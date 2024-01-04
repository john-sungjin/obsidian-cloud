import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment,
	ItemView,
	FileView,
} from "obsidian";
import { Canvas, CanvasView } from "custom";
import { CanvasData, CanvasFileData } from "obsidian/canvas";

interface CloudSettings {
	dailyCanvasFolder: string;
	latestDailyCanvasDate: string | null;
	pinnedNodeIds: Set<string>;
}
// test

const DEFAULT_SETTINGS: CloudSettings = {
	dailyCanvasFolder: "daily-canvas",
	latestDailyCanvasDate: null,
	pinnedNodeIds: new Set(),
};

// TEST SETTINGS for data.json
// {
//   "dailyCanvasFolder": "daily",
//   "latestDailyCanvasDate": "2024-01-02",
//   "pinnedNodeIds": {"09a5499c3b1d4cee", "3ae38435e11bf3cf"}
// }

export default class CloudPlugin extends Plugin {
	settings: CloudSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CloudSettingTab(this.app, this));

		// Open today's daily canvas on startup
		this.app.workspace.onLayoutReady(async () => {
			this.openTodayDailyCanvasFile();
		});

		// Command to open today's daily canvas
		this.addCommand({
			id: "open-daily-canvas-today",
			name: "Open today's daily canvas",
			callback: async () => {
				this.openTodayDailyCanvasFile();
			},
		});

		// Test command. For reverse engineering.
		this.addCommand({
			id: "debugging",
			name: "Run Test Command",
			callback: async () => {
				console.log("Running test command");
				console.log("Canvas: ", this.getActiveCanvas());
				console.log("Settings: ", this.settings);
			},
		});

		this.addCommand({
			id: "pin-selected-nodes",
			name: "Pin selected nodes",
			checkCallback: (checking: boolean) => {
				return this.pinOrUnpinSelectedNodes(checking, true);
			},
		});

		this.addCommand({
			id: "unpin-selected-nodes",
			name: "Unpin selected nodes",
			checkCallback: (checking: boolean) => {
				return this.pinOrUnpinSelectedNodes(checking, false);
			},
		});

		this.addCommand({
			id: "add-daily-journal-to-canvas",
			name: "Add daily journal to canvas",
			checkCallback: (checking: boolean) => {
				const canvas = this.getActiveCanvas();
				if (canvas === null) {
					return false;
				}
				if (checking) {
					return true;
				}
				this.addDailyJournalToCanvas(canvas);
			},
		});
	}

	private pinOrUnpinSelectedNodes(
		checking: boolean,
		pin: boolean
	): boolean | void {
		// TODO: Handle edges
		const canvas = this.getActiveCanvas();
		if (
			canvas === null ||
			!this.canvasIsLatestDailyCanvas(canvas) ||
			canvas.selection.size === 0
		) {
			return false;
		}
		if (checking) {
			return true;
		}

		const selectedNodeIds = new Set<string>();
		canvas.selection.forEach((node) => selectedNodeIds.add(node.id));
		selectedNodeIds.forEach((id) => {
			if (pin) {
				this.settings.pinnedNodeIds.add(id);
			} else {
				this.settings.pinnedNodeIds.delete(id);
			}
		});
		console.log("Pinned node ids: ", this.settings.pinnedNodeIds);
		this.saveSettings();
	}

	onunload() {}

	getActiveCanvas(): Canvas | null {
		const activeView = this.app.workspace.getActiveViewOfType(FileView);
		if (activeView?.getViewType() !== "canvas") {
			return null;
		}
		return (activeView as CanvasView).canvas;
	}

	async loadSettings() {
		console.log("Default Settings: ", DEFAULT_SETTINGS);
		console.log("Loaded Data: ", await this.loadData());
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Date format: YYYY-MM-DD
	async getDailyCanvasFile(date: string): Promise<TFile | Error> {
		const dailyCanvasFileName = `${date}.canvas`;
		const dailyCanvasFilePath = `${this.settings.dailyCanvasFolder}/${dailyCanvasFileName}`;
		let dailyCanvasFile = this.app.vault.getAbstractFileByPath(
			dailyCanvasFilePath
		) as TFile | null;
		if (dailyCanvasFile === null) {
			return new Error("Daily canvas file not found");
		}
		return dailyCanvasFile;
	}

	async getCanvasDataFromFile(file: TFile): Promise<CanvasData> {
		const canvasData = await this.app.vault.read(file);
		return JSON.parse(canvasData) as CanvasData;
	}

	async addDailyJournalToCanvas(canvas: Canvas): Promise<void | Error> {
		// Trigger daily note and insert into canvas
		const file = canvas.view.file;
		if (file === null) {
			return new Error("canvas.view.file is null");
		}
		const date = file.basename;
		// @ts-expect-error
		const dailyNote: TFile = await this.app.internalPlugins.plugins[
			"daily-notes"
		].instance.getDailyNote(moment(date));
		canvas.createFileNode({
			file: dailyNote,
			pos: { x: 0, y: 0 },
			size: { width: 500, height: 500 },
			save: true,
			focus: true,
			position: "center",
		});
	}

	// Gets or creates today's daily canvas file and opens it in the current pane
	async openTodayDailyCanvasFile(): Promise<void> {
		const now = moment();
		const date = now.format("YYYY-MM-DD");
		let wasCreated = false;
		let dailyCanvasFile = await this.getDailyCanvasFile(date);

		// Create new daily canvas file if it doesn't exist
		if (dailyCanvasFile instanceof Error) {
			let pinnedCanvasData = "";
			if (this.settings.latestDailyCanvasDate !== null) {
				const previousDailyCanvasFile = await this.getDailyCanvasFile(
					this.settings.latestDailyCanvasDate
				);
				if (previousDailyCanvasFile instanceof TFile) {
					const previousCanvasData = await this.getCanvasDataFromFile(
						previousDailyCanvasFile
					);
					const newCanvasData: CanvasData = {
						nodes: [],
						edges: [],
					};
					const pinnedNodeIds = this.settings.pinnedNodeIds;
					pinnedNodeIds.forEach((id) => {
						// Copy node to new canvas data
						const node = previousCanvasData.nodes.find(
							(node) => node.id === id
						);
						if (node !== undefined) {
							newCanvasData.nodes.push(node);
						}
					});
					pinnedCanvasData = JSON.stringify(newCanvasData);
				}
			}
			dailyCanvasFile = await this.app.vault.create(
				`${this.settings.dailyCanvasFolder}/${date}.canvas`,
				pinnedCanvasData
			);
			this.settings.latestDailyCanvasDate = date;
			await this.saveSettings();

			wasCreated = true;
		}

		const leaf = this.app.workspace.getLeaf();
		await leaf.openFile(dailyCanvasFile);

		if (wasCreated) {
			// Add daily journal to canvas
			const canvas = this.getActiveCanvas();
			if (canvas === null) {
				throw new Error("Active canvas is null");
			}
			await this.addDailyJournalToCanvas(canvas);
		}
	}

	canvasIsLatestDailyCanvas(canvas: Canvas): boolean {
		const file = canvas.view.file;
		if (file === null) {
			throw new Error("CanvasView file is null");
		}
		const fileName = file.basename;
		return fileName === this.settings.latestDailyCanvasDate;
	}
}

class CloudModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class CloudSettingTab extends PluginSettingTab {
	plugin: CloudPlugin;

	constructor(app: App, plugin: CloudPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Daily Canvas Folder")
			.setDesc(
				"Choose the folder where your daily canvas files will be stored"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter a folder path")
					.setValue(this.plugin.settings.dailyCanvasFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyCanvasFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

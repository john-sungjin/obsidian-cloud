import { around, dedupe } from "monkey-around";
import {
	App,
	Canvas,
	CanvasNode,
	CanvasView,
	Component,
	FileView,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment,
	setIcon,
	Events,
} from "obsidian";
import { CanvasData } from "obsidian/canvas";
import {
	CloudSettings,
	DEFAULT_SETTINGS,
	NODE_ADD_EVENT,
	SETTINGS_CHANGE_EVENT,
	CloudEvents,
} from "types/cloud";

export default class CloudPlugin extends Plugin {
	events: CloudEvents;
	settings: CloudSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CloudSettingTab(this.app, this));

		this.events = new Events() as CloudEvents;

		// Open today's daily canvas on startup
		this.app.workspace.onLayoutReady(async () => {
			this.openTodayDailyCanvasFile();
			this.loadPatches();
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
		canvas.selection.forEach((node) => {
			if (pin) {
				this.pinNode(node);
			} else {
				this.unpinNode(node);
			}
		});
		this.saveSettings();
	}

	pinNode(node: CanvasNode): void {
		this.settings.pinnedNodeIds.add(node.id);
		this.saveSettings();
	}

	unpinNode(node: CanvasNode): void {
		this.settings.pinnedNodeIds.delete(node.id);
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
		// Need to serialize/deserialize Set as an Array
		const loadedData = await this.loadData();
		loadedData.pinnedNodeIds = new Set(loadedData.pinnedNodeIds);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
	}

	async saveSettings() {
		const dataToSave = Object.assign({}, this.settings, {
			pinnedNodeIds: Array.from(this.settings.pinnedNodeIds),
		});
		await this.saveData(dataToSave);
		this.events.trigger(SETTINGS_CHANGE_EVENT, dataToSave);
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

	loadPatches() {
		// Always try to patch before registering events
		const canvasPatchResult = this.patchCanvas();
		if (canvasPatchResult instanceof Error) {
			console.log(
				"Failed to patch canvas. Registering event to patch canvas when one is available."
			);
			const patchCanvasEvent = this.app.workspace.on(
				"layout-change",
				() => {
					console.log("Layout changed. Attempting to patch canvas");
					const result = this.patchCanvas();
					if (!(result instanceof Error)) {
						this.app.workspace.offref(patchCanvasEvent);
					}
				}
			);
			this.registerEvent(patchCanvasEvent);
		}

		const nodesPatchResult = this.patchNodes();
		if (nodesPatchResult instanceof Error) {
			console.log(
				"Failed to patch nodes. Registering event to patch nodes when one is available."
			);
			const patchNodesEvent = this.events.on(
				NODE_ADD_EVENT,
				(node: CanvasNode) => {
					console.log("Node added. Attempting to patch node");
					const result = this.patchNodes();
					if (!(result instanceof Error)) {
						this.app.workspace.offref(patchNodesEvent);
					}
				}
			);
			this.registerEvent(patchNodesEvent);
		}
	}

	patchCanvas(): void | Error {
		console.log("Attempting to patch canvas.");
		// To patch the canvas prototype, we need an instance of it.
		const canvas = this.app.workspace.getLeavesOfType("canvas").first()
			?.view?.canvas;
		if (canvas === undefined) {
			return new Error("No canvas open");
		}

		const triggerNodeAddEvent = (node: CanvasNode) => {
			this.events.trigger(NODE_ADD_EVENT, node);
		};

		const handleDeleteSelection = (canvas: Canvas) => {
			// TODO: add unpin actions to history
			canvas.selection.forEach((node) => {
				this.unpinNode(node);
			});
		};

		const canvasPrototype: Canvas = Object.getPrototypeOf(canvas);
		this.register(
			around(canvasPrototype, {
				addNode: function (
					originalAddNode: (this: Canvas, node: CanvasNode) => void
				) {
					return dedupe(
						"addNode",
						originalAddNode,
						function (this: Canvas, node: CanvasNode) {
							originalAddNode.call(this, node);
							triggerNodeAddEvent(node);
						}
					);
				},
				deleteSelection: function (
					originalDeleteSelection: (this: Canvas) => void
				) {
					return dedupe(
						"deleteSelection",
						originalDeleteSelection,
						function (this: Canvas) {
							handleDeleteSelection(this);
							originalDeleteSelection.call(this);
						}
					);
				},
			})
		);
		console.log("Successfully patched canvas.");
	}

	patchNodes() {
		console.log("Attempting to patch nodes.");
		// To patch canvas nodes, we need a canvas instance that has nodes
		const canvas = this.app.workspace.getLeavesOfType("canvas").first()
			?.view?.canvas;
		const nodes = Array.from(canvas?.nodes.values() ?? []);
		if (nodes.length === 0) {
			return new Error("No nodes found");
		}

		// Find base class by finding the prototype of the highest class
		// with an initialize method
		let nodePrototype = Object.getPrototypeOf(nodes[0]);
		while (true) {
			const parentPrototype = Object.getPrototypeOf(nodePrototype);
			if (!parentPrototype.hasOwnProperty("initialize")) {
				break;
			}
			nodePrototype = parentPrototype;
		}

		const addHeaderToNode = this.addHeaderToNode.bind(this);

		this.register(
			around(nodePrototype as CanvasNode, {
				initialize: function (
					originalInitialize: (this: CanvasNode) => void
				) {
					return dedupe(
						"initialize",
						originalInitialize,
						function (this: CanvasNode) {
							originalInitialize.call(this);
							addHeaderToNode(this);
						}
					);
				},
				destroy: function (
					originalDestroy: (this: CanvasNode) => void
				) {
					return dedupe(
						"destroy",
						originalDestroy,
						function (this: CanvasNode) {
							originalDestroy.call(this);
							this.nodeHeader!.unload();
						}
					);
				},
			})
		);

		// Add header to all existing nodes that have already been initialized
		this.app.workspace
			.getLeavesOfType("canvas")
			.map((leaf) => leaf.view.canvas)
			.flatMap((canvas) => Array.from(canvas.nodes.values()))
			.filter((node) => node.initialized)
			.forEach(addHeaderToNode);

		console.log("Successfully patched nodes.");
	}

	addHeaderToNode(node: CanvasNode) {
		if (node.nodeHeader !== undefined) {
			console.log("Tried to patch node twice: ", node);
			return;
		}
		const nodeHeader = new NodeHeader(node, this);
		nodeHeader.load();
		node.containerEl.insertBefore(
			nodeHeader.element,
			node.containerEl.firstChild
		);
		node.nodeHeader = nodeHeader;
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

export class NodeHeader extends Component {
	// Can only pin nodes on the latest daily canvas
	// Should be aligned to today
	isLatestDailyCanvas: boolean;

	node: CanvasNode;
	plugin: CloudPlugin;
	element: HTMLElement;
	pinButton: HTMLElement;

	constructor(node: CanvasNode, plugin: CloudPlugin) {
		super();
		this.node = node;
		this.plugin = plugin;
	}

	onload() {
		super.onload();

		this.element = createEl("div", {
			cls: "cloud-node-header",
			attr: {
				"data-node-id": this.node.id,
			},
		});
		this.pinButton = createEl("button", {
			cls: "cloud-node-header-pin-button clickable-icon",
		});
		this.pinButton.addEventListener("click", () => {
			if (this.isPinned()) {
				this.plugin.unpinNode(this.node);
			} else {
				this.plugin.pinNode(this.node);
			}
		});
		setIcon(this.pinButton, "pin");
		this.element.appendChild(this.pinButton);

		this.updatePinButtonVisibility();
		this.updatePinButtonState();

		this.registerEvent(
			this.plugin.events.on(
				SETTINGS_CHANGE_EVENT,
				(settings: CloudSettings) => {
					this.updatePinButtonVisibility();
					this.updatePinButtonState();
				}
			)
		);
	}

	onunload() {
		this.element.remove();
		super.onunload();
	}

	isPinned(): boolean {
		return this.plugin.settings.pinnedNodeIds.has(this.node.id);
	}

	updatePinButtonVisibility() {
		this.isLatestDailyCanvas = this.plugin.canvasIsLatestDailyCanvas(
			this.node.canvas
		);
		if (this.isLatestDailyCanvas) {
			this.pinButton.style.display = "block";
		} else {
			this.pinButton.style.display = "none";
		}
	}

	updatePinButtonState() {
		if (this.isPinned()) {
			this.pinButton.classList.add("pinned");
		} else {
			this.pinButton.classList.remove("pinned");
		}
	}
}

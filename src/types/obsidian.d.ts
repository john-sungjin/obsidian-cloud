// Reverse engineered type definitions for Obsidian's Canvas
// Derived from:
// https://github.com/Quorafind/Obsidian-Collapse-Node/blob/master/src/types/obsidian.d.ts
// https://github.com/rpggio/obsidian-chat-stream/blob/master/src/obsidian/canvas-internal.d.ts
// Also from printing the canvas object in the console
// Is intentionally minimal

import "obsidian";
import { CloudSettings } from "./cloud";

declare module "obsidian" {
	const NODE_ADD_EVENT = "cloud-canvas-node-added";
	const SETTINGS_CHANGE_EVENT = "cloud-settings-change";

	interface Workspace {
		getLeavesOfType(viewType: "canvas"): (Omit<WorkspaceLeaf, "view"> & {
			view: CanvasView;
		})[];

		on(
			name: typeof NODE_ADD_EVENT,
			cb: (node: CanvasNode) => any
		): EventRef;

		on(
			name: typeof SETTINGS_CHANGE_EVENT,
			cb: (settings: CloudSettings) => any
		): EventRef;
	}

	abstract class CanvasView extends EditableFileView {
		canvas: Canvas;
	}

	// Supposed to represent the shared base class of all node types
	interface CanvasNode {
		id: string;
		x: number;
		y: number;
		width: number;
		height: number;
		color: string;
		// nodeEl > containerEl + label > contentEl
		nodeEl: HTMLElement;
		containerEl: HTMLElement;

		canvas: Canvas;

		initialized: boolean;
		// Runs when the node is first rendered
		initialize(): void;

		// Custom property to detect whether a node has been patched
		isPatched: boolean | undefined;
	}

	interface CreateNodeOptions {
		pos: { x: number; y: number };
		size: { width: number; height: number };
		position: "left" | "right" | "top" | "bottom" | "center";
		save: boolean; // Whether to save after creating the node
		focus: boolean; // Whether to focus  the new node
	}

	interface Canvas {
		app: App;
		view: CanvasView;
		nodes: Map<string, CanvasNode>;
		selection: Set<CanvasNode>;

		addNode(node: CanvasNode): void;

		createTextNode(
			options: CreateNodeOptions & {
				text: string;
			}
		): void;

		createFileNode(
			options: CreateNodeOptions & {
				file: TFile;
			}
		): void;

		createLinkNode(
			options: CreateNodeOptions & {
				url: string;
			}
		): void;
	}
}

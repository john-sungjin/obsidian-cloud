// Reverse engineered type definitions for Obsidian's Canvas
// Derived from:
// https://github.com/Quorafind/Obsidian-Collapse-Node/blob/master/src/types/obsidian.d.ts
// https://github.com/rpggio/obsidian-chat-stream/blob/master/src/obsidian/canvas-internal.d.ts
// Also from printing the canvas object in the console
// Is intentionally minimal

import "obsidian";
import { NodeHeader } from "main";

declare module "obsidian" {
	interface Workspace {
		getLeavesOfType(viewType: "canvas"): (Omit<WorkspaceLeaf, "view"> & {
			view: CanvasView;
		})[];
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
		// I think this runs to delete the node
		// Detach is similar, but destroy calls detach
		destroy(): void;

		// Custom property to store the header of the node
		// Note that this is a circular dependency
		nodeHeader: NodeHeader | undefined;
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

		// Add and remove node are called both for creating/deleting
		// and for closing/opening different files
		addNode(node: CanvasNode): void;
		removeNode(node: CanvasNode): void;

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

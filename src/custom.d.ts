// Reverse engineered type definitions for Obsidian's Canvas
// Derived from:
// https://github.com/Quorafind/Obsidian-Collapse-Node/blob/master/src/types/obsidian.d.ts
// https://github.com/rpggio/obsidian-chat-stream/blob/master/src/obsidian/canvas-internal.d.ts
// Also from printing the canvas object in the console
// Is intentionally minimal

import { CanvasNodeData } from "obsidian/canvas";
import { EditableFileView, TFile } from "obsidian";

export abstract class CanvasView extends EditableFileView {
	canvas: Canvas;
}

export interface CanvasNode {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
}

interface CreateNodeOptions {
	pos: { x: number; y: number };
	size: { width: number; height: number };
	position: "left" | "right" | "top" | "bottom" | "center";
	save: boolean; // Whether to save after creating the node
	focus: boolean; // Whether to focus  the new node
}

export interface Canvas {
	view: CanvasView;
	nodes: Record<string, CanvasNode>;
	selection: Set<CanvasNode>;

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

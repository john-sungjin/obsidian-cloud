import { Events, EventRef, CanvasNode } from "obsidian";

export const NODE_ADD_EVENT = "cloud-canvas-node-added";
export const SETTINGS_CHANGE_EVENT = "cloud-settings-change";
export interface CloudEvents extends Events {
	on(
		name: typeof NODE_ADD_EVENT,
		callback: (node: CanvasNode) => void
	): EventRef;

	on(
		name: typeof SETTINGS_CHANGE_EVENT,
		callback: (settings: CloudSettings) => void
	): EventRef;

	trigger(name: typeof NODE_ADD_EVENT, node: CanvasNode): void;
	trigger(name: typeof SETTINGS_CHANGE_EVENT, settings: CloudSettings): void;

	off(
		name: typeof NODE_ADD_EVENT,
		callback: (node: CanvasNode) => void
	): void;
	off(
		name: typeof SETTINGS_CHANGE_EVENT,
		callback: (settings: CloudSettings) => void
	): void;
}

export interface CloudSettings {
	dailyCanvasFolder: string;
	latestDailyCanvasDate: string | null;
	pinnedNodeIds: Set<string>;
}
// test

export const DEFAULT_SETTINGS: CloudSettings = {
	dailyCanvasFolder: "daily-canvas",
	latestDailyCanvasDate: null,
	pinnedNodeIds: new Set(),
};

// TEST SETTINGS for data.json
// {
//   "dailyCanvasFolder": "daily-canvas",
//   "latestDailyCanvasDate": "2024-01-02",
//   "pinnedNodeIds": {"09a5499c3b1d4cee", "3ae38435e11bf3cf"}
// }

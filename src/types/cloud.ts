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

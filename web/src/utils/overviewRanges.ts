import type { OverviewRange } from '../api/overview.api';

export const RANGES: OverviewRange[] = ['week', 'month', 'quarter'];
export const PANEL_ID = 'overview-panel';
export const tabId = (range: OverviewRange) => `overview-tab-${range}`;

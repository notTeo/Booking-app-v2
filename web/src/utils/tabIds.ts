// The ids that tie a row of tabs (components/Tabs.tsx) to the panel it controls.

/** The id of a tab's button, for its panel's `aria-labelledby`. */
export const tabButtonId = (prefix: string, id: string) => `${prefix}-tab-${id}`;

/** The id the panel must carry, which every tab points at. */
export const tabPanelId = (prefix: string) => `${prefix}-panel`;

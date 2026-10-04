Short label for an icon-only control, shown below it on hover and on keyboard focus. Used by the app navbar's Account and Logout buttons.

Markup: wrap the control in `span.tooltip` and put `span.tooltip__bubble` (`aria-hidden="true"`) after it. The control keeps its own `aria-label` with the same text, so screen readers hear it once. Use `tooltip--end` for controls at the right edge of a bar, so the bubble lines up with the control's right edge and stays on a 360px screen.

Esc hides it until the pointer or focus leaves (`is-dismissed`, set by `components/Tooltip.tsx`). `is-open` forces it visible for previews. Colors are inverted from tokens (`--text` background, `--surface` text), so it reads in light and dark. Labels only: no links, buttons or long text inside; use a modal or popover for that.

Pill-shaped action trigger in five variants (primary, secondary, ghost, danger, danger-outline), three sizes (sm 36, md 44, lg 52) and an icon-only form.

Provide a verb label (or an `aria-label` for `btn--icon`). Use one primary per view; secondary beside it; ghost for low emphasis; `btn--danger-outline` (red text and border, no fill, soft red fill on hover) for every remove/delete trigger on a page; filled `btn--danger` only for the final confirm inside a confirm dialog. Add `btn--block` for full width (default on phones in forms and sticky bars). Loading: add `is-loading` and `aria-busy="true"` but keep the button focusable; disabled uses `disabled`.

Do not nest buttons in links, do not use two primaries together, and do not hide the label of a text button on phones; switch to a shorter label instead.

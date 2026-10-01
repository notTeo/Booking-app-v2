Toggle pill for filters and for choosing one value from a short list (booking status filter and picker, provider jump chips). It is a `<button>` with `aria-pressed`; pressed state is the selected state.

Classes: `chip`, `chip__label`; status colors `chip--pending / --confirmed / --completed / --canceled / --no-show` (also `--success/--warning/--danger/--info`) apply only while pressed and match `badge--*`; `chip--lg` is the 44px size for phone rows. Put an icon before the label, and wrap the label in `chip__label` when the chip is canceled (it is struck through, like the badge).

Use `tabs` / `tabs--segmented` to switch views of the same data; use `chip` for filters and value pickers. Never use a badge as a button. Disabled chips keep their label and set `disabled`.

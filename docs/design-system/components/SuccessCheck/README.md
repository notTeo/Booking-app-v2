The "done" mark: a tick drawn inside a filled accent circle, shown once after something was completed (a booking was made).

Use the `SuccessCheck` component at the top of a `card--center`, with a title under it that says what happened; the mark itself is decorative (`aria-hidden`). It is the size of `avatar--xl`. The disc pops in and the tick is then drawn; with reduced motion it appears complete. Don't use it for states that are merely "ok" (a saved form gets an `alert--success`).

A flow of steps shown one per screen, with the step's one main button always in view. Used by the new-shop flow (`/shops/new`, `/shops/<slug>/setup`).

Structure: `.wizard` holds the Steps bar, the step (`.wizard__step`, which starts with a `.wizard__intro`: an optional badge, the title, one sentence) and the footer (`.wizard__foot`). `.wizard--wide` widens the column from 38rem to 64rem for content that sits side by side (the three plan cards).

Moving between steps: the step is given `.wizard__step--slide`, so it slides in from the right; add `.is-back` when it was reached with Back. Reduced motion removes the slide.

Footer: Back (`.wizard__back`) on the left, "Skip for now" and the main button (`.wizard__main`) on the right. A step with no Back may show a short note (`.wizard__note`) in its place. One primary button per step; Back and Skip are ghost buttons. The footer is sticky at the bottom of the screen.

Compact: add `.is-compact` to `.wizard` and to `.wizard__foot` from JS (`useIsCompact`), as on the app shell. The main button then takes the full width, above Back and Skip. There are no media queries in this component.

Plan cards as a choice: `.plan-card--select` on a `<label class="card plan-card">` around a visually hidden radio, with an `.option-check` as its first visible child. The chosen card takes the accent border and soft fill. `.plan-grid--stack` keeps the cards in one column.

Keep a flow to seven steps or fewer.

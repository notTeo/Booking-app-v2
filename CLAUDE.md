## Design system

- Source of truth is `docs/design-system/` (README, implementation, migration, component docs).
- Use only tokens from `web/src/styles/tokens.css`. No raw hex, px or rem for color, spacing, radius or font size.
- Use classes from `web/src/styles/components.css` (BEM: `.btn`, `.btn--secondary`, `.is-loading`). Never restyle shared components in page CSS; if a variant is missing, add it to `components.css`.
- Every change must work in light, dark (`[data-theme="dark"]`) and at 360px wide.
- One migration phase per session; commit after each.

## Known gaps

- TODO: Reactivating a member does not restore bookableByCustomers/bookableInternally; owner must re-enable them manually. Consider restoring or showing a hint.

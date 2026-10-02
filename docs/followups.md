# Follow-ups from `fix/silent-failures`

Things noticed while fixing the silent failures that were deliberately left alone.

| # | Item | Status |
|---|------|--------|
| 1 | Dead `shopLoading` spinner branches in the six shop pages, plus the dead `isLoading` check and `!shop` return in `ShopNewBookingPage`, now that `ShopGate` handles them. | UI rebuild |
| 2 | `ShopInvitesPage` and `ShopSettingsPage` were outside `ShopGate`; Invites could spin when the shop is missing. | Fixed in this branch (every `/shops/:slug/*` route is under `ShopGate`) |
| 3 | `ShopOverviewPage` had its own `noShop` text and did not distinguish a lookup error from not found. | Fixed in this branch (overview is under `ShopGate`) |
| 4 | Several `useEffect`s in the shop pages have missing dependencies, mostly the `t.*.errorLoad` strings, which can leave error messages in the wrong language. | UI rebuild |
| 5 | Slot fetching has no loading state; the previous slots stay on screen while a new date loads. | Pages-spec states |
| 6 | A failed customer phone search in `OwnerCustomerFormStep` is swallowed silently (it no longer shows the "New customer" hint, but gives no error either). | Pages-spec states |
| 7 | `ShopTeamPage` and `ShopTeamMemberPage` duplicate the member-remove error handling. | UI rebuild |
| 8 | Raw inline style values (for example `marginBottom: '1.25rem'` in `ShopCustomersPage`) go against the design-system token rule. | UI rebuild |

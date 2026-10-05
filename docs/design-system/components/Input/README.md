Text input, select and textarea with shared field chrome: label, hint, error, and default, hover, focus, error, disabled and loading states.

Wrap every control in `.field` with a visible `.field__label`; connect hint and error with `aria-describedby`; set `aria-invalid="true"` on error. Controls are 44px tall and 16px type (no iOS zoom). `border-strong` outlines the control; error switches to `danger` and shows an icon and message, never color alone. The consumer provides label text, `name`, `autocomplete` and `inputmode`.

Password fields use the `PasswordInput` component: `input-wrap input-wrap--action` around the input, with a `btn btn--ghost btn--icon btn--sm input-wrap__action` eye toggle (`aria-pressed`, translated `aria-label`) that switches the field between hidden and visible. Never write a bare `type="password"` input.

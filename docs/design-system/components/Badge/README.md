Compact pill for status and counts. Booking statuses: pending (warning), confirmed (success), completed (info), canceled (neutral, struck through), no-show (danger). Each has an icon and label.

Use the status classes only for booking states; use `badge--success/warning/danger/info/accent/neutral` for everything else. The consumer maps data values (`no_show` to `no-show`). Never use a badge as a button.

`badge--wrap` lets a badge with long text (an address) wrap inside its row instead of overflowing; it squares the corners so a two-line badge still reads as one shape. Put the badges in a `.cluster` so they sit in a row and wrap.

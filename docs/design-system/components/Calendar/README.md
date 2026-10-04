The owner's day view: a time gutter on the left and one column per provider, with bookings as blocks.

`.cal` is the scroll box; inside it `cal__grid > cal__head (cal__corner + cal__col-head…) + cal__body (cal__gutter > cal__hour… + cal__col…)`. The page sets the hour height as `--cal-hour-h` on `.cal` and positions `cal__line`, `cal__off` and each `cal-block` with inline `top` / `height`, since those come from the data. Off hours are hatched and carry a badge ("Closed"), never colour alone.

A booking is a `<button class="cal-block cal-block--{status}">` with `cal-block__time` (status icon first), `cal-block__name`, `cal-block__service`, and optionally `cal-block__tag` / `cal-block__next-day`. Status uses the badge tokens plus a left bar and an icon; canceled is struck through. `cal-block--override` (dashed edge) marks an out-of-hours booking, `cal-block--compact` puts everything on one row for bookings under an hour, `cal-block--selected` outlines the open one.

Below 640px each provider column is one swipeable page and the gutter stays put; `cal-chips` (a row of `chip chip--lg`, hidden from 640px up) jumps between providers.

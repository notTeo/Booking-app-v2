Table for records with several fields (bookings, customers, services). On wide containers a normal table; below 640px of container width each row becomes a card with labeled lines, using a container query, so there is one markup for both.

The consumer provides `data-label` on each `td`, a `data-table__title` first cell, a `data-table__actions` last cell, and `scope="col"` headers. Numbers align right with `data-table__num`. Show empty and loading states with `empty--sm` and skeletons inside `.table-surface`. Don't use a table for fewer than three columns.

For a person in the title cell, wrap the `Avatar` and the link in `data-table__identity`: the two stay on one line and the text truncates with an ellipsis. Badges go after it.

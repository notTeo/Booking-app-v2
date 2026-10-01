Month grid for choosing a booking date. Header with previous and next month buttons, Monday-first weekday row, 7-column grid of 44px-tall day buttons.

States: default, hover, focus-visible, today (ring), selected (filled), has openings (dot), disabled (closed or past), loading (pulsing). Selected day is announced with `aria-pressed`; each day has a full `aria-label`. The consumer provides the month, availability by day, and the selected day, and disables the previous-month button at the current month.

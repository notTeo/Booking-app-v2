Skeleton blocks for content areas and a spinner for actions.

Use skeletons when the shape of the result is known and loading takes over 300ms (lists, cards, slot chips); match the final layout. Use a spinner (`spinner--sm` in buttons and inputs) for short, local waits. Set `aria-busy="true"` on the loading region. Reduced motion stops the pulse and slows the spinner.

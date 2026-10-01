Dialog above the page: `modal` for forms and details, `modal--confirm` for yes/no decisions. Centered with `radius-lg` from 640px, bottom sheet below.

The consumer provides a title (always), body, and footer buttons: confirm on the right (on top when stacked), cancel as secondary or ghost. Confirm dialogs name the object ("Cancel this booking?") and the destructive button repeats the verb ("Cancel booking"); the safe button has initial focus. Trap focus, close on Esc and backdrop click (not for forms with unsaved changes), restore focus.

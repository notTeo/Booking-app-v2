// Every sentence an email can contain, in Greek and English. The templates in
// email.service.ts hold the layout; this file holds the words.

export const EMAIL_LOCALES = ['el', 'en'] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
// Greek unless the recipient is known to use the app in English.
export const DEFAULT_EMAIL_LOCALE: EmailLocale = 'el';

const en = {
  intlLocale: 'en-US',
  hour12: true,
  hours: (n: number) => `${n} hour${n === 1 ? '' : 's'}`,
  fallbackLink: "If the button doesn't work, copy and paste this link:",
  expires: (span: string) => `This link expires in ${span}.`,
  span24h: '24 hours',
  span1h: '1 hour',
  span7d: '7 days',

  labels: {
    date: 'Date',
    time: 'Time',
    newDate: 'New date',
    newTime: 'New time',
    was: 'Was',
    service: 'Service',
    provider: 'Provider',
    location: 'Location',
    customer: 'Customer',
    phone: 'Phone',
  },
  roles: {
    owner: 'owner',
    manager: 'manager',
    staff: 'staff member',
  } as Record<string, string>,
  staffFallback: 'Your staff member',

  verify: {
    subject: 'Verify your email',
    page: 'Verify',
    heading: (name?: string) =>
      name ? `Verify your email, ${name}.` : 'Verify your email.',
    body: 'Confirm this email to activate your account and keep your access secure.',
    ignore:
      "If you didn't create a BeBooked account, you can ignore this email.",
    button: 'Verify email',
  },
  emailChange: {
    subject: 'Verify your new email address',
    page: 'Verify email change',
    heading: 'Verify your new email.',
    body: "You requested to change your account's email address. Confirm this address to complete the change.",
    button: 'Verify new email',
  },
  reset: {
    subject: 'Reset your password',
    page: 'Reset password',
    heading: (name?: string) =>
      name ? `Reset your password, ${name}.` : 'Reset your password.',
    body: 'We received a request to reset your password. Set a new one below.',
    ignore: "If you didn't request this, you can ignore this email.",
    button: 'Reset password',
  },
  invite: {
    subject: (shop: string) => `You've been invited to join ${shop}`,
    title: (shop: string) => `Invitation to ${shop}`,
    page: 'Invite',
    heading: (shop: string) => `You're invited to ${shop}.`,
    // Around the inviter's address and the role, which the template makes bold.
    body: ['', ' has invited you to join as a ', '.'] as [
      string,
      string,
      string,
    ],
    button: 'Accept invitation',
  },

  actions: {
    calendar: 'Save to calendar',
    directions: 'Get directions',
    reschedule: 'Reschedule booking',
    cancel: 'Cancel booking',
    directionsNote:
      'Directions open Google Maps and show travel time from your location.',
    calendarTitle: (service: string, shop: string) => `${service} at ${shop}`,
    calendarDetails: (staff: string, shop: string) =>
      `Appointment with ${staff} at ${shop}.`,
  },
  policy: {
    cancel: (span: string) =>
      `You can cancel up to ${span} before your appointment.`,
    both: (span: string) =>
      `You can cancel or reschedule up to ${span} before your appointment.`,
    reschedule: (span: string) => `You can reschedule up to ${span} before.`,
  },

  confirmation: {
    subject: (shop: string) => `Your booking at ${shop} is confirmed`,
    title: (shop: string) => `Booking at ${shop}`,
    page: 'Booked',
    heading: (name: string) => `Booking confirmed, ${name}.`,
    body: "Your appointment is locked in. We'll see you soon.",
  },
  reminder: {
    subject: (shop: string) => `Reminder: your booking at ${shop}`,
    title: (shop: string) => `Reminder — ${shop}`,
    page: 'Reminder',
    heading: (name: string) => `See you soon, ${name}.`,
    body: 'A reminder of your upcoming appointment.',
  },
  rescheduled: {
    subject: (shop: string) => `Your booking at ${shop} has been rescheduled`,
    title: (shop: string) => `Booking rescheduled — ${shop}`,
    page: 'Rescheduled',
    heading: (name: string) => `Booking rescheduled, ${name}.`,
    body: 'Your appointment has moved to a new time. The old time is no longer reserved for you.',
    oldLinks: 'The links in earlier emails about this booking no longer work.',
  },
  cancelled: {
    subject: (shop: string) => `Your booking at ${shop} has been cancelled`,
    title: (shop: string) => `Booking cancelled — ${shop}`,
    page: 'Cancelled',
    heading: (name: string) => `Booking cancelled, ${name}.`,
    body: 'Your appointment has been successfully cancelled.',
    again: "If you'd like to book again, visit the shop's booking page.",
  },
  newBooking: {
    subject: (shop: string) => `New booking at ${shop}`,
    title: (shop: string) => `New booking — ${shop}`,
    page: 'New booking',
    heading: (shop: string) => `New booking at ${shop}.`,
    body: 'A new appointment has just been made.',
  },
  rescheduledNotice: {
    subject: (shop: string) => `Booking rescheduled at ${shop}`,
    title: (shop: string) => `Booking rescheduled — ${shop}`,
    page: 'Rescheduled',
    heading: 'A customer rescheduled a booking.',
    body: 'The old time is free again and shows as rescheduled in your calendar.',
  },
};

export type EmailStrings = typeof en;

const el: EmailStrings = {
  intlLocale: 'el-GR',
  hour12: false,
  hours: (n) => (n === 1 ? '1 ώρα' : `${n} ώρες`),
  fallbackLink: 'Αν το κουμπί δεν λειτουργεί, αντίγραψε αυτόν τον σύνδεσμο:',
  expires: (span) => `Ο σύνδεσμος λήγει σε ${span}.`,
  span24h: '24 ώρες',
  span1h: '1 ώρα',
  span7d: '7 ημέρες',

  labels: {
    date: 'Ημερομηνία',
    time: 'Ώρα',
    newDate: 'Νέα ημερομηνία',
    newTime: 'Νέα ώρα',
    was: 'Ήταν',
    service: 'Υπηρεσία',
    provider: 'Με',
    location: 'Τοποθεσία',
    customer: 'Πελάτης',
    phone: 'Τηλέφωνο',
  },
  roles: {
    owner: 'ιδιοκτήτης',
    manager: 'διαχειριστής',
    staff: 'μέλος προσωπικού',
  },
  staffFallback: 'Το προσωπικό μας',

  verify: {
    subject: 'Επιβεβαίωσε το email σου',
    page: 'Επιβεβαίωση',
    heading: (name) =>
      name ? `Επιβεβαίωσε το email σου, ${name}.` : 'Επιβεβαίωσε το email σου.',
    body: 'Επιβεβαίωσε αυτό το email για να ενεργοποιήσεις τον λογαριασμό σου και να κρατήσεις την πρόσβασή σου ασφαλή.',
    ignore:
      'Αν δεν δημιούργησες λογαριασμό στο BeBooked, αγνόησε αυτό το email.',
    button: 'Επιβεβαίωση email',
  },
  emailChange: {
    subject: 'Επιβεβαίωσε τη νέα διεύθυνση email',
    page: 'Αλλαγή email',
    heading: 'Επιβεβαίωσε το νέο σου email.',
    body: 'Ζήτησες να αλλάξεις τη διεύθυνση email του λογαριασμού σου. Επιβεβαίωσε αυτή τη διεύθυνση για να ολοκληρωθεί η αλλαγή.',
    button: 'Επιβεβαίωση νέου email',
  },
  reset: {
    subject: 'Επαναφορά κωδικού',
    page: 'Επαναφορά κωδικού',
    heading: (name) =>
      name ? `Επαναφορά κωδικού, ${name}.` : 'Επαναφορά κωδικού.',
    body: 'Λάβαμε αίτημα για επαναφορά του κωδικού σου. Όρισε νέο κωδικό παρακάτω.',
    ignore: 'Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email.',
    button: 'Επαναφορά κωδικού',
  },
  invite: {
    subject: (shop) => `Πρόσκληση για το ${shop}`,
    title: (shop) => `Πρόσκληση για το ${shop}`,
    page: 'Πρόσκληση',
    heading: (shop) => `Σε προσκάλεσαν στο ${shop}.`,
    body: ['Ο χρήστης ', ' σε προσκάλεσε να συμμετέχεις ως ', '.'],
    button: 'Αποδοχή πρόσκλησης',
  },

  actions: {
    calendar: 'Αποθήκευση στο ημερολόγιο',
    directions: 'Οδηγίες',
    reschedule: 'Αλλαγή ώρας',
    cancel: 'Ακύρωση ραντεβού',
    directionsNote:
      'Οι οδηγίες ανοίγουν το Google Maps και δείχνουν τον χρόνο διαδρομής από εκεί που βρίσκεσαι.',
    calendarTitle: (service, shop) => `${service} στο ${shop}`,
    calendarDetails: (staff, shop) => `Ραντεβού με ${staff} στο ${shop}.`,
  },
  policy: {
    cancel: (span) => `Μπορείς να ακυρώσεις έως ${span} πριν από το ραντεβού.`,
    both: (span) =>
      `Μπορείς να ακυρώσεις ή να αλλάξεις ώρα έως ${span} πριν από το ραντεβού.`,
    reschedule: (span) => `Μπορείς να αλλάξεις ώρα έως ${span} πριν.`,
  },

  confirmation: {
    subject: (shop) => `Το ραντεβού σου στο ${shop} επιβεβαιώθηκε`,
    title: (shop) => `Ραντεβού στο ${shop}`,
    page: 'Κράτηση',
    heading: (name) => `Το ραντεβού επιβεβαιώθηκε, ${name}.`,
    body: 'Το ραντεβού σου κλείστηκε. Σε περιμένουμε.',
  },
  reminder: {
    subject: (shop) => `Υπενθύμιση: το ραντεβού σου στο ${shop}`,
    title: (shop) => `Υπενθύμιση — ${shop}`,
    page: 'Υπενθύμιση',
    heading: (name) => `Τα λέμε σύντομα, ${name}.`,
    body: 'Μια υπενθύμιση για το ραντεβού σου που πλησιάζει.',
  },
  rescheduled: {
    subject: (shop) => `Το ραντεβού σου στο ${shop} άλλαξε ώρα`,
    title: (shop) => `Αλλαγή ραντεβού — ${shop}`,
    page: 'Αλλαγή ώρας',
    heading: (name) => `Το ραντεβού άλλαξε ώρα, ${name}.`,
    body: 'Το ραντεβού σου μεταφέρθηκε σε νέα ώρα. Η παλιά ώρα δεν είναι πια κρατημένη για σένα.',
    oldLinks:
      'Οι σύνδεσμοι σε προηγούμενα email για αυτό το ραντεβού δεν λειτουργούν πια.',
  },
  cancelled: {
    subject: (shop) => `Το ραντεβού σου στο ${shop} ακυρώθηκε`,
    title: (shop) => `Ακύρωση ραντεβού — ${shop}`,
    page: 'Ακύρωση',
    heading: (name) => `Το ραντεβού ακυρώθηκε, ${name}.`,
    body: 'Το ραντεβού σου ακυρώθηκε με επιτυχία.',
    again:
      'Αν θέλεις να κλείσεις ξανά, επισκέψου τη σελίδα κρατήσεων του καταστήματος.',
  },
  newBooking: {
    subject: (shop) => `Νέο ραντεβού στο ${shop}`,
    title: (shop) => `Νέο ραντεβού — ${shop}`,
    page: 'Νέο ραντεβού',
    heading: (shop) => `Νέο ραντεβού στο ${shop}.`,
    body: 'Μόλις κλείστηκε ένα νέο ραντεβού.',
  },
  rescheduledNotice: {
    subject: (shop) => `Αλλαγή ραντεβού στο ${shop}`,
    title: (shop) => `Αλλαγή ραντεβού — ${shop}`,
    page: 'Αλλαγή ώρας',
    heading: 'Ένας πελάτης άλλαξε την ώρα του ραντεβού του.',
    body: 'Η παλιά ώρα είναι ξανά ελεύθερη και εμφανίζεται ως αλλαγμένη στο ημερολόγιό σου.',
  },
};

export const emailStrings: Record<EmailLocale, EmailStrings> = { el, en };

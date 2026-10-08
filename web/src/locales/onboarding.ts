// Copy of the new-shop flow (/shops/new and /shops/<slug>/setup) and of what
// sits around it: the "Finish setup" card, switching plan, the Solo pages.
// Plan names are never translated; "{plan}" takes one.

export interface OnboardingStrings {
  stepsLabel: string;
  stepOf: string;
  steps: { plan: string; shop: string; hours: string; services: string; team: string; products: string; share: string };
  back: string;
  skip: string;
  continue: string;
  optional: string;
  remove: string;
  errorLoad: string;
  errorSave: string;
  plan: {
    title: string;
    introTrial: string;
    introInactive: string;
    noteTrial: string;
    noteInactive: string;
    continueWith: string;
    popular: string;
    perMonth: string;
    includes: string;
  };
  shop: {
    title: string;
    intro: string;
    name: string;
    link: string;
    linkPreview: string;
    linkHint: string;
    phone: string;
    address: string;
    trial: string;
    inactive: string;
    create: string;
    errorCreate: string;
    slugTaken: string;
  };
  created: { title: string; text: string; note: string; contact: string; backToShops: string };
  hours: {
    title: string;
    intro: string;
    closed: string;
    from: string;
    to: string;
    more: string;
    fullEditor: string;
    save: string;
    endBeforeStart: string;
    days: { MON: string; TUE: string; WED: string; THU: string; FRI: string; SAT: string; SUN: string };
  };
  services: { title: string; intro: string; add: string; newTitle: string; minutes: string };
  team: {
    title: string;
    intro: string;
    rolesTitle: string;
    rolesText: string;
    rolesLink: string;
    you: string;
    owner: string;
    places: string;
    add: string;
  };
  products: {
    title: string;
    intro: string;
    add: string;
    newTitle: string;
    continueWithout: string;
    inStock: string;
    name: string;
    price: string;
    stock: string;
    description: string;
    active: string;
    cancel: string;
    photoLater: string;
    photoFailed: string;
  };
  share: { title: string; intro: string; noServices: string; later: string; goToShop: string; qrTitle: string; qrAlt: string };
  finish: {
    title: string;
    count: string;
    text: string;
    done: string;
    hours: string;
    hoursText: string;
    hoursAction: string;
    services: string;
    servicesText: string;
    servicesAction: string;
    team: string;
    teamText: string;
    teamAction: string;
    products: string;
    productsText: string;
    productsAction: string;
  };
  changePlan: {
    intro: string;
    current: string;
    switchTo: string;
    onPlan: string;
    confirmTitle: string;
    confirmSolo: string;
    confirmSmaller: string;
    cancel: string;
    changed: string;
    error: string;
    rerunTitle: string;
    rerunText: string;
    rerunAction: string;
  };
  solo: {
    teamTitle: string;
    teamText: string;
    productsTitle: string;
    productsText: string;
    upgrade: string;
    comparePlans: string;
    lockedByPlan: string;
  };
}

export const onboardingStrings: Record<'el' | 'en', OnboardingStrings> = {
  el: {
    stepsLabel: 'Βήματα ρύθμισης',
    stepOf: 'Βήμα {n} από {total}',
    steps: { plan: 'Πακέτο', shop: 'Κατάστημα', hours: 'Ωράριο', services: 'Υπηρεσίες', team: 'Ομάδα', products: 'Προϊόντα', share: 'Κοινοποίηση' },
    back: 'Πίσω',
    skip: 'Παράλειψη',
    continue: 'Συνέχεια',
    optional: 'Προαιρετικό',
    remove: 'Αφαίρεση',
    errorLoad: 'Δεν μπορέσαμε να φορτώσουμε αυτό το βήμα. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.',
    errorSave: 'Δεν μπορέσαμε να αποθηκεύσουμε τις αλλαγές σου. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.',
    plan: {
      title: 'Διάλεξε το πακέτο σου',
      introTrial: 'Το πρώτο σου κατάστημα είναι δωρεάν για 30 ημέρες, στο πακέτο που θα διαλέξεις. Δεν χρειάζεται κάρτα και αλλάζεις πακέτο όποτε θέλεις μέσα στη δοκιμή.',
      introInactive: 'Έχεις ήδη χρησιμοποιήσει τη δωρεάν δοκιμή. Διάλεξε το πακέτο που θέλεις για το νέο κατάστημα· θα μείνει ανενεργό μέχρι να επικοινωνήσεις μαζί μας για να το ενεργοποιήσουμε.',
      noteTrial: '30 ημέρες δωρεάν · χωρίς κάρτα',
      noteInactive: 'Ενεργοποιείται αφού επικοινωνήσεις μαζί μας',
      continueWith: 'Συνέχεια με {plan}',
      popular: 'Το πιο δημοφιλές',
      perMonth: '/μήνα · χωρίς ΦΠΑ',
      includes: 'Περιλαμβάνει',
    },
    shop: {
      title: 'Πώς λέγεται το κατάστημά σου;',
      intro: 'Αυτό βλέπουν οι πελάτες στη σελίδα κρατήσεων.',
      name: 'Όνομα καταστήματος',
      link: 'Σύνδεσμος κρατήσεων',
      linkPreview: 'Ο σύνδεσμός σου: {link}',
      linkHint: '3 έως 40 χαρακτήρες: μικρά λατινικά γράμματα, αριθμοί και παύλες. Δεν αλλάζει αργότερα.',
      phone: 'Τηλέφωνο',
      address: 'Διεύθυνση',
      trial: 'Ξεκινάς με 30 ημέρες δωρεάν στο {plan}. Δεν χρειάζεται κάρτα.',
      inactive: 'Το κατάστημα θα δημιουργηθεί στο {plan} και θα μείνει ανενεργό μέχρι να το ενεργοποιήσουμε.',
      create: 'Δημιουργία καταστήματος',
      errorCreate: 'Δεν μπορέσαμε να δημιουργήσουμε το κατάστημα. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.',
      slugTaken: 'Αυτός ο σύνδεσμος χρησιμοποιείται ήδη. Δοκίμασε έναν άλλο.',
    },
    created: {
      title: 'Το κατάστημά σου δημιουργήθηκε',
      text: 'Μένει ανενεργό μέχρι να ενεργοποιηθεί το πακέτο του. Επικοινώνησε μαζί μας και θα του ενεργοποιήσουμε το {plan}.',
      note: 'Όταν ενεργοποιηθεί, θα βρεις τα βήματα ρύθμισης στην επισκόπηση του καταστήματος.',
      contact: 'Επικοινώνησε μαζί μας',
      backToShops: 'Πίσω στα καταστήματά μου',
    },
    hours: {
      title: 'Πότε δουλεύεις;',
      intro: 'Οι πελάτες κλείνουν ραντεβού μόνο μέσα σε αυτές τις ώρες. Τις αλλάζεις όποτε θέλεις.',
      closed: 'Κλειστά',
      from: '{day}, από',
      to: '{day}, έως',
      more: '+{n} ακόμα',
      fullEditor: 'Διαλείμματα, δεύτερη βάρδια ή ωράριο με ημερομηνίες: άνοιξε το πλήρες ωράριο',
      save: 'Αποθήκευση και συνέχεια',
      endBeforeStart: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.',
      days: { MON: 'Δευτέρα', TUE: 'Τρίτη', WED: 'Τετάρτη', THU: 'Πέμπτη', FRI: 'Παρασκευή', SAT: 'Σάββατο', SUN: 'Κυριακή' },
    },
    services: {
      title: 'Τι υπηρεσίες προσφέρεις;',
      intro: 'Πρόσθεσε μία ή δύο για αρχή. Τις υπόλοιπες τις βάζεις αργότερα.',
      add: 'Προσθήκη υπηρεσίας',
      newTitle: 'Νέα υπηρεσία',
      minutes: '{n} λεπτά',
    },
    team: {
      title: 'Ποιοι δουλεύουν μαζί σου;',
      intro: 'Πρόσθεσε τα άτομα στα οποία κλείνουν ραντεβού οι πελάτες. Με email μπορείς να τους προσκαλέσεις να συνδεθούν.',
      rolesTitle: 'Προσωπικό ή διαχειριστής;',
      rolesText: 'Το προσωπικό βλέπει και διαχειρίζεται τα δικά του ραντεβού. Οι διαχειριστές βοηθούν και στη λειτουργία του καταστήματος.',
      rolesLink: 'Πώς λειτουργούν οι ρόλοι',
      you: 'Εσύ',
      owner: 'Ιδιοκτήτης',
      places: 'Το πακέτο σου έχει θέσεις για {n} μέλη προσωπικού με κρατήσεις.',
      add: 'Προσθήκη μέλους',
    },
    products: {
      title: 'Πουλάς προϊόντα;',
      intro: 'Οι πελάτες μπορούν να κρατήσουν προϊόντα μαζί με το ραντεβού τους. Τα περισσότερα καταστήματα τα προσθέτουν αργότερα, οπότε προχώρα χωρίς αυτά αν θέλεις.',
      add: 'Προσθήκη προϊόντος',
      newTitle: 'Νέο προϊόν',
      continueWithout: 'Συνέχεια χωρίς προϊόντα',
      inStock: '{n} σε απόθεμα',
      name: 'Όνομα προϊόντος',
      price: 'Τιμή (€)',
      stock: 'Απόθεμα',
      description: 'Περιγραφή',
      active: 'Ενεργό',
      cancel: 'Ακύρωση',
      photoLater: 'Η φωτογραφία ανεβαίνει μόλις αποθηκευτεί το προϊόν.',
      photoFailed: 'Το προϊόν αποθηκεύτηκε, αλλά η φωτογραφία δεν ανέβηκε. Δοκίμασε ξανά από τη σελίδα του προϊόντος.',
    },
    share: {
      title: 'Μοιράσου τον σύνδεσμο κρατήσεων',
      intro: 'Όποιος ανοίξει αυτόν τον σύνδεσμο κλείνει ραντεβού μαζί σου.',
      noServices: 'Οι πελάτες δεν μπορούν να κλείσουν ραντεβού ακόμα. Πρόσθεσε πρώτα μία υπηρεσία.',
      later: 'Ό,τι παρέλειψες σε περιμένει στο «Ολοκλήρωση ρύθμισης», στην επισκόπηση του καταστήματος.',
      goToShop: 'Πάμε στο κατάστημα',
      qrTitle: 'Σελίδα κρατήσεων',
      qrAlt: 'Κωδικός QR για τη σελίδα κρατήσεων',
    },
    finish: {
      title: 'Ολοκλήρωση ρύθμισης',
      count: '{done} από {total} έγιναν',
      text: 'Μένουν λίγα πράγματα για να μπορούν οι πελάτες να κλείνουν ραντεβού.',
      done: 'Έγινε',
      hours: 'Ωράριο',
      hoursText: 'Οι πελάτες κλείνουν ραντεβού μόνο μέσα στο ωράριό σου.',
      hoursAction: 'Ορισμός ωραρίου',
      services: 'Υπηρεσίες',
      servicesText: 'Οι πελάτες δεν κλείνουν ραντεβού μέχρι να προσθέσεις μία.',
      servicesAction: 'Προσθήκη υπηρεσιών',
      team: 'Ομάδα',
      teamText: 'Προαιρετικό. Πρόσθεσε τα άτομα στα οποία κλείνουν ραντεβού οι πελάτες.',
      teamAction: 'Προσθήκη ομάδας',
      products: 'Προϊόντα',
      productsText: 'Προαιρετικό. Οι πελάτες τα κρατούν μαζί με το ραντεβού.',
      productsAction: 'Προσθήκη προϊόντων',
    },
    changePlan: {
      intro: 'Αλλάζεις πακέτο όποτε θέλεις μέσα στη δοκιμή. Η αλλαγή ισχύει αμέσως.',
      current: 'Τρέχον',
      switchTo: 'Αλλαγή σε {plan}',
      onPlan: 'Είσαι στο {plan}',
      confirmTitle: 'Αλλαγή σε {plan};',
      confirmSolo: 'Στο Solo μένεις ενεργός μόνο εσύ, ο ιδιοκτήτης. Τα υπόλοιπα μέλη της ομάδας απενεργοποιούνται και μένουν κλειδωμένα στη λίστα, τα προϊόντα σου κλείνουν και η σελίδα κρατήσεων δεν τα δείχνει πια. Δεν διαγράφεται τίποτα.',
      confirmSmaller: 'Το {plan} έχει θέσεις για {n} μέλη προσωπικού με κρατήσεις. Αν έχεις περισσότερα, μένουν ενεργά τα παλαιότερα και τα υπόλοιπα απενεργοποιούνται. Δεν διαγράφεται τίποτα.',
      cancel: 'Ακύρωση',
      changed: 'Το κατάστημά σου είναι τώρα στο {plan}.',
      error: 'Δεν μπορέσαμε να αλλάξουμε το πακέτο. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.',
      rerunTitle: 'Οδηγός ρύθμισης',
      rerunText: 'Πέρνα ξανά από το ωράριο, τις υπηρεσίες, την ομάδα και τον σύνδεσμο κρατήσεων.',
      rerunAction: 'Ρύθμιση από την αρχή',
    },
    solo: {
      teamTitle: 'Δουλεύεις με άλλους;',
      teamText: 'Το Solo έχει ένα άτομο για κρατήσεις: εσένα. Στο πακέτο Team προσθέτεις προσωπικό, το προσκαλείς να συνδεθεί και δίνεις στον καθένα το δικό του ωράριο.',
      productsTitle: 'Τα προϊόντα είναι διαθέσιμα στο πακέτο Team',
      productsText: 'Πούλα προϊόντα που οι πελάτες κρατούν μαζί με το ραντεβού τους. Το κατάστημά σου είναι στο {plan}.',
      upgrade: 'Αναβάθμιση σε Team',
      comparePlans: 'Σύγκριση πακέτων',
      lockedByPlan: 'Κλειδωμένο από το πακέτο',
    },
  },
  en: {
    stepsLabel: 'Setup steps',
    stepOf: 'Step {n} of {total}',
    steps: { plan: 'Plan', shop: 'Shop', hours: 'Hours', services: 'Services', team: 'Team', products: 'Products', share: 'Share' },
    back: 'Back',
    skip: 'Skip for now',
    continue: 'Continue',
    optional: 'Optional',
    remove: 'Remove',
    errorLoad: 'We couldn\'t load this step. Check your connection and try again.',
    errorSave: 'We couldn\'t save your changes. Check your connection and try again.',
    plan: {
      title: 'Choose your plan',
      introTrial: 'Your first shop is free for 30 days on the plan you pick. No card needed, and you can switch plan at any time during the trial.',
      introInactive: 'You have already used your free trial. Pick the plan you want for the new shop; it stays inactive until you contact us to activate it.',
      noteTrial: '30 days free · no card needed',
      noteInactive: 'Activated after you contact us',
      continueWith: 'Continue with {plan}',
      popular: 'Most popular',
      perMonth: '/month · excl. VAT',
      includes: 'Features',
    },
    shop: {
      title: 'What is your shop called?',
      intro: 'This is what customers see on your booking page.',
      name: 'Shop name',
      link: 'Booking link',
      linkPreview: 'Your link: {link}',
      linkHint: '3 to 40 characters: lowercase letters, numbers and hyphens. It can\'t be changed later.',
      phone: 'Phone',
      address: 'Address',
      trial: 'You start with 30 days free on {plan}. No card needed.',
      inactive: 'The shop is created on {plan} and stays inactive until we activate it.',
      create: 'Create shop',
      errorCreate: 'We couldn\'t create the shop. Check your connection and try again.',
      slugTaken: 'This link is already in use. Try another one.',
    },
    created: {
      title: 'Your shop is created',
      text: 'It stays inactive until its plan is activated. Contact us and we\'ll activate {plan} for it.',
      note: 'Once it is active, you\'ll find the setup steps on the shop\'s overview.',
      contact: 'Contact us',
      backToShops: 'Back to my shops',
    },
    hours: {
      title: 'When do you work?',
      intro: 'Customers can only book inside these hours. You can change them at any time.',
      closed: 'Closed',
      from: '{day}, from',
      to: '{day}, to',
      more: '+{n} more',
      fullEditor: 'Breaks, a second shift or hours for set dates: open the full working hours',
      save: 'Save and continue',
      endBeforeStart: 'The end time must be after the start time.',
      days: { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' },
    },
    services: {
      title: 'What do you offer?',
      intro: 'Add one or two services to start. You can add the rest later.',
      add: 'Add service',
      newTitle: 'New service',
      minutes: '{n} min',
    },
    team: {
      title: 'Who works with you?',
      intro: 'Add the people customers can book. With an email you can invite them to log in.',
      rolesTitle: 'Staff or manager?',
      rolesText: 'Staff see and manage their own bookings. Managers also help run the shop.',
      rolesLink: 'How team roles work',
      you: 'You',
      owner: 'Owner',
      places: 'Your plan has places for {n} bookable staff.',
      add: 'Add member',
    },
    products: {
      title: 'Do you sell products?',
      intro: 'Customers can reserve products together with their booking. Most shops add them later, so feel free to skip this step.',
      add: 'Add product',
      newTitle: 'New product',
      continueWithout: 'Continue without products',
      inStock: '{n} in stock',
      name: 'Product name',
      price: 'Price (€)',
      stock: 'In stock',
      description: 'Description',
      active: 'Active',
      cancel: 'Cancel',
      photoLater: 'The photo is uploaded once the product is saved.',
      photoFailed: 'The product was saved, but its photo wasn\'t uploaded. Try again from the product\'s page.',
    },
    share: {
      title: 'Share your booking link',
      intro: 'Anyone who opens this link can book with you.',
      noServices: 'Customers can\'t book yet. Add at least one service first.',
      later: 'Anything you skipped waits under "Finish setup" on your shop overview.',
      goToShop: 'Go to my shop',
      qrTitle: 'Booking page',
      qrAlt: 'QR code for the booking page',
    },
    finish: {
      title: 'Finish setup',
      count: '{done} of {total} done',
      text: 'A few things are left before customers can book with you.',
      done: 'Done',
      hours: 'Working hours',
      hoursText: 'Customers can only book inside your working hours.',
      hoursAction: 'Set your hours',
      services: 'Services',
      servicesText: 'Customers can\'t book until you add one.',
      servicesAction: 'Add services',
      team: 'Team',
      teamText: 'Optional. Add the people customers can book.',
      teamAction: 'Add your team',
      products: 'Products',
      productsText: 'Optional. Customers reserve them with a booking.',
      productsAction: 'Add products',
    },
    changePlan: {
      intro: 'You can switch plan at any time during the trial. The change applies straight away.',
      current: 'Current',
      switchTo: 'Switch to {plan}',
      onPlan: 'You are on {plan}',
      confirmTitle: 'Switch to {plan}?',
      confirmSolo: 'On Solo only you, the owner, stay active. Your other team members are deactivated and stay in the list, locked, your products are turned off and your booking page no longer shows them. Nothing is deleted.',
      confirmSmaller: '{plan} has places for {n} bookable staff. If you have more, the longest-standing ones stay active and the rest are deactivated. Nothing is deleted.',
      cancel: 'Cancel',
      changed: 'Your shop is now on {plan}.',
      error: 'We couldn\'t change the plan. Check your connection and try again.',
      rerunTitle: 'Setup guide',
      rerunText: 'Go through your hours, services, team and booking link again.',
      rerunAction: 'Run setup again',
    },
    solo: {
      teamTitle: 'Working with others?',
      teamText: 'Solo has one bookable person: you. On the Team plan you add staff, invite them to log in and give each of them their own hours.',
      productsTitle: 'Products are available on the Team plan',
      productsText: 'Sell products that customers reserve together with their booking. Your shop is on {plan}.',
      upgrade: 'Upgrade to Team',
      comparePlans: 'Compare plans',
      lockedByPlan: 'Locked by plan',
    },
  },
};

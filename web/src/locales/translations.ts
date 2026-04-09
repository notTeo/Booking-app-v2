export type Language = 'el' | 'en';

export interface Translations {
  nav: {
    pricing: string;
    about: string;
    login: string;
    register: string;
    logout: string;
  };
  sidebar: {
    app: string;
    account: string;
    overview: string;
    shops: string;
    billing: string;
    settings: string;
    logout: string;
    expand: string;
    collapse: string;
    backToShops: string;
    shopSection: string;
    manageSection: string;
    bookings: string;
    services: string;
    team: string;
    invites: string;
    customers: string;
    shopSettings: string;
    shopWorkingHours: string;
    bookAppointment: string;
  };
  shops: {
    title: string;
    newShop: string;
    noShops: string;
    upgradePrompt: string;
    name: string;
    slug: string;
    slugHint: string;
    description: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    save: string;
    saving: string;
    role: string;
    createdAt: string;
    active: string;
    inactive: string;
    deleteShop: string;
    dangerZone: string;
    dangerDesc: string;
    areYouSure: string;
    confirmDelete: string;
    deleting: string;
    cancel: string;
    backToShops: string;
    notFound: string;
    errorLoad: string;
    successUpdate: string;
  };
  home: {
    headline: string;
    headlineAccent: string;
    sub: string;
    cta: string;
    signIn: string;
    demo: string;
    heroBadge: string;
     featuresBadge: string;
    featuresTitle: string;
    featuresSub: string;
    howBadge: string;
    howTitle: string;
    howSub: string;
    pricingBadge: string;
    pricingTitle: string;
    pricingSub: string;
    testimonialsBadge:string ;
    testimonialsTitle: string;
    testimonialsSub:string;
  };
  login: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    forgotPassword: string;
    noAccount: string;
    registerLink: string;
    googleCta: string;
    divider: string;
    oauthError: string;
  };
  register: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    alreadyAccount: string;
    loginLink: string;
    googleCta: string;
    divider: string;
    verificationSent: string;
    checkSpam: string;
    resend: string;
    resending: string;
    resentOk: string;
    resentError: string;
    pwMin: string;
    pwUpper: string;
    pwNumber: string;
    pwSpecial: string;
    nameLabel: string;
    inviteNotice: string;
  };
  forgotPassword: {
    title: string;
    emailLabel: string;
    submit: string;
    submitting: string;
    success: string;
    backToLogin: string;
  };
  resetPassword: {
    title: string;
    newPasswordLabel: string;
    confirmLabel: string;
    submit: string;
    submitting: string;
    mismatch: string;
    invalidLink: string;
    backToLogin: string;
    pwMin: string;
    pwUpper: string;
    pwNumber: string;
    pwSpecial: string;
  };
  verifyEmail: {
    title: string;
    verifying: string;
    goToLogin: string;
    resendLabel: string;
    resendPlaceholder: string;
    resendSubmit: string;
    resending: string;
    resentOk: string;
    backToRegister: string;
  };
  verifyEmailChange: {
    title: string;
    verifying: string;
    goToDashboard: string;
    backToSettings: string;
  };
  oauthCallback: {
    signingIn: string;
  };
  dashboard: {
    title: string;
    emailLabel: string;
    userIdLabel: string;
    emailVerifiedLabel: string;
    verified: string;
    notVerified: string;
    memberSinceLabel: string;
    planLabel: string;
    renewsOnLabel: string;
    subscriptionLabel: string;
    cancelNoticePre: string;
    manageLink: string;
    upgrade: string;
    free: string;
    pro: string;
  };
  billing: {
    title: string;
    currentPlan: string;
    accessUntil: string;
    cancelsOn: string;
    renewsOn: string;
    manageSubscription: string;
    redirecting: string;
    upgradeToPro: string;
    successMsg: string;
    free: string;
    pro: string;
  };
  settings: {
    title: string;
    emailSection: string;
    emailLabel: string;
    saveEmail: string;
    saving: string;
    passwordSection: string;
    newPasswordLabel: string;
    updatePassword: string;
    dangerZone: string;
    dangerDesc: string;
    deleteAccount: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    confirmDelete: string;
    deleting: string;
    cancel: string;
    areYouSure: string;
    yesDelete: string;
    pwMin: string;
    pwUpper: string;
    pwNumber: string;
    pwSpecial: string;
    nameSection: string;
    nameLabel: string;
    saveName: string;
    preferencesSection: string;
    themeLabel: string;
    themeDesc: string;
    lightTheme: string;
    darkTheme: string;
    languageLabel: string;
    languageDesc: string;
    activeSessionsSection: string;
    loadingSessions: string;
    noSessions: string;
    sessions: string;
    mostRecent: string;
    sessionStarted: string;
    sessionExpires: string;
    revoking: string;
    revokeAll: string;
    memberSince: string;
    verified: string;
    notVerified: string;
    pro: string;
    free: string;
    successName: string;
    errorName: string;
    successEmail: string;
    errorEmail: string;
    successPassword: string;
    errorPassword: string;
    successRevoke: string;
    errorRevoke: string;
  };
  pricing: {
    title: string;
    starterName: string;
    starterPrice: string;
    starterF1: string;
    starterF2: string;
    starterF3: string;
    starterF4: string;
    starterF5: string;
    currentPlan: string;
    proName: string;
    proPrice: string;
    proF1: string;
    proF2: string;
    proF3: string;
    proF4: string;
    proF5: string;
    proF6: string;
    upgradeToPro: string;
    redirecting: string;
  };
  about: {
    title: string;
    tagline: string;
    offerTitle: string;
    f1: string;
    f2: string;
    f3: string;
    f4: string;
    f5: string;
    f6: string;
    f7: string;
    f8: string;
    f9: string;
    howTitle: string;
    step1Label: string;
    step1Desc: string;
    step2Label: string;
    step2Desc: string;
    step3Label: string;
    step3Desc: string;
    step4Label: string;
    step4Desc: string;
    storyTitle: string;
    bio1: string;
    bio2: string;
    getStarted: string;
    viewPlans: string;
  };
  notFound: {
    code: string;
    title: string;
    message: string;
    goHome: string;
  };
  team: {
    title: string;
    email: string;
    role: string;
    joined: string;
    actions: string;
    roles: { owner: string; staff: string };
    remove: string;
    removing: string;
    confirmRemove: string;
    cancel: string;
    noMembers: string;
    notFound: string;
    errorLoad: string;
    errorRemove: string;
    backToTeam: string;
    editRole: string;
    saveRole: string;
    saving: string;
    roleUpdated: string;
    errorUpdateRole: string;
    availability: string;
    dangerZone: string;
    removeMemberDesc: string;
    confirmRemovePrompt: string;
    assignedServices: string;
    noAssignedServices: string;
    assignService: string;
    selectService: string;
    assigningService: string;
    removeService: string;
    errorLoadServices: string;
    errorAssignService: string;
    errorUnassignService: string;
  };
  invites: {
    title: string;
    received: string;
    sent: string;
    noReceived: string;
    noSent: string;
    sendInvite: string;
    sending: string;
    emailLabel: string;
    roleLabel: string;
    accept: string;
    accepting: string;
    decline: string;
    declining: string;
    revoke: string;
    revoking: string;
    status: { pending: string; accepted: string; expired: string };
    roles: { owner: string; staff: string };
    shopLabel: string;
    invitedBy: string;
    expiresAt: string;
    sentAt: string;
    errorLoad: string;
    errorSend: string;
    errorAccept: string;
    errorDecline: string;
    errorRevoke: string;
    sentOk: string;
    acceptedOk: string;
    declinedOk: string;
    revokedOk: string;
    youreInvited: string;
    joinAs: string;
    registerToAccept: string;
    loginToAccept: string;
    acceptNow: string;
    accepting2: string;
    inviteExpired: string;
    inviteUsed: string;
    inviteNotFound: string;
    emailMismatch: string;
    inviteFor: string;
  };
  services: {
    title: string;
    addService: string;
    create: string;
    name: string;
    description: string;
    duration: string;
    price: string;
    isActive: string;
    save: string;
    saving: string;
    cancel: string;
    edit: string;
    delete: string;
    deleting: string;
    confirmDelete: string;
    active: string;
    inactive: string;
    noServices: string;
    errorLoad: string;
    errorCreate: string;
    errorUpdate: string;
    errorDelete: string;
    staff: string;
    assignedStaff: string;
    noStaff: string;
    addStaff: string;
    selectStaff: string;
    assigning: string;
    removeStaff: string;
    errorAssign: string;
    errorUnassign: string;
  };
  workingHours: {
    title: string;
    save: string;
    saving: string;
    successSave: string;
    errorLoad: string;
    errorSave: string;
    open: string;
    closed: string;
    addSlot: string;
    newSchedule: string;
    createSchedule: string;
    creating: string;
    deleteSchedule: string;
    deleting: string;
    confirmDelete: string;
    cancel: string;
    startDate: string;
    endDate: string;
    ongoing: string;
    from: string;
    to: string;
    saveDays: string;
    noSchedules: string;
    errorDelete: string;
    errorCreate: string;
    slotEndBeforeStart: string;
    slotDuplicate: string;
    slotOverlap: string;
    removeSlot: string;
    days: {
      MON: string;
      TUE: string;
      WED: string;
      THU: string;
      FRI: string;
      SAT: string;
      SUN: string;
    };
  };
  toggles: {
    switchToLight: string;
    switchToDark: string;
    lightMode: string;
    darkMode: string;
  };
  shopSettings: {
    relativeToday: string;
    relativeYesterday: string;
    relativeDaysAgo: string;
    relativeWeekAgo: string;
    relativeWeeksAgo: string;
    relativeMonthAgo: string;
    relativeMonthsAgo: string;
    generalInfo: string;
    contactLocation: string;
    configuration: string;
    activeLabel: string;
    activeDesc: string;
    saveChanges: string;
    saving: string;
    backToShop: string;
    created: string;
    updatedPrefix: string;
    locationConfirmed: string;
    descPlaceholder: string;
    addressPlaceholder: string;
    notFound: string;
    errorLoad: string;
    successUpdate: string;
    errorUpdate: string;
    errorDelete: string;
    yesDeleteShop: string;
    areYouSure: string;
  };
  public: {
    bookAppointment: string;
    service: string;
    staff: string;
    dateTime: string;
    yourDetails: string;
    noServices: string;
    noStaff: string;
    noPreference: string;
    anyStaff: string;
    back: string;
    continue: string;
    date: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    emailLabel: string;
    emailOptional: string;
    emailHint: string;
    emailPlaceholder: string;
    notesLabel: string;
    notesOptional: string;
    notesPlaceholder: string;
    booking: string;
    confirmBooking: string;
    bookingConfirmed: string;
    bookingConfirmedMsg: string;
    shopNotFound: string;
    somethingWrong: string;
    failedSlots: string;
    serviceContext: string;
    staffContext: string;
    atLabel: string;
  };
  overview: {
    loading: string;
    noShop: string;
    identity: string;
    idLabel: string;
    slugLabel: string;
    contact: string;
    phoneLabel: string;
    addressLabel: string;
    settingsSection: string;
    timezoneLabel: string;
    timestamps: string;
    createdLabel: string;
    updatedLabel: string;
  };
  customers: {
    title: string;
    searchPlaceholder: string;
    errorLoad: string;
    noResults: string;
    noCustomers: string;
    nameCol: string;
    phoneCol: string;
    emailCol: string;
    addedCol: string;
    backToCustomers: string;
    notFound: string;
    customerErrorLoad: string;
    customerSince: string;
    editInfo: string;
    nameLabel: string;
    phoneLabel: string;
    emailLabel: string;
    emailOptional: string;
    saving: string;
    save: string;
    recentBookings: string;
    noBookings: string;
    serviceCol: string;
    dateTimeCol: string;
    statusCol: string;
    successUpdate: string;
    errorUpdate: string;
  };
  bookings: {
    title: string;
    errorLoad: string;
    close: string;
    delete: string;
    deleting: string;
    confirmDelete: string;
    cancel: string;
    newBookingTitle: string;
    phoneSearchHint: string;
    newCustomerHint: string;
    createBooking: string;
    creating: string;
    createSuccess: string;
    createError: string;
  };
  cancelBooking: {
    invalidLink: string;
    cancelling: string;
    alreadyCancelled: string;
    notFound: string;
    errorCancel: string;
    cancelled: string;
    yourText: string;
    appointmentAt: string;
    hasCancelled: string;
  };
}

export const translations: Record<Language, Translations> = {
  el: {
    nav: {
      pricing: 'Τιμολόγηση',
      about: 'Σχετικά',
      login: 'Σύνδεση',
      register: 'Εγγραφή',
      logout: 'Αποσύνδεση',
    },
    sidebar: {
      app: 'Εφαρμογή',
      account: 'Λογαριασμός',
      overview: 'Επισκόπηση',
      shops: 'Καταστήματα',
      billing: 'Χρεώσεις',
      settings: 'Ρυθμίσεις',
      logout: 'Αποσύνδεση',
      expand: 'Ανάπτυξη πλευρικής μπάρας',
      collapse: 'Σύμπτυξη πλευρικής μπάρας',
      backToShops: '← ',
      shopSection: 'Κατάστημα',
      manageSection: 'Διαχείριση',
      bookings: 'Ραντεβού',
      services: 'Υπηρεσίες',
      team: 'Ομάδα',
      invites: 'Προσκλήσεις',
      customers: 'Πελάτες',
      shopSettings: 'Ρυθμίσεις',
      shopWorkingHours: "'Ωρες Λειτουργίας",
      bookAppointment: 'Νέο Ραντεβού',
    },
    shops: {
      title: 'Τα Καταστήματά μου',
      newShop: 'Νέο Κατάστημα',
      noShops: 'Δεν έχετε ακόμα καταστήματα.',
      upgradePrompt: 'Αναβαθμίστε στο Pro για να δημιουργήσετε καταστήματα.',
      name: 'Όνομα',
      slug: 'Slug',
      slugHint: 'Μόνο πεζά γράμματα, αριθμοί και παύλες (π.χ. my-shop)',
      description: 'Περιγραφή',
      phone: 'Τηλέφωνο',
      address: 'Διεύθυνση',
      city: 'Πόλη',
      country: 'Χώρα',
      timezone: 'Ζώνη ώρας',
      save: 'Αποθήκευση',
      saving: 'Αποθήκευση...',
      role: 'Ρόλος',
      createdAt: 'Δημιουργήθηκε',
      active: 'Ενεργό',
      inactive: 'Ανενεργό',
      deleteShop: 'Διαγραφή Καταστήματος',
      dangerZone: 'Επικίνδυνη Ζώνη',
      dangerDesc: 'Οριστική διαγραφή καταστήματος και όλων των δεδομένων του. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      areYouSure: 'Είστε σίγουροι; Αυτό θα διαγράψει οριστικά το κατάστημα.',
      confirmDelete: 'Επιβεβαίωση Διαγραφής',
      deleting: 'Διαγραφή...',
      cancel: 'Ακύρωση',
      backToShops: '← Τα Καταστήματά μου',
      notFound: 'Το κατάστημα δεν βρέθηκε.',
      errorLoad: 'Αποτυχία φόρτωσης καταστημάτων.',
      successUpdate: 'Το κατάστημα ενημερώθηκε επιτυχώς.',
    },
home: {
    headline: 'Διαχειρίσου το κατάστημά σου.',
    headlineAccent: 'Γέμισε την καρέκλα.',
    sub: 'Η ολοκληρωμένη πλατφόρμα για κρατήσεις, διαχείριση καταστήματος και ανάπτυξη — χωρίς τον χαμό.',
    cta: 'Ξεκίνα Δωρεάν',
    demo: 'Δείτε το Demo',
    signIn: 'Σύνδεση',
    heroBadge: 'Η πλατφόρμα κρατήσεων για κουρεία & σαλόνια ομορφιάς',
    featuresBadge: 'Χαρακτηριστικά',
    featuresTitle: 'Όλα όσα χρειάζεστε για το κατάστημά σας',
    featuresSub: 'Σχεδιασμένο για σύγχρονα κουρεία και σαλόνια ομορφιάς που θέλουν να αναπτυχθούν.',
    howBadge: 'Πώς Λειτουργεί',
    howTitle: 'Έτοιμο σε λίγα λεπτά',
    howSub: 'Τρία απλά βήματα για μια πλήρως αυτοματοποιημένη εμπειρία κρατήσεων.',
    pricingBadge: 'Τιμολόγηση',
    pricingTitle: 'Απλή, ξεκάθαρη τιμολόγηση',
    pricingSub: 'Ξεκινήστε δωρεάν, αναβαθμίστε όταν είστε έτοιμοι. Χωρίς κρυφές χρεώσεις.',
    testimonialsBadge: 'Μαρτυρίες',
    testimonialsTitle: 'Το αγαπούν οι ιδιοκτήτες',
    testimonialsSub: 'Πραγματικά αποτελέσματα από επαγγελματίες που χρησιμοποιούν το Bookly καθημερινά.'
  },
    login: {
      title: 'Σύνδεση',
      emailLabel: 'Email',
      passwordLabel: 'Κωδικός',
      submit: 'Σύνδεση',
      submitting: 'Σύνδεση...',
      forgotPassword: 'Ξεχάσατε τον κωδικό;',
      noAccount: 'Δεν έχετε λογαριασμό;',
      registerLink: 'Εγγραφή',
      googleCta: 'Συνέχεια με Google',
      divider: 'ή',
      oauthError: 'Η σύνδεση μέσω Google απέτυχε. Παρακαλώ δοκιμάστε ξανά.',
    },
    register: {
      title: 'Εγγραφή',
      emailLabel: 'Email',
      passwordLabel: 'Κωδικός',
      submit: 'Εγγραφή',
      submitting: 'Εγγραφή...',
      alreadyAccount: 'Έχετε ήδη λογαριασμό;',
      loginLink: 'Σύνδεση',
      googleCta: 'Συνέχεια με Google',
      divider: 'ή',
      verificationSent: 'Email επαλήθευσης εστάλη. Ελέγξτε τα εισερχόμενά σας.',
      checkSpam: 'Ελέγξτε και τα ανεπιθύμητα αν δεν το βλέπετε.',
      resend: 'Αποστολή ξανά',
      resending: 'Αποστολή...',
      resentOk: 'Email εστάλη ξανά επιτυχώς.',
      resentError: 'Αποτυχία αποστολής. Παρακαλώ δοκιμάστε ξανά.',
      pwMin: 'Τουλάχιστον 8 χαρακτήρες',
      pwUpper: 'Ένα κεφαλαίο γράμμα',
      pwNumber: 'Ένας αριθμός',
      pwSpecial: 'Ένας ειδικός χαρακτήρας (!@#$%...)',
      nameLabel: 'Όνομα',
      inviteNotice: 'Δημιουργήστε τον λογαριασμό σας για να αποδεχτείτε την πρόσκληση.',
    },
    forgotPassword: {
      title: 'Ξεχάσατε τον Κωδικό',
      emailLabel: 'Email',
      submit: 'Αποστολή Συνδέσμου Επαναφοράς',
      submitting: 'Αποστολή...',
      success: 'Εάν αυτό το email υπάρχει θα λάβετε έναν σύνδεσμο επαναφοράς σύντομα.',
      backToLogin: 'Πίσω στη Σύνδεση',
    },
    resetPassword: {
      title: 'Επαναφορά Κωδικού',
      newPasswordLabel: 'Νέος Κωδικός',
      confirmLabel: 'Επιβεβαίωση Κωδικού',
      submit: 'Επαναφορά Κωδικού',
      submitting: 'Επαναφορά...',
      mismatch: 'Οι κωδικοί δεν ταιριάζουν.',
      invalidLink: 'Μη έγκυρος σύνδεσμος επαναφοράς.',
      backToLogin: 'Πίσω στη Σύνδεση',
      pwMin: 'Τουλάχιστον 8 χαρακτήρες',
      pwUpper: 'Ένα κεφαλαίο γράμμα',
      pwNumber: 'Ένας αριθμός',
      pwSpecial: 'Ένας ειδικός χαρακτήρας (!@#$%...)',
    },
    verifyEmail: {
      title: 'Επαλήθευση Email',
      verifying: 'Επαλήθευση...',
      goToLogin: 'Μετάβαση στη Σύνδεση',
      resendLabel: 'Εισάγετε το email σας για να λάβετε νέο σύνδεσμο:',
      resendPlaceholder: 'εσεις@παραδειγμα.com',
      resendSubmit: 'Αποστολή Email Επαλήθευσης',
      resending: 'Αποστολή...',
      resentOk: 'Email εστάλη! Ελέγξτε εισερχόμενα και ανεπιθύμητα.',
      backToRegister: 'Πίσω στην Εγγραφή',
    },
    verifyEmailChange: {
      title: 'Επαλήθευση Αλλαγής Email',
      verifying: 'Επαλήθευση...',
      goToDashboard: 'Μετάβαση στο Ταμπλό',
      backToSettings: 'Πίσω στις Ρυθμίσεις',
    },
    oauthCallback: {
      signingIn: 'Σύνδεση...',
    },
    dashboard: {
      title: 'Επισκόπηση',
      emailLabel: 'Email',
      userIdLabel: 'ID Χρήστη',
      emailVerifiedLabel: 'Επαλήθευση Email',
      verified: 'Επαληθευμένο',
      notVerified: 'Μη επαληθευμένο',
      memberSinceLabel: 'Μέλος από',
      planLabel: 'Πλάνο',
      renewsOnLabel: 'Ανανέωση στις',
      subscriptionLabel: 'Συνδρομή',
      cancelNoticePre: '⚠️ Η συνδρομή σας ακυρώθηκε και δεν θα ανανεωθεί. Πρόσβαση μέχρι',
      manageLink: 'Διαχείριση →',
      upgrade: 'Αναβάθμιση →',
      free: 'Δωρεάν',
      pro: 'Pro',
    },
    billing: {
      title: 'Χρεώσεις',
      currentPlan: 'Τρέχον Πλάνο',
      accessUntil: 'Πρόσβαση μέχρι',
      cancelsOn: 'Ακύρωση στις',
      renewsOn: 'Ανανέωση στις',
      manageSubscription: 'Διαχείριση Συνδρομής',
      redirecting: 'Ανακατεύθυνση...',
      upgradeToPro: 'Αναβάθμιση σε Pro',
      successMsg: '🎉 Είστε τώρα στο Pro!',
      free: 'Δωρεάν',
      pro: 'Pro',
    },
    settings: {
      title: 'Ρυθμίσεις',
      emailSection: 'Διεύθυνση Email',
      emailLabel: 'Email',
      saveEmail: 'Αποθήκευση Email',
      saving: 'Αποθήκευση...',
      passwordSection: 'Αλλαγή Κωδικού',
      newPasswordLabel: 'Νέος Κωδικός',
      updatePassword: 'Ενημέρωση Κωδικού',
      dangerZone: 'Επικίνδυνη Ζώνη',
      dangerDesc: 'Οριστική διαγραφή λογαριασμού και όλων των δεδομένων. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      confirmPasswordLabel: 'Επιβεβαίωση κωδικού',
      confirmPasswordPlaceholder: 'Εισάγετε τον κωδικό σας για επιβεβαίωση',
      confirmDelete: 'Επιβεβαίωση Διαγραφής',
      deleting: 'Διαγραφή...',
      cancel: 'Ακύρωση',
      areYouSure: 'Είστε σίγουροι; Αυτό θα διαγράψει οριστικά τον λογαριασμό σας και όλα τα δεδομένα. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      yesDelete: 'Ναι, Διαγραφή Λογαριασμού',
      pwMin: 'Τουλάχιστον 8 χαρακτήρες',
      pwUpper: 'Ένα κεφαλαίο γράμμα',
      pwNumber: 'Ένας αριθμός',
      pwSpecial: 'Ένας ειδικός χαρακτήρας (!@#$%...)',
      nameSection: 'Όνομα Χρήστη',
      nameLabel: 'Όνομα Χρήστη',
      saveName: 'Αποθήκευση Ονόματος',
      preferencesSection: 'Προτιμήσεις',
      themeLabel: 'Θέμα',
      themeDesc: 'Επιλέξτε το προτιμώμενο χρωματικό θέμα',
      lightTheme: 'Φωτεινό',
      darkTheme: 'Σκοτεινό',
      languageLabel: 'Γλώσσα',
      languageDesc: 'Ορίστε τη γλώσσα εμφάνισης',
      activeSessionsSection: 'Ενεργές Συνεδρίες',
      loadingSessions: 'Φόρτωση συνεδριών...',
      noSessions: 'Δεν βρέθηκαν ενεργές συνεδρίες.',
      sessions: 'συνεδρίες',
      mostRecent: 'πιο πρόσφατη:',
      sessionStarted: 'Συνεδρία ξεκίνησε',
      sessionExpires: 'Λήγει',
      revoking: 'Ανάκληση...',
      revokeAll: 'Ανάκληση Όλων των Συνεδριών',
      memberSince: 'Μέλος από',
      verified: '✓ Επαληθευμένο',
      notVerified: '✗ Μη επαληθευμένο',
      pro: '★ Pro',
      free: 'Δωρεάν',
      successName: 'Το όνομα ενημερώθηκε επιτυχώς.',
      errorName: 'Αποτυχία ενημέρωσης ονόματος.',
      successEmail: 'Το email ενημερώθηκε επιτυχώς.',
      errorEmail: 'Αποτυχία ενημέρωσης email.',
      successPassword: 'Ο κωδικός ενημερώθηκε επιτυχώς.',
      errorPassword: 'Αποτυχία ενημέρωσης κωδικού.',
      successRevoke: 'Όλες οι άλλες συνεδρίες ανακλήθηκαν.',
      errorRevoke: 'Αποτυχία ανάκλησης συνεδριών.',
    },
    pricing: {
      title: 'Απλή, Ειλικρινής Τιμολόγηση',
      starterName: 'Starter',
      starterPrice: '€0 / μήνα',
      starterF1: '1 μέλος προσωπικού',
      starterF2: 'Σελίδα online κρατήσεων',
      starterF3: 'Έως 30 ραντεβού ανά μήνα',
      starterF4: 'Email επιβεβαιώσεις κρατήσεων',
      starterF5: 'Βασική διαχείριση υπηρεσιών',
      currentPlan: 'Τρέχον Πλάνο',
      proName: 'Pro',
      proPrice: '€19 / μήνα',
      proF1: 'Τα πάντα του Starter',
      proF2: 'Απεριόριστα ραντεβού',
      proF3: 'Έως 10 μέλη προσωπικού',
      proF4: 'Υπενθυμίσεις SMS & email',
      proF5: 'Προφίλ & ιστορικό πελατών',
      proF6: 'Υποστήριξη πολλαπλών τοποθεσιών',
      upgradeToPro: 'Αναβάθμιση σε Pro',
      redirecting: 'Ανακατεύθυνση...',
    },
    about: {
      title: 'Φτιαγμένο για την Καρέκλα, Όχι το Γραφείο',
      tagline: 'Φτιάξαμε την πλατφόρμα κρατήσεων που κουρεία και σαλόνια χρειάζονται πραγματικά. Τέλος στις χαμένες κλήσεις, τα διπλά ραντεβού και τα χαρτιά. Μόνο ένα καθαρό σύστημα που λειτουργεί.',
      offerTitle: 'Τι Προσφέρουμε',
      f1: 'Online κρατήσεις — οι πελάτες κλείνουν ραντεβού 24/7',
      f2: 'Πρόγραμμα προσωπικού — διαχείριση κουρέων ή stylist κάτω από έναν λογαριασμό',
      f3: 'Διαχείριση υπηρεσιών — ορίστε υπηρεσίες, διάρκεια και τιμές ανά μέλος',
      f4: 'Αυτόματες υπενθυμίσεις — μειώστε τα no-shows με SMS και email',
      f5: 'Ουρά walk-in — χειριστείτε drop-ins μαζί με προγραμματισμένα ραντεβού',
      f6: 'Προφίλ πελατών — κρατήστε σημειώσεις, προτιμήσεις και ιστορικό',
      f7: 'Dashboard επιχείρησης — δείτε ημερήσια, εβδομαδιαία και μηνιαία κρατήσεις',
      f8: 'Διαχείριση ακυρώσεων — οι πελάτες αλλάζουν ραντεβού χωρίς να καλούν',
      f9: 'Υποστήριξη πολλαπλών τοποθεσιών — διαχειριστείτε περισσότερα από ένα καταστήματα',
      howTitle: 'Πώς Λειτουργεί',
      step1Label: 'Ρύθμιση',
      step1Desc: 'Προσθέστε υπηρεσίες, προσωπικό και διαθεσιμότητα σε λίγα λεπτά',
      step2Label: 'Κοινοποίηση',
      step2Desc: 'Στείλτε στους πελάτες τον σύνδεσμο κρατήσεων ή ενσωματώστε τον στη σελίδα σας',
      step3Label: 'Διαχείριση',
      step3Desc: 'Επιβεβαιώστε, αλλάξτε ή ακυρώστε από το dashboard σας',
      step4Label: 'Ανάπτυξη',
      step4Desc: 'Παρακολουθήστε τάσεις, διατηρήστε πελάτες και γεμίστε το ημερολόγιό σας',
      storyTitle: 'Η Ιστορία μας',
      bio1: 'Παρακολούθησα ένα μέλος της οικογένειάς μου να διαχειρίζεται το κουρείο του με ένα τετράδιο και ένα τηλέφωνο κολλημένο στο χέρι όλη μέρα. Χαμένες κλήσεις σήμαιναν χαμένα χρήματα. Ξεχαστά ραντεβού σήμαιναν χαμένο χρόνο. Έπρεπε να υπάρχει ένας πιο απλός τρόπος — οπότε τον έφτιαξα.',
      bio2: 'Αυτή η πλατφόρμα είναι για κάθε κουρέα και ιδιοκτήτη σαλονιού που προτιμά να ξοδεύει ενέργεια πίσω από την καρέκλα παρά πίσω από μια οθόνη.',
      getStarted: 'Ξεκίνα Δωρεάν',
      viewPlans: 'Δες τα Πλάνα',
    },
    notFound: {
      code: '404',
      title: 'Η σελίδα δεν βρέθηκε',
      message: 'Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.',
      goHome: 'Αρχική',
    },
    team: {
      title: 'Μέλη Ομάδας',
      email: 'Email',
      role: 'Ρόλος',
      joined: 'Εντάχθηκε',
      actions: 'Ενέργειες',
      roles: { owner: 'Ιδιοκτήτης', staff: 'Προσωπικό' },
      remove: 'Αφαίρεση',
      removing: 'Αφαίρεση...',
      confirmRemove: 'Επιβεβαίωση Αφαίρεσης',
      cancel: 'Ακύρωση',
      noMembers: 'Δεν υπάρχουν μέλη ακόμα.',
      notFound: 'Το μέλος δεν βρέθηκε.',
      errorLoad: 'Αποτυχία φόρτωσης μελών.',
      errorRemove: 'Αποτυχία αφαίρεσης μέλους.',
      backToTeam: '← Πίσω στην Ομάδα',
      editRole: 'Επεξεργασία Ρόλου',
      saveRole: 'Αποθήκευση Ρόλου',
      saving: 'Αποθήκευση...',
      roleUpdated: 'Ο ρόλος ενημερώθηκε επιτυχώς.',
      errorUpdateRole: 'Αποτυχία ενημέρωσης ρόλου.',
      availability: 'Πρόγραμμα Διαθεσιμότητας',
      dangerZone: 'Επικίνδυνη Ζώνη',
      removeMemberDesc: 'Αφαίρεση αυτού του μέλους από το κατάστημα. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      confirmRemovePrompt: 'Είστε σίγουροι ότι θέλετε να αφαιρέσετε αυτό το μέλος;',
      assignedServices: 'Ανατεθειμένες Υπηρεσίες',
      noAssignedServices: 'Δεν έχουν ανατεθεί υπηρεσίες.',
      assignService: 'Προσθήκη',
      selectService: 'Επιλογή υπηρεσίας...',
      assigningService: 'Προσθήκη...',
      removeService: 'Αφαίρεση',
      errorLoadServices: 'Αποτυχία φόρτωσης υπηρεσιών.',
      errorAssignService: 'Αποτυχία ανάθεσης υπηρεσίας.',
      errorUnassignService: 'Αποτυχία αφαίρεσης υπηρεσίας.',
    },
    invites: {
      title: 'Προσκλήσεις',
      received: 'Ληφθείσες',
      sent: 'Απεσταλμένες',
      noReceived: 'Δεν έχετε εκκρεμείς προσκλήσεις.',
      noSent: 'Δεν έχετε στείλει προσκλήσεις ακόμα.',
      sendInvite: 'Αποστολή Πρόσκλησης',
      sending: 'Αποστολή...',
      emailLabel: 'Email',
      roleLabel: 'Ρόλος',
      accept: 'Αποδοχή',
      accepting: 'Αποδοχή...',
      decline: 'Απόρριψη',
      declining: 'Απόρριψη...',
      revoke: 'Ανάκληση',
      revoking: 'Ανάκληση...',
      status: { pending: 'Εκκρεμής', accepted: 'Αποδεκτή', expired: 'Ληγμένη' },
      roles: { owner: 'Ιδιοκτήτης', staff: 'Προσωπικό' },
      shopLabel: 'Κατάστημα',
      invitedBy: 'Από',
      expiresAt: 'Λήγει',
      sentAt: 'Εστάλη',
      errorLoad: 'Αποτυχία φόρτωσης προσκλήσεων.',
      errorSend: 'Αποτυχία αποστολής πρόσκλησης.',
      errorAccept: 'Αποτυχία αποδοχής πρόσκλησης.',
      errorDecline: 'Αποτυχία απόρριψης πρόσκλησης.',
      errorRevoke: 'Αποτυχία ανάκλησης πρόσκλησης.',
      sentOk: 'Η πρόσκληση εστάλη επιτυχώς.',
      acceptedOk: 'Η πρόσκληση έγινε αποδεκτή.',
      declinedOk: 'Η πρόσκληση απορρίφθηκε.',
      revokedOk: 'Η πρόσκληση ανακλήθηκε.',
      youreInvited: 'Έχετε λάβει πρόσκληση',
      joinAs: 'Εντάσσεστε ως',
      registerToAccept: 'Εγγραφή για Αποδοχή',
      loginToAccept: 'Σύνδεση για Αποδοχή',
      acceptNow: 'Αποδοχή Πρόσκλησης',
      accepting2: 'Αποδοχή...',
      inviteExpired: 'Αυτή η πρόσκληση έχει λήξει.',
      inviteUsed: 'Αυτή η πρόσκληση έχει ήδη χρησιμοποιηθεί.',
      inviteNotFound: 'Η πρόσκληση δεν βρέθηκε.',
      emailMismatch: 'Αυτή η πρόσκληση απευθύνεται σε άλλο email.',
      inviteFor: 'Πρόσκληση για',
    },
    services: {
      title: 'Υπηρεσίες',
      addService: '+ Νέα Υπηρεσία',
      create: 'Δημιουργία',
      name: 'Όνομα',
      description: 'Περιγραφή',
      duration: 'Διάρκεια',
      price: 'Τιμή',
      isActive: 'Ενεργή',
      save: 'Αποθήκευση',
      saving: 'Αποθήκευση...',
      cancel: 'Ακύρωση',
      edit: 'Επεξεργασία',
      delete: 'Διαγραφή',
      deleting: 'Διαγραφή...',
      confirmDelete: 'Επιβεβαίωση Διαγραφής',
      active: 'Ενεργή',
      inactive: 'Ανενεργή',
      noServices: 'Δεν υπάρχουν υπηρεσίες ακόμα.',
      errorLoad: 'Αποτυχία φόρτωσης υπηρεσιών.',
      errorCreate: 'Αποτυχία δημιουργίας υπηρεσίας.',
      errorUpdate: 'Αποτυχία ενημέρωσης υπηρεσίας.',
      errorDelete: 'Αποτυχία διαγραφής υπηρεσίας.',
      staff: 'Προσωπικό',
      assignedStaff: 'Ανατεθειμένο Προσωπικό',
      noStaff: 'Δεν έχει ανατεθεί προσωπικό.',
      addStaff: 'Προσθήκη',
      selectStaff: 'Επιλογή μέλους...',
      assigning: 'Προσθήκη...',
      removeStaff: 'Αφαίρεση',
      errorAssign: 'Αποτυχία ανάθεσης προσωπικού.',
      errorUnassign: 'Αποτυχία αφαίρεσης προσωπικού.',
    },
    workingHours: {
      title: 'Ώρες Λειτουργίας',
      save: 'Αποθήκευση Αλλαγών',
      saving: 'Αποθήκευση...',
      successSave: 'Οι ώρες λειτουργίας αποθηκεύτηκαν.',
      errorLoad: 'Αποτυχία φόρτωσης ωρών λειτουργίας.',
      errorSave: 'Αποτυχία αποθήκευσης αλλαγών.',
      open: 'Ανοιχτό',
      closed: 'Κλειστό',
      addSlot: '+ Προσθήκη',
      newSchedule: 'Νέο Πρόγραμμα',
      createSchedule: 'Δημιουργία',
      creating: 'Δημιουργία...',
      deleteSchedule: 'Διαγραφή Προγράμματος',
      deleting: 'Διαγραφή...',
      confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το πρόγραμμα;',
      cancel: 'Ακύρωση',
      startDate: 'Ημερομηνία έναρξης',
      endDate: 'Ημερομηνία λήξης (προαιρετική)',
      ongoing: 'Χωρίς λήξη',
      from: 'Από',
      to: 'έως',
      saveDays: 'Αποθήκευση Ημερών',
      noSchedules: 'Δεν υπάρχουν προγράμματα ακόμα.',
      errorDelete: 'Αποτυχία διαγραφής προγράμματος.',
      errorCreate: 'Αποτυχία δημιουργίας προγράμματος.',
      slotEndBeforeStart: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.',
      slotDuplicate: 'Διπλό χρονικό πλαίσιο.',
      slotOverlap: 'Τα χρονικά πλαίσια δεν μπορούν να αλληλεπικαλύπτονται.',
      removeSlot: 'Αφαίρεση χρονικού πλαισίου',
      days: {
        MON: 'Δευτέρα',
        TUE: 'Τρίτη',
        WED: 'Τετάρτη',
        THU: 'Πέμπτη',
        FRI: 'Παρασκευή',
        SAT: 'Σάββατο',
        SUN: 'Κυριακή',
      },
    },
    toggles: {
      switchToLight: 'Εναλλαγή σε φωτεινή λειτουργία',
      switchToDark: 'Εναλλαγή σε σκοτεινή λειτουργία',
      lightMode: 'Φωτεινή λειτουργία',
      darkMode: 'Σκοτεινή λειτουργία',
    },
    shopSettings: {
      relativeToday: 'σήμερα',
      relativeYesterday: 'χθες',
      relativeDaysAgo: 'μέρες πριν',
      relativeWeekAgo: 'εβδομάδα πριν',
      relativeWeeksAgo: 'εβδομάδες πριν',
      relativeMonthAgo: 'μήνας πριν',
      relativeMonthsAgo: 'μήνες πριν',
      generalInfo: 'Γενικές Πληροφορίες',
      contactLocation: 'Επικοινωνία & Τοποθεσία',
      configuration: 'Διαμόρφωση',
      activeLabel: 'Ενεργό',
      activeDesc: 'Όταν ανενεργό, το κατάστημα δεν δέχεται νέα ραντεβού.',
      saveChanges: 'Αποθήκευση Αλλαγών',
      saving: 'Αποθήκευση...',
      backToShop: '← Πίσω στο Κατάστημα',
      created: 'Δημιουργήθηκε',
      updatedPrefix: '· Ενημερώθηκε',
      locationConfirmed: '✓ Τοποθεσία επιβεβαιώθηκε',
      descPlaceholder: 'Περιγράψτε το κατάστημά σας...',
      addressPlaceholder: 'Κεντρική 1, Αθήνα, Ελλάδα',
      notFound: 'Το κατάστημα δεν βρέθηκε.',
      errorLoad: 'Αποτυχία φόρτωσης καταστήματος.',
      successUpdate: 'Το κατάστημα ενημερώθηκε επιτυχώς.',
      errorUpdate: 'Αποτυχία ενημέρωσης καταστήματος.',
      errorDelete: 'Αποτυχία διαγραφής καταστήματος.',
      yesDeleteShop: 'Ναι, Διαγραφή Καταστήματος',
      areYouSure: 'Είστε σίγουροι; Αυτό θα διαγράψει οριστικά το {name} και όλα τα δεδομένα του.',
    },
    public: {
      bookAppointment: 'Κλείστε Ραντεβού',
      service: 'Υπηρεσία',
      staff: 'Προσωπικό',
      dateTime: 'Ημερομηνία & Ώρα',
      yourDetails: 'Τα Στοιχεία σας',
      noServices: 'Δεν υπάρχουν διαθέσιμες υπηρεσίες.',
      noStaff: 'Δεν υπάρχει διαθέσιμο προσωπικό για αυτήν την υπηρεσία.',
      noPreference: 'Χωρίς προτίμηση',
      anyStaff: 'Οποιοδήποτε διαθέσιμο μέλος',
      back: '← Πίσω',
      continue: 'Συνέχεια →',
      date: 'Ημερομηνία',
      nameLabel: 'Όνομα',
      namePlaceholder: 'Το όνομά σας',
      phoneLabel: 'Τηλέφωνο',
      phonePlaceholder: '+30 697 000 0000',
      emailLabel: 'Email',
      emailOptional: '(προαιρετικό)',
      emailHint: 'Προσθέστε email για να λάβετε λεπτομέρειες κράτησης και σύνδεσμο ακύρωσης',
      emailPlaceholder: 'εσεις@παραδειγμα.com',
      notesLabel: 'Σημειώσεις',
      notesOptional: '(προαιρετικό)',
      notesPlaceholder: 'Ειδικές απαιτήσεις...',
      booking: 'Κράτηση...',
      confirmBooking: 'Επιβεβαίωση Κράτησης',
      bookingConfirmed: 'Κράτηση Επιβεβαιώθηκε!',
      bookingConfirmedMsg: 'Ευχαριστούμε, {name}. Το ραντεβού σας για {service} στις {date} στις {time} έχει κρατηθεί. Τα λέμε!',
      shopNotFound: 'Το κατάστημα δεν βρέθηκε',
      somethingWrong: 'Κάτι πήγε στραβά',
      failedSlots: 'Αποτυχία φόρτωσης διαθέσιμων ωρών',
      serviceContext: 'Υπηρεσία:',
      staffContext: 'Προσωπικό:',
      atLabel: 'στις',
    },
    overview: {
      loading: 'Φόρτωση...',
      noShop: 'Δεν φορτώθηκε κατάστημα',
      identity: 'Ταυτότητα',
      idLabel: 'ID',
      slugLabel: 'Slug',
      contact: 'Επικοινωνία',
      phoneLabel: 'Τηλέφωνο',
      addressLabel: 'Διεύθυνση',
      settingsSection: 'Ρυθμίσεις',
      timezoneLabel: 'Ζώνη ώρας',
      timestamps: 'Χρονοσφραγίδες',
      createdLabel: 'Δημιουργήθηκε',
      updatedLabel: 'Τελευταία Ενημέρωση',
    },
    customers: {
      title: 'Πελάτες',
      searchPlaceholder: 'Αναζήτηση με όνομα ή τηλέφωνο…',
      errorLoad: 'Αποτυχία φόρτωσης πελατών',
      noResults: 'Δεν βρέθηκαν πελάτες με αυτά τα κριτήρια.',
      noCustomers: 'Δεν υπάρχουν πελάτες ακόμα.',
      nameCol: 'Όνομα',
      phoneCol: 'Τηλέφωνο',
      emailCol: 'Email',
      addedCol: 'Προστέθηκε',
      backToCustomers: '← Πίσω στους Πελάτες',
      notFound: 'Ο πελάτης δεν βρέθηκε',
      customerErrorLoad: 'Αποτυχία φόρτωσης πελάτη',
      customerSince: 'Πελάτης από',
      editInfo: 'Επεξεργασία Στοιχείων',
      nameLabel: 'Όνομα',
      phoneLabel: 'Τηλέφωνο',
      emailLabel: 'Email',
      emailOptional: 'Προαιρετικό',
      saving: 'Αποθήκευση…',
      save: 'Αποθήκευση',
      recentBookings: 'Πρόσφατα Ραντεβού',
      noBookings: 'Δεν υπάρχουν ραντεβού ακόμα.',
      serviceCol: 'Υπηρεσία',
      dateTimeCol: 'Ημερομηνία & Ώρα',
      statusCol: 'Κατάσταση',
      successUpdate: 'Ο πελάτης ενημερώθηκε.',
      errorUpdate: 'Αποτυχία αποθήκευσης αλλαγών.',
    },
    bookings: {
      title: 'Ραντεβού',
      errorLoad: 'Αποτυχία φόρτωσης ραντεβού.',
      close: 'Κλείσιμο',
      delete: 'Διαγραφή',
      deleting: 'Διαγραφή…',
      confirmDelete: 'Διαγραφή;',
      cancel: 'Ακύρωση',
      newBookingTitle: 'Νέο Ραντεβού',
      phoneSearchHint: 'Πληκτρολογήστε για αναζήτηση πελάτη…',
      newCustomerHint: 'Νέος πελάτης',
      createBooking: 'Δημιουργία Ραντεβού',
      creating: 'Δημιουργία…',
      createSuccess: 'Το ραντεβού δημιουργήθηκε!',
      createError: 'Αποτυχία δημιουργίας ραντεβού.',
    },
    cancelBooking: {
      invalidLink: 'Μη έγκυρος σύνδεσμος ακύρωσης.',
      cancelling: 'Ακύρωση ραντεβού...',
      alreadyCancelled: 'Αυτό το ραντεβού έχει ήδη ακυρωθεί.',
      notFound: 'Το ραντεβού δεν βρέθηκε. Ο σύνδεσμος μπορεί να είναι άκυρος ή ληγμένος.',
      errorCancel: 'Αδυναμία ακύρωσης ραντεβού. Δοκιμάστε ξανά ή επικοινωνήστε με το κατάστημα.',
      cancelled: 'Ραντεβού Ακυρώθηκε',
      yourText: 'Το',
      appointmentAt: 'ραντεβού σας στο',
      hasCancelled: 'ακυρώθηκε.',
    },
  },

  en: {
    nav: {
      pricing: 'Pricing',
      about: 'About',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
    },
    sidebar: {
      app: 'App',
      account: 'Account',
      overview: 'Overview',
      shops: 'Shops',
      billing: 'Billing',
      settings: 'Settings',
      logout: 'Logout',
      expand: 'Expand sidebar',
      collapse: 'Collapse sidebar',
      backToShops: '← My Shops',
      shopSection: 'Shop',
      manageSection: 'Manage',
      bookings: 'Bookings',
      services: 'Services',
      team: 'Team Members',
      invites: 'Invites',
      customers: 'Customers',
      shopSettings: 'Shop Settings',
      shopWorkingHours: "Working Hours",
      bookAppointment: 'Book an Appointment',
    },
    shops: {
      title: 'My Shops',
      newShop: 'New Shop',
      noShops: 'You have no shops yet.',
      upgradePrompt: 'Upgrade to Pro to create shops.',
      name: 'Name',
      slug: 'Slug',
      slugHint: 'Lowercase letters, numbers, and hyphens only (e.g. my-shop)',
      description: 'Description',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      country: 'Country',
      timezone: 'Timezone',
      save: 'Save',
      saving: 'Saving...',
      role: 'Role',
      createdAt: 'Created',
      active: 'Active',
      inactive: 'Inactive',
      deleteShop: 'Delete Shop',
      dangerZone: 'Danger Zone',
      dangerDesc: 'Permanently delete this shop and all its data. This action cannot be undone.',
      areYouSure: 'Are you sure? This will permanently delete the shop.',
      confirmDelete: 'Confirm Delete',
      deleting: 'Deleting...',
      cancel: 'Cancel',
      backToShops: '← My Shops',
      notFound: 'Shop not found.',
      errorLoad: 'Failed to load shops.',
      successUpdate: 'Shop updated successfully.',
    },
    home: {
    headline: 'Run your shop.',
    headlineAccent: 'Fill your chair.',
    sub: 'The all-in-one platform to manage bookings, run your shop, and grow your business — without the chaos.',
    cta: 'Get Started Free',
    demo: 'See Demo',
    signIn: 'Sign In',
    heroBadge: 'Booking platform for barbershops & salons',
    featuresBadge: 'Features',
    featuresTitle: 'Everything you need to run your shop',
    featuresSub: 'Built for modern barbershops and salons that want to grow without the overhead.',
    howBadge: 'How It Works',
    howTitle: 'Up and running in minutes',
    howSub: 'Three simple steps to a fully automated booking experience.',
    pricingBadge: 'Pricing',
    pricingTitle: 'Simple, transparent pricing',
    pricingSub: "Start free, upgrade when you're ready. No hidden fees, ever.",
    testimonialsBadge: 'Testimonials',
    testimonialsTitle: 'Loved by shop owners',
    testimonialsSub: 'Real results from real barbershops and salons using Bookly every day.'
  },
    login: {
      title: 'Login',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      submit: 'Login',
      submitting: 'Logging in...',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      registerLink: 'Register',
      googleCta: 'Continue with Google',
      divider: 'or',
      oauthError: 'Google sign-in failed. Please try again.',
    },
    register: {
      title: 'Register',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      submit: 'Register',
      submitting: 'Registering...',
      alreadyAccount: 'Already have an account?',
      loginLink: 'Login',
      googleCta: 'Continue with Google',
      divider: 'or',
      verificationSent: 'Verification email sent. Please check your inbox.',
      checkSpam: "Check your spam folder if you don't see it.",
      resend: 'Resend Email',
      resending: 'Sending...',
      resentOk: 'Email resent successfully.',
      resentError: 'Failed to resend. Please try again.',
      pwMin: 'At least 8 characters',
      pwUpper: 'One uppercase letter',
      pwNumber: 'One number',
      pwSpecial: 'One special character (!@#$%...)',
      nameLabel: 'Name',
      inviteNotice: 'Create your account to accept the invitation.',
    },
    forgotPassword: {
      title: 'Forgot Password',
      emailLabel: 'Email',
      submit: 'Send Reset Link',
      submitting: 'Sending...',
      success: 'If this email exists you will receive a reset link shortly.',
      backToLogin: 'Back to Login',
    },
    resetPassword: {
      title: 'Reset Password',
      newPasswordLabel: 'New Password',
      confirmLabel: 'Confirm Password',
      submit: 'Reset Password',
      submitting: 'Resetting...',
      mismatch: 'Passwords do not match.',
      invalidLink: 'Invalid reset link.',
      backToLogin: 'Back to Login',
      pwMin: 'At least 8 characters',
      pwUpper: 'One uppercase letter',
      pwNumber: 'One number',
      pwSpecial: 'One special character (!@#$%...)',
    },
    verifyEmail: {
      title: 'Email Verification',
      verifying: 'Verifying...',
      goToLogin: 'Go to Login',
      resendLabel: 'Enter your email to get a new link:',
      resendPlaceholder: 'you@example.com',
      resendSubmit: 'Resend Verification Email',
      resending: 'Sending...',
      resentOk: 'Email sent! Check your inbox and spam folder.',
      backToRegister: 'Back to Register',
    },
    verifyEmailChange: {
      title: 'Email Change Verification',
      verifying: 'Verifying...',
      goToDashboard: 'Go to Dashboard',
      backToSettings: 'Back to Settings',
    },
    oauthCallback: {
      signingIn: 'Signing you in...',
    },
    dashboard: {
      title: 'Overview',
      emailLabel: 'Email',
      userIdLabel: 'User ID',
      emailVerifiedLabel: 'Email Verified',
      verified: 'Verified',
      notVerified: 'Not verified',
      memberSinceLabel: 'Member Since',
      planLabel: 'Plan',
      renewsOnLabel: 'Renews On',
      subscriptionLabel: 'Subscription',
      cancelNoticePre: '⚠️ Your subscription is canceled and will not renew. Access continues until',
      manageLink: 'Manage →',
      upgrade: 'Upgrade →',
      free: 'Free',
      pro: 'Pro',
    },
    billing: {
      title: 'Billing',
      currentPlan: 'Current Plan',
      accessUntil: 'Access until',
      cancelsOn: 'Cancels on',
      renewsOn: 'Renews on',
      manageSubscription: 'Manage Subscription',
      redirecting: 'Redirecting...',
      upgradeToPro: 'Upgrade to Pro',
      successMsg: '🎉 You are now on Pro!',
      free: 'Free',
      pro: 'Pro',
    },
    settings: {
      title: 'Settings',
      emailSection: 'Email Address',
      emailLabel: 'Email',
      saveEmail: 'Save Email',
      saving: 'Saving...',
      passwordSection: 'Change Password',
      newPasswordLabel: 'New Password',
      updatePassword: 'Update Password',
      dangerZone: 'Danger Zone',
      dangerDesc: 'Permanently delete your account and all associated data. This action cannot be undone.',
      deleteAccount: 'Delete Account',
      confirmPasswordLabel: 'Confirm your password',
      confirmPasswordPlaceholder: 'Enter your password to confirm',
      confirmDelete: 'Confirm Delete',
      deleting: 'Deleting...',
      cancel: 'Cancel',
      areYouSure: 'Are you sure? This will permanently delete your account and all associated data. This action cannot be undone.',
      yesDelete: 'Yes, Delete My Account',
      pwMin: 'At least 8 characters',
      pwUpper: 'One uppercase letter',
      pwNumber: 'One number',
      pwSpecial: 'One special character (!@#$%...)',
      nameSection: 'User Name',
      nameLabel: 'User Name',
      saveName: 'Save Name',
      preferencesSection: 'Preferences',
      themeLabel: 'Theme',
      themeDesc: 'Choose your preferred color scheme',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      languageLabel: 'Language',
      languageDesc: 'Set your display language',
      activeSessionsSection: 'Active Sessions',
      loadingSessions: 'Loading sessions...',
      noSessions: 'No active sessions found.',
      sessions: 'sessions',
      mostRecent: 'most recent:',
      sessionStarted: 'Session started',
      sessionExpires: 'Expires',
      revoking: 'Revoking...',
      revokeAll: 'Revoke All Sessions',
      memberSince: 'Member since',
      verified: '✓ Verified',
      notVerified: '✗ Unverified',
      pro: '★ Pro',
      free: 'Free',
      successName: 'Name updated successfully.',
      errorName: 'Failed to update name.',
      successEmail: 'Email updated successfully.',
      errorEmail: 'Failed to update email.',
      successPassword: 'Password updated successfully.',
      errorPassword: 'Failed to update password.',
      successRevoke: 'All other sessions have been revoked.',
      errorRevoke: 'Failed to revoke sessions.',
    },
    pricing: {
      title: 'Simple, Honest Pricing',
      starterName: 'Starter',
      starterPrice: '€0 / month',
      starterF1: '1 staff member',
      starterF2: 'Online booking page',
      starterF3: 'Up to 30 appointments per month',
      starterF4: 'Email booking confirmations',
      starterF5: 'Basic service management',
      currentPlan: 'Current Plan',
      proName: 'Pro',
      proPrice: '€19 / month',
      proF1: 'Everything in Starter',
      proF2: 'Unlimited appointments',
      proF3: 'Up to 10 staff members',
      proF4: 'SMS & email reminders',
      proF5: 'Client profiles & history',
      proF6: 'Multi-location support',
      upgradeToPro: 'Upgrade to Pro',
      redirecting: 'Redirecting...',
    },
    about: {
      title: 'Built for the Chair, Not the Desk',
      tagline: 'We built the booking platform that barbers and salon owners actually need. No more missed calls, double bookings, or paper schedules. Just a clean system that works.',
      offerTitle: 'What We Offer',
      f1: 'Online booking — clients book their own appointments 24/7',
      f2: 'Staff scheduling — manage multiple barbers or stylists under one account',
      f3: 'Service management — define services, durations, and pricing per staff member',
      f4: 'Automated reminders — reduce no-shows with SMS and email notifications',
      f5: 'Walk-in queue — handle drop-ins alongside scheduled appointments',
      f6: 'Client profiles — keep notes, preferences, and visit history per client',
      f7: 'Business dashboard — see your day, week, and monthly bookings at a glance',
      f8: 'Cancellation management — let clients reschedule without calling the shop',
      f9: 'Multi-location support — run more than one shop from the same account',
      howTitle: 'How It Works',
      step1Label: 'Set Up',
      step1Desc: 'Add your services, staff, and availability in minutes',
      step2Label: 'Share',
      step2Desc: 'Send clients your booking link or embed it on your page',
      step3Label: 'Manage',
      step3Desc: 'Confirm, reschedule, or cancel from your dashboard',
      step4Label: 'Grow',
      step4Desc: 'Track trends, retain clients, and fill your calendar',
      storyTitle: 'Our Story',
      bio1: "I watched a family member run their barbershop with a notebook and a phone glued to their hand all day. Missed calls meant missed money. Forgotten appointments meant wasted time. There had to be a simpler way — so I built one.",
      bio2: "This platform is for every barber and salon owner who'd rather spend their energy behind the chair than behind a screen.",
      getStarted: 'Get Started Free',
      viewPlans: 'View Plans',
    },
    notFound: {
      code: '404',
      title: 'Page not found',
      message: "The page you're looking for doesn't exist or has been moved.",
      goHome: 'Go Home',
    },
    team: {
      title: 'Team Members',
      email: 'Email',
      role: 'Role',
      joined: 'Joined',
      actions: 'Actions',
      roles: { owner: 'Owner', staff: 'Staff' },
      remove: 'Remove',
      removing: 'Removing...',
      confirmRemove: 'Confirm Remove',
      cancel: 'Cancel',
      noMembers: 'No team members yet.',
      notFound: 'Member not found.',
      errorLoad: 'Failed to load team members.',
      errorRemove: 'Failed to remove member.',
      backToTeam: '← Back to Team',
      editRole: 'Edit Role',
      saveRole: 'Save Role',
      saving: 'Saving...',
      roleUpdated: 'Role updated successfully.',
      errorUpdateRole: 'Failed to update role.',
      availability: 'Availability Schedule',
      dangerZone: 'Danger Zone',
      removeMemberDesc: 'Remove this member from the shop. This action cannot be undone.',
      confirmRemovePrompt: 'Are you sure you want to remove this member?',
      assignedServices: 'Assigned Services',
      noAssignedServices: 'No services assigned.',
      assignService: 'Add',
      selectService: 'Select service...',
      assigningService: 'Adding...',
      removeService: 'Remove',
      errorLoadServices: 'Failed to load services.',
      errorAssignService: 'Failed to assign service.',
      errorUnassignService: 'Failed to remove service.',
    },
    invites: {
      title: 'Invites',
      received: 'Received',
      sent: 'Sent',
      noReceived: 'You have no pending invites.',
      noSent: "You haven't sent any invites yet.",
      sendInvite: 'Send Invite',
      sending: 'Sending...',
      emailLabel: 'Email',
      roleLabel: 'Role',
      accept: 'Accept',
      accepting: 'Accepting...',
      decline: 'Decline',
      declining: 'Declining...',
      revoke: 'Revoke',
      revoking: 'Revoking...',
      status: { pending: 'Pending', accepted: 'Accepted', expired: 'Expired' },
      roles: { owner: 'Owner', staff: 'Staff' },
      shopLabel: 'Shop',
      invitedBy: 'Invited by',
      expiresAt: 'Expires',
      sentAt: 'Sent',
      errorLoad: 'Failed to load invites.',
      errorSend: 'Failed to send invite.',
      errorAccept: 'Failed to accept invite.',
      errorDecline: 'Failed to decline invite.',
      errorRevoke: 'Failed to revoke invite.',
      sentOk: 'Invite sent successfully.',
      acceptedOk: 'Invite accepted.',
      declinedOk: 'Invite declined.',
      revokedOk: 'Invite revoked.',
      youreInvited: "You've been invited",
      joinAs: 'Join as',
      registerToAccept: 'Register to Accept',
      loginToAccept: 'Log In to Accept',
      acceptNow: 'Accept Invitation',
      accepting2: 'Accepting...',
      inviteExpired: 'This invite has expired.',
      inviteUsed: 'This invite has already been used.',
      inviteNotFound: 'Invite not found.',
      emailMismatch: 'This invite was sent to a different email address.',
      inviteFor: 'Invitation for',
    },
    services: {
      title: 'Services',
      addService: '+ New Service',
      create: 'Create',
      name: 'Name',
      description: 'Description',
      duration: 'Duration',
      price: 'Price',
      isActive: 'Active',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      deleting: 'Deleting...',
      confirmDelete: 'Confirm Delete',
      active: 'Active',
      inactive: 'Inactive',
      noServices: 'No services yet.',
      errorLoad: 'Failed to load services.',
      errorCreate: 'Failed to create service.',
      errorUpdate: 'Failed to update service.',
      errorDelete: 'Failed to delete service.',
      staff: 'Staff',
      assignedStaff: 'Assigned Staff',
      noStaff: 'No staff assigned.',
      addStaff: 'Add',
      selectStaff: 'Select member...',
      assigning: 'Adding...',
      removeStaff: 'Remove',
      errorAssign: 'Failed to assign staff.',
      errorUnassign: 'Failed to remove staff.',
    },
    workingHours: {
      title: 'Working Hours',
      save: 'Save Changes',
      saving: 'Saving...',
      successSave: 'Working hours saved.',
      errorLoad: 'Failed to load working hours.',
      errorSave: 'Failed to save changes.',
      open: 'Open',
      closed: 'Closed',
      addSlot: '+ Add',
      newSchedule: 'New Schedule',
      createSchedule: 'Create',
      creating: 'Creating...',
      deleteSchedule: 'Delete Schedule',
      deleting: 'Deleting...',
      confirmDelete: 'Are you sure you want to delete this schedule?',
      cancel: 'Cancel',
      startDate: 'Start date',
      endDate: 'End date (optional)',
      ongoing: 'Ongoing',
      from: 'From',
      to: 'to',
      saveDays: 'Save Days',
      noSchedules: 'No schedules yet.',
      errorDelete: 'Failed to delete schedule.',
      errorCreate: 'Failed to create schedule.',
      slotEndBeforeStart: 'End time must be after start time.',
      slotDuplicate: 'Duplicate time slot.',
      slotOverlap: 'Time slots cannot overlap.',
      removeSlot: 'Remove time slot',
      days: {
        MON: 'Monday',
        TUE: 'Tuesday',
        WED: 'Wednesday',
        THU: 'Thursday',
        FRI: 'Friday',
        SAT: 'Saturday',
        SUN: 'Sunday',
      },
    },
    toggles: {
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
    },
    shopSettings: {
      relativeToday: 'today',
      relativeYesterday: 'yesterday',
      relativeDaysAgo: 'days ago',
      relativeWeekAgo: 'week ago',
      relativeWeeksAgo: 'weeks ago',
      relativeMonthAgo: 'month ago',
      relativeMonthsAgo: 'months ago',
      generalInfo: 'General Info',
      contactLocation: 'Contact & Location',
      configuration: 'Configuration',
      activeLabel: 'Active',
      activeDesc: "When inactive, your shop won't accept new bookings.",
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      backToShop: '← Back to Shop',
      created: 'Created',
      updatedPrefix: '· Updated',
      locationConfirmed: '✓ Location confirmed',
      descPlaceholder: 'Describe your shop...',
      addressPlaceholder: '123 Main St, Athens, Greece',
      notFound: 'Shop not found.',
      errorLoad: 'Failed to load shop.',
      successUpdate: 'Shop updated successfully.',
      errorUpdate: 'Failed to update shop.',
      errorDelete: 'Failed to delete shop.',
      yesDeleteShop: 'Yes, Delete Shop',
      areYouSure: 'Are you sure? This will permanently delete {name} and all its data.',
    },
    public: {
      bookAppointment: 'Book an Appointment',
      service: 'Service',
      staff: 'Staff',
      dateTime: 'Date & Time',
      yourDetails: 'Your Details',
      noServices: 'No services available.',
      noStaff: 'No staff available for this service.',
      noPreference: 'No preference',
      anyStaff: 'Any available staff member',
      back: '← Back',
      continue: 'Continue →',
      date: 'Date',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      phoneLabel: 'Phone',
      phonePlaceholder: '+1 555 000 0000',
      emailLabel: 'Email',
      emailOptional: '(optional)',
      emailHint: 'Add your email to receive booking details and a cancellation link',
      emailPlaceholder: 'you@example.com',
      notesLabel: 'Notes',
      notesOptional: '(optional)',
      notesPlaceholder: 'Any special requests...',
      booking: 'Booking…',
      confirmBooking: 'Confirm Booking',
      bookingConfirmed: 'Booking Confirmed!',
      bookingConfirmedMsg: "Thanks, {name}. Your appointment for {service} on {date} at {time} has been booked. We'll see you then!",
      shopNotFound: 'Shop not found',
      somethingWrong: 'Something went wrong',
      failedSlots: 'Failed to load available slots',
      serviceContext: 'Service:',
      staffContext: 'Staff:',
      atLabel: 'at',
    },
    overview: {
      loading: 'Loading...',
      noShop: 'No shop loaded',
      identity: 'Identity',
      idLabel: 'ID',
      slugLabel: 'Slug',
      contact: 'Contact',
      phoneLabel: 'Phone',
      addressLabel: 'Address',
      settingsSection: 'Settings',
      timezoneLabel: 'Timezone',
      timestamps: 'Timestamps',
      createdLabel: 'Created',
      updatedLabel: 'Last Updated',
    },
    customers: {
      title: 'Customers',
      searchPlaceholder: 'Search by name or phone…',
      errorLoad: 'Failed to load customers',
      noResults: 'No customers match your search.',
      noCustomers: 'No customers yet.',
      nameCol: 'Name',
      phoneCol: 'Phone',
      emailCol: 'Email',
      addedCol: 'Added',
      backToCustomers: '← Back to Customers',
      notFound: 'Customer not found',
      customerErrorLoad: 'Failed to load customer',
      customerSince: 'Customer since',
      editInfo: 'Edit Info',
      nameLabel: 'Name',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
      emailOptional: 'Optional',
      saving: 'Saving…',
      save: 'Save',
      recentBookings: 'Recent Bookings',
      noBookings: 'No bookings yet.',
      serviceCol: 'Service',
      dateTimeCol: 'Date & Time',
      statusCol: 'Status',
      successUpdate: 'Customer updated.',
      errorUpdate: 'Failed to save changes.',
    },
    bookings: {
      title: 'Bookings',
      errorLoad: 'Failed to load bookings.',
      close: 'Close',
      delete: 'Delete',
      deleting: 'Deleting…',
      confirmDelete: 'Delete?',
      cancel: 'Cancel',
      newBookingTitle: 'New Booking',
      phoneSearchHint: 'Type to search customer…',
      newCustomerHint: 'New customer',
      createBooking: 'Create Booking',
      creating: 'Creating…',
      createSuccess: 'Booking created!',
      createError: 'Failed to create booking.',
    },
    cancelBooking: {
      invalidLink: 'Invalid cancellation link.',
      cancelling: 'Cancelling your booking...',
      alreadyCancelled: 'This booking has already been cancelled.',
      notFound: 'Booking not found. The link may be invalid or expired.',
      errorCancel: 'Could not cancel booking. Please try again or contact the shop.',
      cancelled: 'Booking Cancelled',
      yourText: 'Your',
      appointmentAt: 'appointment at',
      hasCancelled: 'has been cancelled.',
    },
  },
};
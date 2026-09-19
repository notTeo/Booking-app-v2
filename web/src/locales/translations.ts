export type Language = 'el' | 'en';

export interface Translations {
  nav: {
    login: string;
    register: string;
    logout: string;
  };
  sidebar: {
    app: string;
    account: string;
    overview: string;
    shops: string;
    settings: string;
    logout: string;
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
  dashboard: {
    title: string;
    subtitle: string;
    errorLoad: string;
    noShops: string;
    todayCount: string;
    upcomingCount: string;
    upcomingAcrossShops: string;
    noUpcoming: string;
  };
  shops: {
    title: string;
    newShop: string;
    noShops: string;
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
    cta: string;
    signIn: string;
    heroBadge: string;
     featuresBadge: string;
    featuresTitle: string;
    featuresSub: string;
    howBadge: string;
    howTitle: string;
    howSub: string;
    aboutBadge: string;
    productBadge: string;
    contactBadge: string;
    pricingBadge: string;
    pricingTitle: string;
    pricingSub: string;
    pricingPlanName: string;
    pricingPlanDesc: string;
    pricingFeature1: string;
    pricingFeature2: string;
    pricingFeature3: string;
    pricingCta: string;
    previewHint: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    faqHeading: string;
    faqSub: string;
    faqContact: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    faq4Q: string;
    faq4A: string;
    featureAlertsIncoming: string;
    featureAlertsIncomingSubject: string;
    featureAlertsConfirmed: string;
    featureAlertsConfirmedSubject: string;
    featureAlertsTimeNow: string;
    featureAlertsTimeAgo: string;
    featureAlertsTitle: string;
    featureAlertsDesc: string;
    featureChip1: string;
    featureChip2: string;
    featureChip3: string;
    featureChip4: string;
    featureServicesLabel: string;
    featureServicesTitle: string;
    featureStatCaption: string;
    featureRemindersCheck1: string;
    featureRemindersCheck2: string;
    featureRemindersLabel: string;
    featureRemindersTitle: string;
    featureChannelsLabel: string;
    featureChannelsTitle: string;
    previewGreeting: string;
    previewGreetingSub: string;
    previewUpcoming1Label: string;
    previewUpcoming1Sub: string;
    previewUpcoming2Label: string;
    previewUpcoming2Sub: string;
    previewBookingsSubtitle: string;
    previewBooking1Label: string;
    previewBooking1Sub: string;
    previewBooking2Label: string;
    previewBooking2Sub: string;
    previewNewBookingSubtitle: string;
    previewNewBookingStep1Label: string;
    previewNewBookingStep1Sub: string;
    previewNewBookingStep2Label: string;
    previewNewBookingStep2Sub: string;
    previewServicesSubtitle: string;
    previewService1Label: string;
    previewService1Sub: string;
    previewService2Label: string;
    previewService2Sub: string;
    previewTeamPageSubtitle: string;
    previewTeamMember1Label: string;
    previewTeamMember1Sub: string;
    previewTeamMember2Label: string;
    previewTeamMember2Sub: string;
    previewInvitesSubtitle: string;
    previewInvite1Label: string;
    previewInvite1Sub: string;
    previewInvite2Label: string;
    previewInvite2Sub: string;
    previewHoursSubtitle: string;
    previewHours1Label: string;
    previewHours1Sub: string;
    previewHours2Label: string;
    previewHours2Sub: string;
    previewCustomersSubtitle: string;
    previewCustomer1Label: string;
    previewCustomer1Sub: string;
    previewCustomer2Label: string;
    previewCustomer2Sub: string;
    previewSettingsSubtitle: string;
    previewSetting1Label: string;
    previewSetting1Sub: string;
    previewSetting2Label: string;
    previewSetting2Sub: string;
  };
  privacy: {
    linkLabel: string;
    title: string;
    lastUpdated: string;
    intro: string;
    collectHeading: string;
    collectBody: string;
    useHeading: string;
    useBody: string;
    cookiesHeading: string;
    cookiesBody: string;
    sharingHeading: string;
    sharingBody: string;
    rightsHeading: string;
    rightsBody: string;
    changesHeading: string;
    changesBody: string;
    contact: string;
  };
  terms: {
    linkLabel: string;
    title: string;
    lastUpdated: string;
    intro: string;
    useHeading: string;
    useBody: string;
    accountsHeading: string;
    accountsBody: string;
    acceptableHeading: string;
    acceptableBody: string;
    availabilityHeading: string;
    availabilityBody: string;
    liabilityHeading: string;
    liabilityBody: string;
    changesHeading: string;
    changesBody: string;
    contact: string;
  };
  about: {
    badge: string;
    title: string;
    intro: string;
    storyHeading: string;
    storyBody: string;
    githubLabel: string;
    contactLabel: string;
  };
  contact: {
    badge: string;
    title: string;
    intro: string;
    buttonLabel: string;
  };
  footer: {
    brandDesc: string;
    productHeading: string;
    companyHeading: string;
    legalHeading: string;
    faq: string;
    contact: string;
    copyright: string;
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
  };
  register: {
    title: string;
    emailLabel: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    alreadyAccount: string;
    loginLink: string;
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
  settings: {
    title: string;
    profileSection: string;
    saveProfile: string;
    successProfile: string;
    errorProfile: string;
    emailSection: string;
    emailLabel: string;
    saveEmail: string;
    saving: string;
    passwordSection: string;
    newPasswordLabel: string;
    newPasswordOptionalLabel: string;
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
    successName: string;
    errorName: string;
    successEmail: string;
    errorEmail: string;
    successPassword: string;
    errorPassword: string;
    successRevoke: string;
    errorRevoke: string;
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
    noLoginYet: string;
    loginAccess: string;
    inviteAlreadySent: string;
    noInviteSentYet: string;
    sendInvite: string;
    resendInvite: string;
    cancelInvite: string;
    inviteSent: string;
    errorSendInvite: string;
    errorCancelInvite: string;
    canViewCustomerDetails: string;
    canViewCustomerDetailsDesc: string;
    confirmContinue: string;
    confirmPromoteOwner: string;
    confirmDemoteOwner: string;
    emailLabel: string;
    saveEmail: string;
    addEmailFirst: string;
    errorSaveEmail: string;
    emailChangedHint: string;
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
    addMember: string;
    nameLabel: string;
    namePlaceholder: string;
    canViewCustomerDetails: string;
    canViewCustomerDetailsDesc: string;
    sendEmailNow: string;
    sendEmailNowDesc: string;
    confirmOwnerInvite: string;
    createdNoEmail: string;
    pendingLogins: string;
    noPendingLogins: string;
    notSentYet: string;
    resend: string;
    cancelInvite: string;
    confirmCancel: string;
    errorResend: string;
    errorCancel: string;
    statusLabel: string;
    optional: string;
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
    saveDates: string;
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
    shopDetails: string;
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
    closedThisDay: string;
    closedOrNoSchedule: string;
    manageWorkingHours: string;
    failedSlots: string;
    serviceContext: string;
    staffContext: string;
    atLabel: string;
  };
  overview: {
    greeting: string;
    title: string;
    loading: string;
    noShop: string;
    teamLabel: string;
    servicesLabel: string;
    customersLabel: string;
    todaysBookings: string;
    noBookingsToday: string;
    upcomingBookings: string;
    noUpcoming: string;
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
    notesLabel: string;
    notesOptional: string;
    saving: string;
    save: string;
    totalVisitsLabel: string;
    totalSpentLabel: string;
    recentBookings: string;
    noBookings: string;
    serviceCol: string;
    dateTimeCol: string;
    statusCol: string;
    successUpdate: string;
    errorUpdate: string;
    hiddenLabel: string;
    contactHiddenNotice: string;
    prevPage: string;
    nextPage: string;
    pageOf: string;
  };
  bookings: {
    title: string;
    viewDateLabel: string;
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
      login: 'Σύνδεση',
      register: 'Εγγραφή',
      logout: 'Αποσύνδεση',
    },
    sidebar: {
      app: 'Εφαρμογή',
      account: 'Λογαριασμός',
      overview: 'Επισκόπηση',
      shops: 'Καταστήματα',
      settings: 'Ρυθμίσεις',
      logout: 'Αποσύνδεση',
      backToShops: 'Τα Καταστήματά μου',
      shopSection: 'Κατάστημα',
      manageSection: 'Διαχείριση',
      bookings: 'Ραντεβού',
      services: 'Υπηρεσίες',
      team: 'Ομάδα',
      invites: 'Προσκλήσεις',
      customers: 'Πελάτες',
      shopSettings: 'Ρυθμίσεις',
      shopWorkingHours: "'Ωρες",
      bookAppointment: 'Νέο Ραντεβού',
    },
    dashboard: {
      title: 'Επισκόπηση',
      subtitle: 'Τα ραντεβού και οι καταστήματά σου, με μια ματιά.',
      errorLoad: 'Αποτυχία φόρτωσης δεδομένων.',
      noShops: 'Δεν έχεις ακόμα κανένα κατάστημα.',
      todayCount: 'Σήμερα: {count}',
      upcomingCount: 'Επόμενα: {count}',
      upcomingAcrossShops: 'Επόμενα Ραντεβού',
      noUpcoming: 'Δεν υπάρχουν προσεχή ραντεβού.',
    },
    shops: {
      title: 'Τα Καταστήματά μου',
      newShop: 'Νέο Κατάστημα',
      noShops: 'Δεν έχετε ακόμα καταστήματα.',
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
    headline: 'Το πρόγραμμά σου,',
    headlineAccent: 'οργανωμένο.',
    cta: 'Ξεκίνα Δωρεάν',
    signIn: 'Σύνδεση',
    heroBadge: 'Η πλατφόρμα κρατήσεων για κουρεία & σαλόνια ομορφιάς',
    featuresBadge: 'Χαρακτηριστικά',
    featuresTitle: 'Όλα όσα χρειάζεστε για το κατάστημά σας',
    featuresSub: 'Σχεδιασμένο για σύγχρονα κουρεία και σαλόνια ομορφιάς που θέλουν να αναπτυχθούν.',
    howBadge: 'Πώς Λειτουργεί',
    howTitle: 'Έτοιμο σε λίγα λεπτά',
    howSub: 'Τρία απλά βήματα για μια πλήρως αυτοματοποιημένη εμπειρία κρατήσεων.',
    aboutBadge: 'Σχετικά',
    productBadge: 'Προϊόν',
    contactBadge: 'Επικοινωνία',
    pricingBadge: 'Τιμές',
    pricingTitle: 'Απλή, χωρίς κρυφά κόστη',
    pricingSub: 'Είμαστε ακόμα στα πρώτα βήματα — επικοινωνήστε μαζί μας για να ξεκινήσετε.',
    pricingPlanName: 'Δωρεάν κατά τη διάρκεια του beta',
    pricingPlanDesc: 'Πλήρη πρόσβαση σε όλα τα χαρακτηριστικά όσο βρισκόμαστε σε πρώιμο στάδιο. Καμία χρέωση, καμία δέσμευση.',
    pricingFeature1: 'Απεριόριστες κρατήσεις',
    pricingFeature2: 'Δημόσια σελίδα κρατήσεων για τους πελάτες σου',
    pricingFeature3: 'Διαχείριση ομάδας, υπηρεσιών και πελατών',
    pricingCta: 'Επικοινωνήστε μαζί μας',
    previewHint: 'Έλα, κάνε κλικ τριγύρω — είναι διαδραστικό',
    step1Title: 'Δημιούργησε τον λογαριασμό σου',
    step1Desc: 'Εγγράψου σε δευτερόλεπτα — είναι δωρεάν, χωρίς πιστωτική κάρτα.',
    step2Title: 'Στήσε το κατάστημά σου',
    step2Desc: 'Πρόσθεσε τις υπηρεσίες σου, όρισε το ωράριό σου και κάλεσε την ομάδα σου — όλα σε λιγότερο από 10 λεπτά.',
    step3Title: 'Δέξου κρατήσεις',
    step3Desc: 'Μοιράσου τον σύνδεσμο κρατήσεων και ξεκίνα να δέχεσαι πραγματικά ραντεβού αμέσως.',
    faqHeading: 'Συχνές Ερωτήσεις',
    faqSub: 'Βρες απαντήσεις σε συχνές ερωτήσεις.',
    faqContact: 'Επικοινώνησε μαζί μας',
    faq1Q: 'Πώς λειτουργεί η δωρεάν δοκιμή;',
    faq1A: 'Δημιούργησε τον λογαριασμό σου και χρησιμοποίησε κάθε δυνατότητα δωρεάν για 14 ημέρες — χωρίς πιστωτική κάρτα. Μπορείς να καλέσεις την ομάδα σου και να ξεκινήσεις να δέχεσαι πραγματικά ραντεβού αμέσως.',
    faq2Q: 'Μπορούν οι πελάτες μου να κλείσουν ραντεβού χωρίς να δημιουργήσουν λογαριασμό;',
    faq2A: 'Ναι. Οι πελάτες απλώς επιλέγουν υπηρεσία, μέλος προσωπικού και ώρα από τη δημόσια σελίδα κρατήσεων του καταστήματός σου — δεν χρειάζεται εγγραφή από τη δική τους πλευρά.',
    faq3Q: 'Πώς ακυρώνω τη συνδρομή μου;',
    faq3A: 'Ακύρωσε ανά πάσα στιγμή από τις ρυθμίσεις του λογαριασμού σου. Θα διατηρήσεις πρόσβαση μέχρι το τέλος της τρέχουσας περιόδου χρέωσης και τα δεδομένα σου παραμένουν εξαγώγιμα.',
    faq4Q: 'Τι συμβαίνει μετά το όριο του δωρεάν πλάνου;',
    faq4A: 'Θα ενημερωθείς πριν φτάσεις στο όριο. Αναβάθμισε για να συνεχίσεις να δέχεσαι κρατήσεις χωρίς διακοπή, ή μείνε στο δωρεάν πλάνο και συνέχισε τον επόμενο μήνα.',
    featureAlertsIncoming: 'Η Σάρα Μ. ζήτησε ραντεβού για Κούρεμα, σήμερα στις 3:00 μμ.',
    featureAlertsIncomingSubject: 'Νέα αίτηση κράτησης',
    featureAlertsConfirmed: 'Το ραντεβού της Σάρα Μ. επιβεβαιώθηκε για τις 3:00 μμ 👋',
    featureAlertsConfirmedSubject: 'Το ραντεβού επιβεβαιώθηκε',
    featureAlertsTimeNow: 'μόλις τώρα',
    featureAlertsTimeAgo: 'πριν 1 λεπτό',
    featureAlertsTitle: 'Ειδοποιήσεις κρατήσεων σε πραγματικό χρόνο',
    featureAlertsDesc: 'Ενημερώσου τη στιγμή που ένας πελάτης κλείνει, αλλάζει ή ακυρώνει ραντεβού — χωρίς να χρειάζεται ανανέωση σελίδας.',
    featureChip1: 'Κούρεμα',
    featureChip2: 'Βαφή',
    featureChip3: 'Φορμάρισμα Γενειάδας',
    featureChip4: 'Μασάζ',
    featureServicesLabel: 'Ρύθμισέ το μία φορά',
    featureServicesTitle: 'Κάθε υπηρεσία, συγχρονισμένη',
    featureStatCaption: 'Η σελίδα κρατήσεών σου, πάντα ανοιχτή',
    featureRemindersCheck1: 'Αυτόματος συγχρονισμός με το ημερολόγιό σου',
    featureRemindersCheck2: 'Άμεση επιβεβαίωση email σε κάθε κράτηση',
    featureRemindersLabel: 'Καμία χειροκίνητη δουλειά',
    featureRemindersTitle: 'Επιβεβαιώσεις κρατήσεων',
    featureChannelsLabel: 'Κράτησε από',
    featureChannelsTitle: 'Οποιαδήποτε συσκευή, οποιαδήποτε ώρα',
    previewGreeting: 'Γεια σου, Μάρκο!',
    previewGreetingSub: 'Δες τι συμβαίνει σήμερα στο κατάστημά σου.',
    previewUpcoming1Label: 'Έλενα Ρ. · Σοφία Ριβέρα',
    previewUpcoming1Sub: 'Κούρεμα — Αύριο, 10:00 πμ',
    previewUpcoming2Label: 'Δημήτρης Κ. · Μάρκος',
    previewUpcoming2Sub: 'Φορμάρισμα Γενειάδας — Παρ, 2:30 μμ',
    previewBookingsSubtitle: 'Όλα στο ημερολόγιο αυτή την εβδομάδα.',
    previewBooking1Label: 'Σάρα Μ. — Κούρεμα',
    previewBooking1Sub: 'Σήμερα, 3:00 μμ',
    previewBooking2Label: 'Γιάννης Ο. — Φορμάρισμα Γενειάδας',
    previewBooking2Sub: 'Σήμερα, 4:30 μμ',
    previewNewBookingSubtitle: 'Κλείσε ραντεβού πελάτη σε λιγότερο από ένα λεπτό.',
    previewNewBookingStep1Label: 'Επίλεξε υπηρεσία',
    previewNewBookingStep1Sub: 'Κούρεμα, βαφή, φορμάρισμα γενειάδας & άλλα',
    previewNewBookingStep2Label: 'Επίλεξε ώρα',
    previewNewBookingStep2Sub: 'Δες τη διαθεσιμότητα της ομάδας σου σε πραγματικό χρόνο',
    previewServicesSubtitle: 'Τι προσφέρει το κατάστημά σου.',
    previewService1Label: 'Κούρεμα',
    previewService1Sub: '30 λεπτά · 25€',
    previewService2Label: 'Φορμάρισμα Γενειάδας',
    previewService2Sub: '15 λεπτά · 12€',
    previewTeamPageSubtitle: '5 μέλη προσωπικού ενεργά.',
    previewTeamMember1Label: 'Μάρκος Θεοδώρου',
    previewTeamMember1Sub: 'Ιδιοκτήτης',
    previewTeamMember2Label: 'Σοφία Ριβέρα',
    previewTeamMember2Sub: 'Κομμώτρια',
    previewInvitesSubtitle: 'Φέρε την ομάδα σου στο Bookly.',
    previewInvite1Label: 'Εκκρεμής πρόσκληση',
    previewInvite1Sub: 'james@fadeculture.com',
    previewInvite2Label: 'Κάλεσε συνάδελφο',
    previewInvite2Sub: 'Στείλε σύνδεσμο για να μπει στο κατάστημά σου',
    previewHoursSubtitle: 'Πότε είναι ανοιχτό το κατάστημά σου.',
    previewHours1Label: 'Δευ – Παρ',
    previewHours1Sub: '9:00 πμ – 7:00 μμ',
    previewHours2Label: 'Σαβ',
    previewHours2Sub: '10:00 πμ – 4:00 μμ',
    previewCustomersSubtitle: '312 πελάτες καταχωρημένοι.',
    previewCustomer1Label: 'Αναζήτηση πελατών',
    previewCustomer1Sub: 'Αναζήτησε με όνομα, τηλέφωνο ή email',
    previewCustomer2Label: 'Σάρα Μ.',
    previewCustomer2Sub: '14 επισκέψεις · τελευταία πριν 2 εβδομάδες',
    previewSettingsSubtitle: 'Στοιχεία καταστήματος & προτιμήσεις.',
    previewSetting1Label: 'Προφίλ καταστήματος',
    previewSetting1Sub: 'Όνομα, διεύθυνση, στοιχεία επικοινωνίας',
    previewSetting2Label: 'Ειδοποιήσεις',
    previewSetting2Sub: 'Προτιμήσεις email & SMS',
  },
  privacy: {
    linkLabel: 'Πολιτική Απορρήτου',
    title: 'Πολιτική Απορρήτου',
    lastUpdated: 'Τελευταία ενημέρωση: Σεπτέμβριος 2026',
    intro: 'Η ιδιωτικότητά σου έχει σημασία. Αυτή η σελίδα εξηγεί, σε απλά λόγια, τι δεδομένα συλλέγει το Bookly και πώς τα χρησιμοποιεί. Δεν αποτελεί νομική συμβουλή — βρισκόμαστε σε πρώιμο στάδιο και θα ενημερώνουμε αυτή τη σελίδα καθώς η υπηρεσία μεγαλώνει.',
    collectHeading: 'Ποια δεδομένα συλλέγουμε',
    collectBody: 'Συλλέγουμε τα στοιχεία που μας δίνεις όταν δημιουργείς λογαριασμό ή κλείνεις ραντεβού μέσω μιας δημόσιας σελίδας καταστήματος: όνομα, email, τηλέφωνο και βασικά στοιχεία του καταστήματός σου (όνομα, διεύθυνση, υπηρεσίες, ωράριο). Δεν συλλέγουμε στοιχεία πληρωμής, καθώς το Bookly δεν επεξεργάζεται πληρωμές.',
    useHeading: 'Πώς τα χρησιμοποιούμε',
    useBody: 'Χρησιμοποιούμε τα δεδομένα σου για να λειτουργήσει η υπηρεσία: να δημιουργούμε και να διαχειριζόμαστε ραντεβού, να στέλνουμε emails επιβεβαίωσης ή ειδοποιήσεων και να σου παρέχουμε υποστήριξη όταν τη χρειάζεσαι. Δεν πουλάμε ούτε νοικιάζουμε τα δεδομένα σου σε τρίτους.',
    cookiesHeading: 'Cookies και τοπική αποθήκευση',
    cookiesBody: 'Χρησιμοποιούμε έναν μικρό αριθμό cookies και τοπικής αποθήκευσης του browser για βασικές λειτουργίες, όπως η διατήρηση της σύνδεσής σου και η προτίμηση γλώσσας/θέματος. Δεν χρησιμοποιούμε cookies τρίτων για διαφήμιση ή παρακολούθηση.',
    sharingHeading: 'Κοινοποίηση δεδομένων',
    sharingBody: 'Δεν μοιραζόμαστε τα δεδομένα σου με τρίτους, εκτός από τους παρόχους υπηρεσιών που χρειαζόμαστε για να λειτουργήσει το Bookly (π.χ. αποστολή email, φιλοξενία). Αυτοί οι πάροχοι έχουν πρόσβαση μόνο στα δεδομένα που χρειάζονται για να παρέχουν την υπηρεσία τους.',
    rightsHeading: 'Τα δικαιώματά σου',
    rightsBody: 'Μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή των δεδομένων σου ανά πάσα στιγμή, επικοινωνώντας μαζί μας. Διατηρούμε τα δεδομένα σου όσο ο λογαριασμός σου παραμένει ενεργός, εκτός αν μας ζητήσεις κάτι διαφορετικό.',
    changesHeading: 'Αλλαγές σε αυτή την πολιτική',
    changesBody: 'Καθώς το Bookly εξελίσσεται, ενδέχεται να ενημερώσουμε αυτή τη σελίδα. Θα αναφέρουμε πάντα εδώ την ημερομηνία τελευταίας ενημέρωσης.',
    contact: 'Για ερωτήσεις σχετικά με τα δεδομένα σου, επικοινώνησε στο',
  },
  terms: {
    linkLabel: 'Όροι Χρήσης',
    title: 'Όροι Χρήσης',
    lastUpdated: 'Τελευταία ενημέρωση: Σεπτέμβριος 2026',
    intro: 'Χρησιμοποιώντας το Bookly, συμφωνείς με τους παρακάτω όρους. Βρισκόμαστε σε πρώιμο στάδιο ανάπτυξης, οπότε αυτοί οι όροι μπορεί να αλλάξουν καθώς η υπηρεσία ωριμάζει.',
    useHeading: 'Χρήση του Bookly',
    useBody: 'Το Bookly είναι μια πλατφόρμα διαχείρισης ραντεβού για καταστήματα όπως κουρεία και σαλόνια ομορφιάς. Μπορείς να το χρησιμοποιήσεις για να διαχειρίζεσαι το κατάστημά σου, την ομάδα σου και τους πελάτες σου, εφόσον το κάνεις νόμιμα και με καλή πίστη.',
    accountsHeading: 'Λογαριασμοί και ευθύνη',
    accountsBody: 'Είσαι υπεύθυνος/η για τη διατήρηση της ασφάλειας του λογαριασμού σου και για κάθε ενέργεια που πραγματοποιείται μέσω αυτού. Ενημέρωσέ μας άμεσα αν υποψιαστείς μη εξουσιοδοτημένη πρόσβαση.',
    acceptableHeading: 'Αποδεκτή χρήση',
    acceptableBody: 'Δεν επιτρέπεται η χρήση του Bookly για παράνομες δραστηριότητες, την αποστολή ανεπιθύμητων μηνυμάτων ή οποιαδήποτε ενέργεια που θα μπορούσε να βλάψει την υπηρεσία ή άλλους χρήστες.',
    availabilityHeading: 'Διαθεσιμότητα υπηρεσίας',
    availabilityBody: 'Το Bookly βρίσκεται σε φάση beta. Καταβάλλουμε κάθε προσπάθεια ώστε η υπηρεσία να είναι διαθέσιμη και αξιόπιστη, αλλά δεν μπορούμε να εγγυηθούμε αδιάλειπτη λειτουργία κατά τη διάρκεια αυτού του σταδίου.',
    liabilityHeading: 'Περιορισμός ευθύνης',
    liabilityBody: 'Το Bookly παρέχεται "ως έχει", χωρίς καμία εγγύηση. Στον μέγιστο βαθμό που επιτρέπει ο νόμος, δεν φέρουμε ευθύνη για έμμεσες ζημιές που μπορεί να προκύψουν από τη χρήση της υπηρεσίας.',
    changesHeading: 'Αλλαγές σε αυτούς τους όρους',
    changesBody: 'Μπορεί να ενημερώνουμε αυτούς τους όρους καθώς εξελίσσεται το Bookly. Η συνέχιση της χρήσης της υπηρεσίας μετά από μια ενημέρωση σημαίνει ότι αποδέχεσαι τους νέους όρους.',
    contact: 'Για ερωτήσεις σχετικά με τους όρους χρήσης, επικοινώνησε στο',
  },
  about: {
    badge: 'Η ιστορία',
    title: 'Γεια, είμαι ο Νίκος — έφτιαξα το Bookly για τη μαμά μου 🧡.',
    intro: 'Το Bookly ξεκίνησε ως ένα μικρό εργαλείο για να βοηθήσω τη μαμά μου να διαχειρίζεται τα ραντεβού στο δικό της κατάστημα, χωρίς το χάος των τηλεφωνημάτων και των σημειώσεων σε χαρτί.',
    storyHeading: 'Γιατί το έφτιαξα',
    storyBody: 'Έβλεπα τη μαμά μου να παλεύει κάθε μέρα με ένα τετράδιο ραντεβού, να χάνει κρατήσεις και να ξοδεύει ώρες στο τηλέφωνο. Έφτιαξα το Bookly για να λύσω αυτό ακριβώς το πρόβλημα — για εκείνη, αλλά και για κάθε κατάστημα σαν το δικό της. Σήμερα το χτίζω, το συντηρώ και το βελτιώνω μόνος μου, κομμάτι-κομμάτι.',
    githubLabel: 'Δες τον κώδικα στο GitHub',
    contactLabel: 'Επικοινώνησε μαζί μου',
  },
  contact: {
    badge: 'Πες Γεια 👋',
    title: 'Ας μιλήσουμε!',
    intro: 'Βρήκες κάποιο bug, έχεις κάποια ερώτηση ή μια ιδέα για το Bookly; Στείλε μου ένα μήνυμα και θα σου απαντήσω το συντομότερο δυνατό.',
    buttonLabel: 'Επικοινώνησε μαζί μου',
  },
  footer: {
    brandDesc: 'Η πλατφόρμα κρατήσεων φτιαγμένη για κουρεία και σαλόνια ομορφιάς που παίρνουν την επιχείρησή τους στα σοβαρά.',
    productHeading: 'Προϊόν',
    companyHeading: 'Εταιρεία',
    legalHeading: 'Νομικά',
    faq: 'Συχνές Ερωτήσεις',
    contact: 'Επικοινωνία',
    copyright: 'Με επιφύλαξη παντός δικαιώματος.',
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
    },
    register: {
      title: 'Εγγραφή',
      emailLabel: 'Email',
      passwordLabel: 'Κωδικός',
      submit: 'Εγγραφή',
      submitting: 'Εγγραφή...',
      alreadyAccount: 'Έχετε ήδη λογαριασμό;',
      loginLink: 'Σύνδεση',
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
    settings: {
      title: 'Ρυθμίσεις',
      profileSection: 'Προφίλ',
      saveProfile: 'Αποθήκευση Προφίλ',
      successProfile: 'Το προφίλ ενημερώθηκε επιτυχώς.',
      errorProfile: 'Αποτυχία ενημέρωσης προφίλ.',
      emailSection: 'Διεύθυνση Email',
      emailLabel: 'Email',
      saveEmail: 'Αποθήκευση Email',
      saving: 'Αποθήκευση...',
      passwordSection: 'Αλλαγή Κωδικού',
      newPasswordLabel: 'Νέος Κωδικός',
      newPasswordOptionalLabel: 'Νέος Κωδικός (προαιρετικό)',
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
      successName: 'Το όνομα ενημερώθηκε επιτυχώς.',
      errorName: 'Αποτυχία ενημέρωσης ονόματος.',
      successEmail: 'Το email ενημερώθηκε επιτυχώς.',
      errorEmail: 'Αποτυχία ενημέρωσης email.',
      successPassword: 'Ο κωδικός ενημερώθηκε επιτυχώς.',
      errorPassword: 'Αποτυχία ενημέρωσης κωδικού.',
      successRevoke: 'Όλες οι άλλες συνεδρίες ανακλήθηκαν.',
      errorRevoke: 'Αποτυχία ανάκλησης συνεδριών.',
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
      noLoginYet: 'Χωρίς σύνδεση ακόμα',
      loginAccess: 'Πρόσβαση Σύνδεσης',
      inviteAlreadySent: 'Έχει σταλεί πρόσκληση σύνδεσης. Περιμένουμε να την αποδεχτεί.',
      noInviteSentYet: 'Δεν έχει σταλεί ακόμα πρόσκληση σύνδεσης σε αυτό το μέλος.',
      sendInvite: 'Αποστολή Πρόσκλησης Σύνδεσης',
      resendInvite: 'Επαναποστολή Πρόσκλησης',
      cancelInvite: 'Ακύρωση Πρόσκλησης',
      inviteSent: 'Η πρόσκληση σύνδεσης εστάλη.',
      errorSendInvite: 'Αποτυχία αποστολής πρόσκλησης.',
      errorCancelInvite: 'Αποτυχία ακύρωσης πρόσκλησης.',
      canViewCustomerDetails: 'Προβολή στοιχείων πελατών',
      canViewCustomerDetailsDesc: 'Όταν είναι ανενεργό, το μέλος βλέπει μόνο τη λέξη «Πελάτης», χωρίς όνομα, τηλέφωνο ή email.',
      confirmContinue: 'Επιβεβαίωση & Συνέχεια',
      confirmPromoteOwner: 'Αυτό το άτομο θα γίνει ιδιοκτήτης, με πλήρη πρόσβαση στη διαχείριση ομάδας, προσκλήσεων, πελατών και ρυθμίσεων, καθώς και δυνατότητα υποβιβασμού άλλων ιδιοκτητών. Πατήστε ξανά για να συνεχίσετε.',
      confirmDemoteOwner: 'Αυτό το άτομο θα χάσει την πρόσβαση ιδιοκτήτη. Πατήστε ξανά για να συνεχίσετε.',
      emailLabel: 'Email',
      saveEmail: 'Αποθήκευση Email',
      addEmailFirst: 'Προσθέστε email πριν στείλετε πρόσκληση σύνδεσης',
      errorSaveEmail: 'Αποτυχία αποθήκευσης email.',
      emailChangedHint: 'Αποθηκεύστε τις αλλαγές παραπάνω πριν στείλετε την πρόσκληση.',
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
      addMember: 'Προσθήκη Μέλους',
      nameLabel: 'Όνομα',
      namePlaceholder: 'π.χ. Μαρία Παπαδοπούλου',
      canViewCustomerDetails: 'Προβολή στοιχείων πελατών',
      canViewCustomerDetailsDesc: 'Όταν είναι ανενεργό, θα βλέπει μόνο τη λέξη «Πελάτης» στα ραντεβού, χωρίς όνομα, τηλέφωνο ή email. Μπορείτε να το αλλάξετε αργότερα.',
      sendEmailNow: 'Αποστολή πρόσκλησης σύνδεσης τώρα',
      sendEmailNowDesc: 'Το μέλος δημιουργείται άμεσα και μπορεί να δεχτεί ραντεβού ό,τι κι αν επιλέξετε εδώ. Αν είναι ανενεργό, μπορείτε να στείλετε την πρόσκληση αργότερα από τη σελίδα του μέλους.',
      confirmOwnerInvite: 'Αυτό το άτομο θα γίνει ιδιοκτήτης, με πλήρη πρόσβαση στη διαχείριση ομάδας, προσκλήσεων, πελατών και ρυθμίσεων. Πατήστε ξανά για να συνεχίσετε.',
      createdNoEmail: 'Το μέλος δημιουργήθηκε. Δεν στάλθηκε πρόσκληση σύνδεσης.',
      pendingLogins: 'Μέλη χωρίς σύνδεση',
      noPendingLogins: 'Όλα τα μέλη έχουν σύνδεση.',
      notSentYet: 'Δεν έχει σταλεί',
      resend: 'Επαναποστολή',
      cancelInvite: 'Ακύρωση Πρόσκλησης',
      confirmCancel: 'Επιβεβαίωση Ακύρωσης',
      errorResend: 'Αποτυχία αποστολής πρόσκλησης.',
      errorCancel: 'Αποτυχία ακύρωσης πρόσκλησης.',
      statusLabel: 'Κατάσταση',
      optional: 'προαιρετικό',
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
      saveDates: 'Αποθήκευση Ημερομηνιών',
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
      shopDetails: 'Στοιχεία Καταστήματος',
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
      closedThisDay: 'Είμαστε κλειστά αυτή την ημέρα.',
      closedOrNoSchedule: 'Κλειστό ή δεν υπάρχει πρόγραμμα για αυτή την ημέρα.',
      manageWorkingHours: 'Μετάβαση στο ωράριο εργασίας για διόρθωση',
      failedSlots: 'Αποτυχία φόρτωσης διαθέσιμων ωρών',
      serviceContext: 'Υπηρεσία:',
      staffContext: 'Προσωπικό:',
      atLabel: 'στις',
    },
    overview: {
      greeting: 'Γεια σου, {name}!',
      title: 'Επισκόπηση',
      loading: 'Φόρτωση...',
      noShop: 'Δεν φορτώθηκε κατάστημα',
      teamLabel: 'Ομάδα',
      servicesLabel: 'Υπηρεσίες',
      customersLabel: 'Πελάτες',
      todaysBookings: 'Σημερινά Ραντεβού',
      noBookingsToday: 'Δεν υπάρχουν ραντεβού σήμερα.',
      upcomingBookings: 'Προσεχή Ραντεβού',
      noUpcoming: 'Δεν υπάρχουν προσεχή ραντεβού.',
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
      notesLabel: 'Σημειώσεις',
      notesOptional: 'Προαιρετικό',
      saving: 'Αποθήκευση…',
      save: 'Αποθήκευση',
      totalVisitsLabel: 'Συνολικές επισκέψεις',
      totalSpentLabel: 'Συνολική δαπάνη',
      recentBookings: 'Πρόσφατα Ραντεβού',
      noBookings: 'Δεν υπάρχουν ραντεβού ακόμα.',
      serviceCol: 'Υπηρεσία',
      dateTimeCol: 'Ημερομηνία & Ώρα',
      statusCol: 'Κατάσταση',
      successUpdate: 'Ο πελάτης ενημερώθηκε.',
      errorUpdate: 'Αποτυχία αποθήκευσης αλλαγών.',
      hiddenLabel: 'Πελάτης',
      contactHiddenNotice: 'Δεν έχετε δικαίωμα προβολής ή επεξεργασίας των στοιχείων επικοινωνίας αυτού του πελάτη.',
      prevPage: '←',
      nextPage: '→',
      pageOf: 'Σελίδα {page} από {total}',
    },
    bookings: {
      title: 'Ραντεβού',
      viewDateLabel: 'Προβολή ημερομηνίας',
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
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
    },
    sidebar: {
      app: 'App',
      account: 'Account',
      overview: 'Overview',
      shops: 'Shops',
      settings: 'Settings',
      logout: 'Logout',
      backToShops: 'My Shops',
      shopSection: 'Shop',
      manageSection: 'Manage',
      bookings: 'Bookings',
      services: 'Services',
      team: 'Team',
      invites: 'Invites',
      customers: 'Customers',
      shopSettings: 'Settings',
      shopWorkingHours: "Hours",
      bookAppointment: 'New Booking',
    },
    dashboard: {
      title: 'Overview',
      subtitle: 'Your bookings and shops, at a glance.',
      errorLoad: 'Failed to load your data.',
      noShops: "You don't have any shops yet.",
      todayCount: 'Today: {count}',
      upcomingCount: 'Upcoming: {count}',
      upcomingAcrossShops: 'Upcoming Bookings',
      noUpcoming: 'No upcoming bookings.',
    },
    shops: {
      title: 'My Shops',
      newShop: 'New Shop',
      noShops: 'You have no shops yet.',
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
    cta: 'Start Free',
    signIn: 'Sign In',
    heroBadge: 'Booking platform for barbershops & salons',
    featuresBadge: 'Features',
    featuresTitle: 'Everything you need to run your shop',
    featuresSub: 'Built for modern barbershops and salons that want to grow without the overhead.',
    howBadge: 'How It Works',
    howTitle: 'Up and running in minutes',
    howSub: 'Three simple steps to a fully automated booking experience.',
    aboutBadge: 'About',
    productBadge: 'Product',
    contactBadge: 'Contact',
    pricingBadge: 'Pricing',
    pricingTitle: 'Simple, with no surprises',
    pricingSub: "We're still early — reach out and we'll get you set up.",
    pricingPlanName: 'Free during beta',
    pricingPlanDesc: "Full access to every feature while we're in early access. No charge, no commitment.",
    pricingFeature1: 'Unlimited bookings',
    pricingFeature2: 'A public booking page for your clients',
    pricingFeature3: 'Team, service, and customer management',
    pricingCta: 'Contact us',
    previewHint: "Go ahead, click around — it's interactive",
    step1Title: 'Create your account',
    step1Desc: "Sign up in seconds — it's free, no credit card required.",
    step2Title: 'Set up your shop',
    step2Desc: 'Add your services, set your hours, and invite your team — all in under 10 minutes.',
    step3Title: 'Accept bookings',
    step3Desc: 'Share your booking link and start receiving real appointments immediately.',
    faqHeading: 'Frequently Asked Questions',
    faqSub: 'Find answers to frequently asked questions.',
    faqContact: 'Contact us',
    faq1Q: 'How does the free trial work?',
    faq1A: 'Create your account and use every feature free for 14 days — no credit card required. You can invite your team and start taking real bookings right away.',
    faq2Q: 'Can my clients book without creating an account?',
    faq2A: 'Yes. Clients just pick a service, staff member, and time slot from your public booking page — no sign-up required on their end.',
    faq3Q: 'How do I cancel my subscription?',
    faq3A: "Cancel any time from your account settings. You'll keep access through the end of your current billing period, and your data stays exportable.",
    faq4Q: 'What happens after the free plan limit?',
    faq4A: "You'll get a heads-up before you hit the limit. Upgrade to keep accepting bookings without interruption, or stay on the free plan and pick up next month.",
    featureAlertsIncoming: 'Sarah M. requested a Haircut, today at 3:00 PM.',
    featureAlertsIncomingSubject: 'New booking request',
    featureAlertsConfirmed: "Sarah M.'s booking is confirmed for 3:00 PM 👋",
    featureAlertsConfirmedSubject: 'Booking confirmed',
    featureAlertsTimeNow: 'just now',
    featureAlertsTimeAgo: '1 min ago',
    featureAlertsTitle: 'Real-time booking alerts',
    featureAlertsDesc: 'Get notified the moment a client books, reschedules, or cancels — no refreshing required.',
    featureChip1: 'Haircut',
    featureChip2: 'Color',
    featureChip3: 'Beard Trim',
    featureChip4: 'Massage',
    featureServicesLabel: 'Set up once',
    featureServicesTitle: 'Every service, synced',
    featureStatCaption: 'Your booking page, always open',
    featureRemindersCheck1: 'Auto-synced to your calendar',
    featureRemindersCheck2: 'Instant email confirmation on every booking',
    featureRemindersLabel: 'Zero manual work',
    featureRemindersTitle: 'Booking confirmations',
    featureChannelsLabel: 'Book from',
    featureChannelsTitle: 'Any device, any time',
    previewGreeting: 'Hi, Marcus!',
    previewGreetingSub: "Here's what's happening at your shop today.",
    previewUpcoming1Label: 'Emma R. · Sofia Rivera',
    previewUpcoming1Sub: 'Haircut — Tomorrow, 10:00 AM',
    previewUpcoming2Label: 'David K. · Marcus',
    previewUpcoming2Sub: 'Beard Trim — Fri, 2:30 PM',
    previewBookingsSubtitle: 'Everything on the calendar this week.',
    previewBooking1Label: 'Sarah M. — Haircut',
    previewBooking1Sub: 'Today, 3:00 PM',
    previewBooking2Label: 'James O. — Beard Trim',
    previewBooking2Sub: 'Today, 4:30 PM',
    previewNewBookingSubtitle: 'Book a client in under a minute.',
    previewNewBookingStep1Label: 'Choose a service',
    previewNewBookingStep1Sub: 'Haircut, color, beard trim & more',
    previewNewBookingStep2Label: 'Pick a time',
    previewNewBookingStep2Sub: 'See live availability for your team',
    previewServicesSubtitle: 'What your shop offers.',
    previewService1Label: 'Haircut',
    previewService1Sub: '30 min · €25',
    previewService2Label: 'Beard Trim',
    previewService2Sub: '15 min · €12',
    previewTeamPageSubtitle: '5 staff members active.',
    previewTeamMember1Label: 'Marcus Thompson',
    previewTeamMember1Sub: 'Owner',
    previewTeamMember2Label: 'Sofia Rivera',
    previewTeamMember2Sub: 'Stylist',
    previewInvitesSubtitle: 'Bring your team onto Bookly.',
    previewInvite1Label: 'Pending invite',
    previewInvite1Sub: 'james@fadeculture.com',
    previewInvite2Label: 'Invite a teammate',
    previewInvite2Sub: 'Send a link to join your shop',
    previewHoursSubtitle: 'When your shop is open.',
    previewHours1Label: 'Mon – Fri',
    previewHours1Sub: '9:00 AM – 7:00 PM',
    previewHours2Label: 'Sat',
    previewHours2Sub: '10:00 AM – 4:00 PM',
    previewCustomersSubtitle: '312 clients on file.',
    previewCustomer1Label: 'Search customers',
    previewCustomer1Sub: 'Find by name, phone, or email',
    previewCustomer2Label: 'Sarah M.',
    previewCustomer2Sub: '14 visits · last seen 2 weeks ago',
    previewSettingsSubtitle: 'Shop details & preferences.',
    previewSetting1Label: 'Shop profile',
    previewSetting1Sub: 'Name, address, contact info',
    previewSetting2Label: 'Notifications',
    previewSetting2Sub: 'Email & SMS preferences',
  },
  privacy: {
    linkLabel: 'Privacy Policy',
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: September 2026',
    intro: "Your privacy matters. This page explains, in plain language, what data Bookly collects and how it's used. It isn't legal advice — we're early-stage and will keep this page updated as the service grows.",
    collectHeading: 'What We Collect',
    collectBody: "We collect the information you give us when you create an account or book an appointment through a shop's public page: name, email, phone number, and basic shop details (name, address, services, hours). We don't collect payment information — Bookly doesn't process payments.",
    useHeading: 'How We Use It',
    useBody: "We use your data to run the service: creating and managing bookings, sending confirmation or notification emails, and providing support when you need it. We don't sell or rent your data to third parties.",
    cookiesHeading: 'Cookies & Local Storage',
    cookiesBody: "We use a small number of cookies and browser local storage for essential functionality, like keeping you signed in and remembering your language/theme preference. We don't use third-party cookies for advertising or tracking.",
    sharingHeading: 'Data Sharing',
    sharingBody: "We don't share your data with third parties, except the service providers we rely on to run Bookly (e.g. email delivery, hosting). Those providers only get access to what they need to provide their service.",
    rightsHeading: 'Your Rights',
    rightsBody: "You can request access to, correction of, or deletion of your data at any time by reaching out to us. We keep your data for as long as your account is active, unless you ask us to do otherwise.",
    changesHeading: 'Changes to This Policy',
    changesBody: "As Bookly evolves, we may update this page. We'll always note the last-updated date here.",
    contact: 'For questions about your data, reach out to',
  },
  terms: {
    linkLabel: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'Last updated: September 2026',
    intro: "By using Bookly, you agree to the terms below. We're early-stage, so these terms may change as the service matures.",
    useHeading: 'Using Bookly',
    useBody: 'Bookly is a booking management platform for shops like barbershops and beauty salons. You can use it to manage your shop, your team, and your customers, as long as you do so lawfully and in good faith.',
    accountsHeading: 'Accounts & Responsibility',
    accountsBody: "You're responsible for keeping your account secure and for any activity that happens through it. Let us know right away if you suspect unauthorized access.",
    acceptableHeading: 'Acceptable Use',
    acceptableBody: 'You may not use Bookly for unlawful activity, sending unsolicited messages, or anything that could harm the service or other users.',
    availabilityHeading: 'Service Availability',
    availabilityBody: "Bookly is in beta. We do our best to keep the service available and reliable, but we can't guarantee uninterrupted operation during this stage.",
    liabilityHeading: 'Limitation of Liability',
    liabilityBody: 'Bookly is provided "as is", without warranties of any kind. To the maximum extent permitted by law, we aren\'t liable for indirect damages arising from your use of the service.',
    changesHeading: 'Changes to These Terms',
    changesBody: 'We may update these terms as Bookly evolves. Continuing to use the service after an update means you accept the new terms.',
    contact: 'For questions about these terms, reach out to',
  },
  about: {
    badge: 'The Story',
    title: "Hi, I'm Nick — I built Bookly for my mum 🧡.",
    intro: 'Bookly started as a small tool to help my mum manage bookings at her own shop, without the chaos of phone calls and paper notebooks.',
    storyHeading: 'Why I built it',
    storyBody: 'I watched my mum wrestle with an appointment notebook every day, lose bookings, and spend hours on the phone. I built Bookly to solve exactly that problem — for her, and for every shop like hers. Today I build, run, and improve it myself, one piece at a time.',
    githubLabel: 'View the code on GitHub',
    contactLabel: 'Get in touch',
  },
  contact: {
    badge: 'Say Hi 👋',
    title: 'Let’s talk!',
    intro: "Found a bug, have a question, or have an idea for Bookly? I’d like to hear it. Send me a message and I’ll get back to you.",
    buttonLabel: 'Contact me',
  },
  footer: {
    brandDesc: 'The booking platform built for barbershops and salons that take their business seriously.',
    productHeading: 'Product',
    companyHeading: 'Company',
    legalHeading: 'Legal',
    faq: 'FAQ',
    contact: 'Contact',
    copyright: 'All rights reserved.',
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
    },
    register: {
      title: 'Register',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      submit: 'Register',
      submitting: 'Registering...',
      alreadyAccount: 'Already have an account?',
      loginLink: 'Login',
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
    settings: {
      title: 'Settings',
      profileSection: 'Profile',
      saveProfile: 'Save Profile',
      successProfile: 'Profile updated successfully.',
      errorProfile: 'Failed to update profile.',
      emailSection: 'Email Address',
      emailLabel: 'Email',
      saveEmail: 'Save Email',
      saving: 'Saving...',
      passwordSection: 'Change Password',
      newPasswordLabel: 'New Password',
      newPasswordOptionalLabel: 'New Password (optional)',
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
      successName: 'Name updated successfully.',
      errorName: 'Failed to update name.',
      successEmail: 'Email updated successfully.',
      errorEmail: 'Failed to update email.',
      successPassword: 'Password updated successfully.',
      errorPassword: 'Failed to update password.',
      successRevoke: 'All other sessions have been revoked.',
      errorRevoke: 'Failed to revoke sessions.',
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
      noLoginYet: 'No login yet',
      loginAccess: 'Login Access',
      inviteAlreadySent: "A login invite has been sent. Waiting for them to accept it.",
      noInviteSentYet: 'No login invite has been sent to this member yet.',
      sendInvite: 'Send Login Invite',
      resendInvite: 'Resend Invite',
      cancelInvite: 'Cancel Invite',
      inviteSent: 'Login invite sent.',
      errorSendInvite: 'Failed to send invite.',
      errorCancelInvite: 'Failed to cancel invite.',
      canViewCustomerDetails: 'View customer details',
      canViewCustomerDetailsDesc: "When off, this member sees just the word \"Customer\" — no name, phone, or email.",
      confirmContinue: 'Confirm & Continue',
      confirmPromoteOwner: 'This person will become an owner, with full access to team, invites, customers, and settings — including the ability to demote other owners. Click again to continue.',
      confirmDemoteOwner: 'This person will lose owner access. Click again to continue.',
      emailLabel: 'Email',
      saveEmail: 'Save Email',
      addEmailFirst: 'Add an email before sending a login invite',
      errorSaveEmail: 'Failed to save email.',
      emailChangedHint: 'Save your changes above before sending the invite.',
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
      addMember: 'Add Team Member',
      nameLabel: 'Name',
      namePlaceholder: 'e.g. Maria Papadopoulou',
      canViewCustomerDetails: 'View customer details',
      canViewCustomerDetailsDesc: "When off, they'll see just the word \"Customer\" on bookings — no name, phone, or email. You can change this later.",
      sendEmailNow: 'Send login invite now',
      sendEmailNowDesc: "The member is created right away and can be booked either way. If off, you can send the invite later from the member's page.",
      confirmOwnerInvite: 'This person will become an owner, with full access to team, invites, customers, and settings. Click again to continue.',
      createdNoEmail: 'Team member created. No login invite was sent.',
      pendingLogins: 'Members Without a Login',
      noPendingLogins: 'Every member has a login.',
      notSentYet: 'Not sent',
      resend: 'Resend',
      cancelInvite: 'Cancel Invite',
      confirmCancel: 'Confirm Cancel',
      errorResend: 'Failed to send invite.',
      errorCancel: 'Failed to cancel invite.',
      statusLabel: 'Status',
      optional: 'optional',
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
      saveDates: 'Save Dates',
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
      shopDetails: 'Shop Details',
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
      closedThisDay: 'We are closed this day.',
      closedOrNoSchedule: 'Closed, or there is no schedule for this day.',
      manageWorkingHours: 'Go to working hours to fix this',
      failedSlots: 'Failed to load available slots',
      serviceContext: 'Service:',
      staffContext: 'Staff:',
      atLabel: 'at',
    },
    overview: {
      greeting: 'Hello, {name}!',
      title: 'Overview',
      loading: 'Loading...',
      noShop: 'No shop loaded',
      teamLabel: 'Team',
      servicesLabel: 'Services',
      customersLabel: 'Customers',
      todaysBookings: "Today's Bookings",
      noBookingsToday: 'No bookings today.',
      upcomingBookings: 'Upcoming Bookings',
      noUpcoming: 'No upcoming bookings.',
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
      notesLabel: 'Notes',
      notesOptional: 'Optional',
      saving: 'Saving…',
      save: 'Save',
      totalVisitsLabel: 'Total visits',
      totalSpentLabel: 'Total spent',
      recentBookings: 'Recent Bookings',
      noBookings: 'No bookings yet.',
      serviceCol: 'Service',
      dateTimeCol: 'Date & Time',
      statusCol: 'Status',
      successUpdate: 'Customer updated.',
      errorUpdate: 'Failed to save changes.',
      hiddenLabel: 'Customer',
      contactHiddenNotice: "You don't have permission to view or edit this customer's contact details.",
      prevPage: '←',
      nextPage: '→',
      pageOf: 'Page {page} of {total}',
    },
    bookings: {
      title: 'Bookings',
      viewDateLabel: 'View date',
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
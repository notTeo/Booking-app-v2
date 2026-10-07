import type { PublicFont, PublicPalette } from '../utils/branding';

export type Language = 'el' | 'en';

// Messages for the server's booking-rule violations (422 `code`s) + slot conflict.
export interface RuleMessages {
  BOOKING_IN_PAST: string;
  BOOKING_BEYOND_ADVANCE_WINDOW: string;
  SHOP_CLOSED: string;
  OUTSIDE_OPENING_HOURS: string;
  OFF_SLOT_GRID: string;
  SLOT_TAKEN: string;
  BOOKING_TOO_LONG: string;
}

export interface Translations {
  nav: {
    login: string;
    register: string;
    logout: string;
  };
  sidebar: {
    dashboard: string;
    openMenu: string;
    mainNav: string;
    resize: string;
    account: string;
    help: string;
    overview: string;
    logout: string;
    home: string;
    shopSection: string;
    manageSection: string;
    bookings: string;
    services: string;
    products: string;
    team: string;
    invites: string;
    customers: string;
    shopSettings: string;
    bookAppointment: string;
  };
  help: {
    title: string;
    intro: string;
    managersBadge: string;
    contactButton: string;
    /** Keyed by the section ids in pages/HelpPage.tsx; each item is a lead and its sentence. */
    sections: Record<
      'gettingStarted' | 'bookings' | 'teamRoles' | 'customers' | 'products' | 'plans' | 'publicPage' | 'contact',
      { title: string; items: { lead: string; text: string }[] }
    >;
  };
  dashboard: {
    title: string;
    createShop: string;
    /** from: "{email} invited you as {role}" */
    invites: { title: string; from: string; empty: string };
    shops: { title: string };
    /** text contains {email}. */
    empty: { title: string; text: string };
  };
  shops: {
    title: string;
    newShop: string;
    name: string;
    slug: string;
    slugHint: string;
    slugLockedHint: string;
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
    pricingPerMonth: string;
    pricingPerYear: string;
    pricingBillingLabel: string;
    pricingMonthly: string;
    pricingYearly: string;
    pricingPopular: string;
    pricingWas: string;
    pricingSaving: string;
    pricingCta: string;
    pricingFeaturesLabel: string;
    pricingExclVat: string;
    pricingSoloName: string;
    pricingSoloDesc: string;
    pricingSoloFeatures: string[];
    pricingTeamName: string;
    pricingTeamDesc: string;
    pricingTeamFeatures: string[];
    pricingBusinessName: string;
    pricingBusinessDesc: string;
    pricingBusinessFeatures: string[];
    pricingDetailsLink: string;
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
    previewServicesSubtitle: string;
    previewTeamPageSubtitle: string;
    previewInvitesSubtitle: string;
    previewCustomersSubtitle: string;
    previewSettingsSubtitle: string;
    previewCalStaff1: string;
    previewCalStaff2: string;
    previewCalStaff3: string;
    previewCalBlock1Name: string;
    previewCalBlock1Service: string;
    previewCalBlock2Name: string;
    previewCalBlock2Service: string;
    previewCalBlock3Name: string;
    previewCalBlock3Service: string;
    previewCalBlock4Name: string;
    previewCalBlock4Service: string;
    previewService1Name: string;
    previewService1Duration: string;
    previewService1Desc: string;
    previewService2Name: string;
    previewService2Duration: string;
    previewService2Desc: string;
    previewInviteRowName1: string;
    previewInviteRowName2: string;
    previewShopDesc: string;
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
  shopPlan: {
    newShopTrial: string;
    newShopInactive: string;
    staffLimitReached: string;
    featureNotInPlan: string;
    locked: string;
    contactUs: string;
    title: string;
    active: string;
    trialUntil: string;
    trialEnded: string;
    inactive: string;
    staffLimit: string;
    changePlan: string;
    seePlans: string;
    lockedTitle: string;
    lockedOwner: string;
    trialEnding: string;
  };
  pricingPage: {
    title: string;
    intro: string;
    featureCol: string;
    included: string;
    notIncluded: string;
    /** Each row: the feature, then Solo, Team and Business (true/false, or a short text). */
    groups: { title: string; rows: [string, boolean | string, boolean | string, boolean | string][] }[];
    notesTitle: string;
    notes: string[];
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
    rememberMe: string;
    error: string;
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
    acceptPrefix: string;
    acceptAnd: string;
    termsRequired: string;
    error: string;
  };
  dpa: {
    linkLabel: string;
    title: string;
    lastUpdated: string;
    placeholderNotice: string;
    intro: string;
    rolesHeading: string;
    rolesBody: string;
    processingHeading: string;
    processingBody: string;
    subprocessorsHeading: string;
    subprocessorsBody: string;
    securityHeading: string;
    securityBody: string;
    rightsHeading: string;
    rightsBody: string;
    contact: string;
  };
  forgotPassword: {
    title: string;
    emailLabel: string;
    submit: string;
    submitting: string;
    success: string;
    backToLogin: string;
    error: string;
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
    error: string;
  };
  verifyEmail: {
    title: string;
    verifying: string;
    resendLabel: string;
    resendPlaceholder: string;
    resendSubmit: string;
    resending: string;
    resentOk: string;
    backToRegister: string;
    passwordIntro: string;
    passwordLabel: string;
    submit: string;
    wrongPassword: string;
    invalidLink: string;
    error: string;
    resendError: string;
  };
  verifyEmailChange: {
    title: string;
    verifying: string;
    success: string;
    invalidLink: string;
    error: string;
    continue: string;
    backToAccount: string;
  };
  settings: {
    wrongPassword: string;
    soleOwnerOfShop: string;
    deleteAccountMessage: string;
    deleteAccountConfirmButton: string;
    deleteAccountTitle: string;
    title: string;
    profileSection: string;
    saveProfile: string;
    successProfile: string;
    errorProfile: string;
    emailSection: string;
    emailLabel: string;
    saveEmail: string;
    passwordSection: string;
    newPasswordLabel: string;
    newPasswordOptionalLabel: string;
    currentPasswordLabel: string;
    updatePassword: string;
    showPassword: string;
    hidePassword: string;
    logout: string;
    logoutDesc: string;
    dangerZone: string;
    dangerDesc: string;
    deleteAccount: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    cancel: string;
    pwMin: string;
    pwUpper: string;
    pwNumber: string;
    pwSpecial: string;
    nameSection: string;
    nameLabel: string;
    saveName: string;
    preferencesSection: string;
    paletteLabel: string;
    paletteDesc: string;
    palettes: { original: string; mono: string; purple: string };
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
    photoHint: string;
  };
  notFound: {
    code: string;
    title: string;
    message: string;
    goHome: string;
  };
  team: {
    demoteConfirmButton: string;
    demoteTitle: string;
    promoteConfirmButton: string;
    promoteTitle: string;
    removeConfirmButton: string;
    removeTitle: string;
    title: string;
    email: string;
    role: string;
    joined: string;
    actions: string;
    roles: { owner: string; manager: string; staff: string };
    remove: string;
    cancel: string;
    noMembers: string;
    notFound: string;
    errorLoad: string;
    errorRemove: string;
    errorRemoveHasBookings: string;
    backToTeam: string;
    editRole: string;
    saveRole: string;
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
    errorInviteInactive: string;
    errorCancelInvite: string;
    canViewCustomerDetails: string;
    canViewCustomerDetailsDesc: string;
    active: string;
    activeDesc: string;
    ownerAlwaysActiveHint: string;
    bookableByCustomers: string;
    bookableByCustomersDesc: string;
    bookableInternally: string;
    bookableInternallyDesc: string;
    inactiveBadge: string;
    canManageManagers: string;
    canManageManagersDesc: string;
    canEditShopSettings: string;
    canEditShopSettingsDesc: string;
    confirmPromoteManager: string;
    confirmDemoteManager: string;
    transferOwnership: string;
    transferDesc: string;
    transferTitle: string;
    confirmTransfer: string;
    transferConfirmButton: string;
    errorTransfer: string;
    emailLabel: string;
    saveEmail: string;
    addEmailFirst: string;
    errorSaveEmail: string;
    emailChangedHint: string;
  };
  invites: {
    declineConfirmButton: string;
    declineMessage: string;
    declineTitle: string;
    cancelInviteConfirmButton: string;
    cancelInviteMessage: string;
    cancelInviteTitle: string;
    managerInviteConfirmButton: string;
    managerInviteTitle: string;
    title: string;
    received: string;
    sent: string;
    sendInvite: string;
    emailLabel: string;
    roleLabel: string;
    accept: string;
    decline: string;
    revoke: string;
    revoking: string;
    status: { pending: string; accepted: string; expired: string };
    roles: { owner: string; manager: string; staff: string };
    expiresAt: string;
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
    confirmManagerInvite: string;
    createdNoEmail: string;
    pendingLogins: string;
    noPendingLogins: string;
    notSentYet: string;
    resend: string;
    cancelInvite: string;
    errorResend: string;
    errorCancel: string;
    statusLabel: string;
    optional: string;
    dashboard: string;
    invitedToJoin: string;
  };
  services: {
    errorHasBookings: string;
    errorHasBookingsInactive: string;
    deactivateTitle: string;
    deactivate: string;
    errorDeactivate: string;
    deleteConfirmButton: string;
    deleteMessage: string;
    deleteTitle: string;
    title: string;
    addService: string;
    create: string;
    name: string;
    description: string;
    duration: string;
    price: string;
    isActive: string;
    showOnPublicPage: string;
    showOnPublicPageHint: string;
    internalOnly: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
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
    deleteScheduleConfirmButton: string;
    deleteScheduleMessage: string;
    deleteScheduleTitle: string;
    title: string;
    save: string;
    successSave: string;
    errorLoad: string;
    errorSave: string;
    open: string;
    closed: string;
    addSlot: string;
    newSchedule: string;
    createSchedule: string;
    deleteSchedule: string;
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
    ruleNote: string;
    statusCurrent: string;
    statusUpcoming: string;
    statusEnded: string;
    overlapWith: string;
    overlapOpenEnded: string;
    openEndedNotice: string;
    setEndDate: string;
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
  branding: {
    title: string;
    desc: string;
    colours: string;
    font: string;
    fontHint: string;
    save: string;
    saved: string;
    errorSave: string;
    preview: string;
    previewUnsaved: string;
    previewSaved: string;
    palettes: Record<PublicPalette, string>;
    fonts: Record<PublicFont, string>;
  };
  products: {
    title: string;
    add: string;
    empty: string;
    emptyHint: string;
    notInPlan: string;
    colProduct: string;
    colPrice: string;
    colStock: string;
    colSupplier: string;
    noSupplier: string;
    stockOut: string;
    stockLast: string;
    stockLow: string;
    stockOk: string;
    stockCount: string;
    newTitle: string;
    back: string;
    name: string;
    price: string;
    stockLabel: string;
    description: string;
    supplier: string;
    supplierHint: string;
    openSupplier: string;
    save: string;
    create: string;
    saved: string;
    errorLoad: string;
    errorSave: string;
    errorDelete: string;
    errorPhoto: string;
    notFound: string;
    photoTitle: string;
    photoPending: string;
    photoAlt: string;
    deleteCard: string;
    deleteTitle: string;
    deleteMessage: string;
    delete: string;
    cancel: string;
    readOnly: string;
    pickerTitle: string;
    pickerHint: string;
    payInShop: string;
    total: string;
    decrease: string;
    increase: string;
    quantity: string;
    overStock: string;
    overStockConfirm: string;
    outOfStockError: string;
    bookingTitle: string;
    sold: string;
    notSold: string;
    leftInStock: string;
    errorSale: string;
    confirmationTitle: string;
    deletedProduct: string;
    zeroNote: string;
    serviceFee: string;
    productsSubtotal: string;
    removeLine: string;
    removeLineTitle: string;
    removeLineMessage: string;
    active: string;
    activeHint: string;
    inactive: string;
  };
  photos: {
    editorTitle: string;
    zoom: string;
    editorHint: string;
    save: string;
    cancel: string;
    add: string;
    replace: string;
    adjust: string;
    remove: string;
    removeTitle: string;
    removeMessage: string;
    hint: string;
    shopTitle: string;
    shopDesc: string;
    shopEmpty: string;
    shopAlt: string;
    errorType: string;
    errorSize: string;
    errorLoad: string;
    errorSave: string;
    errorRemove: string;
  };
  timeOff: {
    title: string;
    shopTitle: string;
    hint: string;
    shopHint: string;
    add: string;
    firstDay: string;
    lastDay: string;
    allDay: string;
    startTime: string;
    endTime: string;
    note: string;
    notePlaceholder: string;
    shopNotePlaceholder: string;
    save: string;
    cancel: string;
    empty: string;
    shopEmpty: string;
    wholeShop: string;
    remove: string;
    removeTitle: string;
    removeMessage: string;
    errorLoad: string;
    errorSave: string;
    errorDelete: string;
    endBeforeStart: string;
    timeEndBeforeStart: string;
    affectedOne: string;
    affectedMany: string;
    viewCalendar: string;
    showPast: string;
    hidePast: string;
  };
  toggles: {
    switchToLight: string;
    switchToDark: string;
    lightMode: string;
    darkMode: string;
    language: string;
  };
  shopSettings: {
    deleteShopConfirmButton: string;
    deleteShopTitle: string;
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
    activeOwnerOnly: string;
    saveChanges: string;
    saveHint: string;
    readOnlyHint: string;
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
    areYouSure: string;
    maxAdvanceLabel: string;
    maxAdvanceHint: string;
    slotIntervalLabel: string;
    slotIntervalHint: string;
    customerChangesTitle: string;
    customerChangesHint: string;
    rescheduleEnabledLabel: string;
    rescheduleEnabledDesc: string;
    cancelCutoffLabel: string;
    cancelCutoffHint: string;
    rescheduleCutoffLabel: string;
    rescheduleCutoffHint: string;
    reminderEnabledLabel: string;
    reminderEnabledDesc: string;
    reminderHoursLabel: string;
    reminderHoursHint: string;
    slotIntervalOption: string;
  };
  sharing: {
    title: string;
    desc: string;
    copyButton: string;
    copiedLabel: string;
    viewButton: string;
  };
  public: {
    identity: {
      askTitle: string;
      askBody: string;
      yes: string;
      no: string;
      knownAs: string;
      notYou: string;
      prompt: string;
      phoneLabel: string;
      phoneHint: string;
      usePhone: string;
      cancel: string;
    };
    notAcceptingTitle: string;
    notAccepting: string;
    notAcceptingCall: string;
    bookAppointment: string;
    service: string;
    staff: string;
    dateTime: string;
    yourDetails: string;
    stepOf: string;
    chooseService: string;
    chooseServiceHint: string;
    chooseServiceToContinue: string;
    bookingAs: string;
    change: string;
    servicesChosen: string;
    servicesLimit: string;
    openMap: string;
    callShop: string;
    stepLabel: string;
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
    privacyNoticeBefore: string;
    privacyNoticeLink: string;
    privacyNoticeAfter: string;
    emailPlaceholder: string;
    notesLabel: string;
    notesOptional: string;
    notesPlaceholder: string;
    rememberLabel: string;
    rememberHint: string;
    confirmBooking: string;
    bookingConfirmed: string;
    bookingConfirmedMsg: string;
    shopNotFound: string;
    somethingWrong: string;
    /** The server is momentarily out of retry budget (503) — never shown as an error. */
    bookingBusy: string;
    ruleErrors: RuleMessages;
    closedThisDay: string;
    closedOrNoSchedule: string;
    manageWorkingHours: string;
    failedSlots: string;
    retry: string;
    serviceContext: string;
    staffContext: string;
    atLabel: string;
    bookAnother: string;
    scrollForMore: string;
  };
  shopGate: {
    notFoundTitle: string;
    notFoundText: string;
    backToShops: string;
    errorLoad: string;
    retry: string;
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
    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    rangeLabel: string;
    range: { week: string; month: string; quarter: string };
    stats: {
      bookings: string;
      completed: string;
      canceled: string;
      noShow: string;
    };
    chart: {
      title: string;
      tableCaption: string;
      periodCol: string;
      countCol: string;
      bookingOne: string;
      bookingMany: string;
      scheduled: string;
    };
    upcoming: {
      title: string;
      viewAll: string;
      empty: string;
      customerCol: string;
      serviceCol: string;
      shopCol: string;
      whenCol: string;
      statusCol: string;
    };
    breakdown: { title: string; total: string; listLabel: string };
    error: { title: string; text: string; retry: string };
    empty: {
      title: string;
      text: string;
      copy: string;
      copied: string;
      week: string;
      month: string;
      quarter: string;
    };
    loadingLabel: string;
  };
  customers: {
    durationsHeading: string;
    durationsBody: string;
    durationsStandard: string;
    durationsUnit: string;
    durationsNoServices: string;
    durationsInvalid: string;
    durationsErrorLoad: string;
    durationsErrorSave: string;
    durationsSaved: string;
    filterCustomDurations: string;
    customDurationsBadge: string;
    cancel: string;
    deleteConfirmButton: string;
    deleteTitle: string;
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
    save: string;
    totalVisitsLabel: string;
    totalSpentLabel: string;
    recentBookings: string;
    noBookings: string;
    privacyHeading: string;
    privacyBody: string;
    exportData: string;
    exportError: string;
    deleteCustomer: string;
    deleteConfirm: string;
    deleteError: string;
    serviceCol: string;
    dateTimeCol: string;
    statusCol: string;
    mergeButton: string;
    mergeHeading: string;
    mergeBody: string;
    mergeTitle: string;
    mergeHint: string;
    mergeSearchLabel: string;
    mergeSelect: string;
    mergeChange: string;
    mergeSummary: string;
    mergeConfirmButton: string;
    mergeError: string;
    mergeSuccess: string;
    bookingHistory: string;
    bookingsErrorLoad: string;
    providerCol: string;
    prevPageLabel: string;
    nextPageLabel: string;
    importButton: string;
    exportLabel: string;
    exportAllError: string;
    importTitle: string;
    importHint: string;
    importFileLabel: string;
    importUnsupported: string;
    importUnreadable: string;
    importMissingColumns: string;
    importEmpty: string;
    importPreview: string;
    importConfirmButton: string;
    importError: string;
    importPartialError: string;
    importResult: string;
    importRowErrors: string;
    importRowError: string;
    importClose: string;
    importProblems: Record<'name_missing' | 'name_too_long' | 'phone_invalid' | 'email_invalid' | 'notes_too_long', string>;
    successUpdate: string;
    errorUpdate: string;
    hiddenLabel: string;
    contactHiddenNotice: string;
    prevPage: string;
    nextPage: string;
    pageOf: string;
  };
  bookings: {
    detail: {
      minutes: string;
      noShow: string;
      cancelBooking: string;
      cancelTitle: string;
      cancelMessage: string;
      keepBooking: string;
      editProducts: string;
      doneEditing: string;
      totalNote: string;
      soldBadge: string;
      notSoldBadge: string;
    };
    block: {
      button: string;
      bookCustomer: string;
      name: string;
      hint: string;
      noteDefault: string;
      confirm: string;
      unblock: string;
      unblocked: string;
    };
    customerPicker: {
      label: string;
      placeholder: string;
      hint: string;
      noMatch: string;
      selected: string;
      change: string;
    };
    statusConflict: string;
    statusError: string;
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
    createSuccess: string;
    createError: string;
    /** The server is momentarily out of retry budget (503) — never shown as an error. */
    bookingBusy: string;
    reschedule: {
      button: string;
      title: string;
      from: string;
      to: string;
      submit: string;
      /** The chosen time breaks rules the owner may override. */
      submitAnyway: string;
      /** Label of the wizard's last step in reschedule mode. */
      confirmStep: string;
      same: string;
      error: string;
      notFound: string;
      notAllowed: string;
      /** Shown in place of "Canceled" on the old half of a reschedule. */
      rescheduledLabel: string;
      /** {when} = the new booking's date and time. */
      rescheduledTo: string;
      /** {when} = the replaced booking's date and time. */
      rescheduledFrom: string;
      viewNew: string;
      serviceWas: string;
    };
    override: RuleMessages & {
      title: string;
      confirm: string;
      cancel: string;
    };
    intervalPicker: { label: string; option: string; offGrid: string; panelTitle: string; confirmButton: string };
    outsideHours: {
      toggle: string;
      workingHours: string;
      BEFORE_OPENING: string;
      BREAK: string;
      AFTER_CLOSING: string;
      CLOSED_DAY: string;
      needsConfirm: string;
      otherTime: string;
      otherTimeHint: string;
      booked: string;
      past: string;
      slotAria: string;
      panelTitle: string;
      panelBody: string;
      confirmButton: string;
    };
    calendar: {
      otherColumn: string;
      off: string;
      closed: string;
      nextDay: string;
      outsideBanner: string;
      tags: {
        OUTSIDE_OPENING_HOURS: string;
        SHOP_CLOSED: string;
        BOOKING_IN_PAST: string;
        OFF_SLOT_GRID: string;
      };
    };
    filters: {
      statusLabel: string;
      staffLabel: string;
      serviceLabel: string;
      allStaff: string;
      allServices: string;
      button: string;
      done: string;
      clear: string;
      showing: string;
      status: Record<'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW', string>;
    };
    bookingCreated: string;
  };
  customerProfile: {
    newCustomer: string;
    newCustomerTitle: string;
    create: string;
    cancel: string;
    errorCreate: string;
    existsError: string;
    existsLink: string;
    photoTitle: string;
    photoDesc: string;
    takePhoto: string;
    choosePhoto: string;
    changePhoto: string;
    removePhoto: string;
    photoLabel: string;
    photoHelp: string;
    wizardPhotoFailed: string;
    pageTitle: string;
    pageIntro: string;
    submit: string;
    successTitle: string;
    successBody: string;
    bookLink: string;
    existingNote: string;
    errorSubmit: string;
    unavailableTitle: string;
    unavailableBody: string;
    sectionTitle: string;
    sectionHint: string;
    photosLabel: string;
    photosDesc: string;
    pageLabel: string;
    pageDesc: string;
    qrDesc: string;
    qrAlt: string;
    download: string;
    print: string;
    saveToShow: string;
    signupLinkTitle: string;
    signupLinkDesc: string;
    changesTitle: string;
    changesDesc: string;
    changesPhoto: string;
    changesAccept: string;
    changesReject: string;
    changesError: string;
    changesPhoneTaken: string;
    changesFilter: string;
    changesBadge: string;
    numberChanged: string;
    newPhoneLabel: string;
    newPhoneHint: string;
  };
  cancelBooking: {
    invalidLink: string;
    cancelling: string;
    alreadyCancelled: string;
    alreadyCompleted: string;
    markedNoShow: string;
    pastBooking: string;
    notFound: string;
    errorCancel: string;
    cancelled: string;
    yourText: string;
    appointmentAt: string;
    hasCancelled: string;
    confirmTitle: string;
    confirmText: string;
    confirmButton: string;
    keepButton: string;
    kept: string;
    /** {n} = hours of notice the shop asks for. */
    windowClosed: string;
    rescheduled: string;
  };
  rescheduleBooking: {
    invalidLink: string;
    notFound: string;
    title: string;
    currentLabel: string;
    keepButton: string;
    kept: string;
    done: string;
    doneText: string;
    doneEmail: string;
    disabled: string;
    /** {n} = hours of notice the shop asks for. */
    windowClosed: string;
    /** {when} = the new booking's date and time. */
    rescheduled: string;
    alreadyCancelled: string;
    alreadyCompleted: string;
    markedNoShow: string;
    pastBooking: string;
    staffUnavailable: string;
    error: string;
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
      dashboard: 'Πίνακας ελέγχου',
      openMenu: 'Άνοιγμα μενού',
      mainNav: 'Κύρια πλοήγηση',
      resize: 'Αλλαγή πλάτους μενού',
      account: 'Λογαριασμός',
      help: 'Βοήθεια',
      overview: 'Επισκόπηση',
      logout: 'Αποσύνδεση',
      home: 'Αρχική',
      shopSection: 'Κατάστημα',
      manageSection: 'Διαχείριση',
      bookings: 'Ραντεβού',
      services: 'Υπηρεσίες',
      products: 'Προϊόντα',
      team: 'Ομάδα',
      invites: 'Προσκλήσεις',
      customers: 'Πελάτες',
      shopSettings: 'Ρυθμίσεις',
      bookAppointment: 'Νέο Ραντεβού',
    },
    help: {
      title: 'Βοήθεια',
      intro: 'Σύντομες απαντήσεις για το πώς δουλεύει το BeBooked. Άνοιξε ένα θέμα για να το διαβάσεις.',
      managersBadge: 'Ιδιοκτήτες και διαχειριστές',
      contactButton: 'Επικοινώνησε μαζί μας',
      sections: {
        gettingStarted: {
          title: 'Ξεκινώντας',
          items: [
            { lead: 'Όρισε πότε δουλεύεις.', text: 'Άνοιξε την Ομάδα, διάλεξε τον εαυτό σου και συμπλήρωσε το Πρόγραμμα Διαθεσιμότητας. Οι πελάτες κλείνουν ραντεβού μόνο μέσα σε αυτές τις ώρες.' },
            { lead: 'Πρόσθεσε τις υπηρεσίες σου.', text: 'Στις Υπηρεσίες, πρόσθεσε κάθε υπηρεσία με τη διάρκεια και την τιμή της και όρισε ποιος από την ομάδα την κάνει.' },
            { lead: 'Μοιράσου τον σύνδεσμο κρατήσεων.', text: 'Ο δημόσιος σύνδεσμος του καταστήματος βρίσκεται στις Ρυθμίσεις. Βάλε τον στο Instagram, στο Google Maps ή σε ένα μήνυμα. Οι πελάτες κλείνουν ραντεβού χωρίς λογαριασμό.' },
            { lead: 'Δοκίμασέ το.', text: 'Άνοιξε τον σύνδεσμο και κλείσε ένα δοκιμαστικό ραντεβού. Θα εμφανιστεί στα Ραντεβού.' },
          ],
        },
        bookings: {
          title: 'Ραντεβού',
          items: [
            { lead: 'Το ημερολόγιο.', text: 'Τα Ραντεβού δείχνουν την ημέρα, με μία στήλη για κάθε μέλος της ομάδας.' },
            { lead: 'Νέο ραντεβού.', text: 'Ο ιδιοκτήτης και οι διαχειριστές μπορούν να καταχωρίσουν ραντεβού για έναν πελάτη, για παράδειγμα μετά από τηλεφώνημα.' },
            { lead: 'Αλλαγή ή ακύρωση.', text: 'Άνοιξε ένα ραντεβού για να δεις τα στοιχεία του. Ο ιδιοκτήτης και οι διαχειριστές μπορούν να το μεταφέρουν ή να το ακυρώσουν οποιαδήποτε στιγμή.' },
            { lead: 'Τι μπορεί να κάνει ο πελάτης.', text: 'Το email επιβεβαίωσης έχει συνδέσμους για ακύρωση και αλλαγή ώρας. Στις Ρυθμίσεις ορίζεις αν επιτρέπεται η αλλαγή ώρας και πόσες ώρες πριν από το ραντεβού παύουν να ισχύουν οι σύνδεσμοι.' },
            { lead: 'Υπενθυμίσεις.', text: 'Οι πελάτες που έχουν δώσει email λαμβάνουν υπενθύμιση πριν από το ραντεβού. Την ενεργοποιείς και ορίζεις τις ώρες στις Ρυθμίσεις.' },
            { lead: 'Κανόνες κρατήσεων.', text: 'Στις Ρυθμίσεις ορίζεις επίσης πόσες ημέρες μπροστά μπορούν να κλείσουν οι πελάτες και κάθε πόσα λεπτά εμφανίζεται διαθέσιμη ώρα.' },
          ],
        },
        teamRoles: {
          title: 'Ομάδα και ρόλοι',
          items: [
            { lead: 'Ιδιοκτήτης.', text: 'Έχει όλα τα δικαιώματα. Μόνο αυτός μπορεί να διαγράψει το κατάστημα ή να το μεταβιβάσει σε άλλον.' },
            { lead: 'Διαχειριστής.', text: 'Τρέχει το κατάστημα καθημερινά: ραντεβού, υπηρεσίες, ομάδα και πελάτες. Ο ιδιοκτήτης μπορεί να του επιτρέψει επιπλέον να διαχειρίζεται άλλους διαχειριστές και να αλλάζει τις ρυθμίσεις του καταστήματος.' },
            { lead: 'Προσωπικό.', text: 'Βλέπει το ημερολόγιο, τις υπηρεσίες και τα προϊόντα. Ο ιδιοκτήτης ορίζει αν βλέπει τα ονόματα και τα στοιχεία επικοινωνίας των πελατών.' },
            { lead: 'Ένα μέλος δεν χρειάζεται λογαριασμό.', text: 'Πρόσθεσε κάποιον μόνο με το όνομά του για να δέχεται ραντεβού. Αν αργότερα θέλεις να χρησιμοποιεί ο ίδιος την εφαρμογή, στείλε του πρόσκληση σύνδεσης με email.' },
            { lead: 'Ποιος δέχεται ραντεβού.', text: 'Κάθε μέλος έχει δύο διακόπτες: αν μπορούν να το επιλέξουν οι πελάτες στη σελίδα κρατήσεων, και αν μπορεί να επιλεγεί σε ραντεβού που καταχωρίζονται μέσα από την εφαρμογή. Ένα μέλος με κλειστούς και τους δύο δεν πιάνει θέση προσωπικού στο πακέτο σου.' },
            { lead: 'Ωράριο και άδειες.', text: 'Κάθε μέλος έχει το δικό του ωράριο και τις δικές του άδειες, στη σελίδα του.' },
            { lead: 'Όταν κάποιος φεύγει.', text: 'Απενεργοποίησε το μέλος: χάνει την πρόσβαση και δεν δέχεται πια ραντεβού, ενώ τα παλιά του ραντεβού μένουν.' },
            { lead: 'Στο Solo.', text: 'Οι προσκλήσεις σύνδεσης και οι διαχειριστές περιλαμβάνονται στα πακέτα Team και Business.' },
          ],
        },
        customers: {
          title: 'Πελάτες',
          items: [
            { lead: 'Η λίστα.', text: 'Όποιος κλείνει ραντεβού αποθηκεύεται στους Πελάτες, μαζί με τα ραντεβού του.' },
            { lead: 'Εισαγωγή.', text: 'Ανέβασε ένα αρχείο CSV, Excel ή JSON με στήλες για όνομα και τηλέφωνο, και προαιρετικά email και σημειώσεις. Αν ένα τηλέφωνο υπάρχει ήδη, ο πελάτης δεν αλλάζει· συμπληρώνονται μόνο το email ή οι σημειώσεις που λείπουν.' },
            { lead: 'Εξαγωγή.', text: 'Κατέβασε όλους τους πελάτες σου σε αρχείο Excel.' },
            { lead: 'Διπλές εγγραφές.', text: 'Αν ο ίδιος άνθρωπος υπάρχει δύο φορές, συγχώνευσε τη διπλή εγγραφή σε αυτήν που κρατάς.' },
            { lead: 'Διαφορετική διάρκεια για έναν πελάτη.', text: 'Αν ένας πελάτης χρειάζεται πάντα περισσότερο ή λιγότερο χρόνο για μια υπηρεσία, όρισε τη δική του διάρκεια στη σελίδα του.' },
            { lead: 'Αιτήματα για προσωπικά δεδομένα.', text: 'Από τη σελίδα ενός πελάτη μπορείς να εξαγάγεις ή να διαγράψεις τα δεδομένα του, αν το ζητήσει.' },
          ],
        },
        products: {
          title: 'Προϊόντα',
          items: [
            { lead: 'Τι είναι.', text: 'Όσα πουλάς στο κατάστημα. Για το καθένα βάζεις όνομα, τιμή, φωτογραφία και πόσα έχεις.' },
            { lead: 'Κράτηση προϊόντος.', text: 'Οι πελάτες μπορούν να κρατήσουν ένα προϊόν την ώρα που κλείνουν ραντεβού και να το παραλάβουν όταν έρθουν. Προϊόντα προστίθενται σε ραντεβού και μέσα από την εφαρμογή.' },
            { lead: 'Απόθεμα.', text: 'Όταν ένα προϊόν τελειώνει ή δεν είναι διαθέσιμο, αυτό φαίνεται δίπλα του.' },
            { lead: 'Στο Solo.', text: 'Τα προϊόντα περιλαμβάνονται στα πακέτα Team και Business.' },
          ],
        },
        plans: {
          title: 'Πακέτα και δοκιμαστική περίοδος',
          items: [
            { lead: 'Solo.', text: 'Ένα άτομο που δέχεται ραντεβού. Ραντεβού, ημερολόγιο, υπηρεσίες, πελάτες, σελίδα κρατήσεων, email επιβεβαίωσης και υπενθύμισης.' },
            { lead: 'Team.', text: 'Έως 5 άτομα που δέχονται ραντεβού. Προσθέτει προσκλήσεις σύνδεσης, διαχειριστές και δικαιώματα, και προϊόντα.' },
            { lead: 'Business.', text: 'Έως 15 άτομα που δέχονται ραντεβού, με όλα όσα έχει το Team.' },
            { lead: 'Δωρεάν δοκιμή.', text: 'Το πρώτο σου κατάστημα είναι δωρεάν για 30 ημέρες. Δεν χρειάζεται κάρτα.' },
            { lead: 'Όταν τελειώσει η δοκιμή.', text: 'Το κατάστημα γίνεται μόνο για ανάγνωση: βλέπεις τα πάντα και μπορείς να εξαγάγεις τους πελάτες σου, αλλά τίποτα δεν αλλάζει και η σελίδα κρατήσεων δεν δέχεται νέα ραντεβού. Επικοινώνησε μαζί μας για να διαλέξεις πακέτο και ξεκλειδώνει.' },
            { lead: 'Περισσότερα καταστήματα.', text: 'Κάθε κατάστημα έχει το δικό του πακέτο. Ένα δεύτερο κατάστημα μένει ανενεργό μέχρι να επικοινωνήσεις μαζί μας για να του οριστεί πακέτο.' },
          ],
        },
        publicPage: {
          title: 'Η δημόσια σελίδα σου',
          items: [
            { lead: 'Ο σύνδεσμός σου.', text: 'Οι πελάτες κλείνουν ραντεβού στον σύνδεσμο του καταστήματος. Το τελευταίο κομμάτι του το διαλέγεις όταν δημιουργείς το κατάστημα και δεν αλλάζει μετά.' },
            { lead: 'Φωτογραφία.', text: 'Πρόσθεσε μια φωτογραφία του καταστήματος στις Ρυθμίσεις. Εμφανίζεται στη σελίδα κρατήσεων.' },
            { lead: 'Χρώματα και γραμματοσειρές.', text: 'Στις Ρυθμίσεις διαλέγεις τα χρώματα και τη γραμματοσειρά της σελίδας κρατήσεων.' },
          ],
        },
        contact: {
          title: 'Επικοινωνία',
          items: [
            { lead: 'Δεν βρήκες αυτό που έψαχνες;', text: 'Γράψε μας αν έχεις απορία ή αν κάτι δεν δουλεύει. Θα σου απαντήσουμε με email.' },
          ],
        },
      },
    },
    dashboard: {
      title: 'Επισκόπηση',
      createShop: 'Νέο κατάστημα',
      invites: {
        title: 'Προσκλήσεις',
        from: 'Ο/Η {email} σε προσκάλεσε ως {role}',
        empty: 'Δεν έχεις προσκλήσεις σε αναμονή.',
      },
      shops: { title: 'Όλα τα καταστήματα' },
      empty: {
        title: 'Δεν ανήκεις ακόμα σε κάποιο κατάστημα',
        text: 'Ζήτησε από τον ιδιοκτήτη του καταστήματός σου να προσκαλέσει το {email}.',
      },
    },
    shops: {
      title: 'Τα Καταστήματά μου',
      newShop: 'Νέο Κατάστημα',
      name: 'Όνομα',
      slug: 'Slug',
      slugHint: 'Μόνο πεζά γράμματα, αριθμοί και παύλες (π.χ. my-shop)',
      slugLockedHint: 'Η διεύθυνση του καταστήματος δεν μπορεί να αλλάξει μετά τη δημιουργία.',
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
      cancel: 'Ακύρωση',
      backToShops: '← Τα Καταστήματά μου',
      notFound: 'Το κατάστημα δεν βρέθηκε.',
      errorLoad: 'Αποτυχία φόρτωσης καταστημάτων.',
      successUpdate: 'Το κατάστημα ενημερώθηκε επιτυχώς.',
    },
home: {
    headline: 'Το πρόγραμμά σου,',
    headlineAccent: 'οργανωμένο.',
    cta: 'Ξεκίνα',
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
    pricingSub: 'Τρία πακέτα, με τιμή ανά κατάστημα. 30 ημέρες δωρεάν χωρίς κάρτα, και χωρίς προμήθεια στις κρατήσεις.',
    pricingPerMonth: '/μήνα',
    pricingPerYear: '/έτος',
    pricingBillingLabel: 'Χρέωση',
    pricingMonthly: 'Μηνιαία',
    pricingYearly: 'Ετήσια · 2 μήνες δώρο',
    pricingPopular: 'Το πιο δημοφιλές',
    pricingWas: 'Αντί για',
    pricingSaving: 'Κερδίζεις €{amount}: 2 μήνες δώρο',
    pricingCta: 'Ξεκίνα δωρεάν',
    pricingFeaturesLabel: 'Περιλαμβάνει',
    pricingExclVat: 'χωρίς ΦΠΑ',
    pricingSoloName: 'Solo',
    pricingSoloDesc: 'Για όποιον δουλεύει μόνος του.',
    pricingSoloFeatures: [
      '1 μέλος προσωπικού με κρατήσεις',
      'Απεριόριστες κρατήσεις',
      'Δημόσια σελίδα κρατήσεων',
      'Ημερολόγιο, υπηρεσίες και πελατολόγιο',
      'Email επιβεβαίωσης με σύνδεσμο ακύρωσης και αλλαγής',
      'Email υπενθύμισης πριν από το ραντεβού',
      'Εισαγωγή και εξαγωγή πελατών',
    ],
    pricingTeamName: 'Team',
    pricingTeamDesc: 'Για καταστήματα με 2 έως 5 άτομα.',
    pricingTeamFeatures: [
      'Έως 5 μέλη προσωπικού με κρατήσεις',
      'Όλα όσα έχει το Solo',
      'Προσκλήσεις ομάδας με email',
      'Ρόλοι και δικαιώματα',
      'Ωράριο ανά μέλος προσωπικού',
      'Προϊόντα που κρατούν οι πελάτες με το ραντεβού τους',
    ],
    pricingBusinessName: 'Business',
    pricingBusinessDesc: 'Για καταστήματα με 6 έως 15 άτομα.',
    pricingBusinessFeatures: [
      'Έως 15 μέλη προσωπικού με κρατήσεις',
      'Όλα όσα έχει το Team',
    ],
    pricingDetailsLink: 'Δες αναλυτικά τι περιλαμβάνει κάθε πακέτο',
    previewHint: 'Έλα, κάνε κλικ τριγύρω — είναι διαδραστικό',
    step1Title: 'Δημιούργησε τον λογαριασμό σου',
    step1Desc: 'Εγγράψου σε δευτερόλεπτα με το email σου.',
    step2Title: 'Στήσε το κατάστημά σου',
    step2Desc: 'Πρόσθεσε τις υπηρεσίες σου, όρισε το ωράριό σου και κάλεσε την ομάδα σου — όλα σε λιγότερο από 10 λεπτά.',
    step3Title: 'Δέξου κρατήσεις',
    step3Desc: 'Μοιράσου τον σύνδεσμο κρατήσεων και ξεκίνα να δέχεσαι πραγματικά ραντεβού αμέσως.',
    faqHeading: 'Συχνές Ερωτήσεις',
    faqSub: 'Βρες απαντήσεις σε συχνές ερωτήσεις.',
    faqContact: 'Επικοινώνησε μαζί μας',
    faq1Q: 'Πόσο κοστίζει το BeBooked;',
    faq1A: 'Το Solo κοστίζει €19 τον μήνα, το Team €35 και το Business €59, ανά κατάστημα και χωρίς ΦΠΑ. Με ετήσια πληρωμή, 2 μήνες είναι δώρο. Οι πρώτες 30 ημέρες είναι δωρεάν και δεν υπάρχει προμήθεια στις κρατήσεις.',
    faq2Q: 'Μπορούν οι πελάτες μου να κλείσουν ραντεβού χωρίς να δημιουργήσουν λογαριασμό;',
    faq2A: 'Ναι. Οι πελάτες απλώς επιλέγουν υπηρεσία, μέλος προσωπικού και ώρα από τη δημόσια σελίδα κρατήσεων του καταστήματός σου — δεν χρειάζεται εγγραφή από τη δική τους πλευρά.',
    faq3Q: 'Πώς διαγράφω τον λογαριασμό μου;',
    faq3A: 'Πήγαινε στις Ρυθμίσεις και επίλεξε Διαγραφή Λογαριασμού. Θα χρειαστεί να επιβεβαιώσεις με τον κωδικό σου. Η διαγραφή είναι οριστική και δεν μπορεί να αναιρεθεί.',
    faq4Q: 'Μπορώ να προσθέσω την ομάδα μου;',
    faq4A: 'Ναι. Καλείς μέλη με email από τη σελίδα Ομάδα του καταστήματός σου και κάθε μέλος έχει δικό του λογαριασμό.',
    featureAlertsIncoming: 'Η Σάρα Μ. ζήτησε ραντεβού για Κούρεμα, σήμερα στις 3:00 μμ.',
    featureAlertsIncomingSubject: 'Νέα αίτηση κράτησης',
    featureAlertsConfirmed: 'Το ραντεβού της Σάρα Μ. επιβεβαιώθηκε για τις 3:00 μμ 👋',
    featureAlertsConfirmedSubject: 'Το ραντεβού επιβεβαιώθηκε',
    featureAlertsTimeNow: 'μόλις τώρα',
    featureAlertsTimeAgo: 'πριν 1 λεπτό',
    featureAlertsTitle: 'Email για κάθε νέα κράτηση',
    featureAlertsDesc: 'Λάβε email όταν ένας πελάτης κλείνει ραντεβού.',
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
    featureChannelsLabel: 'Ένας σύνδεσμος',
    featureChannelsTitle: 'Μοιραστείτε τον στο bio, στο WhatsApp, στην ιστοσελίδα σας',
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
    previewServicesSubtitle: 'Τι προσφέρει το κατάστημά σου.',
    previewTeamPageSubtitle: '5 μέλη προσωπικού ενεργά.',
    previewInvitesSubtitle: 'Φέρε την ομάδα σου στο BeBooked.',
    previewCustomersSubtitle: '312 πελάτες καταχωρημένοι.',
    previewSettingsSubtitle: 'Στοιχεία καταστήματος & προτιμήσεις.',
    previewCalStaff1: 'Μάρκος',
    previewCalStaff2: 'Σοφία',
    previewCalStaff3: 'Τζόρνταν',
    previewCalBlock1Name: 'Σάρα Μ.',
    previewCalBlock1Service: 'Κούρεμα',
    previewCalBlock2Name: 'Γιάννης Ο.',
    previewCalBlock2Service: 'Φορμάρισμα Γενειάδας',
    previewCalBlock3Name: 'Έλενα Ρ.',
    previewCalBlock3Service: 'Βαφή',
    previewCalBlock4Name: 'Δημήτρης Κ.',
    previewCalBlock4Service: 'Μασάζ',
    previewService1Name: 'Κούρεμα',
    previewService1Duration: '30 λεπτά',
    previewService1Desc: 'Κλασικό κούρεμα, καθαρό φινίρισμα.',
    previewService2Name: 'Φορμάρισμα Γενειάδας',
    previewService2Duration: '20 λεπτά',
    previewService2Desc: 'Καθαρές γραμμές, τέλειο σχήμα.',
    previewInviteRowName1: 'Γιάννης Ο.',
    previewInviteRowName2: 'Αλέξης Τ.',
    previewShopDesc: 'Παραδοσιακό κουρείο στο κέντρο της πόλης.',
  },
  privacy: {
    linkLabel: 'Πολιτική Απορρήτου',
    title: 'Πολιτική Απορρήτου',
    lastUpdated: 'Τελευταία ενημέρωση: Οκτώβριος 2026',
    intro: 'Η ιδιωτικότητά σου έχει σημασία. Αυτή η σελίδα εξηγεί, σε απλά λόγια, τι δεδομένα συλλέγει το BeBooked και πώς τα χρησιμοποιεί. Δεν αποτελεί νομική συμβουλή — βρισκόμαστε σε πρώιμο στάδιο και θα ενημερώνουμε αυτή τη σελίδα καθώς η υπηρεσία μεγαλώνει.',
    collectHeading: 'Ποια δεδομένα συλλέγουμε',
    collectBody: 'Συλλέγουμε τα στοιχεία που μας δίνεις όταν δημιουργείς λογαριασμό ή κλείνεις ραντεβού μέσω μιας δημόσιας σελίδας καταστήματος: όνομα, email, τηλέφωνο και βασικά στοιχεία του καταστήματός σου (όνομα, διεύθυνση, υπηρεσίες, ωράριο). Δεν συλλέγουμε στοιχεία πληρωμής, καθώς το BeBooked δεν επεξεργάζεται πληρωμές.',
    useHeading: 'Πώς τα χρησιμοποιούμε',
    useBody: 'Χρησιμοποιούμε τα δεδομένα σου για να λειτουργήσει η υπηρεσία: να δημιουργούμε και να διαχειριζόμαστε ραντεβού, να στέλνουμε emails επιβεβαίωσης ή ειδοποιήσεων και να σου παρέχουμε υποστήριξη όταν τη χρειάζεσαι. Δεν πουλάμε ούτε νοικιάζουμε τα δεδομένα σου σε τρίτους.',
    cookiesHeading: 'Cookies και τοπική αποθήκευση',
    cookiesBody: 'Χρησιμοποιούμε έναν μικρό αριθμό cookies και τοπικής αποθήκευσης του browser για βασικές λειτουργίες, όπως η διατήρηση της σύνδεσής σου και η προτίμηση γλώσσας/θέματος. Αν επιλέξεις «Αποθήκευση των στοιχείων μου» σε μια σελίδα κρατήσεων, το όνομα, το τηλέφωνο και το email σου αποθηκεύονται στην τοπική αποθήκευση του browser σου για να συμπληρωθούν στην επόμενη κράτηση· μένουν στη συσκευή σου για έως 12 μήνες και διαγράφονται μόλις αποεπιλέξεις το πεδίο ή καθαρίσεις τα δεδομένα του ιστότοπου. Μετά από μια κράτηση, η επιβεβαίωσή της κρατιέται στην καρτέλα του browser μέχρι να την κλείσεις, ώστε να φαίνεται ξανά αν ανανεώσεις τη σελίδα. Δεν χρησιμοποιούμε cookies τρίτων για διαφήμιση ή παρακολούθηση.',
    sharingHeading: 'Κοινοποίηση δεδομένων',
    sharingBody: 'Δεν μοιραζόμαστε τα δεδομένα σου με τρίτους, εκτός από τους παρόχους υπηρεσιών που χρειαζόμαστε για να λειτουργήσει το BeBooked (π.χ. αποστολή email, φιλοξενία, παρακολούθηση σφαλμάτων). Αυτοί οι πάροχοι έχουν πρόσβαση μόνο στα δεδομένα που χρειάζονται για να παρέχουν την υπηρεσία τους. Όταν κάτι πάει στραβά στην εφαρμογή, μια τεχνική αναφορά σφάλματος (το σφάλμα, η σελίδα, ο τύπος του browser και ενδεχομένως η διεύθυνση IP) στέλνεται στη Sentry, τον πάροχο παρακολούθησης σφαλμάτων μας, σε διακομιστές εντός ΕΕ, για να μπορέσουμε να το διορθώσουμε. Έχουμε απενεργοποιήσει τη συλλογή του περιεχομένου των φορμών και των cookies σε αυτές τις αναφορές.',
    rightsHeading: 'Τα δικαιώματά σου',
    rightsBody: 'Μπορείς να ζητήσεις πρόσβαση, διόρθωση ή διαγραφή των δεδομένων σου ανά πάσα στιγμή, επικοινωνώντας μαζί μας. Διατηρούμε τα δεδομένα σου όσο ο λογαριασμός σου παραμένει ενεργός, εκτός αν μας ζητήσεις κάτι διαφορετικό.',
    changesHeading: 'Αλλαγές σε αυτή την πολιτική',
    changesBody: 'Καθώς το BeBooked εξελίσσεται, ενδέχεται να ενημερώσουμε αυτή τη σελίδα. Θα αναφέρουμε πάντα εδώ την ημερομηνία τελευταίας ενημέρωσης.',
    contact: 'Για ερωτήσεις σχετικά με τα δεδομένα σου, επικοινώνησε στο',
  },
  terms: {
    linkLabel: 'Όροι Χρήσης',
    title: 'Όροι Χρήσης',
    lastUpdated: 'Τελευταία ενημέρωση: Σεπτέμβριος 2026',
    intro: 'Χρησιμοποιώντας το BeBooked, συμφωνείς με τους παρακάτω όρους. Βρισκόμαστε σε πρώιμο στάδιο ανάπτυξης, οπότε αυτοί οι όροι μπορεί να αλλάξουν καθώς η υπηρεσία ωριμάζει.',
    useHeading: 'Χρήση του BeBooked',
    useBody: 'Το BeBooked είναι μια πλατφόρμα διαχείρισης ραντεβού για καταστήματα όπως κουρεία και σαλόνια ομορφιάς. Μπορείς να το χρησιμοποιήσεις για να διαχειρίζεσαι το κατάστημά σου, την ομάδα σου και τους πελάτες σου, εφόσον το κάνεις νόμιμα και με καλή πίστη.',
    accountsHeading: 'Λογαριασμοί και ευθύνη',
    accountsBody: 'Είσαι υπεύθυνος/η για τη διατήρηση της ασφάλειας του λογαριασμού σου και για κάθε ενέργεια που πραγματοποιείται μέσω αυτού. Ενημέρωσέ μας άμεσα αν υποψιαστείς μη εξουσιοδοτημένη πρόσβαση.',
    acceptableHeading: 'Αποδεκτή χρήση',
    acceptableBody: 'Δεν επιτρέπεται η χρήση του BeBooked για παράνομες δραστηριότητες, την αποστολή ανεπιθύμητων μηνυμάτων ή οποιαδήποτε ενέργεια που θα μπορούσε να βλάψει την υπηρεσία ή άλλους χρήστες.',
    availabilityHeading: 'Διαθεσιμότητα υπηρεσίας',
    availabilityBody: 'Το BeBooked βρίσκεται σε φάση beta. Καταβάλλουμε κάθε προσπάθεια ώστε η υπηρεσία να είναι διαθέσιμη και αξιόπιστη, αλλά δεν μπορούμε να εγγυηθούμε αδιάλειπτη λειτουργία κατά τη διάρκεια αυτού του σταδίου.',
    liabilityHeading: 'Περιορισμός ευθύνης',
    liabilityBody: 'Το BeBooked παρέχεται "ως έχει", χωρίς καμία εγγύηση. Στον μέγιστο βαθμό που επιτρέπει ο νόμος, δεν φέρουμε ευθύνη για έμμεσες ζημιές που μπορεί να προκύψουν από τη χρήση της υπηρεσίας.',
    changesHeading: 'Αλλαγές σε αυτούς τους όρους',
    changesBody: 'Μπορεί να ενημερώνουμε αυτούς τους όρους καθώς εξελίσσεται το BeBooked. Η συνέχιση της χρήσης της υπηρεσίας μετά από μια ενημέρωση σημαίνει ότι αποδέχεσαι τους νέους όρους.',
    contact: 'Για ερωτήσεις σχετικά με τους όρους χρήσης, επικοινώνησε στο',
  },
  about: {
    badge: 'Η ιστορία',
    title: 'Γεια, είμαι ο Νίκος — έφτιαξα το BeBooked για τη μαμά μου 🧡.',
    intro: 'Το BeBooked ξεκίνησε ως ένα μικρό εργαλείο για να βοηθήσω τη μαμά μου να διαχειρίζεται τα ραντεβού στο δικό της κατάστημα, χωρίς το χάος των τηλεφωνημάτων και των σημειώσεων σε χαρτί.',
    storyHeading: 'Γιατί το έφτιαξα',
    storyBody: 'Έβλεπα τη μαμά μου να παλεύει κάθε μέρα με ένα τετράδιο ραντεβού, να χάνει κρατήσεις και να ξοδεύει ώρες στο τηλέφωνο. Έφτιαξα το BeBooked για να λύσω αυτό ακριβώς το πρόβλημα — για εκείνη, αλλά και για κάθε κατάστημα σαν το δικό της. Σήμερα το χτίζω, το συντηρώ και το βελτιώνω μόνος μου, κομμάτι-κομμάτι.',
    githubLabel: 'Δες τον κώδικα στο GitHub',
    contactLabel: 'Επικοινώνησε μαζί μου',
  },
  contact: {
    badge: 'Πες Γεια 👋',
    title: 'Ας μιλήσουμε!',
    intro: 'Βρήκες κάποιο bug, έχεις κάποια ερώτηση ή μια ιδέα για το BeBooked; Στείλε μου ένα μήνυμα και θα σου απαντήσω το συντομότερο δυνατό.',
    buttonLabel: 'Επικοινώνησε μαζί μου',
  },
  shopPlan: {
    newShopTrial: 'Το πρώτο σου κατάστημα ξεκινά με 30 ημέρες δωρεάν δοκιμή, με όλες τις δυνατότητες του Team. Δεν χρειάζεται κάρτα.',
    newShopInactive: 'Έχεις ήδη χρησιμοποιήσει τη δωρεάν δοκιμή. Το νέο κατάστημα θα μείνει ανενεργό μέχρι να επικοινωνήσεις μαζί μας για να του ορίσουμε πακέτο.',
    staffLimitReached: 'Το πακέτο {plan} επιτρέπει έως {n} μέλη προσωπικού με κρατήσεις. Για περισσότερα χρειάζεται αναβάθμιση.',
    featureNotInPlan: 'Οι προσκλήσεις ομάδας και ο ρόλος διαχειριστή δεν περιλαμβάνονται στο πακέτο {plan}.',
    locked: 'Το κατάστημα είναι μόνο για ανάγνωση μέχρι να οριστεί πακέτο.',
    contactUs: 'Επικοινώνησε μαζί μας',
    title: 'Πακέτο',
    active: 'Η συνδρομή είναι ενεργή.',
    trialUntil: 'Δωρεάν δοκιμή έως {date}.',
    trialEnded: 'Η δωρεάν δοκιμή τελείωσε. Το κατάστημα είναι μόνο για ανάγνωση.',
    inactive: 'Δεν υπάρχει ενεργή συνδρομή. Το κατάστημα είναι μόνο για ανάγνωση.',
    staffLimit: 'Έως {n} μέλη προσωπικού με κρατήσεις.',
    changePlan: 'Για να ξεκινήσεις ή να αλλάξεις πακέτο, επικοινώνησε μαζί μας.',
    seePlans: 'Δες τα πακέτα',
    lockedTitle: 'Το κατάστημα είναι μόνο για ανάγνωση',
    lockedOwner: 'Η δοκιμή τελείωσε ή δεν υπάρχει ενεργή συνδρομή. Βλέπεις τα πάντα και μπορείς να εξάγεις τους πελάτες σου, αλλά δεν γίνονται αλλαγές και η σελίδα κρατήσεων δεν δέχεται νέα ραντεβού.',
    trialEnding: 'Η δωρεάν δοκιμή τελειώνει στις {date}. Επικοινώνησε μαζί μας για να διαλέξεις πακέτο.',
  },
  pricingPage: {
    title: 'Τιμές',
    intro: 'Τρία πακέτα, με τιμή ανά κατάστημα τον μήνα. Παρακάτω φαίνεται τι ακριβώς περιλαμβάνει το καθένα.',
    featureCol: 'Δυνατότητα',
    included: 'Περιλαμβάνεται',
    notIncluded: 'Δεν περιλαμβάνεται',
    groups: [
      {
        title: 'Σελίδα κρατήσεων',
        rows: [
          ['Δημόσια σελίδα κρατήσεων στον δικό σου σύνδεσμο', true, true, true],
          ['Οι πελάτες κλείνουν χωρίς να φτιάξουν λογαριασμό', true, true, true],
          ['Ακύρωση και αλλαγή ώρας από τον πελάτη, με όριο ωρών που ορίζεις', true, true, true],
          ['Ελληνικά και Αγγλικά', true, true, true],
        ],
      },
      {
        title: 'Ημερολόγιο και ραντεβού',
        rows: [
          ['Ημερήσιο ημερολόγιο με στήλη ανά μέλος προσωπικού', true, true, true],
          ['Ραντεβού που καταχωρείς εσύ, και εκτός ωραρίου', true, true, true],
          ['Κλείδωμα ωρών στο ημερολόγιο', true, true, true],
          ['Καταστάσεις ραντεβού: ολοκληρώθηκε, δεν εμφανίστηκε, ακυρώθηκε', true, true, true],
          ['Προστασία από διπλές κρατήσεις', true, true, true],
          ['Σύνοψη με αριθμό ραντεβού ανά εβδομάδα, μήνα και τρίμηνο', true, true, true],
        ],
      },
      {
        title: 'Υπηρεσίες και πελάτες',
        rows: [
          ['Υπηρεσίες με τιμή και διάρκεια', true, true, true],
          ['Φωτογραφία για το κατάστημα και για κάθε μέλος', true, true, true],
          ['Προϊόντα που κρατούν οι πελάτες με το ραντεβού τους (πληρωμή στο κατάστημα)', false, true, true],
          ['Υπηρεσίες μόνο για εσωτερική χρήση', true, true, true],
          ['Καρτέλα πελάτη με σημειώσεις και ιστορικό', true, true, true],
          ['Δική του διάρκεια υπηρεσίας ανά πελάτη', true, true, true],
          ['Εισαγωγή πελατών από αρχείο και εξαγωγή σε Excel', true, true, true],
          ['Συγχώνευση διπλών πελατών', true, true, true],
        ],
      },
      {
        title: 'Email',
        rows: [
          ['Email επιβεβαίωσης ραντεβού', true, true, true],
          ['Email υπενθύμισης, όσες ώρες πριν ορίσεις', true, true, true],
          ['Email ακύρωσης και αλλαγής ώρας', true, true, true],
          ['Ειδοποίηση στο κατάστημα για κάθε νέο ραντεβού', true, true, true],
        ],
      },
      {
        title: 'Ομάδα',
        rows: [
          ['Μέλη προσωπικού με κρατήσεις', '1', 'Έως 5', 'Έως 15'],
          ['Ωράριο λειτουργίας', true, true, true],
          ['Ξεχωριστό ωράριο ανά μέλος προσωπικού', false, true, true],
          ['Προσκλήσεις ομάδας με email', false, true, true],
          ['Ρόλοι και δικαιώματα (ιδιοκτήτης, διαχειριστής, προσωπικό)', false, true, true],
        ],
      },
      {
        title: 'Όρια',
        rows: [
          ['Κρατήσεις τον μήνα', 'Χωρίς όριο', 'Χωρίς όριο', 'Χωρίς όριο'],
          ['Καταστήματα ανά συνδρομή', '1', '1', '1'],
        ],
      },
    ],
    notesTitle: 'Καλό να γνωρίζεις',
    notes: [
      'Οι τιμές είναι ανά κατάστημα, χωρίς ΦΠΑ. Με ετήσια πληρωμή πληρώνεις 10 μήνες αντί για 12.',
      'Κάθε νέο κατάστημα ξεκινά με 30 ημέρες δωρεάν δοκιμή, με όλες τις δυνατότητες του Team. Δεν χρειάζεται κάρτα.',
      'Αν η δοκιμή τελειώσει χωρίς πακέτο, το κατάστημα γίνεται μόνο για ανάγνωση και η σελίδα κρατήσεων δεν δέχεται νέα ραντεβού. Τα δεδομένα σου μένουν.',
      'Δεν υπάρχει προμήθεια στις κρατήσεις.',
      'Οι επιβεβαιώσεις και οι υπενθυμίσεις στέλνονται με email. Δεν υπάρχουν SMS.',
      'Δεν υπάρχουν online πληρωμές ή προκαταβολές από πελάτες.',
    ],
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
      rememberMe: 'Να με θυμάσαι',
      error: 'Η σύνδεση απέτυχε.',
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
      acceptPrefix: 'Αποδέχομαι τους',
      acceptAnd: 'και την',
      termsRequired: 'Πρέπει να αποδεχτείτε τους Όρους Χρήσης και την Πολιτική Απορρήτου για να συνεχίσετε.',
      error: 'Η εγγραφή απέτυχε.',
    },
    dpa: {
      linkLabel: 'Συμφωνία Επεξεργασίας Δεδομένων',
      title: 'Συμφωνία Επεξεργασίας Δεδομένων (DPA)',
      lastUpdated: 'Τελευταία ενημέρωση: Οκτώβριος 2026',
      placeholderNotice: 'Προσωρινό κείμενο: η τελική Συμφωνία Επεξεργασίας Δεδομένων θα δημοσιευτεί πριν την επίσημη λειτουργία της υπηρεσίας.',
      intro: 'Το παρόν περιγράφει πώς το BeBooked επεξεργάζεται προσωπικά δεδομένα για λογαριασμό των καταστημάτων που το χρησιμοποιούν.',
      rolesHeading: 'Ρόλοι',
      rolesBody: 'Το κατάστημα είναι ο υπεύθυνος επεξεργασίας των δεδομένων των πελατών του. Το BeBooked ενεργεί ως εκτελών την επεξεργασία και επεξεργάζεται τα δεδομένα μόνο βάσει των οδηγιών του καταστήματος.',
      processingHeading: 'Αντικείμενο επεξεργασίας',
      processingBody: 'Όνομα, τηλέφωνο, προαιρετικό email και σημειώσεις πελατών, καθώς και το ιστορικό των κρατήσεών τους, με σκοπό τη διαχείριση ραντεβού.',
      subprocessorsHeading: 'Υπο-εκτελούντες',
      subprocessorsBody: 'Πάροχος φιλοξενίας της εφαρμογής και της βάσης δεδομένων, πάροχος αποστολής email συναλλαγών, και πάροχος παρακολούθησης σφαλμάτων (Sentry, με αποθήκευση εντός ΕΕ), που λαμβάνει τεχνικές αναφορές σφαλμάτων χωρίς το περιεχόμενο των φορμών. Ο ακριβής κατάλογος θα δημοσιευτεί στην τελική έκδοση.',
      securityHeading: 'Ασφάλεια',
      securityBody: 'Κρυπτογραφημένες συνδέσεις (HTTPS), περιορισμένη πρόσβαση ανά κατάστημα και κατακερματισμός κωδικών πρόσβασης.',
      rightsHeading: 'Δικαιώματα υποκειμένων',
      rightsBody: 'Ο ιδιοκτήτης του καταστήματος μπορεί να εξάγει ή να διαγράψει τα δεδομένα ενός πελάτη από τη σελίδα του πελάτη στον πίνακα ελέγχου.',
      contact: 'Επικοινωνία για θέματα προστασίας δεδομένων:',
    },
    forgotPassword: {
      title: 'Ξεχάσατε τον Κωδικό',
      emailLabel: 'Email',
      submit: 'Αποστολή Συνδέσμου Επαναφοράς',
      submitting: 'Αποστολή...',
      success: 'Εάν αυτό το email υπάρχει θα λάβετε έναν σύνδεσμο επαναφοράς σύντομα.',
      backToLogin: 'Πίσω στη Σύνδεση',
      error: 'Κάτι πήγε στραβά.',
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
      error: 'Η επαναφορά απέτυχε.',
    },
    verifyEmail: {
      title: 'Επαλήθευση Email',
      verifying: 'Επαλήθευση...',
      resendLabel: 'Εισάγετε το email σας για να λάβετε νέο σύνδεσμο:',
      resendPlaceholder: 'εσεις@παραδειγμα.com',
      resendSubmit: 'Αποστολή Email Επαλήθευσης',
      resending: 'Αποστολή...',
      resentOk: 'Email εστάλη! Ελέγξτε εισερχόμενα και ανεπιθύμητα.',
      backToRegister: 'Πίσω στην Εγγραφή',
      passwordIntro: 'Εισάγετε τον κωδικό που επιλέξατε στην εγγραφή για να ολοκληρώσετε τη δημιουργία του λογαριασμού σας.',
      passwordLabel: 'Κωδικός',
      submit: 'Επαλήθευση email',
      wrongPassword: 'Αυτός δεν είναι ο κωδικός με τον οποίο εγγραφήκατε.',
      invalidLink: 'Μη έγκυρος σύνδεσμος επαλήθευσης.',
      error: 'Η επαλήθευση απέτυχε.',
      resendError: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.',
    },
    verifyEmailChange: {
      title: 'Επαλήθευση Αλλαγής Email',
      verifying: 'Επαλήθευση...',
      success: 'Η διεύθυνση email σας ενημερώθηκε.',
      invalidLink: 'Μη έγκυρος σύνδεσμος επαλήθευσης.',
      error: 'Η επαλήθευση απέτυχε.',
      continue: 'Συνέχεια',
      backToAccount: 'Πίσω στον Λογαριασμό',
    },
    settings: {
      wrongPassword: 'Λάθος κωδικός.',
      soleOwnerOfShop: 'Είστε ο ιδιοκτήτης ενός καταστήματος. Διαγράψτε το κατάστημα ή μεταβιβάστε το πρώτα σε έναν διαχειριστή.',
      deleteAccountMessage: 'Αυτό θα διαγράψει οριστικά τον λογαριασμό σας και όλα τα δεδομένα σας. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteAccountConfirmButton: 'Διαγραφή λογαριασμού',
      deleteAccountTitle: 'Διαγραφή του λογαριασμού σας;',
      title: 'Λογαριασμός',
      profileSection: 'Προφίλ',
      saveProfile: 'Αποθήκευση Προφίλ',
      successProfile: 'Το προφίλ ενημερώθηκε επιτυχώς.',
      errorProfile: 'Αποτυχία ενημέρωσης προφίλ.',
      emailSection: 'Διεύθυνση Email',
      emailLabel: 'Email',
      saveEmail: 'Αποθήκευση Email',
      passwordSection: 'Αλλαγή Κωδικού',
      newPasswordLabel: 'Νέος Κωδικός',
      newPasswordOptionalLabel: 'Νέος Κωδικός (προαιρετικό)',
      currentPasswordLabel: 'Τρέχων κωδικός',
      updatePassword: 'Ενημέρωση Κωδικού',
      showPassword: 'Εμφάνιση κωδικού',
      hidePassword: 'Απόκρυψη κωδικού',
      logout: 'Αποσύνδεση',
      logoutDesc: 'Αποσυνδεθείτε από τον λογαριασμό σας σε αυτή τη συσκευή.',
      dangerZone: 'Επικίνδυνη Ζώνη',
      dangerDesc: 'Οριστική διαγραφή λογαριασμού και όλων των δεδομένων. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteAccount: 'Διαγραφή Λογαριασμού',
      confirmPasswordLabel: 'Επιβεβαίωση κωδικού',
      confirmPasswordPlaceholder: 'Ο κωδικός σας',
      cancel: 'Ακύρωση',
      pwMin: 'Τουλάχιστον 8 χαρακτήρες',
      pwUpper: 'Ένα κεφαλαίο γράμμα',
      pwNumber: 'Ένας αριθμός',
      pwSpecial: 'Ένας ειδικός χαρακτήρας (!@#$%...)',
      nameSection: 'Όνομα Χρήστη',
      nameLabel: 'Όνομα Χρήστη',
      saveName: 'Αποθήκευση Ονόματος',
      preferencesSection: 'Προτιμήσεις',
      paletteLabel: 'Χρώματα',
      paletteDesc: 'Τα χρώματα της εφαρμογής σε αυτή τη συσκευή',
      palettes: { original: 'Αρχικό', mono: 'Ασπρόμαυρο', purple: 'Μωβ' },
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
      photoHint: "Όταν μπαίνεις σε μια ομάδα, η φωτογραφία αυτή γίνεται η αρχική σου φωτογραφία εκεί. Το κατάστημα μπορεί να την αλλάξει χωρίς να επηρεαστεί αυτή.",
    },
    notFound: {
      code: '404',
      title: 'Η σελίδα δεν βρέθηκε',
      message: 'Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.',
      goHome: 'Αρχική',
    },
    team: {
      demoteConfirmButton: 'Αφαίρεση πρόσβασης διαχειριστή',
      demoteTitle: 'Αφαίρεση πρόσβασης διαχειριστή από «{name}»;',
      promoteConfirmButton: 'Ορισμός διαχειριστή',
      promoteTitle: 'Να γίνει διαχειριστής ο/η «{name}»;',
      removeConfirmButton: 'Αφαίρεση μέλους',
      removeTitle: 'Αφαίρεση «{name}»;',
      title: 'Μέλη Ομάδας',
      email: 'Email',
      role: 'Ρόλος',
      joined: 'Εντάχθηκε',
      actions: 'Ενέργειες',
      roles: { owner: 'Ιδιοκτήτης', manager: 'Διαχειριστής', staff: 'Προσωπικό' },
      remove: 'Αφαίρεση',
      cancel: 'Ακύρωση',
      noMembers: 'Δεν υπάρχουν μέλη ακόμα.',
      notFound: 'Το μέλος δεν βρέθηκε.',
      errorLoad: 'Αποτυχία φόρτωσης μελών.',
      errorRemove: 'Αποτυχία αφαίρεσης μέλους.',
      errorRemoveHasBookings: 'Αυτό το μέλος έχει κρατήσεις. Απενεργοποιήστε το αντί να το αφαιρέσετε.',
      backToTeam: 'Πίσω στην Ομάδα',
      editRole: 'Επεξεργασία Ρόλου',
      saveRole: 'Αποθήκευση Ρόλου',
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
      errorInviteInactive: 'Ενεργοποιήστε αυτό το μέλος πριν στείλετε πρόσκληση.',
      errorCancelInvite: 'Αποτυχία ακύρωσης πρόσκλησης.',
      canViewCustomerDetails: 'Προβολή στοιχείων πελατών',
      canViewCustomerDetailsDesc: 'Όταν είναι ανενεργό, το μέλος βλέπει μόνο τη λέξη «Πελάτης», χωρίς όνομα, τηλέφωνο ή email.',
      active: 'Ενεργό',
      activeDesc: 'Όταν είναι ανενεργό, το μέλος δεν εμφανίζεται πουθενά για κράτηση και χάνει την πρόσβαση σε αυτό το κατάστημα.',
      ownerAlwaysActiveHint: 'Ο ιδιοκτήτης παραμένει πάντα ενεργός, ώστε να μη χάσει ποτέ την πρόσβασή του.',
      bookableByCustomers: 'Διαθέσιμο για κράτηση από πελάτες',
      bookableByCustomersDesc: 'Ελέγχει αν το μέλος εμφανίζεται ως επιλογή στον δημόσιο σύνδεσμο κρατήσεων.',
      bookableInternally: 'Διαθέσιμο για εσωτερική κράτηση',
      bookableInternallyDesc: 'Ελέγχει αν το μέλος εμφανίζεται ως επιλογή όταν δημιουργείτε ραντεβού μέσα από την εφαρμογή.',
      inactiveBadge: 'Ανενεργό',
      canManageManagers: 'Διαχείριση διαχειριστών',
      canManageManagersDesc: 'Όταν είναι ενεργό, μπορεί να προσθέτει, να αλλάζει και να αφαιρεί άλλους διαχειριστές. Αλλιώς διαχειρίζεται μόνο το προσωπικό.',
      canEditShopSettings: 'Επεξεργασία ρυθμίσεων καταστήματος',
      canEditShopSettingsDesc: 'Όταν είναι ενεργό, μπορεί να αλλάζει τα στοιχεία και τις ρυθμίσεις του καταστήματος. Αλλιώς τα βλέπει μόνο.',
      confirmPromoteManager: 'Αυτό το άτομο θα γίνει διαχειριστής: θα διαχειρίζεται προσωπικό, υπηρεσίες, ωράρια, ραντεβού και πελάτες. Ο ιδιοκτήτης ορίζει αν μπορεί να διαχειρίζεται άλλους διαχειριστές ή τις ρυθμίσεις του καταστήματος.',
      confirmDemoteManager: 'Αυτό το άτομο θα χάσει την πρόσβαση διαχειριστή.',
      transferOwnership: 'Μεταβίβαση ιδιοκτησίας',
      transferDesc: 'Αυτό το άτομο γίνεται ιδιοκτήτης του καταστήματος και εσείς γίνεστε διαχειριστής.',
      transferTitle: 'Μεταβίβαση του καταστήματος στον/στην «{name}»;',
      confirmTransfer: 'Θα γίνει ο ιδιοκτήτης και μόνο αυτός θα μπορεί να διαγράψει το κατάστημα ή να το μεταβιβάσει ξανά. Εσείς θα παραμείνετε ως διαχειριστής.',
      transferConfirmButton: 'Μεταβίβαση ιδιοκτησίας',
      errorTransfer: 'Η μεταβίβαση ιδιοκτησίας απέτυχε.',
      emailLabel: 'Email',
      saveEmail: 'Αποθήκευση Email',
      addEmailFirst: 'Προσθέστε email πριν στείλετε πρόσκληση σύνδεσης',
      errorSaveEmail: 'Αποτυχία αποθήκευσης email.',
      emailChangedHint: 'Αποθηκεύστε τις αλλαγές παραπάνω πριν στείλετε την πρόσκληση.',
    },
    invites: {
      declineConfirmButton: 'Απόρριψη πρόσκλησης',
      declineMessage: 'Δεν θα προστεθείτε σε αυτό το κατάστημα.',
      declineTitle: 'Απόρριψη πρόσκλησης στο «{shop}»;',
      cancelInviteConfirmButton: 'Ακύρωση πρόσκλησης',
      cancelInviteMessage: 'Η εκκρεμής πρόσκληση θα ανακληθεί.',
      cancelInviteTitle: 'Ακύρωση πρόσκλησης για «{name}»;',
      managerInviteConfirmButton: 'Πρόσκληση ως διαχειριστή',
      managerInviteTitle: 'Πρόσκληση «{name}» ως διαχειριστή;',
      title: 'Προσκλήσεις',
      received: 'Ληφθείσες',
      sent: 'Απεσταλμένες',
      sendInvite: 'Αποστολή Πρόσκλησης',
      emailLabel: 'Email',
      roleLabel: 'Ρόλος',
      accept: 'Αποδοχή',
      decline: 'Απόρριψη',
      revoke: 'Ανάκληση',
      revoking: 'Ανάκληση...',
      status: { pending: 'Εκκρεμής', accepted: 'Αποδεκτή', expired: 'Ληγμένη' },
      roles: { owner: 'Ιδιοκτήτης', manager: 'Διαχειριστής', staff: 'Προσωπικό' },
      expiresAt: 'Λήγει',
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
      confirmManagerInvite: 'Αυτό το άτομο θα γίνει διαχειριστής: θα διαχειρίζεται προσωπικό, υπηρεσίες, ωράρια, ραντεβού και πελάτες. Οι επιπλέον άδειες ορίζονται από τον ιδιοκτήτη στο προφίλ του.',
      createdNoEmail: 'Το μέλος δημιουργήθηκε. Δεν στάλθηκε πρόσκληση σύνδεσης.',
      pendingLogins: 'Μέλη χωρίς σύνδεση',
      noPendingLogins: 'Όλα τα μέλη έχουν σύνδεση.',
      notSentYet: 'Δεν έχει σταλεί',
      resend: 'Επαναποστολή',
      cancelInvite: 'Ακύρωση Πρόσκλησης',
      errorResend: 'Αποτυχία αποστολής πρόσκλησης.',
      errorCancel: 'Αποτυχία ακύρωσης πρόσκλησης.',
      statusLabel: 'Κατάσταση',
      optional: 'προαιρετικό',
      dashboard: 'Ταμπλό',
      invitedToJoin: 'σας προσκάλεσε στο',
    },
    services: {
      errorHasBookings: 'Αυτή η υπηρεσία έχει κρατήσεις. Απενεργοποιήστε την ώστε να μην μπορούν οι πελάτες να την κλείσουν.',
      errorHasBookingsInactive: 'Αυτή η υπηρεσία έχει κρατήσεις και δεν μπορεί να διαγραφεί. Είναι ήδη ανενεργή, άρα οι πελάτες δεν μπορούν να την κλείσουν.',
      deactivateTitle: 'Απενεργοποίηση «{name}»;',
      deactivate: 'Απενεργοποίηση',
      errorDeactivate: 'Αποτυχία απενεργοποίησης υπηρεσίας.',
      deleteConfirmButton: 'Διαγραφή υπηρεσίας',
      deleteMessage: 'Η υπηρεσία θα διαγραφεί οριστικά. Η ενέργεια δεν μπορεί να αναιρεθεί.',
      deleteTitle: 'Διαγραφή «{name}»;',
      title: 'Υπηρεσίες',
      addService: 'Νέα Υπηρεσία',
      create: 'Δημιουργία',
      name: 'Όνομα',
      description: 'Περιγραφή',
      duration: 'Διάρκεια',
      price: 'Τιμή',
      isActive: 'Ενεργή',
      showOnPublicPage: 'Εμφάνιση στη δημόσια σελίδα',
      showOnPublicPageHint: 'Όταν είναι κλειστό, μόνο η ομάδα μπορεί να κλείσει ραντεβού για αυτή την υπηρεσία.',
      internalOnly: 'Εσωτερική',
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      edit: 'Επεξεργασία',
      delete: 'Διαγραφή',
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
      deleteScheduleConfirmButton: 'Διαγραφή προγράμματος',
      deleteScheduleMessage: 'Το πρόγραμμα και οι ώρες εργασίας του θα διαγραφούν οριστικά.',
      deleteScheduleTitle: 'Διαγραφή αυτού του προγράμματος;',
      title: 'Ώρες Λειτουργίας',
      save: 'Αποθήκευση Αλλαγών',
      successSave: 'Οι ώρες λειτουργίας αποθηκεύτηκαν.',
      errorLoad: 'Αποτυχία φόρτωσης ωρών λειτουργίας.',
      errorSave: 'Αποτυχία αποθήκευσης αλλαγών.',
      open: 'Ανοιχτό',
      closed: 'Κλειστό',
      addSlot: '+ Προσθήκη',
      newSchedule: 'Νέο Πρόγραμμα',
      createSchedule: 'Δημιουργία',
      deleteSchedule: 'Διαγραφή',
      cancel: 'Ακύρωση',
      startDate: 'Ημερομηνία έναρξης',
      endDate: 'Ημερομηνία λήξης (προαιρετική)',
      ongoing: 'Χωρίς λήξη',
      from: 'Από',
      to: 'έως',
      saveDays: 'Αποθήκευση',
      saveDates: 'Αποθήκευση Ημερομηνιών',
      noSchedules: 'Δεν υπάρχουν προγράμματα ακόμα. Χωρίς πρόγραμμα, το μέλος δεν είναι διαθέσιμο για κρατήσεις.',
      errorDelete: 'Αποτυχία διαγραφής προγράμματος.',
      errorCreate: 'Αποτυχία δημιουργίας προγράμματος.',
      slotEndBeforeStart: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.',
      slotDuplicate: 'Διπλό χρονικό πλαίσιο.',
      slotOverlap: 'Τα χρονικά πλαίσια δεν μπορούν να αλληλεπικαλύπτονται.',
      removeSlot: 'Αφαίρεση χρονικού πλαισίου',
      ruleNote: "Σε κάθε ημερομηνία ισχύει ένα μόνο πρόγραμμα. Τα ενεργά προγράμματα δεν μπορούν να επικαλύπτονται. Ημέρες χωρίς ενεργό πρόγραμμα θεωρούνται κλειστές.",
      statusCurrent: "Τρέχον",
      statusUpcoming: "Επερχόμενο",
      statusEnded: "Έληξε",
      overlapWith: "Οι ημερομηνίες επικαλύπτονται με το ενεργό πρόγραμμα {range}. Άλλαξε τις ημερομηνίες ή απενεργοποίησε πρώτα εκείνο το πρόγραμμα.",
      overlapOpenEnded: "Το ενεργό πρόγραμμα που ξεκινά {date} δεν έχει ημερομηνία λήξης. Βάλε του λήξη (ή απενεργοποίησέ το) πριν προσθέσεις άλλο.",
      openEndedNotice: "Το πρόγραμμα «{range}» δεν έχει ημερομηνία λήξης, οπότε δεν μπορεί να προστεθεί άλλο ενεργό πρόγραμμα. Βάλε του πρώτα ημερομηνία λήξης.",
      setEndDate: "Ορισμός λήξης",
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
    branding: {
      title: "Εμφάνιση σελίδας κρατήσεων",
      desc: "Χρώματα και γραμματοσειρά της δημόσιας σελίδας όπου κλείνουν ραντεβού οι πελάτες σου.",
      colours: "Χρώματα",
      font: "Γραμματοσειρά",
      fontHint: "Όλες οι γραμματοσειρές υποστηρίζουν ελληνικά.",
      save: "Αποθήκευση",
      saved: "Η εμφάνιση αποθηκεύτηκε.",
      errorSave: "Αποτυχία αποθήκευσης.",
      preview: "Προεπισκόπηση",
      previewUnsaved: "Δεν έχει αποθηκευτεί ακόμα. Οι πελάτες βλέπουν την προηγούμενη εμφάνιση μέχρι να πατήσεις Αποθήκευση.",
      previewSaved: "Έτσι βλέπουν τη σελίδα οι πελάτες σου.",
      palettes: {
        mono: "Ασπρόμαυρο",
        original: "Πράσινο",
        purple: "Μωβ",
        blue: "Μπλε",
        rose: "Ροζ",
        sand: "Άμμος",
      },
      fonts: {
        default: "Κανονική (Poppins)",
        manrope: "Manrope · μοντέρνα",
        "noto-serif": "Noto Serif · κλασική",
        alegreya: "Alegreya · κομψή",
        comfortaa: "Comfortaa · στρογγυλή",
        "roboto-slab": "Roboto Slab · έντονη",
      },
    },
    products: {
      title: "Προϊόντα",
      add: "Προσθήκη προϊόντος",
      empty: "Δεν έχεις προσθέσει προϊόντα ακόμη.",
      emptyHint: "Πρόσθεσε προϊόντα για να τα κρατούν οι πελάτες μαζί με το ραντεβού τους.",
      notInPlan: "Τα προϊόντα δεν περιλαμβάνονται στο πακέτο {plan}. Αναβάθμισε το πακέτο για να τα χρησιμοποιήσεις.",
      colProduct: "Προϊόν",
      colPrice: "Τιμή",
      colStock: "Απόθεμα",
      colSupplier: "Προμηθευτής",
      noSupplier: "—",
      stockOut: "Δεν είναι διαθέσιμο",
      stockLast: "Τελευταίο κομμάτι",
      stockLow: "Μόνο {n} ακόμη",
      stockOk: "Διαθέσιμο",
      stockCount: "{n} σε απόθεμα",
      newTitle: "Νέο προϊόν",
      back: "Πίσω στα προϊόντα",
      name: "Όνομα",
      price: "Τιμή (€)",
      stockLabel: "Πόσα έχουν απομείνει",
      description: "Περιγραφή",
      supplier: "Πού το αγοράζω (σύνδεσμος προμηθευτή)",
      supplierHint: "Τον βλέπεις μόνο εσύ και οι διαχειριστές. Δεν φαίνεται ποτέ στους πελάτες.",
      openSupplier: "Άνοιγμα προμηθευτή",
      save: "Αποθήκευση",
      create: "Δημιουργία προϊόντος",
      saved: "Το προϊόν αποθηκεύτηκε.",
      errorLoad: "Δεν ήταν δυνατή η φόρτωση των προϊόντων.",
      errorSave: "Δεν ήταν δυνατή η αποθήκευση του προϊόντος.",
      errorDelete: "Δεν ήταν δυνατή η διαγραφή του προϊόντος.",
      errorPhoto: "Το προϊόν δημιουργήθηκε, αλλά η φωτογραφία δεν αποθηκεύτηκε. Πρόσθεσέ την ξανά εδώ.",
      notFound: "Το προϊόν δεν βρέθηκε.",
      photoTitle: "Φωτογραφία",
      photoPending: "Η φωτογραφία αποθηκεύεται μαζί με το προϊόν.",
      photoAlt: "Φωτογραφία του {name}",
      deleteCard: "Διαγραφή προϊόντος",
      deleteTitle: "Διαγραφή προϊόντος;",
      deleteMessage: "Το προϊόν θα διαγραφεί. Οι κρατήσεις που το περιέχουν το κρατούν με το όνομα και την τιμή που είχε.",
      delete: "Διαγραφή",
      cancel: "Άκυρο",
      readOnly: "Μόνο οι ιδιοκτήτες και οι διαχειριστές αλλάζουν τα προϊόντα.",
      pickerTitle: "Προϊόντα",
      pickerHint: "Κράτησε προϊόντα μαζί με το ραντεβού. Πληρώνεις στο κατάστημα.",
      payInShop: "Κράτηση μόνο: πληρώνεις στο κατάστημα.",
      total: "Σύνολο",
      decrease: "Λιγότερα: {name}",
      increase: "Περισσότερα: {name}",
      quantity: "Ποσότητα: {name}",
      overStock: "Ζητάς περισσότερα από όσα έχουν απομείνει. Θα κρατηθούν παρ’ όλα αυτά.",
      overStockConfirm: "Κράτηση παρ’ όλα αυτά",
      outOfStockError: "Κάποια προϊόντα δεν είναι πια διαθέσιμα σε αυτή την ποσότητα. Ανανέωσε τη σελίδα και δοκίμασε ξανά.",
      bookingTitle: "Προϊόντα",
      sold: "Πουλήθηκε",
      notSold: "Δεν πουλήθηκε",
      leftInStock: "{n} σε απόθεμα",
      errorSale: "Δεν ήταν δυνατή η ενημέρωση του προϊόντος.",
      confirmationTitle: "Προϊόντα που κρατήθηκαν",
      deletedProduct: "Το προϊόν έχει διαγραφεί",
      zeroNote: "Η ποσότητα είναι 0: το προϊόν δεν υπολογίζεται στην κράτηση. Αύξησέ την ή αφαίρεσέ το.",
      serviceFee: "Υπηρεσία",
      productsSubtotal: "Προϊόντα",
      removeLine: "Αφαίρεση: {name}",
      removeLineTitle: "Αφαίρεση προϊόντος από την κράτηση;",
      removeLineMessage: "Το προϊόν αφαιρείται από την κράτηση. Αν είχε σημειωθεί ως πουλημένο, το απόθεμα επιστρέφει.",
      active: "Προσφέρεται στις κρατήσεις",
      activeHint: "Όταν είναι κλειστό, το προϊόν μένει στη λίστα σου αλλά δεν προτείνεται σε πελάτες ή στο προσωπικό κατά την κράτηση.",
      inactive: "Ανενεργό",
    },
    photos: {
      editorTitle: "Επεξεργασία φωτογραφίας",
      zoom: "Μεγέθυνση",
      editorHint: "Σύρε τη φωτογραφία για να τη μετακινήσεις και χρησιμοποίησε το ρυθμιστικό για μεγέθυνση. Το πλαίσιο είναι αυτό που θα φαίνεται.",
      save: "Αποθήκευση",
      cancel: "Άκυρο",
      add: "Προσθήκη φωτογραφίας",
      replace: "Αντικατάσταση",
      adjust: "Προσαρμογή",
      remove: "Αφαίρεση",
      removeTitle: "Αφαίρεση φωτογραφίας;",
      removeMessage: "Η φωτογραφία θα διαγραφεί. Θα φαίνεται ξανά το αρχικό γράμμα.",
      hint: "JPEG, PNG ή WebP, έως 8 MB.",
      shopTitle: "Φωτογραφία καταστήματος",
      shopDesc: "Εμφανίζεται στην κορυφή της δημόσιας σελίδας κρατήσεων. Αποθηκεύεται μόλις την επεξεργαστείς.",
      shopEmpty: "Δεν έχει προστεθεί φωτογραφία",
      shopAlt: "Φωτογραφία του {name}",
      errorType: "Η φωτογραφία πρέπει να είναι JPEG, PNG ή WebP.",
      errorSize: "Η φωτογραφία είναι πολύ μεγάλη (έως 8 MB).",
      errorLoad: "Δεν ήταν δυνατή η φόρτωση της φωτογραφίας.",
      errorSave: "Δεν ήταν δυνατή η αποθήκευση της φωτογραφίας.",
      errorRemove: "Δεν ήταν δυνατή η αφαίρεση της φωτογραφίας.",
    },
    timeOff: {
      title: "Άδειες και ρεπό",
      shopTitle: "Κλειστές ημέρες",
      hint: "Ημέρες ή ώρες που το μέλος δεν δουλεύει, πέρα από το εβδομαδιαίο πρόγραμμα. Οι πελάτες δεν μπορούν να κλείσουν ραντεβού τότε.",
      shopHint: "Ημέρες ή ώρες που όλο το κατάστημα είναι κλειστό, π.χ. αργίες. Ισχύουν για όλα τα μέλη και οι πελάτες δεν μπορούν να κλείσουν ραντεβού τότε.",
      add: "Προσθήκη",
      firstDay: "Πρώτη ημέρα",
      lastDay: "Τελευταία ημέρα (προαιρετική)",
      allDay: "Όλη την ημέρα",
      startTime: "Ώρα έναρξης",
      endTime: "Ώρα λήξης",
      note: "Σημείωση (προαιρετική)",
      notePlaceholder: "π.χ. Άδεια",
      shopNotePlaceholder: "π.χ. Χριστούγεννα",
      save: "Αποθήκευση",
      cancel: "Ακύρωση",
      empty: "Δεν υπάρχουν άδειες ή ρεπό.",
      shopEmpty: "Δεν υπάρχουν κλειστές ημέρες.",
      wholeShop: "Όλο το κατάστημα",
      remove: "Αφαίρεση",
      removeTitle: "Αφαίρεση αυτής της καταχώρισης;",
      removeMessage: "Οι ώρες αυτές θα είναι ξανά διαθέσιμες για κρατήσεις, σύμφωνα με το εβδομαδιαίο πρόγραμμα.",
      errorLoad: "Αποτυχία φόρτωσης.",
      errorSave: "Αποτυχία αποθήκευσης.",
      errorDelete: "Αποτυχία αφαίρεσης.",
      endBeforeStart: "Η τελευταία ημέρα δεν μπορεί να είναι πριν από την πρώτη.",
      timeEndBeforeStart: "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.",
      affectedOne: "Υπάρχει ήδη 1 κράτηση σε αυτό το διάστημα. Δεν άλλαξε· ακύρωσέ την ή μετάφερέ την αν χρειάζεται.",
      affectedMany: "Υπάρχουν ήδη {count} κρατήσεις σε αυτό το διάστημα. Δεν άλλαξαν· ακύρωσέ τες ή μετάφερέ τες αν χρειάζεται.",
      viewCalendar: "Άνοιγμα ημερολογίου",
      showPast: "Εμφάνιση παλαιότερων ({count})",
      hidePast: "Απόκρυψη παλαιότερων",
    },
    toggles: {
      switchToLight: 'Εναλλαγή σε φωτεινή λειτουργία',
      switchToDark: 'Εναλλαγή σε σκοτεινή λειτουργία',
      lightMode: 'Φωτεινή λειτουργία',
      darkMode: 'Σκοτεινή λειτουργία',
      language: 'Γλώσσα',
    },
    shopSettings: {
      deleteShopConfirmButton: 'Διαγραφή καταστήματος',
      deleteShopTitle: 'Διαγραφή «{name}»;',
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
      activeOwnerOnly: 'Μόνο ο ιδιοκτήτης μπορεί να το αλλάξει.',
      saveChanges: 'Αποθήκευση Αλλαγών',
      saveHint: 'Τα στοιχεία και οι ρυθμίσεις του καταστήματος αποθηκεύονται μαζί.',
      readOnlyHint: 'Μόνο για προβολή. Ο ιδιοκτήτης μπορεί να σου επιτρέψει την επεξεργασία των ρυθμίσεων.',
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
      areYouSure: 'Είστε σίγουροι; Αυτό θα διαγράψει οριστικά το {name} και όλα τα δεδομένα του.',
      maxAdvanceLabel: 'Παράθυρο κρατήσεων (ημέρες)',
      maxAdvanceHint: 'Πόσες ημέρες μπροστά μπορούν οι πελάτες να κλείσουν ραντεβού.',
    slotIntervalLabel: 'Διάστημα ραντεβού',
    slotIntervalHint: 'Κάθε πόσα λεπτά εμφανίζεται διαθέσιμη ώρα ραντεβού (π.χ. κάθε 15 λεπτά).',
    customerChangesTitle: 'Αλλαγές από πελάτες',
    customerChangesHint: 'Τι μπορούν να κάνουν οι πελάτες από τους συνδέσμους στο email τους. Εσείς και οι υπεύθυνοι μπορείτε πάντα να αλλάξετε ένα ραντεβού από το ημερολόγιο.',
    rescheduleEnabledLabel: 'Αλλαγή ώρας από τον πελάτη',
    rescheduleEnabledDesc: 'Το email επιβεβαίωσης περιέχει σύνδεσμο για αλλαγή ώρας.',
    cancelCutoffLabel: 'Ακύρωση έως (ώρες πριν)',
    cancelCutoffHint: 'Μετά από αυτό το όριο ο πελάτης δεν μπορεί να ακυρώσει μόνος του. 0 = μέχρι την έναρξη.',
    rescheduleCutoffLabel: 'Αλλαγή ώρας έως (ώρες πριν)',
    rescheduleCutoffHint: 'Μετά από αυτό το όριο ο πελάτης δεν μπορεί να αλλάξει ώρα μόνος του. 0 = μέχρι την έναρξη.',
    reminderEnabledLabel: 'Email υπενθύμισης',
    reminderEnabledDesc: 'Οι πελάτες με email λαμβάνουν υπενθύμιση πριν από το ραντεβού τους.',
    reminderHoursLabel: 'Αποστολή (ώρες πριν)',
    reminderHoursHint: 'Από 1 έως 72 ώρες. Ραντεβού που κλείνονται πιο κοντά από αυτό δεν λαμβάνουν υπενθύμιση.',
    slotIntervalOption: 'Κάθε {n} λεπτά',
    },
    sharing: {
      title: 'Ο σύνδεσμος κράτησής σας',
      desc: 'Μοιραστείτε αυτόν τον σύνδεσμο οπουδήποτε — στο bio του Instagram, στο WhatsApp, στην ιστοσελίδα σας.',
      copyButton: 'Αντιγραφή',
      copiedLabel: 'Αντιγράφηκε!',
      viewButton: 'Άνοιγμα',
    },
    public: {
      identity: {
        askTitle: 'Συνέχεια ως {name};',
        askBody: 'Θα χρησιμοποιήσουμε τα αποθηκευμένα στοιχεία σας για να βρούμε τις ώρες που σας ταιριάζουν.',
        yes: 'Ναι, συνέχεια',
        no: 'Όχι, άλλος',
        knownAs: 'Κράτηση ως',
        notYou: 'Δεν είστε εσείς;',
        prompt: 'Έχετε ξανακλείσει μαζί μας; Προσθέστε το τηλέφωνό σας για να βρείτε τις ώρες σας πιο εύκολα',
        phoneLabel: 'Το τηλέφωνό σας',
        phoneHint: 'Προαιρετικό. Χρησιμοποιείται μόνο για να βρούμε ώρες που σας ταιριάζουν.',
        usePhone: 'Χρήση αριθμού',
        cancel: 'Άκυρο',
      },
      bookAppointment: 'Κλείστε Ραντεβού',
      notAcceptingTitle: 'Οι online κρατήσεις δεν είναι διαθέσιμες αυτή τη στιγμή',
      notAccepting: 'Επικοινωνήστε με το κατάστημα για να κλείσετε ραντεβού.',
      notAcceptingCall: 'Καλέστε στο {phone} για να κλείσετε ραντεβού.',
      service: 'Υπηρεσία',
      staff: 'Προσωπικό',
      dateTime: 'Ημερομηνία & Ώρα',
      yourDetails: 'Τα Στοιχεία σας',
      stepOf: 'Βήμα {n} από {total}',
      chooseService: "Διάλεξε υπηρεσία",
      chooseServiceHint: "Μπορείς να διαλέξεις περισσότερες από μία: οι ώρες προστίθενται.",
      chooseServiceToContinue: "Διάλεξε υπηρεσία για να συνεχίσεις",
      bookingAs: "Κράτηση ως {name}",
      change: "Αλλαγή",
      servicesChosen: "{n} υπηρεσίες · {duration} · {price}",
      servicesLimit: "Έως {n} υπηρεσίες σε μία κράτηση.",
      openMap: "Άνοιγμα στους χάρτες",
      callShop: "Κλήση στο {phone}",
      stepLabel: "Βήμα {n} από {total}",
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
      privacyNoticeBefore: 'Τα στοιχεία σας χρησιμοποιούνται μόνο για τη διαχείριση της κράτησής σας από το κατάστημα. Δείτε την',
      privacyNoticeLink: 'Πολιτική Απορρήτου',
      privacyNoticeAfter: '.',
      emailPlaceholder: 'εσεις@παραδειγμα.com',
      notesLabel: 'Σημειώσεις',
      notesOptional: '(προαιρετικό)',
      notesPlaceholder: 'Ειδικές απαιτήσεις...',
      rememberLabel: 'Αποθήκευση των στοιχείων μου σε αυτή τη συσκευή',
      rememberHint: 'Αποθηκεύονται μόνο σε αυτόν τον browser, για να συμπληρωθούν στην επόμενη κράτησή σας. Αποεπιλέξτε για να διαγραφούν.',
      confirmBooking: 'Επιβεβαίωση Κράτησης',
      bookingConfirmed: 'Κράτηση Επιβεβαιώθηκε!',
      bookingConfirmedMsg: 'Ευχαριστούμε, {name}. Το ραντεβού σας για {service} στις {date} στις {time} έχει κρατηθεί. Τα λέμε!',
      shopNotFound: 'Το κατάστημα δεν βρέθηκε',
      somethingWrong: 'Κάτι πήγε στραβά',
      bookingBusy: 'Το σύστημα κρατήσεων είναι απασχολημένο — δοκιμάστε ξανά σε λίγο.',
      closedThisDay: 'Δεν υπάρχουν διαθέσιμες κρατήσεις για αυτήν την ημερομηνία. Δοκιμάστε άλλον συνεργάτη ή άλλη μέρα.',
      closedOrNoSchedule: 'Κλειστό ή δεν υπάρχει πρόγραμμα για αυτή την ημέρα.',
      manageWorkingHours: 'Μετάβαση στο ωράριο εργασίας για διόρθωση',
      failedSlots: 'Αποτυχία φόρτωσης διαθέσιμων ωρών',
      retry: 'Δοκιμάστε ξανά',
      serviceContext: 'Υπηρεσία:',
      staffContext: 'Προσωπικό:',
      atLabel: 'στις',
      ruleErrors: {
        BOOKING_IN_PAST: 'Αυτή η ώρα έχει ήδη περάσει. Επιλέξτε άλλη.',
        BOOKING_BEYOND_ADVANCE_WINDOW: 'Δεν δεχόμαστε κρατήσεις τόσο μακριά στο μέλλον. Επιλέξτε πιο κοντινή ημερομηνία.',
        SHOP_CLOSED: 'Το κατάστημα είναι κλειστό αυτή την ημέρα.',
        OUTSIDE_OPENING_HOURS: 'Η ώρα αυτή είναι εκτός ωραρίου λειτουργίας.',
        OFF_SLOT_GRID: 'Η ώρα αυτή δεν είναι διαθέσιμη για κράτηση.',
        SLOT_TAKEN: 'Λυπούμαστε, η ώρα αυτή μόλις κρατήθηκε. Επιλέξτε άλλη.',
        BOOKING_TOO_LONG: 'Ένα ραντεβού δεν μπορεί να διαρκεί πάνω από 24 ώρες.',
      },
      bookAnother: 'Νέα κράτηση',
      scrollForMore: 'Κύλισε για περισσότερα',
    },
    shopGate: {
      notFoundTitle: 'Το κατάστημα δεν είναι διαθέσιμο',
      notFoundText: 'Αυτό το κατάστημα δεν υπάρχει ή δεν έχετε πλέον πρόσβαση σε αυτό.',
      backToShops: 'Πίσω στα καταστήματά μου',
      errorLoad: 'Δεν ήταν δυνατή η φόρτωση του καταστήματος. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
      retry: 'Δοκιμάστε ξανά',
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
      greetingMorning: 'Καλημέρα, {name}',
      greetingAfternoon: 'Καλό απόγευμα, {name}',
      greetingEvening: 'Καλησπέρα, {name}',
      rangeLabel: 'Χρονική περίοδος',
      range: { week: 'Εβδομάδα', month: 'Μήνας', quarter: '3 μήνες' },
      stats: {
        bookings: 'Ραντεβού',
        completed: 'Ολοκληρωμένα',
        canceled: 'Ακυρωμένα',
        noShow: 'Δεν προσήλθαν',
      },
      chart: {
        title: 'Ραντεβού ανά περίοδο',
        tableCaption: 'Ραντεβού ανά περίοδο (χωρίς ακυρωμένα)',
        periodCol: 'Περίοδος',
        countCol: 'Ραντεβού',
        bookingOne: 'ραντεβού',
        bookingMany: 'ραντεβού',
        scheduled: 'προγραμματισμένα',
      },
      upcoming: {
        title: 'Επερχόμενα ραντεβού',
        viewAll: 'Προβολή όλων',
        empty: 'Δεν υπάρχουν επερχόμενα ραντεβού',
        customerCol: 'Πελάτης',
        serviceCol: 'Υπηρεσία',
        shopCol: 'Κατάστημα',
        whenCol: 'Πότε',
        statusCol: 'Κατάσταση',
      },
      breakdown: {
        title: 'Κατανομή καταστάσεων',
        total: 'Σύνολο',
        listLabel: 'Ραντεβού ανά κατάσταση',
      },
      error: {
        title: 'Δεν μπορέσαμε να φορτώσουμε την επισκόπηση',
        text: 'Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
        retry: 'Δοκιμάστε ξανά',
      },
      empty: {
        title: 'Δεν υπάρχουν ραντεβού σε αυτή την περίοδο',
        text: 'Μοιραστείτε τη σελίδα κρατήσεων και ο πρώτος σας πελάτης θα εμφανιστεί εδώ.',
        copy: 'Αντιγραφή συνδέσμου κράτησης',
        copied: 'Ο σύνδεσμος αντιγράφηκε',
        week: 'Δεν υπάρχουν ραντεβού αυτή την εβδομάδα',
        month: 'Δεν υπάρχουν ραντεβού αυτόν τον μήνα',
        quarter: 'Δεν υπάρχουν ραντεβού τους τελευταίους 3 μήνες',
      },
      loadingLabel: 'Φόρτωση επισκόπησης',
    },
    customers: {
      durationsHeading: 'Διάρκεια υπηρεσιών',
      durationsBody: 'Ορίστε πόσα λεπτά χρειάζεται αυτός ο πελάτης για μια υπηρεσία, αν διαφέρει από την κανονική διάρκεια. Ισχύει για τα νέα ραντεβού· τα υπάρχοντα δεν αλλάζουν.',
      durationsStandard: 'Κανονική διάρκεια: {n} λεπτά',
      durationsUnit: 'Λεπτά. Αφήστε το κενό για την κανονική διάρκεια.',
      durationsNoServices: 'Δεν υπάρχουν ενεργές υπηρεσίες.',
      durationsInvalid: 'Η διάρκεια πρέπει να είναι ακέραιος αριθμός λεπτών, από 1 έως 1440.',
      durationsErrorLoad: 'Αποτυχία φόρτωσης υπηρεσιών.',
      durationsErrorSave: 'Αποτυχία αποθήκευσης διάρκειας.',
      durationsSaved: 'Η διάρκεια αποθηκεύτηκε.',
      filterCustomDurations: 'Με δική τους διάρκεια',
      customDurationsBadge: 'Δική του διάρκεια',
      cancel: 'Ακύρωση',
      deleteConfirmButton: 'Διαγραφή πελάτη',
      deleteTitle: 'Διαγραφή «{name}»;',
      title: 'Πελάτες',
      searchPlaceholder: 'Αναζήτηση με όνομα ή τηλέφωνο…',
      errorLoad: 'Αποτυχία φόρτωσης πελατών',
      noResults: 'Δεν βρέθηκαν πελάτες με αυτά τα κριτήρια.',
      noCustomers: 'Δεν υπάρχουν πελάτες ακόμα.',
      nameCol: 'Όνομα',
      phoneCol: 'Τηλέφωνο',
      emailCol: 'Email',
      addedCol: 'Προστέθηκε',
      backToCustomers: 'Πίσω στους Πελάτες',
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
      save: 'Αποθήκευση',
      totalVisitsLabel: 'Συνολικές επισκέψεις',
      totalSpentLabel: 'Συνολική δαπάνη',
      recentBookings: 'Πρόσφατα Ραντεβού',
      noBookings: 'Δεν υπάρχουν ραντεβού ακόμα.',
      privacyHeading: 'Προσωπικά δεδομένα',
      privacyBody: 'Εξαγωγή όλων των δεδομένων που διατηρούνται για αυτόν τον πελάτη (JSON), ή οριστική διαγραφή του πελάτη και όλων των ραντεβού του.',
      exportData: 'Εξαγωγή δεδομένων',
      exportError: 'Αποτυχία εξαγωγής δεδομένων.',
      deleteCustomer: 'Διαγραφή πελάτη',
      deleteConfirm: 'Οριστική διαγραφή αυτού του πελάτη και ΟΛΩΝ των ραντεβού του; Η ενέργεια δεν αναιρείται.',
      deleteError: 'Αποτυχία διαγραφής πελάτη.',
      serviceCol: 'Υπηρεσία',
      dateTimeCol: 'Ημερομηνία & Ώρα',
      statusCol: 'Κατάσταση',
      mergeButton: 'Συγχώνευση με άλλον πελάτη',
      mergeHeading: 'Διπλή εγγραφή;',
      mergeBody: 'Αν ο ίδιος πελάτης υπάρχει δύο φορές, συγχωνεύστε την άλλη εγγραφή σε αυτήν. Τα ραντεβού της μεταφέρονται εδώ.',
      mergeTitle: 'Συγχώνευση πελάτη',
      mergeHint: 'Βρείτε τη διπλή εγγραφή. Θα συγχωνευθεί στον πελάτη {target}.',
      mergeSearchLabel: 'Αναζήτηση πελάτη',
      mergeSelect: 'Επιλογή',
      mergeChange: 'Επιλογή άλλου πελάτη',
      mergeSummary: 'Τα ραντεβού του {source} θα μεταφερθούν στον {target} και η διπλή εγγραφή θα διαγραφεί. Το όνομα και το τηλέφωνο του πελάτη που παραμένει δεν αλλάζουν· το email συμπληρώνεται αν λείπει και οι σημειώσεις ενώνονται. Η ενέργεια δεν αναιρείται.',
      mergeConfirmButton: 'Συγχώνευση',
      mergeError: 'Η συγχώνευση απέτυχε. Δοκιμάστε ξανά.',
      mergeSuccess: 'Οι πελάτες συγχωνεύθηκαν. Μεταφέρθηκαν {count} ραντεβού.',
      bookingHistory: 'Ραντεβού',
      bookingsErrorLoad: 'Τα ραντεβού δεν φορτώθηκαν.',
      providerCol: 'Προσωπικό',
      prevPageLabel: 'Προηγούμενη σελίδα',
      nextPageLabel: 'Επόμενη σελίδα',
      importButton: 'Εισαγωγή',
      exportLabel: 'Εξαγωγή',
      exportAllError: 'Η εξαγωγή απέτυχε. Δοκιμάστε ξανά.',
      importTitle: 'Εισαγωγή πελατών',
      importHint: 'Αρχείο CSV, Excel (.xlsx) ή JSON με στήλες όνομα και τηλέφωνο, και προαιρετικά email και σημειώσεις. Αν το τηλέφωνο υπάρχει ήδη, ο πελάτης δεν αλλάζει· συμπληρώνονται μόνο το email και οι σημειώσεις που λείπουν.',
      importFileLabel: 'Αρχείο',
      importUnsupported: 'Αυτός ο τύπος αρχείου δεν υποστηρίζεται. Χρησιμοποιήστε CSV, .xlsx ή JSON.',
      importUnreadable: 'Το αρχείο δεν μπόρεσε να διαβαστεί.',
      importMissingColumns: 'Λείπει στήλη από το αρχείο: {columns}.',
      importEmpty: 'Το αρχείο δεν έχει πελάτες.',
      importPreview: 'Βρέθηκαν {count} γραμμές. Οι πρώτες:',
      importConfirmButton: 'Εισαγωγή',
      importError: 'Η εισαγωγή απέτυχε. Δεν αποθηκεύτηκε τίποτα.',
      importPartialError: 'Η εισαγωγή διακόπηκε. Αποθηκεύτηκαν {count} πελάτες· δοκιμάστε ξανά με το ίδιο αρχείο για τους υπόλοιπους.',
      importResult: 'Νέοι: {created}. Συμπληρώθηκαν: {updated}. Χωρίς αλλαγή: {skipped}.',
      importRowErrors: '{count} γραμμές δεν εισήχθησαν:',
      importRowError: 'Γραμμή {row}',
      importClose: 'Κλείσιμο',
      importProblems: {
        name_missing: 'λείπει το όνομα',
        name_too_long: 'το όνομα είναι πολύ μεγάλο',
        phone_invalid: 'το τηλέφωνο λείπει ή δεν είναι έγκυρο',
        email_invalid: 'το email δεν είναι έγκυρο',
        notes_too_long: 'οι σημειώσεις είναι πολύ μεγάλες',
      },
      successUpdate: 'Ο πελάτης ενημερώθηκε.',
      errorUpdate: 'Αποτυχία αποθήκευσης αλλαγών.',
      hiddenLabel: 'Πελάτης',
      contactHiddenNotice: 'Δεν έχετε δικαίωμα προβολής ή επεξεργασίας των στοιχείων επικοινωνίας αυτού του πελάτη.',
      prevPage: '←',
      nextPage: '→',
      pageOf: 'Σελίδα {page} από {total}',
    },
    bookings: {
      detail: {
        minutes: "{n} λεπτά",
        noShow: "Δεν ήρθε",
        cancelBooking: "Ακύρωση ραντεβού",
        cancelTitle: "Ακύρωση ραντεβού;",
        cancelMessage: "Το ραντεβού ακυρώνεται και η ώρα ελευθερώνεται. Μπορείς να το ξαναανοίξεις αργότερα αν η ώρα είναι ακόμη ελεύθερη.",
        keepBooking: "Κράτηση του ραντεβού",
        editProducts: "Επεξεργασία",
        doneEditing: "Τέλος",
        totalNote: "Υπηρεσία {service} + προϊόντα {products}",
        soldBadge: "Πουλήθηκε",
        notSoldBadge: "Δεν πουλήθηκε",
      },
      block: {
        button: 'Κλείδωμα ώρας',
        bookCustomer: 'Κράτηση για πελάτη',
        name: 'Κλειδωμένο',
        hint: 'Η ώρα δεν θα είναι διαθέσιμη για κράτηση. Δεν χρειάζονται στοιχεία πελάτη.',
        noteDefault: 'Κλειδωμένη ώρα',
        confirm: 'Κλείδωμα',
        unblock: 'Ξεκλείδωμα ώρας',
        unblocked: 'Η ώρα ξεκλειδώθηκε και είναι ξανά διαθέσιμη.',
      },
      customerPicker: {
        label: 'Πελάτης',
        placeholder: 'Αναζήτηση με όνομα ή τηλέφωνο…',
        hint: 'Επιλέξτε υπάρχοντα πελάτη για να δείτε τις δικές του διάρκειες και ώρες. Μπορείτε να το παραλείψετε.',
        noMatch: 'Δεν βρέθηκε πελάτης. Συμπληρώστε τα στοιχεία στο τελευταίο βήμα.',
        selected: 'Κράτηση για',
        change: 'Αλλαγή',
      },
      statusConflict: 'Αυτή η ώρα δεν είναι πλέον διαθέσιμη, οπότε η κατάσταση της κράτησης δεν μπορεί να αλλάξει.',
      statusError: 'Δεν ήταν δυνατή η ενημέρωση της κατάστασης της κράτησης. Δοκιμάστε ξανά.',
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
      createSuccess: 'Το ραντεβού δημιουργήθηκε!',
      createError: 'Αποτυχία δημιουργίας ραντεβού.',
      bookingBusy: 'Το σύστημα κρατήσεων είναι απασχολημένο — δοκιμάστε ξανά σε λίγο.',
      reschedule: {
        button: 'Αλλαγή ώρας',
        title: 'Αλλαγή ώρας ραντεβού',
        from: 'Από',
        to: 'Σε',
        submit: 'Αλλαγή ώρας',
        submitAnyway: 'Αλλαγή ώρας παρ’ όλα αυτά',
        confirmStep: 'Επιβεβαίωση',
        same: 'Αυτή είναι η τρέχουσα ώρα του ραντεβού. Επιλέξτε άλλη ώρα ή άλλον συνεργάτη.',
        error: 'Η αλλαγή ώρας απέτυχε.',
        notFound: 'Το ραντεβού δεν βρέθηκε.',
        notAllowed: 'Μόνο ραντεβού σε αναμονή ή επιβεβαιωμένα μπορούν να αλλάξουν ώρα.',
        rescheduledLabel: 'Άλλαξε ώρα',
        rescheduledTo: 'Το ραντεβού μεταφέρθηκε: {when}. Αυτή η ώρα είναι ξανά ελεύθερη.',
        rescheduledFrom: 'Μεταφέρθηκε από: {when}.',
        viewNew: 'Δείτε τη νέα ώρα',
        serviceWas: 'Ήταν',
      },
      override: {
        BOOKING_IN_PAST: 'Η ώρα αυτή βρίσκεται στο παρελθόν.',
        BOOKING_BEYOND_ADVANCE_WINDOW: 'Η ημερομηνία είναι πέρα από το επιτρεπόμενο διάστημα κρατήσεων.',
        SHOP_CLOSED: 'Το κατάστημα είναι κλειστό αυτή την ημέρα.',
        OUTSIDE_OPENING_HOURS: 'Η ώρα αυτή είναι εκτός ωραρίου λειτουργίας.',
        OFF_SLOT_GRID: 'Η ώρα αυτή δεν είναι τυπική ώρα κράτησης.',
        SLOT_TAKEN: 'Η ώρα αυτή είναι ήδη κρατημένη για τον συνεργάτη.',
        BOOKING_TOO_LONG: 'Ένα ραντεβού δεν μπορεί να διαρκεί πάνω από 24 ώρες.',
        title: 'Να γίνει η κράτηση παρ’ όλα αυτά;',
        confirm: 'Κράτηση παρ’ όλα αυτά',
        cancel: 'Άκυρο',
      },
      intervalPicker: { label: 'Βήμα ώρας', option: '{n} λεπτά', offGrid: 'προσαρμοσμένη ώρα', panelTitle: 'Προσαρμοσμένη ώρα', confirmButton: 'Κράτηση σε αυτή την ώρα' },
      outsideHours: {
        toggle: 'Εμφάνιση ωρών εκτός ωραρίου',
        workingHours: 'Ώρες λειτουργίας',
        BEFORE_OPENING: 'Πριν το άνοιγμα',
        BREAK: 'Διάλειμμα',
        AFTER_CLOSING: 'Μετά το κλείσιμο',
        CLOSED_DAY: 'Κλειστή ημέρα',
        needsConfirm: '(απαιτεί επιβεβαίωση)',
        otherTime: 'Άλλη ώρα',
        otherTimeHint: 'Οποιαδήποτε ώρα ανά 5 λεπτά. Ελέγχεται όταν κάνετε την κράτηση.',
        booked: 'κρατημένο',
        past: 'παρελθόν',
        slotAria: 'εκτός ωραρίου',
        panelTitle: 'Εκτός ωραρίου',
        panelBody: 'Η κράτηση θα αποθηκευτεί ως εξαίρεση.',
        confirmButton: 'Κράτηση εκτός ωραρίου',
      },
      calendar: {
        otherColumn: 'Άλλο',
        off: 'Κλειστά',
        closed: 'Κλειστή ημέρα',
        nextDay: '→ επόμενη ημέρα',
        outsideBanner: '{count} ραντεβού εκτός της προβαλλόμενης περιόδου',
        tags: {
          OUTSIDE_OPENING_HOURS: 'Εκτός ωραρίου',
          SHOP_CLOSED: 'Κλειστή ημέρα',
          BOOKING_IN_PAST: 'Παλαιότερη καταχώρηση',
          OFF_SLOT_GRID: 'Προσαρμοσμένη ώρα',
        },
      },
      filters: {
        statusLabel: 'Κατάσταση',
        staffLabel: 'Προσωπικό',
        serviceLabel: 'Υπηρεσία',
        allStaff: 'Όλο το προσωπικό',
        allServices: 'Όλες οι υπηρεσίες',
        button: 'Φίλτρα',
        done: 'Τέλος',
        clear: 'Καθαρισμός φίλτρων',
        showing: '{shown} από {total} ραντεβού',
        status: {
          PENDING: 'Εκκρεμεί',
          CONFIRMED: 'Επιβεβαιωμένο',
          COMPLETED: 'Ολοκληρώθηκε',
          CANCELED: 'Ακυρώθηκε',
          NO_SHOW: 'Δεν προσήλθε',
        },
      },
      bookingCreated: 'Το ραντεβού δημιουργήθηκε',
    },
    customerProfile: {
      newCustomer: "Νέος πελάτης",
      newCustomerTitle: "Νέος πελάτης",
      create: "Προσθήκη πελάτη",
      cancel: "Άκυρο",
      errorCreate: "Δεν ήταν δυνατή η προσθήκη του πελάτη.",
      existsError: "Υπάρχει ήδη πελάτης με αυτό το τηλέφωνο.",
      existsLink: "Άνοιγμα της σελίδας του",
      photoTitle: "Φωτογραφία",
      photoDesc: "Φαίνεται δίπλα στο όνομα του πελάτη στη λίστα και στα ραντεβού του.",
      takePhoto: "Τράβηξε φωτογραφία",
      choosePhoto: "Διάλεξε φωτογραφία",
      changePhoto: "Αλλαγή",
      removePhoto: "Αφαίρεση",
      photoLabel: "Η φωτογραφία σου",
      photoHelp: "Βοηθά το κατάστημα να σε αναγνωρίζει. Τη βλέπει μόνο το κατάστημα.",
      wizardPhotoFailed: "Το ραντεβού σου κλείστηκε, αλλά η φωτογραφία δεν αποθηκεύτηκε.",
      pageTitle: "Τα στοιχεία σου",
      pageIntro: "Συμπλήρωσε τα στοιχεία σου για να σε έχει το {shop} στους πελάτες του.",
      submit: "Αποθήκευση",
      successTitle: "Ευχαριστούμε!",
      successBody: "Τα στοιχεία σου στάλθηκαν στο {shop}. Αν ήσουν ήδη πελάτης, το κατάστημα θα επιβεβαιώσει τις αλλαγές.",
      bookLink: "Κλείσε ραντεβού",
      existingNote: "Αν είσαι ήδη πελάτης, το κατάστημα θα δει τις αλλαγές σου και θα τις επιβεβαιώσει.",
      errorSubmit: "Δεν ήταν δυνατή η αποθήκευση. Δοκίμασε ξανά.",
      unavailableTitle: "Η σελίδα δεν είναι διαθέσιμη",
      unavailableBody: "Αυτό το κατάστημα δεν δέχεται εγγραφές πελατών από εδώ.",
      sectionTitle: "Προφίλ πελατών",
      sectionHint: "Τι μπορούν να προσθέσουν οι πελάτες μόνοι τους.",
      photosLabel: "Οι πελάτες μπορούν να προσθέσουν φωτογραφία",
      photosDesc: "Προαιρετικά, όταν κλείνουν ραντεβού και στη σελίδα εγγραφής. Τη βλέπει μόνο η ομάδα σου.",
      pageLabel: "Σελίδα εγγραφής πελατών",
      pageDesc: "Μια δημόσια σελίδα όπου ο πελάτης γράφει το όνομα και το τηλέφωνό του. Δώσε τον σύνδεσμο ή τύπωσε τον κωδικό QR.",
      qrDesc: "Οι πελάτες σκανάρουν τον κωδικό με την κάμερα του κινητού τους.",
      qrAlt: "Κωδικός QR για τη σελίδα εγγραφής πελατών",
      download: "Λήψη PNG",
      print: "Εκτύπωση",
      saveToShow: "Αποθήκευσε τις αλλαγές για να εμφανιστούν ο σύνδεσμος και ο κωδικός QR.",
      signupLinkTitle: "Σύνδεσμος εγγραφής πελατών",
      signupLinkDesc: "Οι πελάτες γράφουν εδώ τα στοιχεία τους. Τύπωσε τον κωδικό QR για να τον σκανάρουν στο κατάστημα.",
      changesTitle: "Αλλαγές που ζήτησε ο πελάτης",
      changesDesc: "Τις έστειλε από τη σελίδα εγγραφής. Δεν ισχύουν μέχρι να τις αποδεχτείς.",
      changesPhoto: "Νέα φωτογραφία",
      changesAccept: "Αποδοχή",
      changesReject: "Απόρριψη",
      changesError: "Δεν ήταν δυνατή η αποθήκευση. Δοκίμασε ξανά.",
      changesPhoneTaken: "Το νέο τηλέφωνο ανήκει ήδη σε άλλον πελάτη. Συγχώνευσε τις δύο εγγραφές ή απόρριψε την αλλαγή.",
      changesFilter: "Αλλαγές σε αναμονή",
      changesBadge: "Αλλαγές σε αναμονή",
      numberChanged: "Άλλαξα αριθμό τηλεφώνου",
      newPhoneLabel: "Νέο τηλέφωνο",
      newPhoneHint: "Γράψε πιο πάνω τον παλιό σου αριθμό, για να σε βρει το κατάστημα.",
    },
    cancelBooking: {
      invalidLink: 'Μη έγκυρος σύνδεσμος ακύρωσης.',
      cancelling: 'Ακύρωση ραντεβού...',
      alreadyCancelled: 'Αυτό το ραντεβού έχει ήδη ακυρωθεί.',
      alreadyCompleted: 'Αυτό το ραντεβού έχει ήδη ολοκληρωθεί και δεν μπορεί να ακυρωθεί.',
      markedNoShow: 'Αυτό το ραντεβού έχει καταχωρηθεί ως απουσία και δεν μπορεί να ακυρωθεί.',
      pastBooking: 'Αυτό το ραντεβού έχει ήδη ξεκινήσει ή περάσει και δεν μπορεί να ακυρωθεί. Επικοινωνήστε με το κατάστημα.',
      notFound: 'Το ραντεβού δεν βρέθηκε. Ο σύνδεσμος μπορεί να είναι άκυρος ή ληγμένος.',
      errorCancel: 'Αδυναμία ακύρωσης ραντεβού. Δοκιμάστε ξανά ή επικοινωνήστε με το κατάστημα.',
      cancelled: 'Ραντεβού Ακυρώθηκε',
      yourText: 'Το',
      appointmentAt: 'ραντεβού σας στο',
      hasCancelled: 'ακυρώθηκε.',
      confirmTitle: 'Ακύρωση ραντεβού;',
      confirmText: 'Θέλετε σίγουρα να ακυρώσετε το ραντεβού σας; Αυτή η ενέργεια δεν αναιρείται.',
      confirmButton: 'Ναι, ακύρωση',
      keepButton: 'Διατήρηση ραντεβού',
      kept: 'Το ραντεβού σας διατηρήθηκε. Μπορείτε να κλείσετε αυτή τη σελίδα.',
      windowClosed: 'Το ραντεβού είναι σε λιγότερο από {n} ώρες και δεν μπορεί πλέον να ακυρωθεί από εδώ. Επικοινωνήστε με το κατάστημα.',
      rescheduled: 'Αυτό το ραντεβού έχει αλλάξει ώρα. Χρησιμοποιήστε τον σύνδεσμο στο πιο πρόσφατο email.',
    },
    rescheduleBooking: {
      invalidLink: 'Μη έγκυρος σύνδεσμος αλλαγής ώρας.',
      notFound: 'Το ραντεβού δεν βρέθηκε. Ο σύνδεσμος μπορεί να είναι άκυρος ή ληγμένος.',
      title: 'Αλλαγή ώρας ραντεβού',
      currentLabel: 'Τρέχουσα ώρα',
      keepButton: 'Διατήρηση τρέχουσας ώρας',
      kept: 'Το ραντεβού σας έμεινε όπως ήταν. Μπορείτε να κλείσετε αυτή τη σελίδα.',
      done: 'Η ώρα άλλαξε',
      doneText: 'Το ραντεβού σας είναι πλέον:',
      doneEmail: 'Αν έχετε δώσει email, θα λάβετε τα νέα στοιχεία. Οι σύνδεσμοι σε παλαιότερα email δεν ισχύουν πλέον.',
      disabled: 'Αυτό το κατάστημα δεν δέχεται αλλαγή ώρας online. Επικοινωνήστε με το κατάστημα.',
      windowClosed: 'Το ραντεβού είναι σε λιγότερο από {n} ώρες και δεν μπορεί πλέον να αλλάξει ώρα από εδώ. Επικοινωνήστε με το κατάστημα.',
      rescheduled: 'Αυτό το ραντεβού έχει ήδη μεταφερθεί: {when}. Χρησιμοποιήστε τον σύνδεσμο στο πιο πρόσφατο email.',
      alreadyCancelled: 'Αυτό το ραντεβού έχει ακυρωθεί.',
      alreadyCompleted: 'Αυτό το ραντεβού έχει ήδη ολοκληρωθεί.',
      markedNoShow: 'Αυτό το ραντεβού έχει καταχωρηθεί ως απουσία.',
      pastBooking: 'Αυτό το ραντεβού έχει ήδη ξεκινήσει ή περάσει. Επικοινωνήστε με το κατάστημα.',
      staffUnavailable: 'Αυτός ο συνεργάτης δεν είναι διαθέσιμος. Επιλέξτε άλλον.',
      error: 'Η αλλαγή ώρας απέτυχε. Δοκιμάστε ξανά ή επικοινωνήστε με το κατάστημα.',
    },
  },

  en: {
    nav: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
    },
    sidebar: {
      dashboard: 'Dashboard',
      openMenu: 'Open menu',
      mainNav: 'Main navigation',
      resize: 'Resize sidebar',
      account: 'Account',
      help: 'Help',
      overview: 'Overview',
      logout: 'Logout',
      home: 'Home',
      shopSection: 'Shop',
      manageSection: 'Manage',
      bookings: 'Bookings',
      services: 'Services',
      products: 'Products',
      team: 'Team',
      invites: 'Invites',
      customers: 'Customers',
      shopSettings: 'Settings',
      bookAppointment: 'New Booking',
    },
    help: {
      title: 'Help',
      intro: 'Short answers on how BeBooked works. Open a topic to read it.',
      managersBadge: 'Owners and managers',
      contactButton: 'Contact us',
      sections: {
        gettingStarted: {
          title: 'Getting started',
          items: [
            { lead: 'Set when you work.', text: 'Open Team, choose yourself and fill in the Availability Schedule. Customers can only book inside those hours.' },
            { lead: 'Add your services.', text: 'On Services, add each service with its duration and price, and choose who on the team does it.' },
            { lead: 'Share your booking link.', text: "Your shop's public link is in Settings. Put it on Instagram, Google Maps or in a message. Customers book without an account." },
            { lead: 'Try it yourself.', text: 'Open the link and make a test booking. It appears in Bookings.' },
          ],
        },
        bookings: {
          title: 'Bookings',
          items: [
            { lead: 'The calendar.', text: 'Bookings shows the day, with one column for each team member.' },
            { lead: 'Adding a booking.', text: 'The owner and managers can add a booking for a customer, for example after a phone call.' },
            { lead: 'Changing or cancelling.', text: 'Open a booking to see its details. The owner and managers can reschedule or cancel it at any time.' },
            { lead: 'What the customer can do.', text: 'The confirmation email has links to cancel and to reschedule. In Settings you choose whether rescheduling is allowed and how many hours before the appointment the links stop working.' },
            { lead: 'Reminders.', text: 'Customers who gave an email get a reminder before their appointment. Turn it on and set the hours in Settings.' },
            { lead: 'Booking rules.', text: 'Settings is also where you set how many days ahead customers can book and how often a bookable time appears.' },
          ],
        },
        teamRoles: {
          title: 'Team and roles',
          items: [
            { lead: 'Owner.', text: 'Has every permission. Only the owner can delete the shop or transfer it to someone else.' },
            { lead: 'Manager.', text: 'Runs the shop day to day: bookings, services, team and customers. The owner can also let a manager manage other managers and edit the shop settings.' },
            { lead: 'Staff.', text: "Sees the calendar, the services and the products. The owner decides whether they see customers' names and contact details." },
            { lead: 'A team member does not need a login.', text: 'Add someone with just their name so they can be booked. If they should use the app themselves later, send them a login invite by email.' },
            { lead: 'Who can be booked.', text: "Each member has two switches: whether customers can pick them on the booking page, and whether they can be chosen for bookings made inside the app. A member with both off does not take one of your plan's staff places." },
            { lead: 'Hours and time off.', text: 'Each member has their own working hours and time off, on their page.' },
            { lead: 'When someone leaves.', text: 'Deactivate the member: they lose access and can no longer be booked, and their past bookings stay.' },
            { lead: 'On Solo.', text: 'Login invites and managers are part of the Team and Business plans.' },
          ],
        },
        customers: {
          title: 'Customers',
          items: [
            { lead: 'The list.', text: 'Everyone who books is saved in Customers, with their bookings.' },
            { lead: 'Import.', text: 'Upload a CSV, Excel or JSON file with name and phone columns, and optionally email and notes. If a phone already exists, that customer is not changed; only a missing email or missing notes are filled in.' },
            { lead: 'Export.', text: 'Download all your customers as an Excel file.' },
            { lead: 'Duplicates.', text: 'If the same person is there twice, merge the duplicate into the record you keep.' },
            { lead: 'A different duration for one customer.', text: 'If a customer always needs more or less time for a service, set their own duration on their page.' },
            { lead: 'Personal data requests.', text: "From a customer's page you can export or delete their data if they ask." },
          ],
        },
        products: {
          title: 'Products',
          items: [
            { lead: 'What they are.', text: 'The things you sell at the shop. Each has a name, a price, a photo and how many you have.' },
            { lead: 'Reserving.', text: 'Customers can reserve a product while they book and collect it when they come in. Products can be added to a booking from inside the app too.' },
            { lead: 'Stock.', text: 'When a product is running low or is not available, that is shown next to it.' },
            { lead: 'On Solo.', text: 'Products are part of the Team and Business plans.' },
          ],
        },
        plans: {
          title: 'Plans and trial',
          items: [
            { lead: 'Solo.', text: 'One bookable person. Bookings, calendar, services, customers, booking page, confirmation and reminder emails.' },
            { lead: 'Team.', text: 'Up to 5 bookable staff. Adds login invites, managers and permissions, and products.' },
            { lead: 'Business.', text: 'Up to 15 bookable staff, with everything in Team.' },
            { lead: 'Free trial.', text: 'Your first shop is free for 30 days. No card is needed.' },
            { lead: 'When the trial ends.', text: 'The shop becomes read-only: you still see everything and can export your customers, but nothing can be changed and the booking page takes no new bookings. Contact us to choose a plan and it is unlocked.' },
            { lead: 'More shops.', text: 'Each shop has its own plan. A second shop stays inactive until you contact us to set a plan for it.' },
          ],
        },
        publicPage: {
          title: 'Your public page',
          items: [
            { lead: 'Your link.', text: "Customers book at your shop's link. Its last part is chosen when the shop is created and cannot be changed later." },
            { lead: 'Photo.', text: 'Add a photo of the shop in Settings. It is shown on the booking page.' },
            { lead: 'Colours and fonts.', text: 'In Settings you choose the colours and the font of the booking page.' },
          ],
        },
        contact: {
          title: 'Contact',
          items: [
            { lead: 'Did not find your answer?', text: 'Write to us if you have a question or something is not working. We reply by email.' },
          ],
        },
      },
    },
    dashboard: {
      title: 'Overview',
      createShop: 'Create shop',
      invites: {
        title: 'Invitations',
        from: '{email} invited you as {role}',
        empty: 'You have no pending invitations.',
      },
      shops: { title: 'All shops' },
      empty: {
        title: "You're not part of a shop yet",
        text: 'Ask your shop owner to invite {email}.',
      },
    },
    shops: {
      title: 'My Shops',
      newShop: 'New Shop',
      name: 'Name',
      slug: 'Slug',
      slugHint: 'Lowercase letters, numbers, and hyphens only (e.g. my-shop)',
      slugLockedHint: 'The shop URL cannot be changed after creation.',
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
      cancel: 'Cancel',
      backToShops: '← My Shops',
      notFound: 'Shop not found.',
      errorLoad: 'Failed to load shops.',
      successUpdate: 'Shop updated successfully.',
    },
    home: {
    headline: "It's okay to {brand}.",
    headlineAccent: 'Just manage it.',
    cta: 'Get started',
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
    pricingSub: 'Three plans, priced per shop. 30 days free with no card, and no commission on bookings.',
    pricingPerMonth: '/month',
    pricingPerYear: '/year',
    pricingBillingLabel: 'Billing',
    pricingMonthly: 'Monthly',
    pricingYearly: 'Yearly · 2 months free',
    pricingPopular: 'Most popular',
    pricingWas: 'Instead of',
    pricingSaving: 'You save €{amount}: 2 months free',
    pricingCta: 'Start free trial',
    pricingFeaturesLabel: 'Features',
    pricingExclVat: 'excl. VAT',
    pricingSoloName: 'Solo',
    pricingSoloDesc: 'For anyone working on their own.',
    pricingSoloFeatures: [
      '1 bookable staff member',
      'Unlimited bookings',
      'Public booking page',
      'Calendar, services and customer records',
      'Confirmation emails with cancel and reschedule links',
      'Reminder emails before each appointment',
      'Customer import and export',
    ],
    pricingTeamName: 'Team',
    pricingTeamDesc: 'For shops with 2 to 5 people.',
    pricingTeamFeatures: [
      'Up to 5 bookable staff',
      'Everything in Solo',
      'Team invites by email',
      'Roles and permissions',
      'Working hours per staff member',
      'Products customers can reserve with a booking',
    ],
    pricingBusinessName: 'Business',
    pricingBusinessDesc: 'For shops with 6 to 15 people.',
    pricingBusinessFeatures: [
      'Up to 15 bookable staff',
      'Everything in Team',
    ],
    pricingDetailsLink: 'See everything each plan includes',
    previewHint: "Go ahead, click around — it's interactive",
    step1Title: 'Create your account',
    step1Desc: 'Sign up in seconds with your email.',
    step2Title: 'Set up your shop',
    step2Desc: 'Add your services, set your hours, and invite your team — all in under 10 minutes.',
    step3Title: 'Accept bookings',
    step3Desc: 'Share your booking link and start receiving real appointments immediately.',
    faqHeading: 'Frequently Asked Questions',
    faqSub: 'Find answers to frequently asked questions.',
    faqContact: 'Contact us',
    faq1Q: 'How much does BeBooked cost?',
    faq1A: 'Solo is €19 a month, Team is €35 and Business is €59, per shop and excluding VAT. Paying yearly gives 2 months free. The first 30 days are free and there is no commission on bookings.',
    faq2Q: 'Can my clients book without creating an account?',
    faq2A: 'Yes. Clients just pick a service, staff member, and time slot from your public booking page — no sign-up required on their end.',
    faq3Q: 'How do I delete my account?',
    faq3A: 'Go to Settings and choose Delete Account. You will confirm with your password. Deleting is permanent and cannot be undone.',
    faq4Q: 'Can I add my team?',
    faq4A: 'Yes. Invite members by email from your shop\'s Team page, and each member gets their own account.',
    featureAlertsIncoming: 'Sarah M. requested a Haircut, today at 3:00 PM.',
    featureAlertsIncomingSubject: 'New booking request',
    featureAlertsConfirmed: "Sarah M.'s booking is confirmed for 3:00 PM 👋",
    featureAlertsConfirmedSubject: 'Booking confirmed',
    featureAlertsTimeNow: 'just now',
    featureAlertsTimeAgo: '1 min ago',
    featureAlertsTitle: 'Email for every new booking',
    featureAlertsDesc: 'Get an email when a client books an appointment.',
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
    featureChannelsLabel: 'One link',
    featureChannelsTitle: 'Share it in your bio, on WhatsApp, on your site',
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
    previewServicesSubtitle: 'What your shop offers.',
    previewTeamPageSubtitle: '5 staff members active.',
    previewInvitesSubtitle: 'Bring your team onto BeBooked.',
    previewCustomersSubtitle: '312 clients on file.',
    previewSettingsSubtitle: 'Shop details & preferences.',
    previewCalStaff1: 'Marcus',
    previewCalStaff2: 'Sofia',
    previewCalStaff3: 'Jordan',
    previewCalBlock1Name: 'Sarah M.',
    previewCalBlock1Service: 'Haircut',
    previewCalBlock2Name: 'James O.',
    previewCalBlock2Service: 'Beard Trim',
    previewCalBlock3Name: 'Emma R.',
    previewCalBlock3Service: 'Color',
    previewCalBlock4Name: 'David K.',
    previewCalBlock4Service: 'Massage',
    previewService1Name: 'Haircut',
    previewService1Duration: '30 min',
    previewService1Desc: 'Classic cut, clean fade.',
    previewService2Name: 'Beard Trim',
    previewService2Duration: '20 min',
    previewService2Desc: 'Sharp lines, clean shape.',
    previewInviteRowName1: 'James O.',
    previewInviteRowName2: 'Alex T.',
    previewShopDesc: 'A classic barbershop in the heart of downtown.',
  },
  privacy: {
    linkLabel: 'Privacy Policy',
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: October 2026',
    intro: "Your privacy matters. This page explains, in plain language, what data BeBooked collects and how it's used. It isn't legal advice — we're early-stage and will keep this page updated as the service grows.",
    collectHeading: 'What We Collect',
    collectBody: "We collect the information you give us when you create an account or book an appointment through a shop's public page: name, email, phone number, and basic shop details (name, address, services, hours). We don't collect payment information — BeBooked doesn't process payments.",
    useHeading: 'How We Use It',
    useBody: "We use your data to run the service: creating and managing bookings, sending confirmation or notification emails, and providing support when you need it. We don't sell or rent your data to third parties.",
    cookiesHeading: 'Cookies & Local Storage',
    cookiesBody: "We use a small number of cookies and browser local storage for essential functionality, like keeping you signed in and remembering your language/theme preference. If you tick \"Remember my details\" on a booking page, your name, phone number and email are kept in your browser's local storage to fill in your next booking; they stay on your device for up to 12 months and are removed as soon as you untick the box or clear the site's data. After you book, the confirmation is kept in that browser tab until you close it, so it is still shown if you reload the page. We don't use third-party cookies for advertising or tracking.",
    sharingHeading: 'Data Sharing',
    sharingBody: "We don't share your data with third parties, except the service providers we rely on to run BeBooked (e.g. email delivery, hosting, error monitoring). Those providers only get access to what they need to provide their service. When something goes wrong in the app, a technical error report (the error, the page, the browser type and possibly the IP address) is sent to Sentry, our error-monitoring provider, on servers in the EU, so that we can fix it. We have switched off the collection of form contents and cookies in these reports.",
    rightsHeading: 'Your Rights',
    rightsBody: "You can request access to, correction of, or deletion of your data at any time by reaching out to us. We keep your data for as long as your account is active, unless you ask us to do otherwise.",
    changesHeading: 'Changes to This Policy',
    changesBody: "As BeBooked evolves, we may update this page. We'll always note the last-updated date here.",
    contact: 'For questions about your data, reach out to',
  },
  terms: {
    linkLabel: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'Last updated: September 2026',
    intro: "By using BeBooked, you agree to the terms below. We're early-stage, so these terms may change as the service matures.",
    useHeading: 'Using BeBooked',
    useBody: 'BeBooked is a booking management platform for shops like barbershops and beauty salons. You can use it to manage your shop, your team, and your customers, as long as you do so lawfully and in good faith.',
    accountsHeading: 'Accounts & Responsibility',
    accountsBody: "You're responsible for keeping your account secure and for any activity that happens through it. Let us know right away if you suspect unauthorized access.",
    acceptableHeading: 'Acceptable Use',
    acceptableBody: 'You may not use BeBooked for unlawful activity, sending unsolicited messages, or anything that could harm the service or other users.',
    availabilityHeading: 'Service Availability',
    availabilityBody: "BeBooked is in beta. We do our best to keep the service available and reliable, but we can't guarantee uninterrupted operation during this stage.",
    liabilityHeading: 'Limitation of Liability',
    liabilityBody: 'BeBooked is provided "as is", without warranties of any kind. To the maximum extent permitted by law, we aren\'t liable for indirect damages arising from your use of the service.',
    changesHeading: 'Changes to These Terms',
    changesBody: 'We may update these terms as BeBooked evolves. Continuing to use the service after an update means you accept the new terms.',
    contact: 'For questions about these terms, reach out to',
  },
  about: {
    badge: 'The Story',
    title: "Hi, I'm Nick — I built BeBooked for my mum 🧡.",
    intro: 'BeBooked started as a small tool to help my mum manage bookings at her own shop, without the chaos of phone calls and paper notebooks.',
    storyHeading: 'Why I built it',
    storyBody: 'I watched my mum wrestle with an appointment notebook every day, lose bookings, and spend hours on the phone. I built BeBooked to solve exactly that problem — for her, and for every shop like hers. Today I build, run, and improve it myself, one piece at a time.',
    githubLabel: 'View the code on GitHub',
    contactLabel: 'Get in touch',
  },
  contact: {
    badge: 'Say Hi 👋',
    title: 'Let’s talk!',
    intro: "Found a bug, have a question, or have an idea for BeBooked? I’d like to hear it. Send me a message and I’ll get back to you.",
    buttonLabel: 'Contact me',
  },
  shopPlan: {
    newShopTrial: 'Your first shop starts with a 30-day free trial with everything in Team. No card is needed.',
    newShopInactive: 'You have already used your free trial. The new shop stays inactive until you contact us to set a plan for it.',
    staffLimitReached: 'The {plan} plan allows up to {n} bookable staff. Adding more needs an upgrade.',
    featureNotInPlan: 'Team invites and the manager role are not part of the {plan} plan.',
    locked: 'This shop is read-only until a plan is set for it.',
    contactUs: 'Contact us',
    title: 'Plan',
    active: 'The subscription is active.',
    trialUntil: 'Free trial until {date}.',
    trialEnded: 'The free trial has ended. The shop is read-only.',
    inactive: 'There is no active subscription. The shop is read-only.',
    staffLimit: 'Up to {n} bookable staff.',
    changePlan: 'To start or change a plan, contact us.',
    seePlans: 'See the plans',
    lockedTitle: 'This shop is read-only',
    lockedOwner: 'The trial has ended or there is no active subscription. You can see everything and export your customers, but nothing can be changed and the booking page takes no new bookings.',
    trialEnding: 'Your free trial ends on {date}. Contact us to choose a plan.',
  },
  pricingPage: {
    title: 'Pricing',
    intro: 'Three plans, priced per shop per month. Below is exactly what each one includes.',
    featureCol: 'Feature',
    included: 'Included',
    notIncluded: 'Not included',
    groups: [
      {
        title: 'Booking page',
        rows: [
          ['Public booking page at your own link', true, true, true],
          ['Customers book without creating an account', true, true, true],
          ['Customer cancel and reschedule links, with a cutoff you set', true, true, true],
          ['Greek and English', true, true, true],
        ],
      },
      {
        title: 'Calendar and bookings',
        rows: [
          ['Daily calendar with a column per staff member', true, true, true],
          ['Bookings you add yourself, including outside opening hours', true, true, true],
          ['Block time slots in the calendar', true, true, true],
          ['Booking statuses: completed, no-show, cancelled', true, true, true],
          ['Double-booking protection', true, true, true],
          ['Overview of booking counts by week, month and quarter', true, true, true],
        ],
      },
      {
        title: 'Services and customers',
        rows: [
          ['Services with price and duration', true, true, true],
          ['A photo for the shop and for each team member', true, true, true],
          ['Products customers can reserve with a booking (pay in the shop)', false, true, true],
          ['Internal-only services', true, true, true],
          ['Customer records with notes and history', true, true, true],
          ['Custom service duration per customer', true, true, true],
          ['Customer import from a file and export to Excel', true, true, true],
          ['Merge duplicate customers', true, true, true],
        ],
      },
      {
        title: 'Emails',
        rows: [
          ['Booking confirmation emails', true, true, true],
          ['Reminder emails, as many hours before as you choose', true, true, true],
          ['Cancellation and reschedule emails', true, true, true],
          ['New-booking notice to the shop', true, true, true],
        ],
      },
      {
        title: 'Team',
        rows: [
          ['Bookable staff members', '1', 'Up to 5', 'Up to 15'],
          ['Opening hours', true, true, true],
          ['Separate working hours per staff member', false, true, true],
          ['Team invites by email', false, true, true],
          ['Roles and permissions (owner, manager, staff)', false, true, true],
        ],
      },
      {
        title: 'Limits',
        rows: [
          ['Bookings per month', 'No limit', 'No limit', 'No limit'],
          ['Shops per subscription', '1', '1', '1'],
        ],
      },
    ],
    notesTitle: 'Good to know',
    notes: [
      'Prices are per shop, excluding VAT. Paying yearly costs 10 months instead of 12.',
      'Every new shop starts with a 30-day free trial with everything in Team. No card is needed.',
      'If the trial ends without a plan, the shop becomes read-only and the booking page stops taking new bookings. Your data stays.',
      'There is no commission on bookings.',
      'Confirmations and reminders are sent by email. There is no SMS.',
      'There are no online payments or deposits from customers.',
    ],
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
      rememberMe: 'Remember me',
      error: 'Login failed.',
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
      acceptPrefix: 'I accept the',
      acceptAnd: 'and the',
      termsRequired: 'You must accept the Terms of Service and Privacy Policy to continue.',
      error: 'Registration failed.',
    },
    dpa: {
      linkLabel: 'Data Processing Agreement',
      title: 'Data Processing Agreement (DPA)',
      lastUpdated: 'Last updated: October 2026',
      placeholderNotice: 'Placeholder text: the final Data Processing Agreement will be published before the service officially launches.',
      intro: 'This describes how BeBooked processes personal data on behalf of the shops that use it.',
      rolesHeading: 'Roles',
      rolesBody: "The shop is the controller of its customers' data. BeBooked acts as processor and processes that data only on the shop's instructions.",
      processingHeading: 'What is processed',
      processingBody: "Customers' name, phone number, optional email and notes, and their booking history, for the purpose of managing appointments.",
      subprocessorsHeading: 'Sub-processors',
      subprocessorsBody: 'The hosting provider for the application and database, a transactional email provider, and an error-monitoring provider (Sentry, stored in the EU), which receives technical error reports without the contents of forms. The exact list will be published in the final version.',
      securityHeading: 'Security',
      securityBody: 'Encrypted connections (HTTPS), per-shop access restrictions, and hashed passwords.',
      rightsHeading: 'Data subject rights',
      rightsBody: "The shop owner can export or delete a customer's data from the customer's page in the dashboard.",
      contact: 'Data protection contact:',
    },
    forgotPassword: {
      title: 'Forgot Password',
      emailLabel: 'Email',
      submit: 'Send Reset Link',
      submitting: 'Sending...',
      success: 'If this email exists you will receive a reset link shortly.',
      backToLogin: 'Back to Login',
      error: 'Something went wrong.',
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
      error: 'Reset failed.',
    },
    verifyEmail: {
      title: 'Email Verification',
      verifying: 'Verifying...',
      resendLabel: 'Enter your email to get a new link:',
      resendPlaceholder: 'you@example.com',
      resendSubmit: 'Resend Verification Email',
      resending: 'Sending...',
      resentOk: 'Email sent! Check your inbox and spam folder.',
      backToRegister: 'Back to Register',
      passwordIntro: 'Enter the password you chose when you signed up to finish creating your account.',
      passwordLabel: 'Password',
      submit: 'Verify email',
      wrongPassword: 'That is not the password you signed up with.',
      invalidLink: 'Invalid verification link.',
      error: 'Verification failed.',
      resendError: 'Something went wrong. Please try again.',
    },
    verifyEmailChange: {
      title: 'Email Change Verification',
      verifying: 'Verifying...',
      success: 'Your email address has been updated successfully.',
      invalidLink: 'Invalid verification link.',
      error: 'Verification failed.',
      continue: 'Continue',
      backToAccount: 'Back to Account',
    },
    settings: {
      wrongPassword: 'Incorrect password.',
      soleOwnerOfShop: 'You are the owner of a shop. Delete the shop or transfer it to a manager first.',
      deleteAccountMessage: 'This will permanently delete your account and all associated data. This can\'t be undone.',
      deleteAccountConfirmButton: 'Delete account',
      deleteAccountTitle: 'Delete your account?',
      title: 'Account',
      profileSection: 'Profile',
      saveProfile: 'Save Profile',
      successProfile: 'Profile updated successfully.',
      errorProfile: 'Failed to update profile.',
      emailSection: 'Email Address',
      emailLabel: 'Email',
      saveEmail: 'Save Email',
      passwordSection: 'Change Password',
      newPasswordLabel: 'New Password',
      newPasswordOptionalLabel: 'New Password (optional)',
      currentPasswordLabel: 'Current password',
      updatePassword: 'Update Password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      logout: 'Log out',
      logoutDesc: 'Sign out of your account on this device.',
      dangerZone: 'Danger Zone',
      dangerDesc: 'Permanently delete your account and all associated data. This action cannot be undone.',
      deleteAccount: 'Delete Account',
      confirmPasswordLabel: 'Confirm your password',
      confirmPasswordPlaceholder: 'Your password',
      cancel: 'Cancel',
      pwMin: 'At least 8 characters',
      pwUpper: 'One uppercase letter',
      pwNumber: 'One number',
      pwSpecial: 'One special character (!@#$%...)',
      nameSection: 'User Name',
      nameLabel: 'User Name',
      saveName: 'Save Name',
      preferencesSection: 'Preferences',
      paletteLabel: 'Colours',
      paletteDesc: 'The colours of the app on this device',
      palettes: { original: 'Original', mono: 'Black & white', purple: 'Purple' },
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
      photoHint: "When you join a team, this becomes your starting photo there. The shop can change its copy without affecting this one.",
    },
    notFound: {
      code: '404',
      title: 'Page not found',
      message: "The page you're looking for doesn't exist or has been moved.",
      goHome: 'Go Home',
    },
    team: {
      demoteConfirmButton: 'Remove manager access',
      demoteTitle: 'Remove manager access for {name}?',
      promoteConfirmButton: 'Make manager',
      promoteTitle: 'Make {name} a manager?',
      removeConfirmButton: 'Remove member',
      removeTitle: 'Remove {name}?',
      title: 'Team Members',
      email: 'Email',
      role: 'Role',
      joined: 'Joined',
      actions: 'Actions',
      roles: { owner: 'Owner', manager: 'Manager', staff: 'Staff' },
      remove: 'Remove',
      cancel: 'Cancel',
      noMembers: 'No team members yet.',
      notFound: 'Member not found.',
      errorLoad: 'Failed to load team members.',
      errorRemove: 'Failed to remove member.',
      errorRemoveHasBookings: 'This member has bookings. Deactivate them instead.',
      backToTeam: 'Back to Team',
      editRole: 'Edit Role',
      saveRole: 'Save Role',
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
      errorInviteInactive: 'Activate this member before sending an invite.',
      errorCancelInvite: 'Failed to cancel invite.',
      canViewCustomerDetails: 'View customer details',
      canViewCustomerDetailsDesc: "When off, this member sees just the word \"Customer\" — no name, phone, or email.",
      active: 'Active',
      activeDesc: "When off, this member won't show up anywhere for booking and loses access to this shop.",
      ownerAlwaysActiveHint: 'The owner always stays active, so they can never be locked out of their own shop.',
      bookableByCustomers: 'Bookable by customers',
      bookableByCustomersDesc: 'Controls whether this member shows up as an option on the public booking link.',
      bookableInternally: 'Bookable internally',
      bookableInternallyDesc: 'Controls whether this member shows up as an option when creating a booking from inside the app.',
      inactiveBadge: 'Inactive',
      canManageManagers: 'Manage managers',
      canManageManagersDesc: 'When on, they can add, change and remove other managers. When off, they manage staff only.',
      canEditShopSettings: 'Edit shop settings',
      canEditShopSettingsDesc: "When on, they can change the shop's details and settings. When off, they can only view them.",
      confirmPromoteManager: 'This person will become a manager: they run staff, services, schedules, bookings and customers. The owner decides whether they can also manage other managers or edit shop settings.',
      confirmDemoteManager: 'This person will lose manager access.',
      transferOwnership: 'Transfer ownership',
      transferDesc: 'This person becomes the owner of the shop and you become a manager.',
      transferTitle: 'Transfer the shop to {name}?',
      confirmTransfer: 'They become the owner, and only they can delete the shop or transfer it again. You stay on as a manager.',
      transferConfirmButton: 'Transfer ownership',
      errorTransfer: 'Could not transfer ownership.',
      emailLabel: 'Email',
      saveEmail: 'Save Email',
      addEmailFirst: 'Add an email before sending a login invite',
      errorSaveEmail: 'Failed to save email.',
      emailChangedHint: 'Save your changes above before sending the invite.',
    },
    invites: {
      declineConfirmButton: 'Decline invite',
      declineMessage: 'You will not be added to this shop.',
      declineTitle: 'Decline invite to {shop}?',
      cancelInviteConfirmButton: 'Cancel invite',
      cancelInviteMessage: 'The pending invite will be revoked.',
      cancelInviteTitle: 'Cancel invite for {name}?',
      managerInviteConfirmButton: 'Invite as manager',
      managerInviteTitle: 'Invite {name} as a manager?',
      title: 'Invites',
      received: 'Received',
      sent: 'Sent',
      sendInvite: 'Send Invite',
      emailLabel: 'Email',
      roleLabel: 'Role',
      accept: 'Accept',
      decline: 'Decline',
      revoke: 'Revoke',
      revoking: 'Revoking...',
      status: { pending: 'Pending', accepted: 'Accepted', expired: 'Expired' },
      roles: { owner: 'Owner', manager: 'Manager', staff: 'Staff' },
      expiresAt: 'Expires',
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
      confirmManagerInvite: 'This person will become a manager: they run staff, services, schedules, bookings and customers. The owner sets any extra permissions on their profile.',
      createdNoEmail: 'Team member created. No login invite was sent.',
      pendingLogins: 'Members Without a Login',
      noPendingLogins: 'Every member has a login.',
      notSentYet: 'Not sent',
      resend: 'Resend',
      cancelInvite: 'Cancel Invite',
      errorResend: 'Failed to send invite.',
      errorCancel: 'Failed to cancel invite.',
      statusLabel: 'Status',
      optional: 'optional',
      dashboard: 'Dashboard',
      invitedToJoin: 'invited you to join',
    },
    services: {
      errorHasBookings: "This service has bookings. Deactivate it instead so customers can't book it.",
      errorHasBookingsInactive: "This service has bookings so it can't be deleted. It's already inactive, so customers can't book it.",
      deactivateTitle: 'Deactivate {name}?',
      deactivate: 'Deactivate',
      errorDeactivate: 'Failed to deactivate service.',
      deleteConfirmButton: 'Delete service',
      deleteMessage: 'This service will be permanently deleted. This can\'t be undone.',
      deleteTitle: 'Delete {name}?',
      title: 'Services',
      addService: 'New Service',
      create: 'Create',
      name: 'Name',
      description: 'Description',
      duration: 'Duration',
      price: 'Price',
      isActive: 'Active',
      showOnPublicPage: 'Show on public page',
      showOnPublicPageHint: 'When off, only your team can book this service.',
      internalOnly: 'Internal',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
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
      deleteScheduleConfirmButton: 'Delete schedule',
      deleteScheduleMessage: 'This schedule and its working hours will be permanently deleted.',
      deleteScheduleTitle: 'Delete this schedule?',
      title: 'Working Hours',
      save: 'Save Changes',
      successSave: 'Working hours saved.',
      errorLoad: 'Failed to load working hours.',
      errorSave: 'Failed to save changes.',
      open: 'Open',
      closed: 'Closed',
      addSlot: '+ Add',
      newSchedule: 'New Schedule',
      createSchedule: 'Create',
      deleteSchedule: 'Delete',
      cancel: 'Cancel',
      startDate: 'Start date',
      endDate: 'End date (optional)',
      ongoing: 'Ongoing',
      from: 'From',
      to: 'to',
      saveDays: 'Save',
      saveDates: 'Save Dates',
      noSchedules: 'No schedules yet. Without a schedule this team member can’t be booked.',
      errorDelete: 'Failed to delete schedule.',
      errorCreate: 'Failed to create schedule.',
      slotEndBeforeStart: 'End time must be after start time.',
      slotDuplicate: 'Duplicate time slot.',
      slotOverlap: 'Time slots cannot overlap.',
      removeSlot: 'Remove time slot',
      ruleNote: "Only one schedule applies on any date. Active schedules can't overlap. Dates with no active schedule are closed.",
      statusCurrent: "Current",
      statusUpcoming: "Upcoming",
      statusEnded: "Ended",
      overlapWith: "These dates overlap the active schedule {range}. Change the dates, or turn that schedule off first.",
      overlapOpenEnded: "The active schedule starting {date} has no end date. Set an end date on it (or turn it off) before adding another.",
      openEndedNotice: "The schedule \"{range}\" has no end date, so no other active schedule can be added. Set an end date on it first.",
      setEndDate: "Set end date",
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
    branding: {
      title: "Booking page look",
      desc: "The colours and font of the public page where your customers book.",
      colours: "Colours",
      font: "Font",
      fontHint: "Every font covers Greek and English.",
      save: "Save",
      saved: "The look was saved.",
      errorSave: "Could not save.",
      preview: "Preview",
      previewUnsaved: "Not saved yet. Customers see the previous look until you press Save.",
      previewSaved: "This is how your customers see the page.",
      palettes: {
        mono: "Black & white",
        original: "Green",
        purple: "Purple",
        blue: "Blue",
        rose: "Rose",
        sand: "Sand",
      },
      fonts: {
        default: "Standard (Poppins)",
        manrope: "Manrope · modern",
        "noto-serif": "Noto Serif · classic",
        alegreya: "Alegreya · elegant",
        comfortaa: "Comfortaa · rounded",
        "roboto-slab": "Roboto Slab · bold",
      },
    },
    products: {
      title: "Products",
      add: "Add product",
      empty: "You have not added any products yet.",
      emptyHint: "Add products so customers can reserve them with their booking.",
      notInPlan: "Products are not part of the {plan} plan. Upgrade the plan to use them.",
      colProduct: "Product",
      colPrice: "Price",
      colStock: "Stock",
      colSupplier: "Supplier",
      noSupplier: "—",
      stockOut: "Not available",
      stockLast: "Last one",
      stockLow: "Only {n} left",
      stockOk: "In stock",
      stockCount: "{n} in stock",
      newTitle: "New product",
      back: "Back to products",
      name: "Name",
      price: "Price (€)",
      stockLabel: "How many are left",
      description: "Description",
      supplier: "Where I buy it (supplier link)",
      supplierHint: "Only you and the managers see this. Customers never do.",
      openSupplier: "Open supplier",
      save: "Save",
      create: "Create product",
      saved: "The product was saved.",
      errorLoad: "The products could not be loaded.",
      errorSave: "The product could not be saved.",
      errorDelete: "The product could not be deleted.",
      errorPhoto: "The product was created, but its photo was not saved. Add it again here.",
      notFound: "Product not found.",
      photoTitle: "Photo",
      photoPending: "The photo is saved with the product.",
      photoAlt: "Photo of {name}",
      deleteCard: "Delete product",
      deleteTitle: "Delete this product?",
      deleteMessage: "The product will be deleted. Bookings that reserved it keep it with the name and price it had.",
      delete: "Delete",
      cancel: "Cancel",
      readOnly: "Only owners and managers can change products.",
      pickerTitle: "Products",
      pickerHint: "Reserve products with your booking. You pay in the shop.",
      payInShop: "Reservation only: you pay in the shop.",
      total: "Total",
      decrease: "Fewer: {name}",
      increase: "More: {name}",
      quantity: "Quantity: {name}",
      overStock: "You are reserving more than what is left. It will be reserved anyway.",
      overStockConfirm: "Reserve anyway",
      outOfStockError: "Some products are no longer available in that quantity. Refresh the page and try again.",
      bookingTitle: "Products",
      sold: "Sold",
      notSold: "Not sold",
      leftInStock: "{n} in stock",
      errorSale: "The product could not be updated.",
      confirmationTitle: "Reserved products",
      deletedProduct: "This product was deleted",
      zeroNote: "Quantity is 0: this product no longer counts in the booking. Raise it again or remove it.",
      serviceFee: "Service",
      productsSubtotal: "Products",
      removeLine: "Remove: {name}",
      removeLineTitle: "Remove this product from the booking?",
      removeLineMessage: "The product is removed from the booking. If it was marked sold, the stock goes back.",
      active: "Offered with bookings",
      activeHint: "When off, the product stays in your list but is not offered to customers or staff when booking.",
      inactive: "Inactive",
    },
    photos: {
      editorTitle: "Edit photo",
      zoom: "Zoom",
      editorHint: "Drag the photo to move it and use the slider to zoom. What is inside the frame is what will be shown.",
      save: "Save",
      cancel: "Cancel",
      add: "Add photo",
      replace: "Replace",
      adjust: "Adjust",
      remove: "Remove",
      removeTitle: "Remove photo?",
      removeMessage: "The photo will be deleted. The initial is shown again.",
      hint: "JPEG, PNG or WebP, up to 8 MB.",
      shopTitle: "Shop photo",
      shopDesc: "Shown at the top of your public booking page. Saved as soon as you finish editing it.",
      shopEmpty: "No photo added",
      shopAlt: "Photo of {name}",
      errorType: "The photo must be a JPEG, PNG or WebP image.",
      errorSize: "The photo is too large (up to 8 MB).",
      errorLoad: "The photo could not be loaded.",
      errorSave: "The photo could not be saved.",
      errorRemove: "The photo could not be removed.",
    },
    timeOff: {
      title: "Time off",
      shopTitle: "Closed days",
      hint: "Days or hours this member is not working, on top of the weekly hours. Customers cannot book then.",
      shopHint: "Days or hours the whole shop is closed, such as public holidays. They apply to every member and customers cannot book then.",
      add: "Add",
      firstDay: "First day",
      lastDay: "Last day (optional)",
      allDay: "All day",
      startTime: "Start time",
      endTime: "End time",
      note: "Note (optional)",
      notePlaceholder: "e.g. Vacation",
      shopNotePlaceholder: "e.g. Christmas",
      save: "Save",
      cancel: "Cancel",
      empty: "No time off.",
      shopEmpty: "No closed days.",
      wholeShop: "Whole shop",
      remove: "Remove",
      removeTitle: "Remove this entry?",
      removeMessage: "This time will be bookable again, following the weekly hours.",
      errorLoad: "Could not load time off.",
      errorSave: "Could not save.",
      errorDelete: "Could not remove.",
      endBeforeStart: "The last day cannot be before the first day.",
      timeEndBeforeStart: "The end time must be after the start time.",
      affectedOne: "1 booking is already in this time. It was not changed; cancel or move it if needed.",
      affectedMany: "{count} bookings are already in this time. They were not changed; cancel or move them if needed.",
      viewCalendar: "Open calendar",
      showPast: "Show past ({count})",
      hidePast: "Hide past",
    },
    toggles: {
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      lightMode: 'Light mode',
      darkMode: 'Dark mode',
      language: 'Language',
    },
    shopSettings: {
      deleteShopConfirmButton: 'Delete shop',
      deleteShopTitle: 'Delete {name}?',
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
      activeOwnerOnly: 'Only the owner can change this.',
      saveChanges: 'Save Changes',
      saveHint: 'Shop details and settings below are saved together.',
      readOnlyHint: 'View only. The owner can let you edit these settings.',
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
      areYouSure: 'Are you sure? This will permanently delete {name} and all its data.',
      maxAdvanceLabel: 'Booking window (days)',
      maxAdvanceHint: 'How many days ahead customers can book an appointment.',
    slotIntervalLabel: 'Slot interval',
    slotIntervalHint: 'How often a bookable time appears (e.g. every 15 minutes). Existing bookings are not changed.',
    customerChangesTitle: 'Customer changes',
    customerChangesHint: 'What customers can do from the links in their email. You and your managers can always change a booking from the calendar.',
    rescheduleEnabledLabel: 'Let customers reschedule',
    rescheduleEnabledDesc: 'The confirmation email includes a link to pick a new time.',
    cancelCutoffLabel: 'Cancel up to (hours before)',
    cancelCutoffHint: 'Closer than this, customers can no longer cancel by themselves. 0 = until the booking starts.',
    rescheduleCutoffLabel: 'Reschedule up to (hours before)',
    rescheduleCutoffHint: 'Closer than this, customers can no longer reschedule by themselves. 0 = until the booking starts.',
    reminderEnabledLabel: 'Reminder emails',
    reminderEnabledDesc: 'Customers with an email get a reminder before their appointment.',
    reminderHoursLabel: 'Send (hours before)',
    reminderHoursHint: 'From 1 to 72 hours. Bookings made closer than this get no reminder.',
    slotIntervalOption: 'Every {n} minutes',
    },
    sharing: {
      title: 'Your booking link',
      desc: 'Share this link anywhere — your Instagram bio, WhatsApp, your website.',
      copyButton: 'Copy',
      copiedLabel: 'Copied!',
      viewButton: 'Open',
    },
    public: {
      identity: {
        askTitle: 'Continue as {name}?',
        askBody: 'We will use your saved details to find the times that suit you.',
        yes: 'Yes, continue',
        no: 'No, someone else',
        knownAs: 'Booking as',
        notYou: 'Not you?',
        prompt: 'Booked with us before? Add your phone to find your times faster',
        phoneLabel: 'Your phone',
        phoneHint: 'Optional. Only used to find times that suit you.',
        usePhone: 'Use this number',
        cancel: 'Cancel',
      },
      bookAppointment: 'Book an Appointment',
      notAcceptingTitle: 'Online booking is not available right now',
      notAccepting: 'Contact the shop to book an appointment.',
      notAcceptingCall: 'Call {phone} to book an appointment.',
      service: 'Service',
      staff: 'Staff',
      dateTime: 'Date & Time',
      yourDetails: 'Your Details',
      stepOf: 'Step {n} of {total}',
      chooseService: "Choose a service",
      chooseServiceHint: "You can pick more than one: the times add up.",
      chooseServiceToContinue: "Choose a service to continue",
      bookingAs: "Booking as {name}",
      change: "Change",
      servicesChosen: "{n} services · {duration} · {price}",
      servicesLimit: "Up to {n} services in one booking.",
      openMap: "Open in maps",
      callShop: "Call {phone}",
      stepLabel: "Step {n} of {total}",
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
      privacyNoticeBefore: 'Your details are used only so the shop can manage your booking. See our',
      privacyNoticeLink: 'Privacy Policy',
      privacyNoticeAfter: '.',
      emailPlaceholder: 'you@example.com',
      notesLabel: 'Notes',
      notesOptional: '(optional)',
      notesPlaceholder: 'Any special requests...',
      rememberLabel: 'Remember my details on this device',
      rememberHint: 'Saved only in this browser, to fill in your next booking. Untick to delete them.',
      confirmBooking: 'Confirm Booking',
      bookingConfirmed: 'Booking Confirmed!',
      bookingConfirmedMsg: "Thanks, {name}. Your appointment for {service} on {date} at {time} has been booked. We'll see you then!",
      shopNotFound: 'Shop not found',
      somethingWrong: 'Something went wrong',
      bookingBusy: 'The booking system is busy — please try again in a moment.',
      closedThisDay: 'No appointments available for this date. Please try another provider or date.',
      closedOrNoSchedule: 'Closed, or there is no schedule for this day.',
      manageWorkingHours: 'Go to working hours to fix this',
      failedSlots: 'Failed to load available slots',
      retry: 'Retry',
      serviceContext: 'Service:',
      staffContext: 'Staff:',
      atLabel: 'at',
      ruleErrors: {
        BOOKING_IN_PAST: 'That time has already passed. Please choose another.',
        BOOKING_BEYOND_ADVANCE_WINDOW: "We don't take bookings that far ahead. Please choose an earlier date.",
        SHOP_CLOSED: 'The shop is closed on that day.',
        OUTSIDE_OPENING_HOURS: 'That time is outside opening hours.',
        OFF_SLOT_GRID: 'That time is not available for booking.',
        SLOT_TAKEN: 'Sorry, that time was just taken. Please choose another.',
        BOOKING_TOO_LONG: "A booking can't be longer than 24 hours.",
      },
      bookAnother: 'Book another',
      scrollForMore: 'Scroll for more',
    },
    shopGate: {
      notFoundTitle: 'Shop not available',
      notFoundText: "This shop doesn't exist, or you no longer have access to it.",
      backToShops: 'Back to my shops',
      errorLoad: 'Could not load this shop. Check your connection and try again.',
      retry: 'Retry',
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
      greetingMorning: 'Good morning, {name}',
      greetingAfternoon: 'Good afternoon, {name}',
      greetingEvening: 'Good evening, {name}',
      rangeLabel: 'Time period',
      range: { week: 'Week', month: 'Month', quarter: '3 months' },
      stats: {
        bookings: 'Bookings',
        completed: 'Completed',
        canceled: 'Canceled',
        noShow: 'No-show',
      },
      chart: {
        title: 'Bookings over time',
        tableCaption: 'Bookings per period (canceled excluded)',
        periodCol: 'Period',
        countCol: 'Bookings',
        bookingOne: 'booking',
        bookingMany: 'bookings',
        scheduled: 'scheduled',
      },
      upcoming: {
        title: 'Upcoming bookings',
        viewAll: 'View all',
        empty: 'No upcoming bookings',
        customerCol: 'Customer',
        serviceCol: 'Service',
        shopCol: 'Shop',
        whenCol: 'When',
        statusCol: 'Status',
      },
      breakdown: {
        title: 'Status breakdown',
        total: 'Total',
        listLabel: 'Bookings by status',
      },
      error: {
        title: "We couldn't load your overview",
        text: 'Check your connection and try again.',
        retry: 'Try again',
      },
      empty: {
        title: 'No bookings in this period',
        text: 'Share your booking page and your first customer will show up here.',
        copy: 'Copy booking link',
        copied: 'Link copied',
        week: 'No bookings this week',
        month: 'No bookings this month',
        quarter: 'No bookings in the last 3 months',
      },
      loadingLabel: 'Loading overview',
    },
    customers: {
      durationsHeading: 'Service durations',
      durationsBody: 'Set how many minutes this customer needs for a service when it differs from the standard duration. Applies to new bookings; existing ones are not changed.',
      durationsStandard: 'Standard duration: {n} min',
      durationsUnit: 'Minutes. Leave empty for the standard duration.',
      durationsNoServices: 'There are no active services.',
      durationsInvalid: 'A duration must be a whole number of minutes, 1 to 1440.',
      durationsErrorLoad: 'Failed to load services.',
      durationsErrorSave: 'Failed to save durations.',
      durationsSaved: 'Durations saved.',
      filterCustomDurations: 'Custom durations',
      customDurationsBadge: 'Custom duration',
      cancel: 'Cancel',
      deleteConfirmButton: 'Delete customer',
      deleteTitle: 'Delete {name}?',
      title: 'Customers',
      searchPlaceholder: 'Search by name or phone…',
      errorLoad: 'Failed to load customers',
      noResults: 'No customers match your search.',
      noCustomers: 'No customers yet.',
      nameCol: 'Name',
      phoneCol: 'Phone',
      emailCol: 'Email',
      addedCol: 'Added',
      backToCustomers: 'Back to Customers',
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
      save: 'Save',
      totalVisitsLabel: 'Total visits',
      totalSpentLabel: 'Total spent',
      recentBookings: 'Recent Bookings',
      noBookings: 'No bookings yet.',
      privacyHeading: 'Personal data',
      privacyBody: 'Export everything held about this customer (JSON), or permanently delete the customer and all their bookings.',
      exportData: 'Export data',
      exportError: 'Failed to export data.',
      deleteCustomer: 'Delete customer',
      deleteConfirm: 'Permanently delete this customer and ALL their bookings? This cannot be undone.',
      deleteError: 'Failed to delete customer.',
      serviceCol: 'Service',
      dateTimeCol: 'Date & Time',
      statusCol: 'Status',
      mergeButton: 'Merge with another customer',
      mergeHeading: 'Duplicate record?',
      mergeBody: 'If the same customer exists twice, merge the other record into this one. Its bookings move here.',
      mergeTitle: 'Merge customer',
      mergeHint: 'Find the duplicate record. It will be merged into {target}.',
      mergeSearchLabel: 'Search customers',
      mergeSelect: 'Select',
      mergeChange: 'Pick a different customer',
      mergeSummary: '{source}\'s bookings will move to {target}, and that duplicate record will be deleted. The kept customer\'s name and phone stay as they are; the email is filled in if missing and the notes are joined. This cannot be undone.',
      mergeConfirmButton: 'Merge',
      mergeError: 'The merge failed. Please try again.',
      mergeSuccess: 'Customers merged. {count} bookings moved.',
      bookingHistory: 'Bookings',
      bookingsErrorLoad: 'The bookings could not be loaded.',
      providerCol: 'Staff',
      prevPageLabel: 'Previous page',
      nextPageLabel: 'Next page',
      importButton: 'Import',
      exportLabel: 'Export',
      exportAllError: 'The export failed. Please try again.',
      importTitle: 'Import customers',
      importHint: 'A CSV, Excel (.xlsx) or JSON file with name and phone columns, and optionally email and notes. If a phone already exists, that customer is not changed; only a missing email or missing notes are filled in.',
      importFileLabel: 'File',
      importUnsupported: 'This file type is not supported. Use CSV, .xlsx or JSON.',
      importUnreadable: 'The file could not be read.',
      importMissingColumns: 'The file is missing a column: {columns}.',
      importEmpty: 'The file has no customers.',
      importPreview: '{count} rows found. The first ones:',
      importConfirmButton: 'Import',
      importError: 'The import failed. Nothing was saved.',
      importPartialError: 'The import stopped part-way. {count} customers were saved; try again with the same file for the rest.',
      importResult: 'New: {created}. Filled in: {updated}. Unchanged: {skipped}.',
      importRowErrors: '{count} rows were not imported:',
      importRowError: 'Row {row}',
      importClose: 'Close',
      importProblems: {
        name_missing: 'the name is missing',
        name_too_long: 'the name is too long',
        phone_invalid: 'the phone is missing or not valid',
        email_invalid: 'the email is not valid',
        notes_too_long: 'the notes are too long',
      },
      successUpdate: 'Customer updated.',
      errorUpdate: 'Failed to save changes.',
      hiddenLabel: 'Customer',
      contactHiddenNotice: "You don't have permission to view or edit this customer's contact details.",
      prevPage: '←',
      nextPage: '→',
      pageOf: 'Page {page} of {total}',
    },
    bookings: {
      detail: {
        minutes: "{n} min",
        noShow: "No-show",
        cancelBooking: "Cancel booking",
        cancelTitle: "Cancel this booking?",
        cancelMessage: "The booking is canceled and its time is freed. You can reopen it later if the time is still free.",
        keepBooking: "Keep it",
        editProducts: "Edit",
        doneEditing: "Done",
        totalNote: "Service {service} + products {products}",
        soldBadge: "Sold",
        notSoldBadge: "Not sold",
      },
      block: {
        button: 'Block this slot',
        bookCustomer: 'Book a customer instead',
        name: 'Blocked',
        hint: 'This time will not be available to book. No customer details are needed.',
        noteDefault: 'Blocked slot',
        confirm: 'Block slot',
        unblock: 'Unblock slot',
        unblocked: 'This slot was unblocked and is available again.',
      },
      customerPicker: {
        label: 'Customer',
        placeholder: 'Search by name or phone…',
        hint: 'Pick an existing customer to see their own durations and times. You can skip this.',
        noMatch: 'No customer found. Enter their details on the last step.',
        selected: 'Booking for',
        change: 'Change',
      },
      statusConflict: "That time is no longer free, so the booking status can't be changed.",
      statusError: "Couldn't update the booking status. Please try again.",
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
      createSuccess: 'Booking created!',
      createError: 'Failed to create booking.',
      bookingBusy: 'The booking system is busy — please try again in a moment.',
      reschedule: {
        button: 'Reschedule',
        title: 'Reschedule booking',
        from: 'From',
        to: 'To',
        submit: 'Reschedule',
        submitAnyway: 'Reschedule anyway',
        confirmStep: 'Confirm',
        same: 'That is the booking’s current time. Pick a different time or provider.',
        error: 'Could not reschedule the booking.',
        notFound: 'This booking no longer exists.',
        notAllowed: 'Only pending or confirmed bookings can be rescheduled.',
        rescheduledLabel: 'Rescheduled',
        rescheduledTo: 'This booking was rescheduled to {when}. This time is free again.',
        rescheduledFrom: 'Rescheduled from {when}.',
        viewNew: 'Go to the new time',
        serviceWas: 'Was',
      },
      override: {
        BOOKING_IN_PAST: 'That time is in the past.',
        BOOKING_BEYOND_ADVANCE_WINDOW: "That date is beyond the shop's booking window.",
        SHOP_CLOSED: 'The shop is closed on that day.',
        OUTSIDE_OPENING_HOURS: 'That time is outside opening hours.',
        OFF_SLOT_GRID: "That isn't a regular booking time.",
        SLOT_TAKEN: 'That time is already booked for this team member.',
        BOOKING_TOO_LONG: "A booking can't be longer than 24 hours.",
        title: 'Book anyway?',
        confirm: 'Book anyway',
        cancel: 'Cancel',
      },
      intervalPicker: { label: 'Time step', option: '{n} min', offGrid: 'custom time', panelTitle: 'Custom time', confirmButton: 'Book this time' },
      outsideHours: {
        toggle: 'Show times outside working hours',
        workingHours: 'Working hours',
        BEFORE_OPENING: 'Before opening',
        BREAK: 'Break',
        AFTER_CLOSING: 'After closing',
        CLOSED_DAY: 'Closed day',
        needsConfirm: '(needs confirmation)',
        otherTime: 'Other time',
        otherTimeHint: 'Any time in 5-minute steps. It is checked when you book.',
        booked: 'booked',
        past: 'past',
        slotAria: 'outside working hours',
        panelTitle: 'Outside working hours',
        panelBody: 'This booking will be saved as an exception.',
        confirmButton: 'Book outside working hours',
      },
      calendar: {
        otherColumn: 'Other',
        off: 'Off',
        closed: 'Closed day',
        nextDay: '→ next day',
        outsideBanner: '{count} booking(s) outside the visible range',
        tags: {
          OUTSIDE_OPENING_HOURS: 'After hours',
          SHOP_CLOSED: 'Closed day',
          BOOKING_IN_PAST: 'Past entry',
          OFF_SLOT_GRID: 'Custom time',
        },
      },
      filters: {
        statusLabel: 'Status',
        staffLabel: 'Staff',
        serviceLabel: 'Service',
        allStaff: 'All staff',
        allServices: 'All services',
        button: 'Filters',
        done: 'Done',
        clear: 'Clear filters',
        showing: '{shown} of {total} bookings',
        status: {
          PENDING: 'Pending',
          CONFIRMED: 'Confirmed',
          COMPLETED: 'Completed',
          CANCELED: 'Canceled',
          NO_SHOW: 'No-show',
        },
      },
      bookingCreated: 'Booking created',
    },
    customerProfile: {
      newCustomer: "New customer",
      newCustomerTitle: "New customer",
      create: "Add customer",
      cancel: "Cancel",
      errorCreate: "The customer could not be added.",
      existsError: "A customer with this phone number already exists.",
      existsLink: "Open their page",
      photoTitle: "Photo",
      photoDesc: "Shown next to the customer's name in the list and on their bookings.",
      takePhoto: "Take a photo",
      choosePhoto: "Choose a photo",
      changePhoto: "Change",
      removePhoto: "Remove",
      photoLabel: "Your photo",
      photoHelp: "Helps the shop recognise you. Only the shop sees it.",
      wizardPhotoFailed: "Your booking is made, but the photo could not be saved.",
      pageTitle: "Your details",
      pageIntro: "Fill in your details so {shop} has you as a customer.",
      submit: "Save",
      successTitle: "Thank you!",
      successBody: "Your details were sent to {shop}. If you were already a customer, the shop will confirm the changes.",
      bookLink: "Book an appointment",
      existingNote: "If you are already a customer, the shop will see your changes and confirm them.",
      errorSubmit: "Your details could not be saved. Try again.",
      unavailableTitle: "This page is not available",
      unavailableBody: "This shop does not take customer sign-ups here.",
      sectionTitle: "Customer profiles",
      sectionHint: "What customers can add themselves.",
      photosLabel: "Customers can add a profile photo",
      photosDesc: "Optional, when they book and on the sign-up page. Only your team sees it.",
      pageLabel: "Customer sign-up page",
      pageDesc: "A public page where a customer enters their name and phone. Share the link or print the QR code.",
      qrDesc: "Customers scan the code with their phone camera.",
      qrAlt: "QR code for the customer sign-up page",
      download: "Download PNG",
      print: "Print",
      saveToShow: "Save your changes to show the link and the QR code.",
      signupLinkTitle: "Customer sign-up link",
      signupLinkDesc: "Customers enter their own details here. Print the QR code so they can scan it in the shop.",
      changesTitle: "Changes this customer asked for",
      changesDesc: "Sent from the sign-up page. Nothing changes until you accept.",
      changesPhoto: "New photo",
      changesAccept: "Accept",
      changesReject: "Reject",
      changesError: "This could not be saved. Try again.",
      changesPhoneTaken: "The new phone number already belongs to another customer. Merge the two records, or reject the change.",
      changesFilter: "Changes waiting",
      changesBadge: "Changes waiting",
      numberChanged: "My phone number has changed",
      newPhoneLabel: "New phone number",
      newPhoneHint: "Enter your old number above, so the shop can find you.",
    },
    cancelBooking: {
      invalidLink: 'Invalid cancellation link.',
      cancelling: 'Cancelling your booking...',
      alreadyCancelled: 'This booking has already been cancelled.',
      alreadyCompleted: 'This booking has already been completed and can no longer be cancelled.',
      markedNoShow: 'This booking was marked as a no-show and can no longer be cancelled.',
      pastBooking: 'This booking has already started or passed and can no longer be cancelled. Please contact the shop.',
      notFound: 'Booking not found. The link may be invalid or expired.',
      errorCancel: 'Could not cancel booking. Please try again or contact the shop.',
      cancelled: 'Booking Cancelled',
      yourText: 'Your',
      appointmentAt: 'appointment at',
      hasCancelled: 'has been cancelled.',
      confirmTitle: 'Cancel your booking?',
      confirmText: 'Are you sure you want to cancel your appointment? This cannot be undone.',
      confirmButton: 'Yes, cancel booking',
      keepButton: 'Keep booking',
      kept: 'Your booking is kept. You can close this page.',
      windowClosed: 'Your booking is less than {n} hours away and can no longer be cancelled here. Please contact the shop.',
      rescheduled: 'This booking was rescheduled. Use the link in your latest email.',
    },
    rescheduleBooking: {
      invalidLink: 'Invalid reschedule link.',
      notFound: 'Booking not found. The link may be invalid or expired.',
      title: 'Reschedule your booking',
      currentLabel: 'Current time',
      keepButton: 'Keep current time',
      kept: 'Your booking stays as it was. You can close this page.',
      done: 'Booking rescheduled',
      doneText: 'Your appointment is now on:',
      doneEmail: 'If you gave an email, the new details are on their way. Links in earlier emails no longer work.',
      disabled: 'This shop does not take reschedules online. Please contact the shop.',
      windowClosed: 'Your booking is less than {n} hours away and can no longer be rescheduled here. Please contact the shop.',
      rescheduled: 'This booking was already rescheduled to {when}. Use the link in your latest email.',
      alreadyCancelled: 'This booking has been cancelled.',
      alreadyCompleted: 'This booking has already been completed.',
      markedNoShow: 'This booking was marked as a no-show.',
      pastBooking: 'This booking has already started or passed. Please contact the shop.',
      staffUnavailable: 'That team member is not available. Pick someone else.',
      error: 'Could not reschedule your booking. Please try again or contact the shop.',
    },
  },
};
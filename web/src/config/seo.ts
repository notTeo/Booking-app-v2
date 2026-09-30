import type { Language } from '../locales/translations';

export const SITE_URL = 'https://bebooked.gr';
export const SITE_NAME = 'BeBooked';

interface PageMeta {
  title: Record<Language, string>;
  description: Record<Language, string>;
  index: boolean;
}

const HOME: PageMeta = {
  title: {
    el: 'BeBooked — Online κρατήσεις για κουρεία και σαλόνια ομορφιάς',
    en: 'BeBooked — Online bookings for barbershops and salons',
  },
  description: {
    el: 'Το BeBooked είναι η πλατφόρμα κρατήσεων για κουρεία και σαλόνια ομορφιάς. Δέξου ραντεβού online και διαχειρίσου ομάδα, υπηρεσίες και πελάτες από ένα μέρος.',
    en: 'BeBooked is the booking platform for barbershops and beauty salons. Take appointments online and manage your team, services and customers in one place.',
  },
  index: true,
};

const page = (
  el: string,
  en: string,
  descEl: string,
  descEn: string,
): PageMeta => ({
  title: { el: `${el} | ${SITE_NAME}`, en: `${en} | ${SITE_NAME}` },
  description: { el: descEl, en: descEn },
  index: true,
});

const PRIVATE: PageMeta = {
  title: { el: SITE_NAME, en: SITE_NAME },
  description: HOME.description,
  index: false,
};

/** Public marketing pages, indexable. Everything else defaults to noindex. */
export const PAGE_META: Record<string, PageMeta> = {
  '/': HOME,
  '/about': page(
    'Σχετικά', 'About',
    'Η ιστορία του BeBooked: φτιάχτηκε για να βοηθήσει ένα κατάστημα να διαχειρίζεται τα ραντεβού του χωρίς χάος.',
    'The story behind BeBooked: built to help a real shop manage its bookings without the chaos.',
  ),
  '/contact': page(
    'Επικοινωνία', 'Contact',
    'Επικοινώνησε με την ομάδα του BeBooked για ερωτήσεις, προτάσεις ή αναφορά προβλήματος.',
    'Get in touch with the BeBooked team for questions, ideas or to report a problem.',
  ),
  '/register': page(
    'Δημιουργία λογαριασμού', 'Create an account',
    'Δημιούργησε λογαριασμό στο BeBooked και ξεκίνησε να δέχεσαι ραντεβού online για το κατάστημά σου.',
    'Create a BeBooked account and start taking online appointments for your shop.',
  ),
  '/privacy': page(
    'Πολιτική απορρήτου', 'Privacy policy',
    'Πώς το BeBooked συλλέγει και χρησιμοποιεί προσωπικά δεδομένα.',
    'How BeBooked collects and uses personal data.',
  ),
  '/terms': page(
    'Όροι χρήσης', 'Terms of use',
    'Οι όροι χρήσης της πλατφόρμας BeBooked.',
    'The terms of use for the BeBooked platform.',
  ),
  '/dpa': page(
    'Συμφωνία επεξεργασίας δεδομένων', 'Data processing agreement',
    'Πώς το BeBooked επεξεργάζεται δεδομένα για λογαριασμό των καταστημάτων που το χρησιμοποιούν.',
    'How BeBooked processes data on behalf of the shops that use it.',
  ),
};

export const PRIVATE_PAGE_META = PRIVATE;

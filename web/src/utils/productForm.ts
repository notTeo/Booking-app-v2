/** Cents from what was typed in euros ("12,50" and "12.5" both work), or null when it is not a price. */
export const parsePrice = (value: string) => {
  const euros = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(euros) && euros >= 0 ? Math.round(euros * 100) : null;
};

/** A whole number of items, or null when it is not one. */
export const parseStock = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

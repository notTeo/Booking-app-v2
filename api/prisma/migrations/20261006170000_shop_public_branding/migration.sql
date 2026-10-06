-- The look of a shop's public booking page: one of the colour sets and font
-- sets the web app ships (see api/src/utils/branding.ts). The defaults are
-- what every public page looked like before: black and white, standard fonts.
ALTER TABLE "Shop" ADD COLUMN "publicPalette" TEXT NOT NULL DEFAULT 'mono';
ALTER TABLE "Shop" ADD COLUMN "publicFont" TEXT NOT NULL DEFAULT 'default';

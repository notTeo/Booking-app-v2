import { Router } from 'express';
import { MEDIA_KEY_PATTERN, storage } from '../services/storage.service';

// Serves the stored photos. The bucket itself is private, so this is the only
// way a browser reaches a file. File names are random and never reused, which
// is what makes the year-long cache safe.
const router = Router();

router.get(/^\/(.+)$/, async (req, res, next) => {
  try {
    const key = (req.params as Record<string, string>)[0];
    const file = MEDIA_KEY_PATTERN.test(key) ? await storage.get(key) : null;
    if (!file) {
      res.status(404).json({ status: 'error', message: 'Not found' });
      return;
    }
    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      // The web app is on another origin; helmet's default (same-origin)
      // would stop its <img> tags from loading these.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(file);
  } catch (err) {
    next(err);
  }
});

export default router;

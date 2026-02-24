import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { handleGoogleAuth } from '../services/oauth.service';
import { logger } from '../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        const result = await handleGoogleAuth(profile.id, email);
        return done(null, result);
      } catch (err) {
        logger.error(err, 'Google OAuth error');
        return done(err);
      }
    },
  ),
);

export default passport;
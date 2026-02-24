import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const resend = new Resend(env.resend.apiKey);

const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #ffffff;
      color: #1a1a2e;
      font-family: 'Poppins', sans-serif;
      padding: 2rem 1rem;
    }
    .wrapper {
      max-width: 480px;
      margin: 0 auto;
    }
    .brand {
      font-size: 1.1rem;
      font-weight: 800;
      color: #4f7cff;
      margin-bottom: 1.5rem;
    }
    .card {
      background: #f4f5f9;
      border: 1px solid #d8dae8;
      border-radius: 10px;
      padding: 2rem 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      color: #1a1a2e;
    }
    p {
      color: #5a6080;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1.25rem;
    }
    .btn {
      background: #4f7cff;
      border-radius: 10px;
      color: #fff;
      display: inline-block;
      font-size: 1rem;
      font-weight: 700;
      padding: 0.75rem 1.75rem;
      text-decoration: none;
    }
    .footer {
      color: #5a6080;
      font-size: 0.8rem;
      margin-top: 1.25rem;
      text-align: center;
    }
    strong {
      color: #1a1a2e;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #0f1117;
        color: #e8eaf6;
      }
      .card {
        background: #1a1d27;
        border-color: #2e3352;
      }
      h1 {
        color: #e8eaf6;
      }
      p {
        color: #7b82a8;
      }
      .footer {
        color: #7b82a8;
      }
      strong {
        color: #e8eaf6;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="brand">AuthBoilerplate</div>
    <div class="card">
      ${content}
    </div>
    <p class="footer">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = async (
  email: string,
  token: string,
) => {
  const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Verify your email',
    html: baseTemplate('Verify your email', `
      <h1>Verify your email</h1>
      <p>Thanks for signing up! Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verificationUrl}">
        <h4 class="btn">Verify Email</h4>
      </a>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send verification email to ${email}`);
    throw new Error('Failed to send verification email');
  }

  logger.info(`Verification email sent to ${email}`);
};

export const sendEmailChangeVerification = async (
  newEmail: string,
  token: string,
) => {
  const verifyUrl = `${env.clientUrl}/verify-email-change?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: newEmail,
    subject: 'Verify your new email address',
    html: baseTemplate('Verify your new email address', `
      <h1>Verify your new email</h1>
      <p>You requested to change your email address. Click the button below to confirm this change. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}">
        <h4 class="btn"> Verify New Email</h4>
      </a>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send email change verification to ${newEmail}`);
    throw new Error('Failed to send email change verification');
  }

  logger.info(`Email change verification sent to ${newEmail}`);
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
) => {
  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.resend.emailFrom,
    to: email,
    subject: 'Reset your password',
    html: baseTemplate('Reset your password', `
      <h1>Reset your password</h1>
      <p>We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}">
        <h4 class="btn">Reset Password</h4>
      </a>
    `),
  });

  if (error) {
    logger.error(error, `Failed to send reset email to ${email}`);
    throw new Error('Failed to send password reset email');
  }

  logger.info(`Password reset email sent to ${email}`);
};

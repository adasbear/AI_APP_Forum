import { Resend } from 'resend';

const FROM_ADDRESS =
  process.env.EMAIL_FROM ||
  'Evangadi Forum <noreply@evangadiforum.com>';

// Lazy singleton — instantiated on first use so a missing key
// does NOT crash the server at startup. A clear error is thrown
// only when an email is actually attempted.
let _resend = null;

function getResendClient() {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. Add it to your Render environment variables to enable email sending.',
    );
  }

  _resend = new Resend(apiKey);
  return _resend;
}

/**
 * Sends a password reset email to the user
 */
export async function sendPasswordResetEmail({
  toEmail,
  firstName,
  resetLink,
}) {
  const html = buildResetEmailHtml({
    firstName,
    resetLink,
    expiryMinutes: 15,
  });

  await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: 'Reset your password – Evangadi Forum',
    html,
    text: `Reset your password using this link: ${resetLink} (expires in 15 minutes)`,
  });
}

/**
 * Builds the HTML email with proper placeholder replacement
 */
function buildResetEmailHtml({ firstName, resetLink, expiryMinutes }) {
  const template = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset</title>

    <style>
      *{margin:0;padding:0;box-sizing:border-box;}

      body{
        background:#f4f6fb;
        font-family:Arial, Helvetica, sans-serif;
        color:#1f2937;
        line-height:1.6;
      }

      .wrapper{width:100%;padding:40px 15px;}

      .container{
        max-width:620px;
        margin:auto;
        background:#fff;
        border-radius:18px;
        overflow:hidden;
        border:1px solid #ececec;
        box-shadow:0 8px 30px rgba(0,0,0,.05);
      }

      .header{
        padding:35px 40px 30px;
        border-bottom:1px solid #f0f0f0;
      }

      .logo{
        display:flex;
        align-items:center;
        gap:14px;
      }

      .logo-icon{
        width:52px;height:52px;
        border-radius:14px;
        background:#ff6b0b;
        color:#fff;
        font-size:28px;
        font-weight:bold;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .hero{
        background:linear-gradient(135deg,#ff7a18,#ff5f00);
        padding:45px 40px;
        text-align:center;
        color:#fff;
      }

      .content{padding:45px 40px;}

      .greeting{
        font-size:20px;
        font-weight:700;
        margin-bottom:20px;
      }

      .button-wrapper{text-align:center;margin:40px 0;}

      .button{
        display:inline-block;
        background:#ff6b0b;
        color:#fff !important;
        text-decoration:none;
        padding:16px 38px;
        border-radius:10px;
        font-size:17px;
        font-weight:bold;
      }

      .notice{
        background:#fff7f1;
        border-left:5px solid #ff6b0b;
        padding:18px;
        border-radius:10px;
        margin-top:35px;
      }

      .link-box{
        margin-top:30px;
        background:#f7f8fb;
        border:1px solid #e5e7eb;
        padding:18px;
        border-radius:10px;
        word-break:break-all;
        font-size:14px;
      }

      .footer{
        background:#fafafa;
        padding:35px;
        text-align:center;
        border-top:1px solid #eee;
        font-size:14px;
        color:#6b7280;
      }

      .brand{color:#ff6b0b;font-weight:bold;}
    </style>
  </head>

  <body>
    <!-- preview text -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Reset your password. Link expires in ${expiryMinutes} minutes.
    </div>

    <div class="wrapper">
      <div class="container">

        <div class="header">
          <div class="logo">
            <div class="logo-icon">💬</div>
            <div>
              <h1>Evangadi Forum</h1>
              <p>Learn together. Ask with context.</p>
            </div>
          </div>
        </div>

        <div class="hero">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password.</p>
        </div>

        <div class="content">

          <div class="greeting">
            Hello ${escapeHtml(firstName || 'there')},
          </div>

          <p>
            Someone requested a password reset for your account.
          </p>

          <p>
            Click below to securely reset your password.
          </p>

          <div class="button-wrapper">
            <a href="${resetLink}" class="button">Reset My Password</a>
          </div>

          <div class="notice">
            <strong>Security Notice</strong>
            <p style="margin-top:10px;">
              This link expires in <strong>${expiryMinutes} minutes</strong>.
            </p>
            <p style="margin-top:10px;">
              If you didn’t request this, ignore this email.
            </p>
          </div>

          <div class="link-box">
            If button doesn’t work, copy:
            <br /><br />
            ${resetLink}
          </div>

        </div>

        <div class="footer">
          <p>Thanks for using <span class="brand">Evangadi Forum</span></p>
          <p>Helping developers learn and grow.</p>
          <br />
          <p>© 2026 Evangadi Forum</p>
        </div>

      </div>
    </div>
  </body>
</html>
`;

  return template.trim();
}

/**
 * Prevent XSS in user name only
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
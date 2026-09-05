/**
 * Email transport — Nodemailer wrapper with graceful fallback.
 *
 * If nodemailer is installed and SMTP credentials are provided via env vars,
 * this sends a real email. Otherwise it returns false and logs a message
 * so the dispatch system still works in simulated mode.
 */

let nodemailerAvailable = null; // lazy-evaluated

async function loadNodemailer() {
  if (nodemailerAvailable !== null) return nodemailerAvailable;
  try {
    const nodemailer = await import('nodemailer');
    nodemailerAvailable = nodemailer.default || nodemailer;
    return nodemailerAvailable;
  } catch {
    console.log('[EMAIL] nodemailer not installed — email sending disabled');
    nodemailerAvailable = false;
    return false;
  }
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'antarctic-platform@ncpor.gov.in';

  if (!host || !user || !pass) return null;

  const nodemailer = nodemailerAvailable;
  if (!nodemailer) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send an alert notification email.
 * Returns true on success, false if transport is unavailable.
 */
export async function sendAlertEmail(to, subject, body) {
  const nodemailer = await loadNodemailer();
  if (!nodemailer) return false;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[EMAIL] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS env vars');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'antarctic-platform@ncpor.gov.in',
      to,
      subject,
      text: body,
      headers: {
        'X-Priority': '1',
        'X-Category': 'antartica-critical-alert',
      },
    });
    console.log(`[EMAIL] Sent: ${info.messageId} → ${to}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Send failed:', err.message);
    return false;
  }
}

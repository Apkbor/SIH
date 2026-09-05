/**
 * Twilio SMS Service
 *
 * Sends real SMS alerts via Twilio when notifications are dispatched.
 * Gracefully handles missing/incorrect config — never crashes the alert pipeline.
 *
 * Env vars required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  (your Twilio trial number, e.g. +1xxx)
 */

let twilioClient = null;
let twilioFromNumber = null;

function getTwilioClient() {
  if (twilioClient) return { client: twilioClient, from: twilioFromNumber };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log('[SMS] Twilio not configured (missing TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER)');
    return null;
  }

  try {
    // Dynamic import so the app works without twilio installed
    const twilio = require('twilio');
    twilioClient = twilio(sid, token);
    twilioFromNumber = from;
    console.log(`[SMS] Twilio client initialized, sending from ${from}`);
    return { client: twilioClient, from: twilioFromNumber };
  } catch (err) {
    console.log('[SMS] Twilio SDK not available:', err.message);
    return null;
  }
}

/**
 * Compose the SMS body based on priority level.
 */
export function composeSMSBody(alert, escalation = false) {
  const stationNames = { BHARATI: 'Bharati Station', MAITRI: 'Maitri Station' };
  const stationName = stationNames[alert.stationId] || alert.stationId;
  const time = new Date().toISOString().slice(11, 16); // HH:MM UTC
  const urgencyIcon = { P0: '🔴', P1: '🟠', P2: '🟡' }[alert.priority] || '⚪';

  if (escalation) {
    return `${urgencyIcon} ONGOING - ${alert.title}
Station: ${stationName}
Time: ${time} UTC
This alert has been active for an extended period with no resolution detected.
Immediate follow-up recommended. - AntarctiGrid`;
  }

  const urgencyLabel = { P0: 'CRITICAL', P1: 'WARNING', P2: 'NOTICE' }[alert.priority] || 'ALERT';
  const actionLabel = {
    P0: 'IMMEDIATE ACTION REQUIRED',
    P1: 'Action recommended',
    P2: 'For awareness',
  }[alert.priority] || 'Please review';

  return `${urgencyIcon} ${urgencyLabel} - ${stationName}
${alert.title}: ${alert.description || 'No details'}
Value: ${alert.value ?? 'N/A'} | Threshold: ${alert.threshold ?? 'N/A'}
Time: ${time} UTC
${actionLabel} - AntarctiGrid`;
}

/**
 * Send a single SMS via Twilio.
 * Returns true on success, false on failure.
 */
export async function sendSMS(toPhone, body) {
  const twilio = getTwilioClient();
  if (!twilio) {
    console.log(`[SMS] Simulated dispatch → ${toPhone}: ${body.split('\n')[0]}`);
    return false;
  }

  try {
    const result = await twilio.client.messages.create({
      body,
      from: twilio.from,
      to: toPhone,
    });
    console.log(`[SMS] Sent ✓ to ${toPhone} (SID: ${result.sid})`);
    return { sent: true, sid: result.sid, provider: 'twilio' };
  } catch (err) {
    console.error(`[SMS] Failed to send to ${toPhone}:`, err.message);
    return { sent: false, error: err.message, provider: 'twilio' };
  }
}

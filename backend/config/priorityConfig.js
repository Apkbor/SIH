/**
 * Priority → Recipient Mapping for SMS notifications
 *
 * Maps alert priority levels to responsible contact details.
 * Easily editable — change numbers, labels, or escalation windows here.
 */

export const priorityConfig = {
  P0: {
    label: 'Critical Response Team',
    phone: process.env.P0_PHONE_NUMBER || '+919540261625',
    channel: 'sms',
    escalationMinutes: 30,   // follow-up SMS after 30min if still active
    cooldownMinutes: 5,      // skip new SMS within 5min of last one for same issue
  },
  P1: {
    label: 'Operations Team',
    phone: process.env.P1_PHONE_NUMBER || '+919599013792',
    channel: 'sms',
    escalationMinutes: 60,
    cooldownMinutes: 10,
  },
  P2: {
    label: 'Routine Monitoring Team',
    phone: process.env.P2_PHONE_NUMBER || '+918178974475',
    channel: 'sms',
    escalationMinutes: 120,
    cooldownMinutes: 15,
  },
};

export function getPriorityConfig(priority) {
  return priorityConfig[priority] || priorityConfig.P2;
}

export function getRecipientForPriority(priority) {
  const cfg = getPriorityConfig(priority);
  return {
    label: cfg.label,
    phone: cfg.phone,
    channel: cfg.channel,
  };
}

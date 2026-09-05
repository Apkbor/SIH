/**
 * Authority/Contact Mapping — editable config for alert-to-authority routing
 *
 * Each entry maps an alert category (or keyword) to the team/authority
 * responsible for that domain. Add new entries here to extend coverage —
 * no code changes required.
 */

export const authorities = [
  {
    id: 'logistics',
    category: 'fuel',
    keywords: ['fuel', 'diesel', 'Fuel Level', 'fuel leak'],
    authority: 'Logistics Team — NCPOR Goa',
    contact: 'logistics@ncpor.gov.in',
    channel: 'email',
    escalationDelay: '5 minutes',
  },
  {
    id: 'engineering',
    category: 'generator',
    keywords: ['generator', 'Generator', 'power', 'Power Loss'],
    authority: 'Engineering Team — NCPOR Goa',
    contact: 'engineering@ncpor.gov.in',
    channel: 'email',
    escalationDelay: '2 minutes',
  },
  {
    id: 'medical',
    category: 'medical',
    keywords: ['medicine', 'antibiotics', 'Medical', 'medical bay'],
    authority: 'Medical Officer — NCPOR Goa',
    contact: 'medical@ncpor.gov.in',
    channel: 'email',
    escalationDelay: '5 minutes',
  },
  {
    id: 'environment',
    category: 'environment',
    keywords: ['environment', 'wind', 'Extreme Wind', 'Extreme Cold', 'temperature'],
    authority: 'Station Commander',
    contact: 'commander@ncpor.gov.in',
    channel: 'radio',
    escalationDelay: '3 minutes',
  },
  {
    id: 'infrastructure',
    category: 'infrastructure',
    keywords: ['infrastructure', 'Power Loss', 'building', 'comm'],
    authority: 'Engineering & Comms Team',
    contact: 'engcomms@ncpor.gov.in',
    channel: 'radio',
    escalationDelay: '5 minutes',
  },
  {
    id: 'general',
    category: '*',
    keywords: [],
    authority: 'Station Operations Center',
    contact: 'opscenter@ncpor.gov.in',
    channel: 'email',
    escalationDelay: '10 minutes',
  },
];

/**
 * Resolve the authority config for a given alert category.
 * Falls back to the 'general' entry if no specific match found.
 */
export function resolveAuthority(category, title = '') {
  const haystack = `${category} ${title}`.toLowerCase();

  // Try exact keyword match first
  for (const entry of authorities) {
    if (entry.category === '*' || entry.id === 'general') continue;
    if (entry.keywords.some(kw => haystack.includes(kw.toLowerCase()))) {
      return entry;
    }
  }

  // Category-level match
  for (const entry of authorities) {
    if (entry.category !== '*' && entry.category !== 'general' && entry.category === category) {
      return entry;
    }
  }

  // Fallback
  return authorities.find(a => a.id === 'general') || authorities[authorities.length - 1];
}

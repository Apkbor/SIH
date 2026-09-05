/**
 * API service — fetch wrappers for all backend endpoints
 */
const API_BASE = '/api';

export async function getStations() {
  const res = await fetch(`${API_BASE}/stations`);
  return res.json();
}

export async function getLatest(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/latest`);
  return res.json();
}

export async function getReadings(stationId, type, limit = 50) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/readings?type=${type}&limit=${limit}`);
  return res.json();
}

export async function getBuildings(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/buildings`);
  return res.json();
}

export async function getInventory(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/inventory`);
  return res.json();
}

export async function getAlerts(stationId) {
  const params = new URLSearchParams({ unresolved: 'true' });
  if (stationId) params.set('stationId', stationId);
  const res = await fetch(`${API_BASE}/alerts?${params}`);
  return res.json();
}

export async function getForecast(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}/forecast`);
  return res.json();
}

export async function getComparison() {
  const res = await fetch(`${API_BASE}/compare`);
  return res.json();
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: 'POST' });
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json().catch(() => ({}));
}

export async function simulateGeneratorFailure(stationId) {
  return apiPost('/simulate/generator-failure', { stationId });
}

export async function simulateFuelDisruption(stationId) {
  return apiPost('/simulate/fuel-disruption', { stationId });
}

// ---- Feature 1: Notifications ----

export async function getNotifications(stationId, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (stationId) params.set('stationId', stationId);
  const res = await fetch(`${API_BASE}/notifications?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getActiveNotifications() {
  const res = await fetch(`${API_BASE}/notifications/active`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function dispatchNotificationApi(alertId) {
  return apiPost('/notifications/dispatch', { alertId });
}

// ---- Feature 2: Chat ----

export async function getChatChannels() {
  const res = await fetch(`${API_BASE}/chat/channels`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getChatMessages(channel, limit = 100) {
  const res = await fetch(`${API_BASE}/chat/messages?channel=${encodeURIComponent(channel)}&limit=${limit}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function postChatMessage(channel, sender, content, msgType = 'user', stationId) {
  return apiPost('/chat/message', { channel, sender, content, msg_type: msgType, station_id: stationId });
}

// Broadcast to all chat channels
export async function broadcastChatMessage(sender, content, msgType = 'user', stationId) {
  return apiPost('/chat/broadcast', { sender, content, msg_type: msgType, station_id: stationId });
}

// Get all messages across all channels
export async function getAllChatMessages(limit = 200) {
  const res = await fetch(`${API_BASE}/chat/all?limit=${limit}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

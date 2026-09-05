/**
 * Sensor Generator Functions
 *
 * Each function returns a JSON object matching the EXACT schema a real sensor/API would send.
 * These are pure functions — they take a stationId and state, return a reading object.
 *
 * The "hardware-agnostic boundary": ingestReading() in engine.js calls these same functions
 * that a real MQTT listener or webhook would call. Swapping in real hardware = replace
 * these generator functions with MQTT message parsers, nothing else changes.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate an energy reading
 * @param {string} stationId
 * @param {object} state - current SensorState
 * @returns {object} energy reading
 */
export function generateEnergyReading(stationId, state) {
  return {
    stationId,
    buildingId: stationId === 'BHARATI' ? 'BHA-GEN' : 'MAI-GEN',
    type: 'energy',
    timestamp: new Date().toISOString(),
    fuelPercent: round2(state.fuelPercent),
    batteryPercent: round2(state.batteryPercent),
    generatorLoad: round2(state.generatorLoad),
    solarOutput: round2(state.solarOutput),
    generatorTempC: round2(state.generatorTempC),
  };
}

/**
 * Generate an environment reading
 * @param {string} stationId
 * @param {object} state - current SensorState
 * @returns {object} environment reading
 */
export function generateEnvReading(stationId, state) {
  return {
    stationId,
    buildingId: null,
    type: 'environment',
    timestamp: new Date().toISOString(),
    temperatureC: round2(state.temperatureC),
    windSpeedKmh: round2(state.windSpeedKmh),
    humidityPercent: round2(state.humidityPercent),
  };
}

/**
 * Generate an infrastructure (building-level) reading
 * @param {string} stationId
 * @param {object} state - current SensorState
 * @param {Array} buildings - list of buildings for this station
 * @returns {object[]} array of infrastructure readings, one per building
 */
export function generateInfraReading(stationId, state, buildings) {
  return buildings.map(b => {
    // Buildings share station-level load roughly
    const powerFactor = (state.generatorLoad / 100);
    const powerOn = Math.random() > 0.02; // 98% uptime
    const heatingOn = powerOn && (state.temperatureC < 10);

    // Building temp influenced by station temp + heating
    let buildingTemp;
    if (heatingOn) {
      buildingTemp = state.temperatureC + 15 + Math.random() * 5;
    } else {
      buildingTemp = state.temperatureC + (Math.random() - 0.5) * 3;
    }

    return {
      stationId,
      buildingId: b.id,
      type: 'infrastructure',
      timestamp: new Date().toISOString(),
      powerOn: powerOn ? 1 : 0,
      heatingOn: heatingOn ? 1 : 0,
      temperatureC: round2(buildingTemp),
    };
  });
}

/**
 * Generate a logistics reading
 * @param {string} stationId
 * @param {Array} inventoryItems - list of inventory items for this station
 * @returns {object[]} array of logistics readings, one per inventory item
 */
export function generateLogisticsReading(stationId, inventoryItems) {
  return inventoryItems.map(item => {
    // Consume a bit each reading
    const consumption = item.daily_rate > 0
      ? item.daily_rate / (86400 / 5) // 5s interval → fraction per tick
      : 0;

    const newQty = Math.max(0, item.current_qty - consumption + (Math.random() - 0.5) * 0.1);
    const daysRemaining = item.daily_rate > 0
      ? round2(newQty / item.daily_rate)
      : 9999;

    return {
      stationId,
      buildingId: null,
      type: 'logistics',
      timestamp: new Date().toISOString(),
      category: item.category,
      item: item.item,
      quantity: round2(newQty),
      unit: item.unit,
      dailyRate: item.daily_rate,
      daysRemaining,
    };
  });
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

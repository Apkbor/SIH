/**
 * What-If Simulation Engine
 *
 * Simulates hypothetical failure scenarios WITHOUT mutating real state.
 * Computes the projected impact on the station.
 */

import { getDb, dbAll, dbOne, saveDatabase } from '../db/index.js';
import { getEnergyForecast } from '../forecasting/index.js';

export function simulateGeneratorFailure(stationId, options = {}) {
  const db = getDb();
  const generatorId = options.generatorId || (stationId === 'BHARATI' ? 'BHA-GEN' : 'MAI-GEN');

  const energyRows = dbAll(
    'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
    stationId, 'energy'
  );

  if (energyRows.length === 0) {
    return { error: 'No energy data available — wait for simulator to generate readings' };
  }

  const energy = JSON.parse(energyRows[0].data);
  const buildings = dbAll('SELECT * FROM buildings WHERE station_id = ?', stationId);

  const batteryKwh = energy.batteryPercent * 5;
  const batteryCoverageMinutes = (batteryKwh / (energy.generatorLoad * 0.5)) * 60;

  const totalLoadKw = energy.generatorLoad * 0.8;
  const backupGeneratorLoad = Math.min(totalLoadKw * 0.4, totalLoadKw * 0.6);
  const uncoveredLoad = totalLoadKw - backupGeneratorLoad;

  const poweredByBackup = [];
  const losesPower = [];

  const sortedBuildings = [...buildings].sort((a, b) => b.critical - a.critical);
  let remainingCapacity = backupGeneratorLoad * 10;

  for (const b of sortedBuildings) {
    const buildingLoad = 5 + Math.random() * 15;
    if (remainingCapacity >= buildingLoad) {
      poweredByBackup.push(b);
      remainingCapacity -= buildingLoad;
    } else {
      losesPower.push(b);
    }
  }

  const criticalBuildings = buildings.filter(b => b.critical !== 0);
  const criticalLoad = criticalBuildings.length * 8;
  const criticalBatteryMinutes = criticalLoad > 0 ? round2((batteryKwh / criticalLoad) * 60) : 0;

  return {
    scenario: 'Generator Failure',
    stationId,
    generatorId,
    timestamp: new Date().toISOString(),
    buildingsAffected: buildings.length,
    criticalBuildingsAffected: buildings.filter(b => b.critical !== 0).length,
    batteryCoverageMinutes: round2(criticalBatteryMinutes),
    backupCanCover: poweredByBackup.length,
    affected: {
      totalBuildings: buildings.length,
      affectedBuildings: buildings.filter(b => b.critical === 0).length,
      criticalBuildingsMaintained: criticalBuildings.length,
      buildingsLosingPower: losesPower.length,
      losesPower: losesPower.map(b => ({ id: b.id, name: b.name, type: b.type })),
      poweredByBackup: poweredByBackup.map(b => ({ id: b.id, name: b.name, type: b.type })),
    },
    power: {
      primaryLoadKw: round2(totalLoadKw),
      backupCapacityKw: round2(backupGeneratorLoad),
      uncoveredLoadKw: round2(uncoveredLoad),
      batteryKwh: round2(batteryKwh),
      criticalBatteryMinutes: round2(criticalBatteryMinutes),
    },
    recommendations: generateRecommendations(losesPower, criticalBatteryMinutes, energy),
  };
}

export function simulateFuelDisruption(stationId) {
  const energyRows = dbAll(
    'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 1',
    stationId, 'energy'
  );

  if (energyRows.length === 0) {
    return { error: 'No energy data available' };
  }

  const energy = JSON.parse(energyRows[0].data);
  const forecast = getEnergyForecast(stationId);
  const fuelRemaining = energy.fuelPercent;
  const daysNormal = fuelRemaining > 0 ? round2((fuelRemaining / 100) * 120) : 0;

  return {
    scenario: 'Fuel Supply Disruption',
    stationId,
    timestamp: new Date().toISOString(),
    currentFuelPercent: round2(fuelRemaining),
    estimatedDaysNormal: daysNormal,
    impact: {
      heatingRisk: fuelRemaining < 30 ? 'HIGH — heating systems at risk within days' : 'LOW',
      generatorRuntimeHours: round2((fuelRemaining / 100) * 720),
      logisticsImpact: 'All diesel-dependent operations at risk',
    },
    recommendations: [
      fuelRemaining < 30 ? 'IMMEDIATE: Initiate emergency fuel conservation protocol' : 'Monitor fuel levels closely',
      'Prioritize critical building heating',
      'Reduce non-essential generator load',
      ...(forecast.fuelMessage && fuelRemaining < 30 ? ['Check resupply flight availability'] : []),
    ],
  };
}

function generateRecommendations(losesPower, batteryMinutes, energy) {
  const recs = [];

  if (losesPower.length > 0) {
    recs.push(`${losesPower.length} buildings will lose power immediately`);
  }

  if (batteryMinutes < 120) {
    recs.push(`Battery provides only ${batteryMinutes} min of critical load backup`);
  } else if (batteryMinutes < 360) {
    recs.push(`Battery backup covers ${batteryMinutes} min (~${Math.round(batteryMinutes / 60)} hrs)`);
  } else {
    recs.push(`Battery backup covers ~${Math.round(batteryMinutes / 60)} hours`);
  }

  if (energy.fuelPercent < 20) {
    recs.push('Fuel already low — generator failure accelerates depletion');
  }

  if (energy.solarOutput > 5) {
    recs.push('Solar panels can supplement power during daylight hours');
  }

  recs.push('Contact NCPOR HQ for emergency support coordination');

  return recs;
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

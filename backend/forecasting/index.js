/**
 * Forecasting / Predictive Analytics Engine
 * Lightweight, explainable — no ML training needed.
 */

import { getDb, dbAll, dbOne, saveDatabase } from '../db/index.js';

function linearRegression(points) {
  const n = points.length;
  if (n < 3) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
    sumXY += points[i].x * points[i].y;
    sumX2 += points[i].x * points[i].x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 0.001) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function getEnergyForecast(stationId) {
  const db = getDb();
  const rows = dbAll(
    'SELECT data, timestamp FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 50',
    stationId, 'energy'
  );

  if (rows.length < 3) {
    return { message: 'Collecting data... — need at least 3 readings for forecast' };
  }

  const readings = rows.map((r, i) => {
    const d = JSON.parse(r.data);
    return { x: rows.length - 1 - i, y: d.fuelPercent, timestamp: r.timestamp };
  }).reverse();

  const fuelRegression = linearRegression(readings);
  if (!fuelRegression) return { message: 'Insufficient data for fuel forecast' };

  const nextX = readings[readings.length - 1].x + 1;
  const predictedFuel = fuelRegression.slope * nextX + fuelRegression.intercept;

  const currentFuel = readings[readings.length - 1].y;
  const slopePerTick = fuelRegression.slope;
  const ticksPerDay = 86400 / 5;
  const slopePerDay = slopePerTick * ticksPerDay;

  let fuelDaysRemaining = Infinity;
  let fuelMessage;
  if (slopePerDay < -0.01) {
    fuelDaysRemaining = Math.round((currentFuel - 15) / Math.abs(slopePerDay));
    if (fuelDaysRemaining <= 0) fuelMessage = `Fuel will be CRITICAL within hours!`;
    else if (fuelDaysRemaining < 3) fuelMessage = `Fuel at ${currentFuel.toFixed(1)}% — critically low, ~${fuelDaysRemaining} days until empty`;
    else if (fuelDaysRemaining < 10) fuelMessage = `Fuel at ${currentFuel.toFixed(1)}% — ~${fuelDaysRemaining} days of supply remaining`;
    else fuelMessage = `Fuel at ${currentFuel.toFixed(1)}% — approximately ${fuelDaysRemaining} days remaining`;
  } else {
    fuelMessage = `Fuel level stable at ${currentFuel.toFixed(1)}%`;
  }

  // Generator temp forecast
  // Generator temp forecast
  const tempReadings = rows.map((r, i) => {
    const d = JSON.parse(r.data);
    return { x: rows.length - 1 - i, y: d.generatorTempC };
  }).reverse();

  const tempRegression = linearRegression(tempReadings);
  let tempForecast = null;
  if (tempRegression && tempRegression.slope > 0.01) {
    const predictedTemp = tempRegression.slope * nextX + tempRegression.intercept;
    if (predictedTemp > 100) {
      const hoursToOverheat = Math.max(1, Math.round((100 - tempReadings[tempReadings.length - 1].y) / (tempRegression.slope * 12 * 60)));
      tempForecast = {
        message: `Generator temp trending up — predicted to hit 100°C in ~${hoursToOverheat} hours`,
        predictedTemp: round2(predictedTemp),
        hoursToCritical: hoursToOverheat,
      };
    }
  }

  // Battery forecast
  const battReadings = rows.map((r, i) => {
    const d = JSON.parse(r.data);
    return { x: rows.length - 1 - i, y: d.batteryPercent };
  }).reverse();

  const battRegression = linearRegression(battReadings);
  let batteryForecast = null;
  if (battRegression && battRegression.slope < -0.05) {
    const currentBatt = battReadings[battReadings.length - 1].y;
    const ticksToCritical = (currentBatt - 20) / Math.abs(battRegression.slope);
    const hoursToCritical = Math.round((ticksToCritical * 5) / 3600);
    if (hoursToCritical < 12) {
      batteryForecast = {
        message: `Battery draining — may reach 20% in ~${hoursToCritical} hours`,
        hoursToCritical,
      };
    }
  }

  const insights = [];

  // Fuel forecast insight
  insights.push({
    title: 'Fuel Outlook',
    value: fuelMessage,
    severity: slopePerDay < -0.01 ? (fuelDaysRemaining < 3 ? 'critical' : fuelDaysRemaining < 10 ? 'warning' : 'info') : 'info',
  });

  // Generator temp insight
  if (tempForecast) {
    insights.push({
      title: 'Generator Temperature',
      value: tempForecast.message,
      severity: 'warning',
    });
  }

  // Battery insight
  if (batteryForecast) {
    insights.push({
      title: 'Battery Status',
      value: batteryForecast.message,
      severity: 'warning',
    });
  }

  return insights;
}

export function getLogisticsForecast(stationId) {
  const items = dbAll(
    'SELECT * FROM inventory WHERE station_id = ? AND days_remaining < 45 ORDER BY days_remaining ASC',
    stationId
  );

  if (items.length === 0) return { message: 'All inventory items healthy' };

  return {
    insights: items.map(item => {
      if (item.days_remaining < 7) {
        return { severity: 'critical', message: `${item.item}: Only ${round2(item.days_remaining)} days remaining`, item: item.item, daysRemaining: item.days_remaining };
      } else if (item.days_remaining < 21) {
        return { severity: 'warning', message: `${item.item}: ${round2(item.days_remaining)} days remaining`, item: item.item, daysRemaining: item.days_remaining };
      } else {
        return { severity: 'info', message: `${item.item}: ${round2(item.days_remaining)} days remaining`, item: item.item, daysRemaining: item.days_remaining };
      }
    }),
  };
}

export function getEnvironmentForecast(stationId) {
  const rows = dbAll(
    'SELECT data FROM readings WHERE station_id = ? AND type = ? ORDER BY timestamp DESC LIMIT 20',
    stationId, 'environment'
  );

  if (rows.length < 3) return { message: 'Collecting weather data...' };

  const temps = rows.map(r => JSON.parse(r.data).temperatureC);
  const avgTemp = round2(temps.reduce((a, b) => a + b, 0) / temps.length);
  const minTemp = round2(Math.min(...temps));
  const maxTemp = round2(Math.max(...temps));
  const trend = temps[0] > temps[temps.length - 1] ? 'warming' : temps[0] < temps[temps.length - 1] ? 'cooling' : 'stable';

  return {
    averageTempC: avgTemp,
    minTempC: minTemp,
    maxTempC: maxTemp,
    trend,
    message: `Avg: ${avgTemp}°C (range: ${minTemp}°C to ${maxTemp}°C) — trend: ${trend}`,
  };
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

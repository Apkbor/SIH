/**
 * Sensor State — maintains per-station, per-sensor state for gradual drift.
 * This is what makes the data look real: values trend, don't jump randomly.
 */
export class SensorState {
  constructor(stationId) {
    this.stationId = stationId;

    // Energy state
    this.fuelPercent = 60 + Math.random() * 20;        // 60-80%
    this.batteryPercent = 75 + Math.random() * 15;     // 75-90%
    this.generatorLoad = 40 + Math.random() * 20;      // 40-60%
    this.solarOutput = 5 + Math.random() * 10;         // 5-15 kW
    this.generatorTempC = 75 + Math.random() * 15;     // 75-90 C

    // Environment state
    this.temperatureC = -25 + Math.random() * 15;      // -25 to -10 C
    this.windSpeedKmh = 15 + Math.random() * 25;       // 15-40 km/h
    this.humidityPercent = 30 + Math.random() * 30;    // 30-60%

    // Building power/heating state
    this.buildingPower = {};   // buildingId -> { powerOn, heatingOn, tempC }
    this.buildingHeating = {};
    this.buildingTemp = {};
  }

  /** Apply gentle drift toward realistic means — called each tick */
  drift() {
    // Fuel: slow downward drift (consumption), clamped
    this.fuelPercent = clamp(
      this.fuelPercent + (Math.random() - 0.55) * 0.3,
      5, 100
    );

    // Battery: oscillates, slowly recharges from solar
    this.batteryPercent = clamp(
      this.batteryPercent + (Math.random() - 0.45) * 0.5,
      10, 100
    );

    // Generator load: drifts around station demand
    this.generatorLoad = clamp(
      this.generatorLoad + (Math.random() - 0.5) * 1.5,
      15, 95
    );

    // Solar: depends on "time of day" — slowly oscillates
    const solarDrift = Math.sin(Date.now() / 60000) * 0.3;
    this.solarOutput = clamp(
      this.solarOutput + solarDrift + (Math.random() - 0.5) * 0.5,
      0, 35
    );

    // Generator temp: follows load, drifts slowly
    const loadEffect = (this.generatorLoad - 50) * 0.05;
    this.generatorTempC = clamp(
      this.generatorTempC + (Math.random() - 0.5) * 0.5 + loadEffect * 0.01,
      50, 130
    );

    // Environment: Antarctic winter means cold and windy
    this.temperatureC = clamp(
      this.temperatureC + (Math.random() - 0.5) * 0.3 + (Math.random() - 0.7) * 0.1,
      -55, 5
    );

    this.windSpeedKmh = clamp(
      this.windSpeedKmh + (Math.random() - 0.5) * 2,
      0, 120
    );

    this.humidityPercent = clamp(
      this.humidityPercent + (Math.random() - 0.5) * 1,
      10, 95
    );
  }

  /** Apply an anomaly spike/drop */
  applyAnomaly() {
    const anomalyType = Math.random();

    if (anomalyType < 0.3) {
      // Generator overheating
      this.generatorTempC = 110 + Math.random() * 25;
      return { type: 'generator_overheat', delta: this.generatorTempC - 90 };
    } else if (anomalyType < 0.6) {
      // Fuel leak / accelerated consumption
      this.fuelPercent -= 8 + Math.random() * 7;
      return { type: 'fuel_leak', delta: this.fuelPercent };
    } else if (anomalyType < 0.8) {
      // Wind gust
      this.windSpeedKmh = 80 + Math.random() * 50;
      return { type: 'wind_gust', delta: this.windSpeedKmh };
    } else {
      // Battery drain
      this.batteryPercent -= 10 + Math.random() * 10;
      return { type: 'battery_drain', delta: this.batteryPercent };
    }
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

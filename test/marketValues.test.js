import test from "node:test";
import assert from "node:assert/strict";
import { Player } from "../src/models/Player.js";
import {
  balanceMarketValueProjections,
  buildMarketValueHistoryEntry,
  buildPercentileMap,
  marketValueChangeLimits,
  projectPlayerMarketValue
} from "../src/services/marketValues.js";

test("la proyeccion conserva el valor cuando no hay señales", () => {
  const result = projectPlayerMarketValue({
    oldValue: 10000000,
    gameweekPoints: 20,
    gameweekPointsPercentile: 1,
    marketValuePercentile: 0,
    usage: 50,
    activeUsers: 50,
    hasRoundData: false
  });

  assert.equal(result.newValue, 10000000);
  assert.equal(result.change, 0);
  assert.equal(result.hasAnySignal, false);
});

test("un jugador caro con rendimiento inferior a su precio apenas puede subir", () => {
  const result = projectPlayerMarketValue({
    oldValue: 25000000,
    gameweekPoints: 7,
    gameweekPositionAverage: 3.05,
    gameweekPointsPercentile: 0.78,
    seasonPointsPerRound: 7,
    seasonPositionAverage: 3.05,
    seasonPointsPercentile: 0.78,
    marketValuePercentile: 0.99,
    evaluatedRounds: 1,
    usage: 16,
    activeUsers: 121,
    averageUsageRate: 0.064,
    hasRoundData: true,
    playedInGameweek: true
  });

  assert.ok(result.newValue <= 25100000);
  assert.ok(result.contributions.valueEfficiency < 0);
  assert.equal(result.hasAnySignal, true);
});

test("una actuacion top permite una subida relevante en la franja media", () => {
  const result = projectPlayerMarketValue({
    oldValue: 18000000,
    gameweekPoints: 12,
    gameweekPositionAverage: 5.44,
    gameweekPointsPercentile: 0.93,
    seasonPointsPerRound: 12,
    seasonPositionAverage: 5.44,
    seasonPointsPercentile: 0.93,
    marketValuePercentile: 0.85,
    evaluatedRounds: 1,
    usage: 17,
    activeUsers: 121,
    averageUsageRate: 0.064,
    hasRoundData: true,
    playedInGameweek: true
  });

  assert.ok(result.change >= 1500000);
  assert.ok(result.change <= 2200000);
});

test("un rendimiento insuficiente hace bajar con claridad a un jugador medio", () => {
  const result = projectPlayerMarketValue({
    oldValue: 18000000,
    gameweekPoints: 5,
    gameweekPositionAverage: 3.43,
    gameweekPointsPercentile: 0.66,
    seasonPointsPerRound: 5,
    seasonPositionAverage: 3.43,
    seasonPointsPercentile: 0.66,
    marketValuePercentile: 0.85,
    evaluatedRounds: 1,
    usage: 11,
    activeUsers: 121,
    averageUsageRate: 0.064,
    hasRoundData: true,
    playedInGameweek: true
  });

  assert.ok(result.change <= -900000);
  assert.ok(result.change >= -1500000);
});

test("los jugadores caros tienen menos margen de subida que los baratos", () => {
  const cheap = marketValueChangeLimits(5000000);
  const expensive = marketValueChangeLimits(30000000);

  assert.equal(cheap.maxRiseRate, 0.16);
  assert.equal(expensive.maxRiseRate, 0.03);
  assert.ok(expensive.maxRiseRate < cheap.maxRiseRate);
  assert.ok(cheap.maxDropRate < expensive.maxDropRate);
});

test("la bajada de un jugador caro que no juega queda moderada", () => {
  const result = projectPlayerMarketValue({
    oldValue: 19000000,
    gameweekPoints: 0,
    gameweekPositionAverage: 5,
    gameweekPointsPercentile: 0,
    seasonPointsPerRound: 0,
    seasonPositionAverage: 5,
    seasonPointsPercentile: 0,
    marketValuePercentile: 0.9,
    evaluatedRounds: 1,
    usage: 0,
    activeUsers: 100,
    averageUsageRate: 0.08,
    hasRoundData: true,
    playedInGameweek: false
  });

  assert.ok(result.change < 0);
  assert.ok(result.change >= -1500000);
  assert.ok(result.maxDropRate < 0.08);
});

test("los percentiles reparten los empates en la misma posicion", () => {
  const rows = [
    { _id: "a", points: 0 },
    { _id: "b", points: 5 },
    { _id: "c", points: 5 },
    { _id: "d", points: 10 }
  ];
  const percentiles = buildPercentileMap(rows, (row) => row.points);

  assert.equal(percentiles.get("a"), 0);
  assert.equal(percentiles.get("b"), 0.5);
  assert.equal(percentiles.get("c"), 0.5);
  assert.equal(percentiles.get("d"), 1);
});

test("el equilibrio reduce el lado dominante sin invertir signos", () => {
  const result = balanceMarketValueProjections([
    { oldValue: 10000000, newValue: 12000000, change: 2000000, rawChangeRate: 0.2, hasAnySignal: true },
    { oldValue: 10000000, newValue: 11000000, change: 1000000, rawChangeRate: 0.1, hasAnySignal: true },
    { oldValue: 10000000, newValue: 9000000, change: -1000000, rawChangeRate: -0.1, hasAnySignal: true }
  ], 1000000000);

  assert.equal(result.targetChange, 500000);
  assert.equal(result.balancedNetChange, 500000);
  assert.equal(result.projections[0].change, 1500000);
  assert.equal(result.projections[1].change, 0);
  assert.ok(result.projections[2].change <= 0);
});

test("crea una entrada historica con valor anterior, nuevo y variacion", () => {
  const recordedAt = new Date("2026-07-20T10:00:00.000Z");
  const entry = buildMarketValueHistoryEntry(
    { _id: "507f1f77bcf86cd799439011", number: 1, name: "Jornada 1" },
    10000000,
    11500000,
    recordedAt
  );

  assert.equal(entry.valueBefore, 10000000);
  assert.equal(entry.valueAfter, 11500000);
  assert.equal(entry.change, 1500000);
  assert.equal(entry.changeRate, 0.15);
  assert.equal(entry.gameweekName, "Jornada 1");
  assert.equal(entry.recordedAt, recordedAt);
});

test("tambien registra jornadas sin cambio de valor", () => {
  const entry = buildMarketValueHistoryEntry(
    { _id: "507f1f77bcf86cd799439011", number: 2, name: "Jornada 2" },
    9000000,
    9000000
  );

  assert.equal(entry.change, 0);
  assert.equal(entry.changeRate, 0);
});

test("el modelo valida la serie historica embebida", async () => {
  assert.equal(Player.schema.path("marketValueHistory").options.select, false);
  const player = new Player({
    name: "Jugador historico",
    position: "MED",
    club: "507f1f77bcf86cd799439012",
    marketValue: 11500000,
    marketValueHistory: [{
      gameweek: "507f1f77bcf86cd799439011",
      gameweekNumber: 1,
      gameweekName: "Jornada 1",
      valueBefore: 10000000,
      valueAfter: 11500000,
      change: 1500000,
      changeRate: 0.15,
      recordedAt: new Date("2026-07-20T10:00:00.000Z")
    }]
  });

  await player.validate();
  assert.equal(player.marketValueHistory.length, 1);
  assert.equal(player.marketValueHistory[0].valueBefore, 10000000);
});

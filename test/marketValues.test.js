import test from "node:test";
import assert from "node:assert/strict";
import { Player } from "../src/models/Player.js";
import { buildMarketValueHistoryEntry } from "../src/services/marketValues.js";

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

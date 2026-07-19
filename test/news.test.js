import test from "node:test";
import assert from "node:assert/strict";
import { buildGameweekStandings } from "../src/services/news.js";

test("ordena y limita el top de una jornada por puntos", () => {
  const lineups = Array.from({ length: 12 }, (_, index) => ({
    points: index === 2 ? 30 : 20 - index,
    user: {
      _id: `team-${index}`,
      role: "user",
      teamName: `Equipo ${String(index).padStart(2, "0")}`,
      totalPoints: 100 + index
    }
  }));
  lineups.push({ points: 999, user: { _id: "admin", role: "admin", teamName: "Admin" } });

  const result = buildGameweekStandings(lineups, 10);

  assert.equal(result.participantCount, 12);
  assert.equal(result.standings.length, 10);
  assert.equal(result.standings[0].teamName, "Equipo 02");
  assert.equal(result.standings[0].points, 30);
  assert.deepEqual(result.standings.map((team) => team.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("desempata por nombre de equipo y conserva puntos negativos", () => {
  const result = buildGameweekStandings([
    { points: -2, user: { _id: "b", role: "user", teamName: "Zulu", totalPoints: 3 } },
    { points: -2, user: { _id: "a", role: "user", teamName: "Alfa", totalPoints: 4 } }
  ]);

  assert.equal(result.standings[0].teamName, "Alfa");
  assert.equal(result.standings[0].points, -2);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildGameweekBestSeven, buildGameweekStandings } from "../src/services/news.js";

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

test("elige el mejor siete entre todas las formaciones validas", () => {
  const club = { _id: "club-1", name: "Club de prueba", shortName: "CDP" };
  const player = (name, position, points, played = true) => ({
    player: { _id: name, name, position, club: club._id },
    points,
    played
  });
  const gameweek = {
    matches: [{
      homeClub: club,
      awayClub: { _id: "club-2", name: "Rival", shortName: "RIV" },
      playerScores: [
        player("Portero", "POR", 5),
        player("Defensa 1", "DEF", 8),
        player("Defensa 2", "DEF", 7),
        player("Defensa 3", "DEF", 6),
        player("Defensa 4", "DEF", -20),
        player("Medio 1", "MED", 10),
        player("Medio 2", "MED", 9),
        player("Medio 3", "MED", -20),
        player("Delantero 1", "DEL", 12),
        player("Delantero 2", "DEL", 11),
        player("Delantero 3", "DEL", 10),
        player("No participo", "MED", 100, false)
      ]
    }]
  };

  const result = buildGameweekBestSeven(gameweek);

  assert.equal(result.formation, "2-1-3");
  assert.equal(result.totalPoints, 63);
  assert.deepEqual(result.players.map((item) => item.name), [
    "Portero",
    "Defensa 1",
    "Defensa 2",
    "Medio 1",
    "Delantero 1",
    "Delantero 2",
    "Delantero 3"
  ]);
  assert.equal(result.players[0].club.shortName, "CDP");
});

test("no publica un mejor siete si no existe una formacion completa", () => {
  const gameweek = {
    matches: [{
      homeClub: { _id: "club-1", name: "Club" },
      awayClub: { _id: "club-2", name: "Rival" },
      playerScores: [{
        player: { _id: "p1", name: "Unico jugador", position: "POR", club: "club-1" },
        points: 20,
        played: true
      }]
    }]
  };

  assert.equal(buildGameweekBestSeven(gameweek), null);
});

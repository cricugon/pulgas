import test from "node:test";
import assert from "node:assert/strict";
import { calculatePlayerForms, classifyPlayerForm, PLAYER_FORM_LEVELS } from "../src/services/playerForm.js";

test("reserva los extremos para actuaciones excepcionalmente alejadas", () => {
  const benchmark = { reference: 6, spread: 3 };

  assert.equal(classifyPlayerForm(15, benchmark), PLAYER_FORM_LEVELS.VERY_UP);
  assert.equal(classifyPlayerForm(10, benchmark), PLAYER_FORM_LEVELS.UP);
  assert.equal(classifyPlayerForm(4, benchmark), PLAYER_FORM_LEVELS.NEUTRAL);
  assert.equal(classifyPlayerForm(3, benchmark), PLAYER_FORM_LEVELS.DOWN);
  assert.equal(classifyPlayerForm(-1, benchmark), PLAYER_FORM_LEVELS.VERY_DOWN);
});

test("calcula medias por posicion y deja neutrales a clubes sin partido", () => {
  const players = [
    { _id: "p1", name: "Portero alto", position: "POR", club: "c1", form: 50 },
    { _id: "p2", name: "Portero bajo", position: "POR", club: "c2", form: 50 },
    { _id: "p3", name: "Defensa alto", position: "DEF", club: "c1", form: 50 },
    { _id: "p4", name: "Defensa suplente", position: "DEF", club: "c2", form: 50 },
    { _id: "p5", name: "Jugador sin partido", position: "DEF", club: "c3", form: 75 }
  ];
  const gameweek = {
    matches: [{
      homeClub: "c1",
      awayClub: "c2",
      playerScores: [
        { player: "p1", points: 15, played: true },
        { player: "p2", points: 5, played: true },
        { player: "p3", points: 10, played: true },
        { player: "p4", points: 0, played: false }
      ]
    }]
  };

  const result = calculatePlayerForms(players, gameweek);
  const forms = new Map(result.updates.map((row) => [String(row.player), row.form]));

  assert.deepEqual(result.averages, { POR: 10, DEF: 10 });
  assert.equal(forms.get("p1"), PLAYER_FORM_LEVELS.UP);
  assert.equal(forms.get("p2"), PLAYER_FORM_LEVELS.NEUTRAL);
  assert.equal(forms.get("p3"), PLAYER_FORM_LEVELS.NEUTRAL);
  assert.equal(forms.get("p4"), PLAYER_FORM_LEVELS.DOWN);
  assert.equal(forms.get("p5"), PLAYER_FORM_LEVELS.NEUTRAL);
});

test("una puntuacion normal no se vuelve extrema por una media sesgada", () => {
  const benchmark = { reference: 5.5, spread: 4.45 };

  assert.equal(classifyPlayerForm(4, benchmark), PLAYER_FORM_LEVELS.NEUTRAL);
  assert.equal(classifyPlayerForm(12, benchmark), PLAYER_FORM_LEVELS.UP);
  assert.equal(classifyPlayerForm(17, benchmark), PLAYER_FORM_LEVELS.VERY_UP);
});

test("no premia a un jugador que no participo aunque la media sea negativa", () => {
  const players = [
    { _id: "p1", name: "Participante", position: "DEF", club: "c1", form: 50 },
    { _id: "p2", name: "No participa", position: "DEF", club: "c2", form: 50 }
  ];
  const gameweek = {
    matches: [{
      homeClub: "c1",
      awayClub: "c2",
      playerScores: [
        { player: "p1", points: -2, played: true },
        { player: "p2", points: 0, played: false }
      ]
    }]
  };

  const result = calculatePlayerForms(players, gameweek);
  const substitute = result.updates.find((row) => String(row.player) === "p2");
  assert.equal(substitute.form, PLAYER_FORM_LEVELS.DOWN);
});

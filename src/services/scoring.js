import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { inferFormationFromPlayers, selectAutoLineup } from "./formations.js";

const BASE_POINTS = {
  POR: 5,
  DEF: 4,
  MED: 2,
  DEL: 2
};

function sameId(a, b) {
  return String(a?._id || a || "") === String(b?._id || b || "");
}

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function gameweekClubIds(gameweek) {
  const clubIds = new Set();
  for (const match of gameweek?.matches || []) {
    if (match.homeClub) clubIds.add(objectId(match.homeClub));
    if (match.awayClub) clubIds.add(objectId(match.awayClub));
  }
  return clubIds;
}

function goalsAgainstForPlayer(player, match) {
  if (sameId(player.club, match.homeClub)) return Number(match.awayScore || 0);
  if (sameId(player.club, match.awayClub)) return Number(match.homeScore || 0);
  return 0;
}

export function normalizeScoreStat(value, { max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.min(Math.floor(number), max);
}

export function calculatePlayerMatchPoints(player, match, stats = {}) {
  if (!stats.played) return 0;

  const position = player.position;
  const goalsAgainst = goalsAgainstForPlayer(player, match);
  const commonGoals = normalizeScoreStat(stats.commonGoals) ?? 0;
  const specialGoals = normalizeScoreStat(stats.specialGoals) ?? 0;
  const assists = normalizeScoreStat(stats.assists) ?? 0;
  const penaltySaves = normalizeScoreStat(stats.penaltySaves) ?? 0;
  const picas = normalizeScoreStat(stats.picas, { max: 3 }) ?? 0;
  const isDefensive = position === "POR" || position === "DEF";

  let points = BASE_POINTS[position] || 0;
  points += commonGoals * (isDefensive ? 4 : 3);
  points += specialGoals * 2;
  points += assists;
  points += picas * 2;

  if (position === "POR") points += penaltySaves * 3;

  if (isDefensive) {
    if (goalsAgainst === 0) {
      points += position === "POR" ? 5 : 3;
    } else {
      points -= Math.floor(goalsAgainst / 2);
    }
  }

  return points;
}

export function buildPlayerMatchBreakdown(player, match, stats = {}) {
  const position = player.position;
  const goalsAgainst = goalsAgainstForPlayer(player, match);
  const commonGoals = normalizeScoreStat(stats.commonGoals) ?? 0;
  const specialGoals = normalizeScoreStat(stats.specialGoals) ?? 0;
  const assists = normalizeScoreStat(stats.assists) ?? 0;
  const penaltySaves = normalizeScoreStat(stats.penaltySaves) ?? 0;
  const picas = normalizeScoreStat(stats.picas, { max: 3 }) ?? 0;
  const isDefensive = position === "POR" || position === "DEF";

  if (!stats.played) {
    return {
      played: false,
      goalsAgainst,
      total: 0,
      lines: [{ label: "No jugo", detail: "Sin puntuacion de partido", points: 0 }]
    };
  }

  const lines = [];
  const basePoints = BASE_POINTS[position] || 0;
  lines.push({ label: "Base", detail: `Puntuacion inicial ${position}`, points: basePoints });

  if (commonGoals > 0) {
    const goalValue = isDefensive ? 4 : 3;
    lines.push({ label: "Goles en juego", detail: `${commonGoals} x ${goalValue}`, points: commonGoals * goalValue });
  }

  if (specialGoals > 0) {
    lines.push({ label: "Penalti/dado", detail: `${specialGoals} x 2`, points: specialGoals * 2 });
  }

  if (assists > 0) {
    lines.push({ label: "Asistencias", detail: `${assists} x 1`, points: assists });
  }

  if (position === "POR" && penaltySaves > 0) {
    lines.push({ label: "Penaltis parados", detail: `${penaltySaves} x 3`, points: penaltySaves * 3 });
  }

  if (picas > 0) {
    lines.push({ label: "Picas", detail: `${picas} x 2`, points: picas * 2 });
  }

  if (isDefensive) {
    if (goalsAgainst === 0) {
      lines.push({
        label: "Porteria a cero",
        detail: position === "POR" ? "Portero" : "Defensa",
        points: position === "POR" ? 5 : 3
      });
    } else {
      const penalty = Math.floor(goalsAgainst / 2);
      lines.push({ label: "Goles encajados", detail: `${goalsAgainst} encajados`, points: -penalty });
    }
  }

  return {
    played: true,
    goalsAgainst,
    total: lines.reduce((sum, line) => sum + Number(line.points || 0), 0),
    lines
  };
}

export function buildGameweekScoreMap(gameweek) {
  const scores = new Map();

  for (const match of gameweek.matches || []) {
    for (const score of match.playerScores || []) {
      const playerId = score.player?._id?.toString?.() || score.player?.toString();
      scores.set(playerId, (scores.get(playerId) || 0) + Number(score.points || 0));
    }
  }

  return scores;
}

export async function recalculateGameweek(gameweekId) {
  const gameweek = await Gameweek.findById(gameweekId);
  if (!gameweek) return null;

  const scores = buildGameweekScoreMap(gameweek);
  const lineups = await Lineup.find({ gameweek: gameweek._id });

  for (const lineup of lineups) {
    lineup.points = lineup.players.reduce((sum, playerId) => {
      return sum + (scores.get(playerId.toString()) || 0);
    }, 0);
    await lineup.save();
  }

  await recalculatePlayerTotals();
  await recalculateUserTotals();
  return gameweek;
}

export async function recalculatePlayerTotals() {
  const gameweeks = await Gameweek.find({});
  const totals = new Map();

  for (const gameweek of gameweeks) {
    const scores = buildGameweekScoreMap(gameweek);
    for (const [playerId, points] of scores.entries()) {
      totals.set(playerId, (totals.get(playerId) || 0) + points);
    }
  }

  const players = await Player.find({});
  for (const player of players) {
    player.totalPoints = totals.get(player._id.toString()) || 0;
    await player.save();
  }
}

export async function recalculateUserTotals() {
  const users = await User.find({});
  const finishedGameweekIds = await Gameweek.find({ status: "finished" }).distinct("_id");

  for (const user of users) {
    if (user.role !== "user") {
      user.totalPoints = 0;
      await user.save();
      continue;
    }

    const lineups = await Lineup.find({
      user: user._id,
      gameweek: { $in: finishedGameweekIds }
    });
    user.totalPoints = lineups.reduce((sum, lineup) => sum + Number(lineup.points || 0), 0);
    await user.save();
  }
}

export async function lockGameweekLineups(gameweek) {
  const users = await User.find({ role: "user", status: "active" });
  const eligibleClubIds = gameweekClubIds(gameweek);
  const availablePlayers = (await Player.find({ status: "available" })).filter((player) =>
    eligibleClubIds.has(objectId(player.club))
  );
  const lockedAt = new Date();
  let lockedLineups = 0;

  for (const user of users) {
    const existingLineup = await Lineup.findOne({ user: user._id, gameweek: gameweek._id }).populate("players");
    const existingPlayers = (existingLineup?.players || []).filter((player) => eligibleClubIds.has(objectId(player.club)));
    const canUseExistingLineup =
      existingPlayers.length === 7 &&
      existingPlayers.length === (existingLineup?.players || []).length &&
      Number(existingLineup?.budgetValue || 0) <= Number(user.budget || 0);
    const autoLineup = canUseExistingLineup
      ? {
          formation: existingLineup.formation || inferFormationFromPlayers(existingLineup.players),
          players: existingPlayers.map((player) => player._id),
          budgetValue: existingLineup.budgetValue
        }
      : selectAutoLineup(availablePlayers, user.budget);

    const selectedPlayers = autoLineup.players;
    const budgetValue = autoLineup.budgetValue;
    const points = scoreLineupFromGameweek(selectedPlayers, gameweek);
    await Lineup.findOneAndUpdate(
      { user: user._id, gameweek: gameweek._id },
      {
        formation: autoLineup.formation,
        players: selectedPlayers,
        budgetValue,
        points,
        lockedAt
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    lockedLineups += 1;
  }

  return lockedLineups;
}

export function scoreLineupFromGameweek(playerIds, gameweek) {
  const scores = buildGameweekScoreMap(gameweek);
  return playerIds.reduce((sum, playerId) => sum + (scores.get(playerId.toString()) || 0), 0);
}

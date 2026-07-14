import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { inferFormationFromPlayers, selectAutoLineup } from "./formations.js";

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
  const availablePlayers = await Player.find({ status: "available" });
  const lockedAt = new Date();
  let lockedLineups = 0;

  for (const user of users) {
    const existingLineup = await Lineup.findOne({ user: user._id, gameweek: gameweek._id }).populate("players");
    const autoLineup = existingLineup?.players?.length
      ? {
          formation: existingLineup.formation || inferFormationFromPlayers(existingLineup.players),
          players: existingLineup.players.map((player) => player._id),
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

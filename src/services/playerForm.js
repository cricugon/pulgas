import { Gameweek } from "../models/Gameweek.js";
import { Player } from "../models/Player.js";

export const PLAYER_FORM_LEVELS = Object.freeze({
  VERY_DOWN: 0,
  DOWN: 25,
  NEUTRAL: 50,
  UP: 75,
  VERY_UP: 100
});

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

export function classifyPlayerForm(points, positionAverage) {
  const average = Number(positionAverage || 0);
  const difference = Number(points || 0) - average;
  const relativeDifference = difference / Math.max(Math.abs(average), 4);

  if (relativeDifference >= 0.5) return PLAYER_FORM_LEVELS.VERY_UP;
  if (relativeDifference >= 0.15) return PLAYER_FORM_LEVELS.UP;
  if (relativeDifference > -0.15) return PLAYER_FORM_LEVELS.NEUTRAL;
  if (relativeDifference > -0.5) return PLAYER_FORM_LEVELS.DOWN;
  return PLAYER_FORM_LEVELS.VERY_DOWN;
}

export function calculatePlayerForms(players = [], gameweek = null) {
  const eligibleClubIds = new Set();
  const performanceByPlayer = new Map();
  const playerById = new Map(players.map((player) => [objectId(player), player]));

  for (const match of gameweek?.matches || []) {
    eligibleClubIds.add(objectId(match.homeClub));
    eligibleClubIds.add(objectId(match.awayClub));

    for (const score of match.playerScores || []) {
      const id = objectId(score.player);
      if (!id || !playerById.has(id)) continue;
      const current = performanceByPlayer.get(id) || { points: 0, played: false };
      current.points += Number(score.points || 0);
      current.played = current.played || score.played === true;
      performanceByPlayer.set(id, current);
    }
  }

  const grouped = new Map();
  for (const player of players) {
    const id = objectId(player);
    const performance = performanceByPlayer.get(id);
    if (!eligibleClubIds.has(objectId(player.club)) || !performance?.played) continue;

    const row = grouped.get(player.position) || { total: 0, count: 0 };
    row.total += performance.points;
    row.count += 1;
    grouped.set(player.position, row);
  }

  const averages = new Map(
    [...grouped.entries()].map(([position, row]) => [position, row.count ? row.total / row.count : 0])
  );
  const updates = players.map((player) => {
    const id = objectId(player);
    const isEligible = eligibleClubIds.has(objectId(player.club));
    const average = averages.get(player.position);
    const performance = performanceByPlayer.get(id);
    const played = Boolean(performance?.played);
    const points = played ? performance.points : 0;
    const form = !isEligible || average === undefined
      ? PLAYER_FORM_LEVELS.NEUTRAL
      : played
        ? classifyPlayerForm(points, average)
        : PLAYER_FORM_LEVELS.VERY_DOWN;

    return {
      player: player._id,
      name: player.name,
      position: player.position,
      points,
      average: average ?? null,
      played,
      eligible: isEligible,
      previousForm: Number(player.form ?? PLAYER_FORM_LEVELS.NEUTRAL),
      form
    };
  });

  return {
    averages: Object.fromEntries([...averages.entries()].map(([position, average]) => [position, Number(average.toFixed(2))])),
    updates
  };
}

export async function updatePlayerFormsAfterGameweek(gameweekId) {
  const [gameweek, players] = await Promise.all([
    Gameweek.findById(gameweekId).lean(),
    Player.find({}).lean()
  ]);
  if (!gameweek) return { updated: 0, unchanged: players.length, averages: {}, updates: [] };

  const result = calculatePlayerForms(players, gameweek);
  const changed = result.updates.filter((update) => update.form !== update.previousForm);

  if (result.updates.length) {
    await Player.bulkWrite(
      result.updates.map((update) => ({
        updateOne: {
          filter: { _id: update.player },
          update: { $set: { form: update.form } }
        }
      }))
    );
  }

  return {
    updated: changed.length,
    unchanged: result.updates.length - changed.length,
    averages: result.averages,
    updates: result.updates
  };
}

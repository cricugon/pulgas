import { Gameweek } from "../models/Gameweek.js";
import { Player } from "../models/Player.js";

export const PLAYER_FORM_LEVELS = Object.freeze({
  VERY_DOWN: 0,
  DOWN: 25,
  NEUTRAL: 50,
  UP: 75,
  VERY_UP: 100
});

const POSITION_BASE_POINTS = Object.freeze({
  POR: 5,
  DEF: 4,
  MED: 2,
  DEL: 2
});

const MINIMUM_FORM_SPREAD = 2.5;
const ROBUST_DEVIATION_FACTOR = 1.4826;

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function median(values = []) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildPositionBenchmark(position, values = []) {
  const average = values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
  const positionMedian = median(values);
  const absoluteDeviations = values.map((value) => Math.abs(value - positionMedian));
  const medianAbsoluteDeviation = median(absoluteDeviations);
  const basePoints = POSITION_BASE_POINTS[position] ?? 2;

  return {
    average,
    median: positionMedian,
    medianAbsoluteDeviation,
    basePoints,
    // Combining both references stops one unusual match from defining every player.
    reference: positionMedian * 0.7 + basePoints * 0.3,
    spread: Math.max(MINIMUM_FORM_SPREAD, medianAbsoluteDeviation * ROBUST_DEVIATION_FACTOR),
    sampleSize: values.length
  };
}

export function classifyPlayerForm(points, benchmark) {
  const score = Number(points || 0);
  const reference = Number(benchmark?.reference || 0);
  const spread = Math.max(Number(benchmark?.spread || 0), MINIMUM_FORM_SPREAD);
  const difference = score - reference;
  const robustDeviation = difference / spread;

  if (score >= 14 && difference >= 6 && robustDeviation >= 1.75) {
    return PLAYER_FORM_LEVELS.VERY_UP;
  }
  if (score <= 0 && difference <= -4 && robustDeviation <= -1.5) {
    return PLAYER_FORM_LEVELS.VERY_DOWN;
  }
  if (difference >= 3 && robustDeviation >= 0.85) return PLAYER_FORM_LEVELS.UP;
  if (difference <= -3 && robustDeviation <= -0.85) return PLAYER_FORM_LEVELS.DOWN;
  return PLAYER_FORM_LEVELS.NEUTRAL;
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

    const values = grouped.get(player.position) || [];
    values.push(performance.points);
    grouped.set(player.position, values);
  }

  const benchmarks = new Map(
    [...grouped.entries()].map(([position, values]) => [position, buildPositionBenchmark(position, values)])
  );
  const updates = players.map((player) => {
    const id = objectId(player);
    const isEligible = eligibleClubIds.has(objectId(player.club));
    const benchmark = benchmarks.get(player.position);
    const performance = performanceByPlayer.get(id);
    const played = Boolean(performance?.played);
    const points = played ? performance.points : 0;
    const form = !isEligible || !benchmark
      ? PLAYER_FORM_LEVELS.NEUTRAL
      : played
        ? classifyPlayerForm(points, benchmark)
        : PLAYER_FORM_LEVELS.DOWN;

    return {
      player: player._id,
      name: player.name,
      position: player.position,
      points,
      average: benchmark?.average ?? null,
      reference: benchmark?.reference ?? null,
      played,
      eligible: isEligible,
      previousForm: Number(player.form ?? PLAYER_FORM_LEVELS.NEUTRAL),
      form
    };
  });

  return {
    averages: Object.fromEntries(
      [...benchmarks.entries()].map(([position, benchmark]) => [position, Number(benchmark.average.toFixed(2))])
    ),
    benchmarks: Object.fromEntries(
      [...benchmarks.entries()].map(([position, benchmark]) => [position, {
        median: Number(benchmark.median.toFixed(2)),
        reference: Number(benchmark.reference.toFixed(2)),
        spread: Number(benchmark.spread.toFixed(2)),
        sampleSize: benchmark.sampleSize
      }])
    ),
    updates
  };
}

export async function updatePlayerFormsAfterGameweek(gameweekId) {
  const [gameweek, players] = await Promise.all([
    Gameweek.findById(gameweekId).lean(),
    Player.find({}).lean()
  ]);
  if (!gameweek) return { updated: 0, unchanged: players.length, averages: {}, benchmarks: {}, updates: [] };

  const result = calculatePlayerForms(players, gameweek);
  const changed = result.updates.filter((update) => update.form !== update.previousForm);

  if (changed.length) {
    await Player.bulkWrite(
      changed.map((update) => ({
        updateOne: {
          filter: { _id: update.player },
          update: { $set: { form: update.form } }
        }
      })),
      { timestamps: false }
    );
  }

  return {
    updated: changed.length,
    unchanged: result.updates.length - changed.length,
    averages: result.averages,
    benchmarks: result.benchmarks,
    updates: result.updates
  };
}

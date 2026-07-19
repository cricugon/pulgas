import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { buildGameweekScoreMap } from "./scoring.js";

const MIN_MARKET_VALUE = 5000000;
const MAX_MARKET_VALUE = 30000000;
const MAX_CHANGE_RATE = 0.16;
const VALUE_STEP = 100000;
const TARGET_MARKET_GROWTH_RATE = 0.0005;
const MIN_MEANINGFUL_CHANGE_RATE = 0.0075;

export const MARKET_VALUE_RULES = Object.freeze({
  minValue: MIN_MARKET_VALUE,
  maxValue: MAX_MARKET_VALUE,
  maxChangeRate: MAX_CHANGE_RATE,
  valueStep: VALUE_STEP,
  targetMarketGrowthRate: TARGET_MARKET_GROWTH_RATE,
  minMeaningfulChangeRate: MIN_MEANINGFUL_CHANGE_RATE,
  cheapPlayerMaxRiseRate: 0.16,
  expensivePlayerMaxRiseRate: 0.03,
  cheapPlayerMaxDropRate: 0.04,
  expensivePlayerMaxDropRate: 0.1
});

const INITIAL_TEAM_STRENGTH = [
  { patterns: ["alcaraz", "cantones", "cant"], value: 1 },
  { patterns: ["jardin", "jardín", "jar"], value: 0.82 },
  { patterns: ["robledo", "rob"], value: 0.66 },
  { patterns: ["ballestero", "ball"], value: 0.5 },
  { patterns: ["quijote", "quij"], value: 0.34 },
  { patterns: ["chospes", "chos"], value: 0.18 }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundValue(value) {
  return Math.round(value / VALUE_STEP) * VALUE_STEP;
}

function clubId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function playerId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function initialClubStrength(club) {
  const text = normalizeText(`${club?.name || ""} ${club?.shortName || ""}`);
  const match = INITIAL_TEAM_STRENGTH.find((item) => item.patterns.some((pattern) => text.includes(normalizeText(pattern))));
  return match?.value ?? 0.5;
}

function buildPositionAverages(players, valueForPlayer, includePlayer = () => true) {
  const grouped = new Map();

  for (const player of players) {
    if (!includePlayer(player)) continue;
    const row = grouped.get(player.position) || { total: 0, count: 0 };
    row.total += Number(valueForPlayer(player) || 0);
    row.count += 1;
    grouped.set(player.position, row);
  }

  return new Map([...grouped.entries()].map(([position, row]) => [position, row.count ? row.total / row.count : 0]));
}

export function buildPercentileMap(items, valueForItem) {
  const values = items
    .map((item) => ({ id: playerId(item), value: Number(valueForItem(item) || 0) }))
    .sort((left, right) => left.value - right.value);
  const percentiles = new Map();
  if (!values.length) return percentiles;
  if (values.length === 1) {
    percentiles.set(values[0].id, 0.5);
    return percentiles;
  }

  let start = 0;
  while (start < values.length) {
    let end = start;
    while (end + 1 < values.length && values[end + 1].value === values[start].value) end += 1;
    const percentile = ((start + end) / 2) / (values.length - 1);
    for (let index = start; index <= end; index += 1) {
      percentiles.set(values[index].id, percentile);
    }
    start = end + 1;
  }

  return percentiles;
}

export function buildPlayerPerformanceStats(gameweeks = []) {
  const stats = new Map();

  for (const gameweek of gameweeks) {
    const scoreMap = buildGameweekScoreMap(gameweek);
    for (const [id, points] of scoreMap.entries()) {
      const row = stats.get(id) || { points: 0, evaluatedRounds: 0, pointsPerRound: 0 };
      row.points += Number(points || 0);
      row.evaluatedRounds += 1;
      row.pointsPerRound = row.points / row.evaluatedRounds;
      stats.set(id, row);
    }
  }

  return stats;
}

function buildPlayedPlayerSet(gameweek) {
  const played = new Set();
  for (const match of gameweek.matches || []) {
    for (const score of match.playerScores || []) {
      if (score.played) played.add(playerId(score.player));
    }
  }
  return played;
}

async function buildUsageMap(gameweekId) {
  const usage = await Lineup.aggregate([
    { $match: { gameweek: gameweekId, lockedAt: { $exists: true, $ne: null } } },
    { $unwind: "$players" },
    { $group: { _id: "$players", count: { $sum: 1 } } }
  ]);

  return new Map(usage.map((row) => [row._id.toString(), row.count]));
}

export function calculateClubStrengths(clubs, finishedGameweeks = []) {
  const strength = new Map(clubs.map((club) => [club._id.toString(), initialClubStrength(club)]));
  const stats = new Map();

  for (const gameweek of finishedGameweeks) {
    for (const match of gameweek.matches || []) {
      if (match.homeScore === null || match.awayScore === null) continue;

      const homeId = clubId(match.homeClub);
      const awayId = clubId(match.awayClub);
      const rows = [
        { id: homeId, goalsFor: Number(match.homeScore || 0), goalsAgainst: Number(match.awayScore || 0) },
        { id: awayId, goalsFor: Number(match.awayScore || 0), goalsAgainst: Number(match.homeScore || 0) }
      ];

      for (const row of rows) {
        const current = stats.get(row.id) || { played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
        current.played += 1;
        current.goalsFor += row.goalsFor;
        current.goalsAgainst += row.goalsAgainst;
        current.points += row.goalsFor > row.goalsAgainst ? 3 : row.goalsFor === row.goalsAgainst ? 1 : 0;
        stats.set(row.id, current);
      }
    }
  }

  for (const club of clubs) {
    const id = club._id.toString();
    const base = strength.get(id) ?? 0.5;
    const row = stats.get(id);
    if (!row?.played) continue;

    const pointsPerGame = row.points / (row.played * 3);
    const goalDiffSignal = clamp((row.goalsFor - row.goalsAgainst) / Math.max(row.played * 4, 1), -1, 1);
    strength.set(id, clamp(base * 0.65 + pointsPerGame * 0.25 + ((goalDiffSignal + 1) / 2) * 0.1, 0, 1));
  }

  return strength;
}

async function nextGameweekAfter(gameweek) {
  return Gameweek.findOne({
    number: { $gt: Number(gameweek.number || 0) },
    status: { $ne: "finished" }
  })
    .sort({ number: 1 })
    .lean();
}

export function buildNextOpponentMap(nextGameweek) {
  const opponentMap = new Map();
  if (!nextGameweek) return opponentMap;

  for (const match of nextGameweek.matches || []) {
    const homeId = clubId(match.homeClub);
    const awayId = clubId(match.awayClub);
    opponentMap.set(homeId, awayId);
    opponentMap.set(awayId, homeId);
  }

  return opponentMap;
}

function relativeSignal(value, average) {
  const denominator = Math.max(Math.abs(average), 4);
  return clamp((Number(value || 0) - Number(average || 0)) / denominator, -1, 1);
}

function statusSignal(status) {
  if (status === "injured") return -0.015;
  if (status === "suspended") return -0.02;
  return 0;
}

export function marketValueChangeLimits(oldValue) {
  const normalizedValue = clamp(Number(oldValue || 0), MIN_MARKET_VALUE, MAX_MARKET_VALUE);
  const priceLevel = (normalizedValue - MIN_MARKET_VALUE) / (MAX_MARKET_VALUE - MIN_MARKET_VALUE);
  const riseCurve = [
    [5000000, 0.16],
    [10000000, 0.145],
    [15000000, 0.13],
    [18000000, 0.12],
    [20000000, 0.105],
    [25000000, 0.055],
    [30000000, 0.03]
  ];
  const dropCurve = [
    [5000000, 0.04],
    [10000000, 0.05],
    [15000000, 0.065],
    [20000000, 0.08],
    [25000000, 0.09],
    [30000000, 0.1]
  ];
  const interpolate = (curve) => {
    const upperIndex = curve.findIndex(([value]) => normalizedValue <= value);
    if (upperIndex <= 0) return curve[0][1];
    const [upperValue, upperRate] = curve[upperIndex];
    const [lowerValue, lowerRate] = curve[upperIndex - 1];
    const progress = (normalizedValue - lowerValue) / (upperValue - lowerValue);
    return lowerRate + (upperRate - lowerRate) * progress;
  };

  return {
    priceLevel,
    maxRiseRate: interpolate(riseCurve),
    maxDropRate: interpolate(dropCurve)
  };
}

function priceAdjustedPerformanceSignal(pointsPercentile, valuePercentile) {
  const gap = clamp(Number(pointsPercentile || 0) - Number(valuePercentile || 0), -1, 1);
  const magnitude = Math.abs(gap);
  if (!magnitude) return 0;

  const normalizedMagnitude = magnitude <= 0.08
    ? (magnitude / 0.08) * 0.02
    : 0.02 + Math.min((magnitude - 0.08) / 0.35, 1) * 0.98;
  return Math.sign(gap) * normalizedMagnitude;
}

function calculatedValue(oldValue, changeRate) {
  const limits = marketValueChangeLimits(oldValue);
  const meaningfulRate = Math.abs(changeRate) >= MIN_MEANINGFUL_CHANGE_RATE ? changeRate : 0;
  const boundedRate = clamp(meaningfulRate, -limits.maxDropRate, limits.maxRiseRate);
  const rawValue = oldValue * (1 + boundedRate);
  const newValue = clamp(roundValue(rawValue), MIN_MARKET_VALUE, MAX_MARKET_VALUE);
  return { newValue, boundedRate, ...limits };
}

export function projectPlayerMarketValue({
  oldValue = 0,
  gameweekPoints = 0,
  gameweekPositionAverage = 0,
  gameweekPointsPercentile = 0.5,
  seasonPointsPerRound = 0,
  seasonPositionAverage = 0,
  seasonPointsPercentile = 0.5,
  marketValuePercentile = 0.5,
  evaluatedRounds = 0,
  usage = 0,
  activeUsers = 0,
  averageUsageRate = 0,
  opponentStrength = 0.5,
  hasOpponent = false,
  playerStatus = "available",
  hasRoundData = false,
  playedInGameweek = false
} = {}) {
  const normalizedOldValue = Number(oldValue || 0);
  const normalizedUsage = Number(usage || 0);
  const normalizedGameweekPoints = Number(gameweekPoints || 0);
  const normalizedActiveUsers = Number(activeUsers || 0);
  const hasAnySignal = Boolean(hasRoundData);
  const usageRate = normalizedActiveUsers > 0 ? normalizedUsage / normalizedActiveUsers : 0;
  const seasonReliability = clamp(Number(evaluatedRounds || 0) / 5, 0, 1);
  const priceLimits = marketValueChangeLimits(normalizedOldValue);
  const valueEfficiencyWeight = clamp(0.22 - Math.max(0, priceLimits.priceLevel - 0.55) * 0.25, 0.14, 0.22);

  const signals = {
    valueEfficiency: 0,
    excellence: 0,
    position: 0,
    seasonValueEfficiency: 0,
    seasonPosition: 0,
    demand: 0,
    opponent: 0,
    status: 0,
    participation: 0
  };

  if (hasAnySignal && normalizedOldValue > 0) {
    signals.valueEfficiency = priceAdjustedPerformanceSignal(gameweekPointsPercentile, marketValuePercentile);
    signals.excellence = clamp((Number(gameweekPointsPercentile) - 0.85) / 0.15, 0, 1);
    signals.position = relativeSignal(normalizedGameweekPoints, gameweekPositionAverage);
    signals.seasonValueEfficiency = clamp(Number(seasonPointsPercentile) - Number(marketValuePercentile), -1, 1);
    signals.seasonPosition = relativeSignal(seasonPointsPerRound, seasonPositionAverage);
    signals.demand = clamp(
      (usageRate - Number(averageUsageRate || 0)) / Math.max(Number(averageUsageRate || 0), 0.05),
      -1,
      1
    );
    signals.opponent = hasOpponent ? clamp(0.5 - Number(opponentStrength ?? 0.5), -0.5, 0.5) : 0;
    signals.status = statusSignal(playerStatus);
    signals.participation = playedInGameweek ? 0 : -0.01;
  }

  const contributions = {
    valueEfficiency: signals.valueEfficiency * valueEfficiencyWeight,
    excellence: signals.excellence * 0.11,
    position: signals.position * 0.018,
    seasonValueEfficiency: signals.seasonValueEfficiency * 0.05 * seasonReliability,
    seasonPosition: signals.seasonPosition * 0.01 * seasonReliability,
    demand: signals.demand * 0.012,
    opponent: signals.opponent * 0.015,
    status: signals.status,
    participation: signals.participation
  };
  const rawChangeRate = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const calculated = hasAnySignal && normalizedOldValue > 0
    ? calculatedValue(normalizedOldValue, rawChangeRate)
    : { newValue: normalizedOldValue, boundedRate: 0, ...marketValueChangeLimits(normalizedOldValue) };

  return {
    oldValue: normalizedOldValue,
    newValue: calculated.newValue,
    change: calculated.newValue - normalizedOldValue,
    changeRate: normalizedOldValue > 0
      ? Number(((calculated.newValue - normalizedOldValue) / normalizedOldValue).toFixed(4))
      : 0,
    rawChangeRate,
    boundedRate: calculated.boundedRate,
    usageRate,
    averageUsageRate: Number(averageUsageRate || 0),
    seasonReliability,
    valueEfficiencyWeight,
    maxRiseRate: calculated.maxRiseRate,
    maxDropRate: calculated.maxDropRate,
    marketValuePercentile: Number(marketValuePercentile || 0),
    gameweekPointsPercentile: Number(gameweekPointsPercentile || 0),
    seasonPointsPercentile: Number(seasonPointsPercentile || 0),
    hasAnySignal,
    signals,
    contributions
  };
}

export function balanceMarketValueProjections(projections = [], totalMarketValue = 0) {
  const targetChange = roundValue(Number(totalMarketValue || 0) * TARGET_MARKET_GROWTH_RATE);
  const rises = projections.reduce((sum, projection) => sum + Math.max(0, projection.change), 0);
  const drops = projections.reduce((sum, projection) => sum + Math.max(0, -projection.change), 0);
  const rawNetChange = rises - drops;

  const balanced = projections.map((projection) => {
    const unbalancedNewValue = projection.newValue;
    const unbalancedChange = projection.change;

    return {
      ...projection,
      unbalancedNewValue,
      unbalancedChange,
      balanceScale: 1,
      balanceAdjustment: 0
    };
  });

  const refreshProjection = (projection, newValue) => {
    projection.newValue = newValue;
    projection.change = newValue - projection.oldValue;
    projection.changeRate = projection.oldValue > 0
      ? Number((projection.change / projection.oldValue).toFixed(4))
      : 0;
    projection.balanceAdjustment = newValue - projection.unbalancedNewValue;
    projection.balanceScale = projection.unbalancedChange
      ? Math.abs(projection.change / projection.unbalancedChange)
      : 1;
  };

  let adjustmentRemaining = Math.abs(rawNetChange - targetChange);
  if (rawNetChange > targetChange) {
    const candidates = balanced
      .filter((projection) => projection.change > 0)
      .sort((left, right) => left.rawChangeRate - right.rawChangeRate || left.change - right.change);
    for (const projection of candidates) {
      if (adjustmentRemaining <= 0) break;
      const reduction = Math.min(projection.change, adjustmentRemaining);
      refreshProjection(projection, projection.newValue - reduction);
      adjustmentRemaining -= reduction;
    }
  } else if (rawNetChange < targetChange) {
    const candidates = balanced
      .filter((projection) => projection.change < 0)
      .sort((left, right) => right.rawChangeRate - left.rawChangeRate || right.change - left.change);
    for (const projection of candidates) {
      if (adjustmentRemaining <= 0) break;
      const reduction = Math.min(-projection.change, adjustmentRemaining);
      refreshProjection(projection, projection.newValue + reduction);
      adjustmentRemaining -= reduction;
    }
  }

  const balancedRises = balanced.reduce((sum, projection) => sum + Math.max(0, projection.change), 0);
  const balancedDrops = balanced.reduce((sum, projection) => sum + Math.max(0, -projection.change), 0);
  const balancedNetChange = balancedRises - balancedDrops;

  return {
    projections: balanced,
    targetChange,
    rawNetChange,
    balancedNetChange,
    riseScale: rises > 0 ? balancedRises / rises : 1,
    dropScale: drops > 0 ? balancedDrops / drops : 1
  };
}

export function buildMarketValueHistoryEntry(gameweek, valueBefore, valueAfter, recordedAt = new Date()) {
  const before = Number(valueBefore || 0);
  const after = Number(valueAfter || 0);
  const change = after - before;

  return {
    gameweek: gameweek._id,
    gameweekNumber: Number(gameweek.number),
    gameweekName: String(gameweek.name || `Jornada ${gameweek.number}`),
    valueBefore: before,
    valueAfter: after,
    change,
    changeRate: before > 0 ? Number((change / before).toFixed(4)) : 0,
    recordedAt
  };
}

export async function updateMarketValuesAfterGameweek(gameweekId) {
  const gameweek = await Gameweek.findById(gameweekId).lean();
  if (!gameweek) return { updated: 0, unchanged: 0, updates: [] };
  const marketValueUpdatedAt = new Date();

  const [players, clubs, activeUsers, usageMap, nextGameweek, gameweeks] = await Promise.all([
    Player.find({}).select("+marketValueHistory").lean(),
    Club.find({}).lean(),
    User.countDocuments({ role: "user", status: "active" }),
    buildUsageMap(gameweek._id),
    nextGameweekAfter(gameweek),
    Gameweek.find({}).sort({ number: 1 }).lean()
  ]);

  const scoreMap = buildGameweekScoreMap(gameweek);
  const playedPlayerIds = buildPlayedPlayerSet(gameweek);
  const evaluatedPlayers = players.filter((player) => scoreMap.has(playerId(player)));
  const projectedFinishedGameweeks = gameweeks.filter(
    (candidate) => candidate.status === "finished" || playerId(candidate._id) === playerId(gameweek._id)
  );
  const performanceStats = buildPlayerPerformanceStats(projectedFinishedGameweeks);
  const seasonEvaluatedPlayers = players.filter((player) => Number(performanceStats.get(playerId(player))?.evaluatedRounds || 0) > 0);
  const marketValuePercentiles = buildPercentileMap(players, (player) => player.marketValue);
  const gameweekPointsPercentiles = buildPercentileMap(evaluatedPlayers, (player) => scoreMap.get(playerId(player)) || 0);
  const seasonPointsPercentiles = buildPercentileMap(
    seasonEvaluatedPlayers,
    (player) => performanceStats.get(playerId(player))?.pointsPerRound || 0
  );
  const gameweekPositionAverages = buildPositionAverages(
    evaluatedPlayers,
    (player) => scoreMap.get(playerId(player)) || 0
  );
  const seasonPositionAverages = buildPositionAverages(
    seasonEvaluatedPlayers,
    (player) => performanceStats.get(playerId(player))?.pointsPerRound || 0
  );
  const totalUsage = [...usageMap.values()].reduce((sum, count) => sum + Number(count || 0), 0);
  const averageUsageRate = activeUsers > 0 && evaluatedPlayers.length > 0
    ? totalUsage / (activeUsers * evaluatedPlayers.length)
    : 0;
  const clubStrength = calculateClubStrengths(clubs, projectedFinishedGameweeks);
  const nextOpponentMap = buildNextOpponentMap(nextGameweek);
  const pending = [];
  let alreadyRecorded = 0;

  for (const player of players) {
    const id = player._id.toString();
    const existingHistory = (player.marketValueHistory || []).find(
      (entry) => playerId(entry.gameweek) === playerId(gameweek._id)
    );
    if (existingHistory) {
      alreadyRecorded += 1;
      continue;
    }

    const stats = performanceStats.get(id) || { points: 0, evaluatedRounds: 0, pointsPerRound: 0 };
    const oldValue = Number(player.marketValue || 0);
    const usage = Number(usageMap.get(id) || 0);
    const gameweekPoints = Number(scoreMap.get(id) || 0);
    const opponentId = nextOpponentMap.get(clubId(player.club)) || null;
    const projection = projectPlayerMarketValue({
      oldValue,
      gameweekPoints,
      gameweekPositionAverage: gameweekPositionAverages.get(player.position),
      gameweekPointsPercentile: gameweekPointsPercentiles.get(id) ?? 0.5,
      seasonPointsPerRound: stats.pointsPerRound,
      seasonPositionAverage: seasonPositionAverages.get(player.position),
      seasonPointsPercentile: seasonPointsPercentiles.get(id) ?? 0.5,
      marketValuePercentile: marketValuePercentiles.get(id) ?? 0.5,
      evaluatedRounds: stats.evaluatedRounds,
      usage,
      activeUsers,
      averageUsageRate,
      opponentStrength: opponentId ? clubStrength.get(opponentId) ?? 0.5 : 0.5,
      hasOpponent: Boolean(opponentId),
      playerStatus: player.status,
      hasRoundData: scoreMap.has(id),
      playedInGameweek: playedPlayerIds.has(id)
    });

    pending.push({ player, stats, oldValue, usage, gameweekPoints, opponentId, projection });
  }

  const totalMarketValue = players.reduce((sum, player) => sum + Number(player.marketValue || 0), 0);
  const marketBalance = balanceMarketValueProjections(
    pending.map((row) => row.projection),
    totalMarketValue
  );
  const updates = [];
  const operations = [];
  let unchanged = alreadyRecorded;

  for (let index = 0; index < pending.length; index += 1) {
    const { player, stats, oldValue, usage, gameweekPoints, opponentId } = pending[index];
    const projection = marketBalance.projections[index];
    const newValue = projection.newValue;

    const historyEntry = buildMarketValueHistoryEntry(gameweek, oldValue, newValue, marketValueUpdatedAt);
    operations.push({
      updateOne: {
        filter: { _id: player._id, "marketValueHistory.gameweek": { $ne: gameweek._id } },
        update: {
          $set: {
            previousMarketValue: oldValue,
            marketValue: newValue,
            marketValueChange: historyEntry.change,
            marketValueUpdatedAt
          },
          $push: { marketValueHistory: historyEntry }
        }
      }
    });

    if (newValue === oldValue) {
      unchanged += 1;
      continue;
    }

    updates.push({
      player: player._id,
      name: player.name,
      position: player.position,
      oldValue,
      newValue,
      changeRate: historyEntry.changeRate,
      gameweekPoints,
      totalPoints: Number(stats.points || 0),
      lineupUsage: usage,
      nextOpponent: opponentId,
      projection
    });
  }

  if (operations.length) await Player.bulkWrite(operations, { ordered: false });

  return {
    updated: updates.length,
    unchanged,
    historyRecorded: operations.length,
    alreadyRecorded,
    minValue: MIN_MARKET_VALUE,
    maxValue: MAX_MARKET_VALUE,
    maxChangeRate: MAX_CHANGE_RATE,
    marketBalance: {
      targetChange: marketBalance.targetChange,
      rawNetChange: marketBalance.rawNetChange,
      balancedNetChange: marketBalance.balancedNetChange,
      riseScale: marketBalance.riseScale,
      dropScale: marketBalance.dropScale
    },
    updates
  };
}

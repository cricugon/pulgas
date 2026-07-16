import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { buildGameweekScoreMap } from "./scoring.js";

const MIN_MARKET_VALUE = 5000000;
const MAX_MARKET_VALUE = 30000000;
const MAX_CHANGE_RATE = 0.3;
const VALUE_STEP = 100000;

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

function buildPositionAverages(players) {
  const grouped = new Map();

  for (const player of players) {
    const row = grouped.get(player.position) || { total: 0, count: 0 };
    row.total += Number(player.totalPoints || 0);
    row.count += 1;
    grouped.set(player.position, row);
  }

  return new Map([...grouped.entries()].map(([position, row]) => [position, row.count ? row.total / row.count : 0]));
}

function buildGameweekPositionAverages(players, scoreMap) {
  const grouped = new Map();

  for (const player of players) {
    const row = grouped.get(player.position) || { total: 0, count: 0 };
    row.total += Number(scoreMap.get(player._id.toString()) || 0);
    row.count += 1;
    grouped.set(player.position, row);
  }

  return new Map([...grouped.entries()].map(([position, row]) => [position, row.count ? row.total / row.count : 0]));
}

async function buildUsageMap(gameweekId) {
  const usage = await Lineup.aggregate([
    { $match: { gameweek: gameweekId, lockedAt: { $exists: true, $ne: null } } },
    { $unwind: "$players" },
    { $group: { _id: "$players", count: { $sum: 1 } } }
  ]);

  return new Map(usage.map((row) => [row._id.toString(), row.count]));
}

async function buildClubStrengthMap(clubs) {
  const strength = new Map(clubs.map((club) => [club._id.toString(), initialClubStrength(club)]));
  const stats = new Map();
  const finishedGameweeks = await Gameweek.find({ status: "finished" }).lean();

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

function buildNextOpponentMap(nextGameweek) {
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

function statusSignal(player) {
  if (player.status === "injured") return -0.05;
  if (player.status === "suspended") return -0.07;
  return 0;
}

function calculatedValue(oldValue, changeRate) {
  const boundedRate = clamp(changeRate, -MAX_CHANGE_RATE, MAX_CHANGE_RATE);
  const maxDown = oldValue * (1 - MAX_CHANGE_RATE);
  const maxUp = oldValue * (1 + MAX_CHANGE_RATE);
  const rawValue = oldValue * (1 + boundedRate);
  return clamp(roundValue(rawValue), Math.max(MIN_MARKET_VALUE, maxDown), Math.min(MAX_MARKET_VALUE, maxUp));
}

export async function updateMarketValuesAfterGameweek(gameweekId) {
  const gameweek = await Gameweek.findById(gameweekId).lean();
  if (!gameweek) return { updated: 0, unchanged: 0, updates: [] };
  const marketValueUpdatedAt = new Date();

  const [players, clubs, activeUsers, usageMap, nextGameweek] = await Promise.all([
    Player.find({}).lean(),
    Club.find({}).lean(),
    User.countDocuments({ role: "user", status: "active" }),
    buildUsageMap(gameweek._id),
    nextGameweekAfter(gameweek)
  ]);

  const scoreMap = buildGameweekScoreMap(gameweek);
  const seasonAverages = buildPositionAverages(players);
  const gameweekAverages = buildGameweekPositionAverages(players, scoreMap);
  const clubStrength = await buildClubStrengthMap(clubs);
  const nextOpponentMap = buildNextOpponentMap(nextGameweek);
  const updates = [];
  let unchanged = 0;

  await Player.updateMany({}, { $set: { marketValueChange: 0, marketValueUpdatedAt } });

  for (const player of players) {
    const id = player._id.toString();
    const oldValue = Number(player.marketValue || 0);
    const usage = Number(usageMap.get(id) || 0);
    const gameweekPoints = Number(scoreMap.get(id) || 0);
    const appearedInGameweek = scoreMap.has(id);
    const hasAnySignal = appearedInGameweek || usage > 0 || Number(player.totalPoints || 0) !== 0;

    if (!hasAnySignal || oldValue <= 0) {
      unchanged += 1;
      continue;
    }

    const seasonSignal = relativeSignal(player.totalPoints, seasonAverages.get(player.position));
    const roundSignal = relativeSignal(gameweekPoints, gameweekAverages.get(player.position));
    const usageRate = activeUsers > 0 ? usage / activeUsers : 0;
    const demandSignal = clamp((usageRate - 0.22) / 0.78, -0.35, 1);
    const opponentId = nextOpponentMap.get(clubId(player.club));
    const opponentStrength = opponentId ? clubStrength.get(opponentId) ?? 0.5 : 0.5;
    const opponentSignal = opponentId ? clamp(0.5 - opponentStrength, -0.5, 0.5) : 0;
    const currentParticipationSignal = appearedInGameweek && gameweekPoints > 0 ? 0.015 : appearedInGameweek ? -0.01 : 0;

    const changeRate =
      seasonSignal * 0.11 +
      roundSignal * 0.09 +
      demandSignal * 0.07 +
      opponentSignal * 0.1 +
      statusSignal(player) +
      currentParticipationSignal;

    const newValue = calculatedValue(oldValue, changeRate);
    if (newValue === oldValue) {
      unchanged += 1;
      continue;
    }

    await Player.updateOne(
      { _id: player._id },
      {
        $set: {
          previousMarketValue: oldValue,
          marketValue: newValue,
          marketValueChange: newValue - oldValue,
          marketValueUpdatedAt
        }
      }
    );
    updates.push({
      player: player._id,
      name: player.name,
      position: player.position,
      oldValue,
      newValue,
      changeRate: Number(((newValue - oldValue) / oldValue).toFixed(4)),
      gameweekPoints,
      totalPoints: Number(player.totalPoints || 0),
      lineupUsage: usage,
      nextOpponent: opponentId || null
    });
  }

  return {
    updated: updates.length,
    unchanged,
    minValue: MIN_MARKET_VALUE,
    maxValue: MAX_MARKET_VALUE,
    maxChangeRate: MAX_CHANGE_RATE,
    updates
  };
}

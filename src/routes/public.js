import express from "express";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { buildGameweekScoreMap, buildPlayerMatchBreakdown } from "../services/scoring.js";

export const publicRouter = express.Router();

function serializePlayerForLineup(player, scoreMap) {
  if (!player) return null;

  return {
    ...player.toObject(),
    gameweekPoints: scoreMap.get(player._id.toString()) || 0
  };
}

function serializeLineupForLeaderboard(lineup, scoreMap, rank, revealLineup = true) {
  const base = {
    rank,
    teamId: lineup.user._id,
    teamName: lineup.user.teamName,
    teamStatus: lineup.user.status,
    totalPoints: lineup.user.totalPoints,
    points: lineup.points || 0,
    lineupVisible: revealLineup
  };

  if (!revealLineup) return base;

  return {
    ...base,
    formation: lineup.formation,
    budgetValue: lineup.budgetValue || 0,
    lockedAt: lineup.lockedAt,
    players: (lineup.players || [])
      .map((player) => serializePlayerForLineup(player, scoreMap))
      .filter(Boolean)
  };
}

function sameId(a, b) {
  return String(a?._id || a || "") === String(b?._id || b || "");
}

function serializePlayerScoreDetail(player, match, score) {
  if (!score || !match) return null;

  const breakdown = buildPlayerMatchBreakdown(player, match, score);
  return {
    played: Boolean(score.played),
    points: Number(score.points || 0),
    calculatedPoints: breakdown.total,
    goalsAgainst: breakdown.goalsAgainst,
    commonGoals: Number(score.commonGoals || 0),
    specialGoals: Number(score.specialGoals || 0),
    assists: Number(score.assists || 0),
    penaltySaves: Number(score.penaltySaves || 0),
    picas: Number(score.picas || 0),
    lines: breakdown.lines
  };
}

publicRouter.get("/clubs", async (_req, res) => {
  const clubs = await Club.find({}).sort({ name: 1 });
  res.json({ clubs });
});

publicRouter.get("/news", async (req, res) => {
  const requestedLimit = Number(req.query.limit || 30);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 30, 1), 100);
  const news = await NewsItem.find({}).sort({ createdAt: -1 }).limit(limit);

  res.json({ news });
});

publicRouter.get("/players", async (req, res) => {
  const filter = {};
  if (req.query.position) filter.position = req.query.position;
  if (req.query.club) filter.club = req.query.club;

  const players = await Player.find(filter).populate("club").sort({ marketValue: -1, name: 1 });
  res.json({ players });
});

publicRouter.get("/players/:id/stats", async (req, res) => {
  const player = await Player.findById(req.params.id).populate("club");
  if (!player) {
    return res.status(404).json({ message: "Jugador no encontrado." });
  }

  const [gameweeks, lineupUsage] = await Promise.all([
    Gameweek.find({}).sort({ number: -1 }).populate("matches.homeClub matches.awayClub matches.playerScores.player"),
    Lineup.aggregate([
      { $match: { players: player._id } },
      { $group: { _id: "$gameweek", usedBy: { $sum: 1 } } }
    ])
  ]);
  const usageMap = new Map(lineupUsage.map((item) => [item._id.toString(), item.usedBy]));
  const playerClubId = player.club?._id?.toString();

  const byGameweek = gameweeks.map((gameweek) => {
    const scoreMap = buildGameweekScoreMap(gameweek);
    const playerMatch = (gameweek.matches || []).find((match) => {
      const homeClubId = match.homeClub?._id?.toString?.() || match.homeClub?.toString();
      const awayClubId = match.awayClub?._id?.toString?.() || match.awayClub?.toString();
      return homeClubId === playerClubId || awayClubId === playerClubId;
    });
    const playerScore = playerMatch?.playerScores?.find((score) => sameId(score.player, player._id));

    return {
      gameweekId: gameweek._id,
      number: gameweek.number,
      name: gameweek.name,
      status: gameweek.status,
      points: scoreMap.get(player._id.toString()) || 0,
      usedBy: usageMap.get(gameweek._id.toString()) || 0,
      score: serializePlayerScoreDetail(player, playerMatch, playerScore),
      match: playerMatch
        ? {
            id: playerMatch._id,
            homeClub: playerMatch.homeClub,
            awayClub: playerMatch.awayClub,
            status: playerMatch.status,
            homeScore: playerMatch.homeScore,
            awayScore: playerMatch.awayScore
          }
        : null
    };
  });

  res.json({
    player,
    summary: {
      totalPoints: player.totalPoints || 0,
      totalLineups: byGameweek.reduce((sum, row) => sum + Number(row.usedBy || 0), 0),
      scoredGameweeks: byGameweek.filter((row) => row.points !== 0).length
    },
    byGameweek
  });
});

publicRouter.get("/leaderboard", async (_req, res) => {
  const users = await User.find({ role: "user" })
    .select("teamName totalPoints budget squad status role")
    .populate("squad")
    .sort({ totalPoints: -1, teamName: 1 });

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    id: user._id,
    teamName: user.teamName,
    totalPoints: user.totalPoints,
    budget: user.budget,
    squadSize: user.squad.length,
    status: user.status,
    role: user.role
  }));

  res.json({ leaderboard });
});

publicRouter.get("/gameweeks/active", async (_req, res) => {
  const gameweek =
    (await Gameweek.findOne({ status: "live" }).populate("matches.homeClub matches.awayClub matches.playerScores.player")) ||
    (await Gameweek.findOne({ status: "draft" }).sort({ number: 1 }).populate("matches.homeClub matches.awayClub matches.playerScores.player")) ||
    (await Gameweek.findOne({ status: "finished" }).sort({ number: -1 }).populate("matches.homeClub matches.awayClub matches.playerScores.player"));

  res.json({ gameweek });
});

publicRouter.get("/gameweeks", async (_req, res) => {
  const gameweeks = await Gameweek.find({})
    .sort({ number: -1 })
    .populate("matches.homeClub matches.awayClub matches.playerScores.player");

  res.json({ gameweeks });
});

publicRouter.get("/gameweeks/:id/leaderboard", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );

  if (!gameweek) {
    return res.status(404).json({ message: "Jornada no encontrada." });
  }

  const scoreMap = buildGameweekScoreMap(gameweek);
  const lineups = await Lineup.find({ gameweek: gameweek._id })
    .populate("user", "teamName status totalPoints role")
    .populate({ path: "players", populate: { path: "club" } });

  const revealLineups = gameweek.status !== "draft";
  const leaderboard = lineups
    .filter((lineup) => lineup.user?.role === "user")
    .sort((a, b) => {
      const pointDelta = Number(b.points || 0) - Number(a.points || 0);
      if (pointDelta !== 0) return pointDelta;
      return String(a.user.teamName || "").localeCompare(String(b.user.teamName || ""));
    })
    .map((lineup, index) => serializeLineupForLeaderboard(lineup, scoreMap, index + 1, revealLineups));

  res.json({ gameweek, leaderboard });
});

publicRouter.get("/gameweeks/:id", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );

  if (!gameweek) {
    return res.status(404).json({ message: "Jornada no encontrada." });
  }

  res.json({ gameweek });
});

import express from "express";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { MundoArticle } from "../models/MundoArticle.js";
import { MundoPlayerStatus } from "../models/MundoPlayerStatus.js";
import { Player } from "../models/Player.js";
import { Settings, getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";
import { hasOfficialMatchScores } from "../services/mundoFinalLineup.js";
import { buildGameweekScoreMap, buildPlayerMatchBreakdown } from "../services/scoring.js";

export const publicRouter = express.Router();

function serializePromo(settings) {
  const hasCustomImage = Boolean(settings?.promoImageContentType && settings?.promoImageUpdatedAt);
  const imageVersion = settings?.promoImageUpdatedAt?.getTime?.();
  return {
    enabled: settings?.promoEnabled !== false && hasCustomImage,
    durationSeconds: Number(settings?.promoDurationSeconds || 15),
    imageUrl: hasCustomImage ? `/api/promo/image?v=${imageVersion}` : ""
  };
}

publicRouter.get("/promo", async (_req, res) => {
  const settings = await getLeagueSettings();
  res.json({ promo: serializePromo(settings) });
});

publicRouter.get("/promo/image", async (_req, res) => {
  const settings = await Settings.findOne({ key: "league" }).select(
    "+promoImageData promoImageContentType promoImageUpdatedAt"
  );
  if (!settings?.promoImageData?.length || !settings.promoImageContentType) {
    return res.status(404).json({ message: "No hay una imagen personalizada para el anuncio." });
  }

  res.set("Cache-Control", "public, max-age=86400");
  res.type(settings.promoImageContentType);
  return res.send(settings.promoImageData);
});

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
    card: score.card || "none",
    isMvp: sameId(player, match.mvp),
    lines: breakdown.lines
  };
}

publicRouter.get("/clubs", async (_req, res) => {
  const clubs = await Club.find({}).sort({ name: 1 });
  res.json({ clubs });
});

publicRouter.get("/clubs/:id/badge", async (req, res) => {
  try {
    const club = await Club.findById(req.params.id).select("+badgeData badgeContentType badgeUpdatedAt");
    if (!club?.badgeData?.length || !club.badgeContentType) {
      return res.status(404).json({ message: "Este club no tiene escudo." });
    }

    res.set("Cache-Control", "public, max-age=86400");
    res.type(club.badgeContentType);
    return res.send(club.badgeData);
  } catch {
    return res.status(404).json({ message: "Escudo no encontrado." });
  }
});

publicRouter.get("/news", async (req, res) => {
  const requestedLimit = Number(req.query.limit || 30);
  const requestedOffset = Number(req.query.offset || 0);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 30, 1), 100);
  const offset = Math.max(Number.isFinite(requestedOffset) ? Math.floor(requestedOffset) : 0, 0);
  const [news, total] = await Promise.all([
    NewsItem.find({})
      .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit),
    NewsItem.countDocuments({})
  ]);

  res.json({
    news,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + news.length < total
    }
  });
});

publicRouter.get("/players", async (req, res) => {
  const filter = {};
  if (req.query.position) filter.position = req.query.position;
  if (req.query.club) filter.club = req.query.club;

  const players = await Player.find(filter).populate("club").sort({ marketValue: -1, name: 1 });
  res.json({ players });
});

publicRouter.get("/players/:id/photo", async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).select("+photoData photoContentType photoUpdatedAt");
    if (!player?.photoData?.length || !player.photoContentType) {
      return res.status(404).json({ message: "Este jugador no tiene foto." });
    }

    res.set("Cache-Control", req.query.v ? "public, max-age=31536000, immutable" : "public, max-age=300");
    res.type(player.photoContentType);
    return res.send(player.photoData);
  } catch {
    return res.status(404).json({ message: "Foto de jugador no encontrada." });
  }
});

publicRouter.get("/players/:id/stats", async (req, res) => {
  const player = await Player.findById(req.params.id).select("+marketValueHistory").populate("club");
  if (!player) {
    return res.status(404).json({ message: "Jugador no encontrado." });
  }

  const [gameweeks, lineupUsage, relatedNews, mundoStatus] = await Promise.all([
    Gameweek.find({}).sort({ number: -1 }).populate("matches.homeClub matches.awayClub matches.playerScores.player"),
    Lineup.aggregate([
      { $match: { players: player._id, lockedAt: { $exists: true, $ne: null } } },
      { $group: { _id: "$gameweek", usedBy: { $sum: 1 } } }
    ]),
    MundoArticle.find({ status: "published", relatedPlayer: player._id })
      .select("title slug excerpt image publishedAt updatedAt")
      .sort({ publishedAt: -1 })
      .limit(20),
    MundoPlayerStatus.findOne({ player: player._id }).lean()
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
            kickoff: playerMatch.kickoff,
            status: playerMatch.status,
            homeScore: playerMatch.homeScore,
            awayScore: playerMatch.awayScore,
            isScored: hasOfficialMatchScores(playerMatch)
          }
        : null
    };
  });

  res.json({
    player: {
      ...player.toObject(),
      mundoStatus: mundoStatus
        ? { status: mundoStatus.status, note: mundoStatus.note || "", updatedAt: mundoStatus.updatedAt }
        : { status: "available", note: "", updatedAt: null }
    },
    summary: {
      totalPoints: player.totalPoints || 0,
      totalLineups: byGameweek.reduce((sum, row) => sum + Number(row.usedBy || 0), 0),
      scoredGameweeks: byGameweek.filter((row) => row.points !== 0).length
    },
    byGameweek,
    relatedNews: relatedNews.map((article) => ({
      _id: article._id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      publishedAt: article.publishedAt,
      imageUrl: article.image ? `/api/mundo/articles/${article._id}/image?v=${new Date(article.updatedAt).getTime()}` : null
    }))
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

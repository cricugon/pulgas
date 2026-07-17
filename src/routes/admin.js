import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { Player } from "../models/Player.js";
import { getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";
import { LeagueBackup } from "../models/LeagueBackup.js";
import { MundoPlayerStatus } from "../models/MundoPlayerStatus.js";
import { MundoPrediction } from "../models/MundoPrediction.js";
import { createLeagueBackup, restoreLeagueBackup } from "../services/backups.js";
import { resetLeague } from "../services/leagueReset.js";
import { updateMarketValuesAfterGameweek } from "../services/marketValues.js";
import { matchLabel, publishNews } from "../services/news.js";
import {
  calculatePlayerMatchPoints,
  lockGameweekLineups,
  normalizeScoreStat,
  recalculateGameweek
} from "../services/scoring.js";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireAdmin);

function formatEuro(value = 0) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function gameweekMatchCount(gameweek) {
  const count = gameweek.matches?.length || 0;
  return `${count} ${count === 1 ? "partido programado" : "partidos programados"}`;
}

async function publishGameweekStatusNews(gameweek, status) {
  if (status === "live") {
    await publishNews({
      type: "gameweek_started",
      title: `${gameweek.name} esta en juego`,
      body: `La jornada ha comenzado con ${gameweekMatchCount(gameweek)}. Las alineaciones quedan bloqueadas.`,
      metadata: { gameweekId: gameweek._id, number: gameweek.number }
    });
  }

  if (status === "finished") {
    await publishNews({
      type: "gameweek_finished",
      title: `${gameweek.name} finalizada`,
      body: "La clasificacion total ya refleja los puntos de esta jornada.",
      metadata: { gameweekId: gameweek._id, number: gameweek.number }
    });
  }
}

async function publishMatchScoresNews(gameweek, match) {
  if (!match) return;
  const playedCount = (match.playerScores || []).filter((score) => score.played !== false).length;

  await publishNews({
    type: "match_scored",
    title: `Puntuaciones publicadas: ${matchLabel(match)}`,
    body: `${gameweek.name} ya tiene ${playedCount} jugadores puntuados para este partido.`,
    metadata: { gameweekId: gameweek._id, matchId: match._id }
  });
}

async function publishMarketValuesNews(result) {
  if (!result?.updated) return;

  await publishNews({
    type: "system",
    title: "Valores de mercado actualizados",
    body: `${result.updated} jugadores han cambiado de valor tras el cierre de la jornada.`,
    metadata: {
      updated: result.updated,
      minValue: result.minValue,
      maxValue: result.maxValue,
      maxChangeRate: result.maxChangeRate
    }
  });
}

function parseMatchResult(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) return null;
  return Math.floor(score);
}

function normalizeScoreInput(score) {
  if (!score || typeof score !== "object") return null;

  const commonGoals = normalizeScoreStat(score.commonGoals);
  const specialGoals = normalizeScoreStat(score.specialGoals);
  const assists = normalizeScoreStat(score.assists);
  const penaltySaves = normalizeScoreStat(score.penaltySaves);
  const picas = normalizeScoreStat(score.picas, { max: 3 });

  if ([commonGoals, specialGoals, assists, penaltySaves, picas].some((value) => value === null)) {
    return null;
  }

  return {
    playerId: String(score.playerId || ""),
    played: Boolean(score.played),
    commonGoals,
    specialGoals,
    assists,
    penaltySaves,
    picas,
    note: String(score.note || "").trim()
  };
}

adminRouter.get("/summary", async (_req, res) => {
  const [users, clubs, players, gameweeks, liveGameweek, settings] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Club.countDocuments({}),
    Player.countDocuments({}),
    Gameweek.countDocuments({}),
    Gameweek.findOne({ status: "live" }),
    getLeagueSettings()
  ]);

  res.json({
    summary: {
      users,
      clubs,
      players,
      gameweeks,
      liveGameweek: liveGameweek?.name || null,
      initialBudget: settings.initialBudget
    }
  });
});

adminRouter.get("/settings", async (_req, res) => {
  const settings = await getLeagueSettings();
  res.json({ settings });
});

adminRouter.put("/settings", async (req, res) => {
  const initialBudget = Number(req.body.initialBudget);

  if (!Number.isFinite(initialBudget) || initialBudget < 0) {
    return res.status(400).json({ message: "Presupuesto inicial no valido." });
  }

  const settings = await getLeagueSettings();
  settings.initialBudget = initialBudget;
  await settings.save();

  res.json({ message: "Configuracion actualizada.", settings });
});

function newsPayload(req, existingNews = null) {
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  const pinned = Boolean(req.body.pinned);
  const validTypes = ["gameweek_started", "gameweek_finished", "match_scored", "player_created", "team_registered", "system"];
  const type = validTypes.includes(req.body.type) ? req.body.type : existingNews?.type || "system";
  const wasPinned = Boolean(existingNews?.pinned);

  return {
    title,
    body,
    pinned,
    pinnedAt: pinned ? existingNews?.pinnedAt || new Date() : null,
    type,
    metadata: {
      ...(existingNews?.metadata || {}),
      manual: true,
      updatedBy: req.user.email
    },
    ...(pinned && !wasPinned ? { pinnedAt: new Date() } : {})
  };
}

adminRouter.get("/news", async (_req, res) => {
  const news = await NewsItem.find({})
    .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
    .limit(100);

  res.json({ news });
});

adminRouter.post("/news", async (req, res) => {
  const payload = newsPayload(req);
  if (!payload.title) {
    return res.status(400).json({ message: "El titulo de la noticia es obligatorio." });
  }

  const news = await NewsItem.create(payload);
  res.status(201).json({ message: "Noticia publicada.", news });
});

adminRouter.put("/news/:id", async (req, res) => {
  const existingNews = await NewsItem.findById(req.params.id);
  if (!existingNews) {
    return res.status(404).json({ message: "Noticia no encontrada." });
  }

  const payload = newsPayload(req, existingNews);
  if (!payload.title) {
    return res.status(400).json({ message: "El titulo de la noticia es obligatorio." });
  }

  Object.assign(existingNews, payload);
  await existingNews.save();
  res.json({ message: "Noticia actualizada.", news: existingNews });
});

adminRouter.delete("/news/:id", async (req, res) => {
  const news = await NewsItem.findByIdAndDelete(req.params.id);
  if (!news) {
    return res.status(404).json({ message: "Noticia no encontrada." });
  }

  res.json({ message: "Noticia eliminada." });
});

adminRouter.get("/backups", async (_req, res) => {
  const backups = await LeagueBackup.find({})
    .select("-snapshot")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ backups });
});

adminRouter.post("/backups", async (req, res) => {
  const backup = await createLeagueBackup({
    name: req.body.name || "",
    reason: "manual",
    createdBy: req.user._id,
    createdByEmail: req.user.email
  });

  res.status(201).json({ message: "Backup creado.", backup });
});

adminRouter.delete("/backups/:id", async (req, res) => {
  const backup = await LeagueBackup.findByIdAndDelete(req.params.id);
  if (!backup) {
    return res.status(404).json({ message: "Backup no encontrado." });
  }

  res.json({ message: "Backup eliminado." });
});

adminRouter.post("/backups/:id/restore", async (req, res) => {
  if (req.body.confirmation !== "RESTAURAR") {
    return res.status(400).json({ message: "Confirmacion no valida. Escribe RESTAURAR para restaurar." });
  }

  try {
    const result = await restoreLeagueBackup(req.params.id, {
      restoredBy: req.user._id,
      restoredByEmail: req.user.email
    });

    if (!result) {
      return res.status(404).json({ message: "Backup no encontrado." });
    }

    res.json({ message: "Backup restaurado. Las cuentas registradas se han conservado.", result });
  } catch (error) {
    res.status(500).json({ message: "No se pudo restaurar el backup.", detail: error.message });
  }
});

adminRouter.post("/league/reset", async (req, res) => {
  if (req.body.confirmation !== "REINICIAR") {
    return res.status(400).json({ message: "Confirmacion no valida. Escribe REINICIAR para reiniciar la liga." });
  }

  try {
    const result = await resetLeague({
      loadDemoData: Boolean(req.body.loadDemoData),
      preserveUsers: true,
      includeDemoAccounts: false
    });

    res.json({
      message: result.loadDemoData
        ? "Liga reiniciada y datos demo cargados."
        : "Liga reiniciada sin datos demo.",
      result
    });
  } catch (error) {
    res.status(500).json({ message: "No se pudo reiniciar la liga.", detail: error.message });
  }
});

adminRouter.get("/players", async (_req, res) => {
  const players = await Player.find({}).populate("club").sort({ name: 1 });
  res.json({ players });
});

adminRouter.post("/players", async (req, res) => {
  try {
    const player = await Player.create({
      name: req.body.name,
      position: req.body.position,
      club: req.body.club,
      marketValue: Number(req.body.marketValue),
      form: Number(req.body.form || 50),
      status: req.body.status || "available",
      shirtNumber: Number(req.body.shirtNumber || 0),
      bio: req.body.bio || ""
    });
    await player.populate("club");
    await publishNews({
      type: "player_created",
      title: `Nuevo jugador disponible: ${player.name}`,
      body: `${player.position} - ${player.club?.shortName || player.club?.name || "Sin club"} - ${formatEuro(player.marketValue)}`,
      metadata: { playerId: player._id, clubId: player.club?._id || player.club }
    });

    res.status(201).json({ message: "Jugador creado.", player });
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear el jugador.", detail: error.message });
  }
});

adminRouter.put("/players/:id", async (req, res) => {
  try {
    const update = {
      name: req.body.name,
      position: req.body.position,
      club: req.body.club,
      marketValue: Number(req.body.marketValue),
      form: Number(req.body.form || 50),
      status: req.body.status || "available",
      shirtNumber: Number(req.body.shirtNumber || 0),
      bio: req.body.bio || ""
    };

    const player = await Player.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!player) return res.status(404).json({ message: "Jugador no encontrado." });

    res.json({ message: "Jugador actualizado.", player });
  } catch (error) {
    res.status(400).json({ message: "No se pudo actualizar el jugador.", detail: error.message });
  }
});

adminRouter.delete("/players/:id", async (req, res) => {
  const player = await Player.findByIdAndDelete(req.params.id);
  if (!player) return res.status(404).json({ message: "Jugador no encontrado." });

  await User.updateMany({}, { $pull: { squad: player._id } });
  await Lineup.updateMany({}, { $pull: { players: player._id } });
  await Gameweek.updateMany({}, { $pull: { "matches.$[].playerScores": { player: player._id } } });
  await MundoPlayerStatus.deleteOne({ player: player._id });
  await MundoPrediction.deleteMany({
    $or: [
      { "teams.picks.starter": player._id },
      { "teams.picks.challenger": player._id }
    ]
  });

  res.json({ message: "Jugador eliminado." });
});

adminRouter.get("/clubs", async (_req, res) => {
  const clubs = await Club.find({}).sort({ name: 1 });
  res.json({ clubs });
});

adminRouter.post("/clubs", async (req, res) => {
  try {
    const club = await Club.create({
      name: req.body.name,
      shortName: req.body.shortName,
      city: req.body.city || "",
      primaryColor: req.body.primaryColor || "#1d4ed8",
      secondaryColor: req.body.secondaryColor || "#ffffff"
    });
    res.status(201).json({ message: "Club creado.", club });
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear el club.", detail: error.message });
  }
});

adminRouter.put("/clubs/:id", async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        shortName: req.body.shortName,
        city: req.body.city || "",
        primaryColor: req.body.primaryColor || "#1d4ed8",
        secondaryColor: req.body.secondaryColor || "#ffffff"
      },
      { new: true, runValidators: true }
    );

    if (!club) return res.status(404).json({ message: "Club no encontrado." });
    res.json({ message: "Club actualizado.", club });
  } catch (error) {
    res.status(400).json({ message: "No se pudo actualizar el club.", detail: error.message });
  }
});

adminRouter.delete("/clubs/:id", async (req, res) => {
  const playerCount = await Player.countDocuments({ club: req.params.id });
  if (playerCount > 0) {
    return res.status(400).json({ message: "No puedes borrar un club con jugadores asignados." });
  }

  const club = await Club.findByIdAndDelete(req.params.id);
  if (!club) return res.status(404).json({ message: "Club no encontrado." });

  res.json({ message: "Club eliminado." });
});

adminRouter.get("/teams", async (_req, res) => {
  const teams = await User.find({ role: "user" })
    .select("-passwordHash")
    .populate({ path: "squad", populate: { path: "club" } })
    .sort({ totalPoints: -1, teamName: 1 });

  res.json({ teams });
});

adminRouter.patch("/teams/:id", async (req, res) => {
  const allowed = {};
  for (const field of ["teamName", "status", "budget"]) {
    if (req.body[field] !== undefined) allowed[field] = req.body[field];
  }

  if (allowed.teamName !== undefined) {
    allowed.teamName = String(allowed.teamName).trim();
    if (!allowed.teamName) {
      return res.status(400).json({ message: "El nombre del equipo no puede estar vacio." });
    }
  }

  if (allowed.budget !== undefined) allowed.budget = Number(allowed.budget);

  const team = await User.findOneAndUpdate(
    { _id: req.params.id, role: "user" },
    allowed,
    { new: true, runValidators: true }
  ).select("-passwordHash");
  if (!team) return res.status(404).json({ message: "Equipo no encontrado." });

  res.json({ message: "Equipo actualizado.", team });
});

adminRouter.delete("/teams/:id", async (req, res) => {
  const team = await User.findOneAndDelete({ _id: req.params.id, role: "user" });
  if (!team) return res.status(404).json({ message: "Equipo no encontrado." });

  await Lineup.deleteMany({ user: team._id });
  res.json({ message: "Equipo eliminado." });
});

adminRouter.post("/gameweeks", async (req, res) => {
  try {
    const gameweek = await Gameweek.create({
      number: Number(req.body.number),
      name: req.body.name || `Jornada ${req.body.number}`,
      lineupBudgetCap: Number(req.body.lineupBudgetCap || 100000000),
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null
    });

    res.status(201).json({ message: "Jornada creada.", gameweek });
  } catch (error) {
    res.status(400).json({ message: "No se pudo crear la jornada.", detail: error.message });
  }
});

adminRouter.put("/gameweeks/:id", async (req, res) => {
  try {
    const update = {};
    for (const field of ["number", "name", "lineupBudgetCap"]) {
      if (req.body[field] !== undefined) update[field] = field === "name" ? req.body[field] : Number(req.body[field]);
    }
    if (req.body.startsAt !== undefined) update.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : undefined;
    if (req.body.endsAt !== undefined) update.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null;

    const gameweek = await Gameweek.findById(req.params.id);
    if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });
    const previousStatus = gameweek.status;

    const requestedStatus = req.body.status;
    if (requestedStatus !== undefined && !["draft", "live", "finished"].includes(requestedStatus)) {
      return res.status(400).json({ message: "Estado de jornada no valido." });
    }

    if (requestedStatus === "live") {
      const liveGameweek = await Gameweek.findOne({ status: "live", _id: { $ne: gameweek._id } });
      if (liveGameweek) {
        return res.status(400).json({ message: `Finaliza primero ${liveGameweek.name}.` });
      }

      if (gameweek.status !== "live") {
        await createLeagueBackup({
          reason: "before_gameweek_start",
          createdBy: req.user._id,
          createdByEmail: req.user.email,
          gameweek: gameweek._id,
          gameweekName: gameweek.name
        });
      }
    }

    Object.assign(gameweek, update);

    if (requestedStatus === "draft") {
      gameweek.status = "draft";
      gameweek.endsAt = null;
      gameweek.matches.forEach((match) => {
        match.status = "scheduled";
      });
      await Lineup.updateMany({ gameweek: gameweek._id }, { lockedAt: null });
    }

    if (requestedStatus === "live") {
      gameweek.status = "live";
      gameweek.startsAt = gameweek.startsAt || new Date();
      gameweek.endsAt = null;
      gameweek.matches.forEach((match) => {
        if (match.status === "scheduled") match.status = "live";
      });
      await lockGameweekLineups(gameweek);
    }

    if (requestedStatus === "finished") {
      gameweek.status = "finished";
      gameweek.endsAt = gameweek.endsAt || new Date();
      gameweek.matches.forEach((match) => {
        match.status = "finished";
      });
    }

    await gameweek.save();

    if (requestedStatus === "live" || requestedStatus === "finished" || requestedStatus === "draft") {
      await recalculateGameweek(gameweek._id);
    }
    const marketValueUpdate =
      requestedStatus === "finished" && previousStatus !== "finished"
        ? await updateMarketValuesAfterGameweek(gameweek._id)
        : null;

    const populated = await Gameweek.findById(gameweek._id).populate(
      "matches.homeClub matches.awayClub matches.playerScores.player"
    );
    if (previousStatus !== populated.status && ["live", "finished"].includes(populated.status)) {
      await publishGameweekStatusNews(populated, populated.status);
    }
    await publishMarketValuesNews(marketValueUpdate);

    res.json({ message: "Jornada actualizada.", gameweek: populated, marketValueUpdate });
  } catch (error) {
    res.status(400).json({ message: "No se pudo actualizar la jornada.", detail: error.message });
  }
});

adminRouter.delete("/gameweeks/:id", async (req, res) => {
  const gameweek = await Gameweek.findByIdAndDelete(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });

  await Lineup.deleteMany({ gameweek: gameweek._id });
  await MundoPrediction.deleteMany({ gameweek: gameweek._id });
  res.json({ message: "Jornada eliminada." });
});

adminRouter.post("/gameweeks/:id/start", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });
  const previousStatus = gameweek.status;

  const liveGameweek = await Gameweek.findOne({ status: "live", _id: { $ne: gameweek._id } });
  if (liveGameweek) {
    return res.status(400).json({ message: `Finaliza primero ${liveGameweek.name}.` });
  }

  if (gameweek.status === "finished") {
    return res.status(400).json({ message: "No se puede iniciar una jornada finalizada." });
  }

  if (gameweek.status !== "live") {
    await createLeagueBackup({
      reason: "before_gameweek_start",
      createdBy: req.user._id,
      createdByEmail: req.user.email,
      gameweek: gameweek._id,
      gameweekName: gameweek.name
    });
  }

  gameweek.status = "live";
  gameweek.startsAt = new Date();
  gameweek.matches.forEach((match) => {
    if (match.status === "scheduled") match.status = "live";
  });
  await gameweek.save();

  const lockedLineups = await lockGameweekLineups(gameweek);
  await recalculateGameweek(gameweek._id);
  const populated = await Gameweek.findById(gameweek._id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );
  if (previousStatus !== "live") {
    await publishGameweekStatusNews(populated, "live");
  }

  res.json({ message: "Jornada iniciada.", gameweek: populated, lockedLineups });
});

adminRouter.post("/gameweeks/:id/finish", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });
  const previousStatus = gameweek.status;

  gameweek.status = "finished";
  gameweek.endsAt = new Date();
  gameweek.matches.forEach((match) => {
    match.status = "finished";
  });
  await gameweek.save();
  await recalculateGameweek(gameweek._id);
  const marketValueUpdate =
    previousStatus !== "finished" ? await updateMarketValuesAfterGameweek(gameweek._id) : null;

  const populated = await Gameweek.findById(gameweek._id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );
  if (previousStatus !== "finished") {
    await publishGameweekStatusNews(populated, "finished");
  }
  await publishMarketValuesNews(marketValueUpdate);

  res.json({ message: "Jornada finalizada.", gameweek: populated, marketValueUpdate });
});

adminRouter.post("/gameweeks/:id/matches", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });

  if (req.body.homeClub === req.body.awayClub) {
    return res.status(400).json({ message: "Un partido necesita dos equipos diferentes." });
  }

  const requestedStatus = req.body.status || "scheduled";
  if (!["scheduled", "live", "finished"].includes(requestedStatus)) {
    return res.status(400).json({ message: "Estado de partido no valido." });
  }
  const matchStatus = gameweek.status === "live" ? requestedStatus : gameweek.status === "finished" ? "finished" : "scheduled";

  gameweek.matches.push({
    homeClub: req.body.homeClub,
    awayClub: req.body.awayClub,
    kickoff: req.body.kickoff ? new Date(req.body.kickoff) : new Date(),
    status: matchStatus
  });
  await gameweek.save();

  const populated = await Gameweek.findById(gameweek._id).populate("matches.homeClub matches.awayClub");
  res.status(201).json({ message: "Partido creado.", gameweek: populated });
});

adminRouter.put("/gameweeks/:id/matches/:matchId", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });

  const match = gameweek.matches.id(req.params.matchId);
  if (!match) return res.status(404).json({ message: "Partido no encontrado." });

  for (const field of ["homeClub", "awayClub", "homeScore", "awayScore"]) {
    if (req.body[field] !== undefined) match[field] = req.body[field];
  }
  if (req.body.status !== undefined) {
    if (!["scheduled", "live", "finished"].includes(req.body.status)) {
      return res.status(400).json({ message: "Estado de partido no valido." });
    }
    match.status = gameweek.status === "draft" ? "scheduled" : gameweek.status === "finished" ? "finished" : req.body.status;
  }
  if (req.body.kickoff) match.kickoff = new Date(req.body.kickoff);

  await gameweek.save();
  const populated = await Gameweek.findById(gameweek._id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );
  res.json({ message: "Partido actualizado.", gameweek: populated });
});

adminRouter.delete("/gameweeks/:id/matches/:matchId", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });

  const match = gameweek.matches.id(req.params.matchId);
  if (!match) return res.status(404).json({ message: "Partido no encontrado." });

  match.deleteOne();
  await gameweek.save();
  await recalculateGameweek(gameweek._id);
  await MundoPrediction.deleteOne({ gameweek: gameweek._id, matchId: req.params.matchId });

  res.json({ message: "Partido eliminado.", gameweek });
});

adminRouter.post("/gameweeks/:id/matches/:matchId/scores", async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.id);
  if (!gameweek) return res.status(404).json({ message: "Jornada no encontrada." });

  const match = gameweek.matches.id(req.params.matchId);
  if (!match) return res.status(404).json({ message: "Partido no encontrado." });

  if (!Array.isArray(req.body.scores)) {
    return res.status(400).json({ message: "Debes enviar la tabla completa de estadisticas del partido." });
  }

  const homeScore = parseMatchResult(req.body.homeScore);
  const awayScore = parseMatchResult(req.body.awayScore);
  if (homeScore === null || awayScore === null) {
    return res.status(400).json({ message: "Introduce un resultado valido para el partido." });
  }

  const scores = req.body.scores.map(normalizeScoreInput);
  if (!scores.length || scores.some((score) => score === null)) {
    return res.status(400).json({ message: "La tabla contiene estadisticas no validas." });
  }

  const uniquePlayerIds = [...new Set(scores.map((score) => score.playerId).filter(Boolean))];
  if (uniquePlayerIds.length !== scores.length) {
    return res.status(400).json({ message: "La lista de jugadores contiene repetidos o no validos." });
  }

  const players = await Player.find({ _id: { $in: uniquePlayerIds } }).select("_id club position");
  if (players.length !== uniquePlayerIds.length) {
    return res.status(400).json({ message: "Alguno de los jugadores no existe." });
  }

  const matchClubIds = new Set([match.homeClub.toString(), match.awayClub.toString()]);
  const outsideMatchPlayer = players.find((player) => !matchClubIds.has(player.club.toString()));
  if (outsideMatchPlayer) {
    return res.status(400).json({ message: "Solo puedes puntuar jugadores de los dos equipos del partido." });
  }

  const playerById = new Map(players.map((player) => [player._id.toString(), player]));
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.playerScores = scores.map((score) => {
    const player = playerById.get(score.playerId);
    const stats = {
      played: score.played,
      commonGoals: score.commonGoals,
      specialGoals: score.specialGoals,
      assists: score.assists,
      penaltySaves: score.penaltySaves,
      picas: score.picas
    };

    return {
      player: score.playerId,
      points: calculatePlayerMatchPoints(player, match, stats),
      ...stats,
      note: score.note
    };
  });

  if (req.body.markFinished !== false) match.status = "finished";

  await gameweek.save();
  await recalculateGameweek(gameweek._id);

  const populated = await Gameweek.findById(gameweek._id).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );
  const scoredMatch = populated.matches.id(match._id);
  await publishMatchScoresNews(populated, scoredMatch);

  res.json({ message: "Puntuaciones del partido calculadas y guardadas.", gameweek: populated });
});

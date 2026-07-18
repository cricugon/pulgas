import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { MundoAdmin } from "../models/MundoAdmin.js";
import { MundoArticle } from "../models/MundoArticle.js";
import { MundoEvent } from "../models/MundoEvent.js";
import { MundoMedia } from "../models/MundoMedia.js";
import { MundoPlayerStatus } from "../models/MundoPlayerStatus.js";
import { MundoPrediction } from "../models/MundoPrediction.js";
import { Player } from "../models/Player.js";
import { buildFinalMatchLineup, hasOfficialMatchScores } from "../services/mundoFinalLineup.js";

export const mundoRouter = express.Router();

const VALID_PLAYER_STATUSES = new Set(["available", "doubt", "out"]);
const VALID_ARTICLE_STATUSES = new Set(["draft", "published"]);
const VALID_POSITIONS = new Set(["POR", "DEF", "MED", "DEL"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function publicError(res, error, fallback) {
  const status = Number(error.status || 500);
  res.status(status).json({ message: status >= 500 ? fallback : error.message, detail: status >= 500 ? error.message : undefined });
}

function signMundoToken(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), scope: "mundo-admin" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function requireMundoAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No autenticado." });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    if (payload.scope !== "mundo-admin") {
      return res.status(403).json({ message: "Esta sesion no pertenece a Mundo Las Pulgas." });
    }

    const admin = await MundoAdmin.findById(payload.sub).select("-passwordHash");
    if (!admin || admin.status !== "active") {
      return res.status(403).json({ message: "Cuenta editorial no disponible." });
    }

    req.mundoAdmin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesion editorial no valida.", detail: error.message });
  }
}

function articleImageUrl(article) {
  const version = article?.updatedAt ? new Date(article.updatedAt).getTime() : "1";
  return article?.image ? `/api/mundo/articles/${article._id}/image?v=${version}` : null;
}

function serializeArticle(article, { includeBody = false } = {}) {
  const value = article?.toObject ? article.toObject() : article;
  if (!value) return null;

  const serialized = {
    _id: value._id,
    title: value.title,
    slug: value.slug,
    excerpt: value.excerpt,
    imageUrl: articleImageUrl(value),
    relatedPlayer: value.relatedPlayer || null,
    status: value.status,
    publishedAt: value.publishedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    views: value.views || 0
  };

  if (includeBody) serialized.body = value.body;
  return serialized;
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "noticia";
}

async function uniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (await MundoArticle.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function normalizeRelatedPlayer(value) {
  if (!value) return null;
  if (!mongoose.isValidObjectId(value) || !(await Player.exists({ _id: value }))) {
    const error = new Error("El jugador asociado no existe.");
    error.status = 400;
    throw error;
  }
  return value;
}

function parseImageDataUrl(value) {
  if (!value) return null;
  const match = String(value).match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match || !IMAGE_TYPES.has(match[1].toLowerCase())) {
    const error = new Error("La imagen debe ser JPG, PNG o WEBP.");
    error.status = 400;
    throw error;
  }

  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_IMAGE_BYTES) {
    const error = new Error("La imagen no puede superar 5 MB.");
    error.status = 400;
    throw error;
  }

  return { data, contentType: match[1].toLowerCase() };
}

function buildExcerpt(body = "") {
  const text = String(body).replace(/\s+/g, " ").trim();
  return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
}

async function publishMundoEvent({ type, emoji, message, metadata = {} }) {
  return MundoEvent.create({ type, emoji, message, metadata });
}

function statusPresentation(status) {
  return {
    available: { label: "Disponible", emoji: "✅" },
    doubt: { label: "Duda", emoji: "⚠️" },
    out: { label: "Baja", emoji: "❌" }
  }[status] || { label: "Disponible", emoji: "✅" };
}

function formationCounts(formation) {
  const parts = String(formation || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((value) => !Number.isInteger(value))) return null;
  const [DEF, MED, DEL] = parts;
  if (DEF < 2 || MED < 1 || DEL < 1 || DEF + MED + DEL !== 6) return null;
  return { POR: 1, DEF, MED, DEL };
}

function sameId(a, b) {
  return String(a?._id || a || "") === String(b?._id || b || "");
}

function findMatch(gameweek, matchId) {
  return (gameweek?.matches || []).find((match) => sameId(match._id, matchId));
}

function serializeGameweek(gameweek, predictionKeys = new Set()) {
  return {
    ...gameweek,
    matches: (gameweek.matches || []).map((match) => ({
      ...match,
      hasPrediction: predictionKeys.has(`${gameweek._id}:${match._id}`),
      isScored: hasOfficialMatchScores(match)
    }))
  };
}

async function gameweeksWithPredictionFlags({ includeFinished = false } = {}) {
  const filter = includeFinished ? {} : { status: { $in: ["draft", "live"] } };
  const gameweeks = await Gameweek.find(filter)
    .sort({ number: includeFinished ? -1 : 1 })
    .populate("matches.homeClub matches.awayClub")
    .lean();
  const predictionRows = await MundoPrediction.find({
    status: "published",
    gameweek: { $in: gameweeks.map((gameweek) => gameweek._id) }
  }).select("gameweek matchId").lean();
  const keys = new Set(predictionRows.map((row) => `${row.gameweek}:${row.matchId}`));
  return gameweeks.map((gameweek) => serializeGameweek(gameweek, keys));
}

async function playerStatusMap(playerIds = []) {
  const rows = await MundoPlayerStatus.find({ player: { $in: playerIds } }).lean();
  return new Map(rows.map((row) => [String(row.player), { status: row.status, note: row.note, updatedAt: row.updatedAt }]));
}

function attachPickStatuses(prediction, statuses) {
  if (!prediction) return null;
  const value = prediction.toObject ? prediction.toObject() : prediction;
  return {
    ...value,
    teams: (value.teams || []).map((team) => ({
      ...team,
      picks: (team.picks || []).map((pick) => ({
        ...pick,
        playerStatus: statuses.get(String(pick.starter?._id || pick.starter)) || { status: "available", note: "" },
        challengerStatus: pick.challenger
          ? statuses.get(String(pick.challenger?._id || pick.challenger)) || { status: "available", note: "" }
          : null
      }))
    }))
  };
}

async function populatedPrediction(query) {
  const prediction = await MundoPrediction.findOne(query)
    .populate("gameweek teams.club teams.picks.starter teams.picks.challenger");
  if (!prediction) return null;
  const ids = prediction.teams.flatMap((team) => team.picks.flatMap((pick) => [pick.starter?._id, pick.challenger?._id]).filter(Boolean));
  const statuses = await playerStatusMap(ids);
  return attachPickStatuses(prediction, statuses);
}

async function validatePredictionPayload(payload, gameweek, match) {
  const rawTeams = Array.isArray(payload.teams) ? payload.teams : [];
  if (rawTeams.length !== 2) {
    const error = new Error("La prediccion necesita los dos equipos del partido.");
    error.status = 400;
    throw error;
  }

  const normalizedTeams = [];
  const allPlayerIds = new Set();
  for (const side of ["home", "away"]) {
    const rawTeam = rawTeams.find((team) => team.side === side);
    const clubId = side === "home" ? match.homeClub?._id || match.homeClub : match.awayClub?._id || match.awayClub;
    const counts = formationCounts(rawTeam?.formation);
    if (!rawTeam || !counts || !sameId(rawTeam.club, clubId)) {
      const error = new Error(`Formacion o club no valido para el equipo ${side === "home" ? "local" : "visitante"}.`);
      error.status = 400;
      throw error;
    }

    const picks = Array.isArray(rawTeam.picks) ? rawTeam.picks : [];
    if (picks.length !== 7) {
      const error = new Error("Cada club debe tener exactamente 7 titulares.");
      error.status = 400;
      throw error;
    }

    const actualCounts = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
    const starters = new Set();
    const normalizedPicks = picks.map((pick, index) => {
      const position = String(pick.position || "").toUpperCase();
      const starter = String(pick.starter || "");
      const probability = Number(pick.probability);
      if (!VALID_POSITIONS.has(position) || !mongoose.isValidObjectId(starter)) {
        const error = new Error("Todos los puestos deben tener un titular valido.");
        error.status = 400;
        throw error;
      }
      if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
        const error = new Error("La probabilidad debe estar entre 0 y 100.");
        error.status = 400;
        throw error;
      }
      if (starters.has(starter)) {
        const error = new Error("No se puede repetir un titular en el mismo equipo.");
        error.status = 400;
        throw error;
      }

      starters.add(starter);
      allPlayerIds.add(starter);
      actualCounts[position] += 1;
      const challenger = probability < 70 && mongoose.isValidObjectId(pick.challenger) ? String(pick.challenger) : null;
      if (challenger) allPlayerIds.add(challenger);
      return {
        slotKey: String(pick.slotKey || `${position}-${index + 1}`),
        position,
        starter,
        probability: Math.round(probability),
        challenger
      };
    });

    if (Object.keys(counts).some((position) => actualCounts[position] !== counts[position])) {
      const error = new Error(`Los puestos no corresponden a la formacion ${rawTeam.formation}.`);
      error.status = 400;
      throw error;
    }

    normalizedTeams.push({ side, club: clubId, formation: rawTeam.formation, picks: normalizedPicks });
  }

  const players = await Player.find({ _id: { $in: [...allPlayerIds] } }).select("_id club position").lean();
  const playerById = new Map(players.map((player) => [String(player._id), player]));
  if (players.length !== allPlayerIds.size) {
    const error = new Error("Alguno de los jugadores elegidos ya no existe.");
    error.status = 400;
    throw error;
  }

  for (const team of normalizedTeams) {
    const starterIds = new Set(team.picks.map((pick) => pick.starter));
    for (const pick of team.picks) {
      const starter = playerById.get(pick.starter);
      if (!sameId(starter.club, team.club) || starter.position !== pick.position) {
        const error = new Error("Un titular no pertenece al club o a la posicion indicada.");
        error.status = 400;
        throw error;
      }
      if (pick.challenger) {
        const challenger = playerById.get(pick.challenger);
        if (starterIds.has(pick.challenger) || !sameId(challenger.club, team.club)) {
          const error = new Error("El suplente debe ser otro jugador del mismo club.");
          error.status = 400;
          throw error;
        }
      }
    }
  }

  return normalizedTeams;
}

// Public portal
mundoRouter.get("/home", asyncRoute(async (_req, res) => {
  const [articles, events, gameweeks] = await Promise.all([
    MundoArticle.find({ status: "published" }).sort({ publishedAt: -1 }).limit(6),
    MundoEvent.find({}).sort({ createdAt: -1 }).limit(20),
    gameweeksWithPredictionFlags()
  ]);
  res.json({ articles: articles.map((article) => serializeArticle(article)), events, gameweeks });
}));

mundoRouter.get("/articles", asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(24, Math.max(1, Number(req.query.limit || 9)));
  const filter = { status: "published" };
  const [articles, total] = await Promise.all([
    MundoArticle.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit),
    MundoArticle.countDocuments(filter)
  ]);
  res.json({
    articles: articles.map((article) => serializeArticle(article)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total }
  });
}));

mundoRouter.get("/articles/:id/image", asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
  const article = await MundoArticle.findById(req.params.id).select("image");
  const media = article?.image ? await MundoMedia.findById(article.image).select("+data contentType") : null;
  if (!media?.data) return res.status(404).end();
  res.set("Content-Type", media.contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(media.data);
}));

mundoRouter.get("/articles/:slug", asyncRoute(async (req, res) => {
  const article = await MundoArticle.findOne({ slug: req.params.slug, status: "published" });
  if (!article) return res.status(404).json({ message: "Noticia no encontrada." });
  await MundoArticle.updateOne({ _id: article._id }, { $inc: { views: 1 } });
  article.views += 1;
  res.json({ article: serializeArticle(article, { includeBody: true }) });
}));

mundoRouter.get("/events", asyncRoute(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const events = await MundoEvent.find({}).sort({ createdAt: -1 }).limit(limit);
  res.json({ events });
}));

mundoRouter.get("/gameweeks", asyncRoute(async (req, res) => {
  const gameweeks = await gameweeksWithPredictionFlags({ includeFinished: req.query.history === "1" });
  res.json({ gameweeks });
}));

mundoRouter.get("/predictions/:gameweekId/:matchId", asyncRoute(async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.gameweekId).populate(
    "matches.homeClub matches.awayClub matches.playerScores.player"
  );
  const match = gameweek && findMatch(gameweek, req.params.matchId);
  if (!gameweek || !match) return res.status(404).json({ message: "Partido no encontrado." });

  if (hasOfficialMatchScores(match)) {
    const finalLineup = buildFinalMatchLineup(match);
    if (!finalLineup) {
      return res.status(409).json({ message: "No hay suficientes jugadores puntuados para formar un siete valido por club." });
    }
    return res.json({ gameweek, match, prediction: finalLineup });
  }

  const prediction = await populatedPrediction({
    gameweek: gameweek._id,
    matchId: match._id,
    status: "published"
  });
  if (!prediction) return res.status(404).json({ message: "La prediccion de este partido aun no esta publicada." });
  res.json({ gameweek, match, prediction });
}));

mundoRouter.get("/clubs", asyncRoute(async (_req, res) => {
  const [clubs, players] = await Promise.all([
    Club.find({}).sort({ name: 1 }).lean(),
    Player.find({}).sort({ position: 1, name: 1 }).lean()
  ]);
  const statuses = await playerStatusMap(players.map((player) => player._id));
  res.json({
    clubs: clubs.map((club) => ({
      ...club,
      players: players
        .filter((player) => sameId(player.club, club._id))
        .map((player) => ({ ...player, mundoStatus: statuses.get(String(player._id)) || { status: "available", note: "" } }))
    }))
  });
}));

mundoRouter.get("/clubs/:id", asyncRoute(async (req, res) => {
  const club = await Club.findById(req.params.id).lean();
  if (!club) return res.status(404).json({ message: "Club no encontrado." });
  const players = await Player.find({ club: club._id }).sort({ position: 1, name: 1 }).lean();
  const statuses = await playerStatusMap(players.map((player) => player._id));
  res.json({
    club,
    players: players.map((player) => ({ ...player, mundoStatus: statuses.get(String(player._id)) || { status: "available", note: "" } }))
  });
}));

// Independent editorial administration
const mundoAdminRouter = express.Router();

mundoAdminRouter.get("/setup-status", asyncRoute(async (_req, res) => {
  res.json({ configured: (await MundoAdmin.countDocuments({})) > 0 });
}));

mundoAdminRouter.post("/setup", requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  if (await MundoAdmin.exists({})) {
    return res.status(409).json({ message: "El administrador editorial inicial ya esta configurado." });
  }
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const displayName = String(req.body.displayName || "Redaccion Mundo Las Pulgas").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ message: "Introduce un email valido y una contrasena de al menos 8 caracteres." });
  }
  const admin = await MundoAdmin.create({ email, displayName, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ message: "Administrador editorial creado.", token: signMundoToken(admin) });
}));

mundoAdminRouter.post("/auth/login", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const admin = await MundoAdmin.findOne({ email });
  if (!admin || admin.status !== "active" || !(await bcrypt.compare(String(req.body.password || ""), admin.passwordHash))) {
    return res.status(401).json({ message: "Credenciales editoriales no validas." });
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  res.json({
    token: signMundoToken(admin),
    admin: { id: admin._id, email: admin.email, displayName: admin.displayName }
  });
}));

mundoAdminRouter.use(requireMundoAdmin);

mundoAdminRouter.get("/me", (req, res) => {
  res.json({ admin: req.mundoAdmin });
});

mundoAdminRouter.put("/account/password", asyncRoute(async (req, res) => {
  const admin = await MundoAdmin.findById(req.mundoAdmin._id);
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return res.status(400).json({ message: "La contrasena actual no es correcta." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "La nueva contrasena debe tener al menos 8 caracteres." });
  }
  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  await admin.save();
  res.json({ message: "Contrasena editorial actualizada." });
}));

mundoAdminRouter.get("/articles", asyncRoute(async (_req, res) => {
  const articles = await MundoArticle.find({})
    .populate("relatedPlayer", "name position club")
    .sort({ updatedAt: -1 });
  res.json({ articles: articles.map((article) => serializeArticle(article, { includeBody: true })) });
}));

mundoAdminRouter.post("/articles", asyncRoute(async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();
    const status = VALID_ARTICLE_STATUSES.has(req.body.status) ? req.body.status : "draft";
    const image = parseImageDataUrl(req.body.imageDataUrl);
    const relatedPlayer = await normalizeRelatedPlayer(req.body.relatedPlayer);
    if (!title || !body) return res.status(400).json({ message: "Titulo y texto son obligatorios." });
    if (title.length > 180 || body.length > 30000) {
      return res.status(400).json({ message: "La noticia supera la longitud maxima permitida." });
    }
    if (status === "published" && !image) return res.status(400).json({ message: "La noticia necesita una foto principal para publicarse." });

    const media = image ? await MundoMedia.create({
      data: image.data,
      contentType: image.contentType,
      filename: String(req.body.imageFilename || ""),
      uploadedBy: req.mundoAdmin._id
    }) : null;
    const article = await MundoArticle.create({
      title,
      slug: await uniqueSlug(title),
      excerpt: buildExcerpt(body),
      body,
      image: media?._id || null,
      relatedPlayer,
      status,
      publishedAt: status === "published" ? new Date() : null,
      author: req.mundoAdmin._id
    });
    if (status === "published") {
      await publishMundoEvent({
        type: "article",
        emoji: "📰",
        message: `Nueva noticia publicada: ${article.title}`,
        metadata: { articleId: article._id, slug: article.slug }
      });
    }
    res.status(201).json({ message: status === "published" ? "Noticia publicada." : "Borrador guardado.", article: serializeArticle(article, { includeBody: true }) });
  } catch (error) {
    publicError(res, error, "No se pudo guardar la noticia.");
  }
}));

mundoAdminRouter.put("/articles/:id", asyncRoute(async (req, res) => {
  try {
    const article = await MundoArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Noticia no encontrada." });
    const wasPublished = article.status === "published";
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();
    const status = VALID_ARTICLE_STATUSES.has(req.body.status) ? req.body.status : article.status;
    const image = req.body.imageDataUrl ? parseImageDataUrl(req.body.imageDataUrl) : null;
    const relatedPlayer = await normalizeRelatedPlayer(req.body.relatedPlayer);
    if (!title || !body) return res.status(400).json({ message: "Titulo y texto son obligatorios." });
    if (title.length > 180 || body.length > 30000) {
      return res.status(400).json({ message: "La noticia supera la longitud maxima permitida." });
    }

    if (image) {
      const media = await MundoMedia.create({
        data: image.data,
        contentType: image.contentType,
        filename: String(req.body.imageFilename || ""),
        uploadedBy: req.mundoAdmin._id
      });
      article.image = media._id;
    } else if (req.body.removeImage) {
      article.image = null;
    }
    if (status === "published" && !article.image) {
      return res.status(400).json({ message: "La noticia necesita una foto principal para publicarse." });
    }

    article.title = title;
    article.body = body;
    article.excerpt = buildExcerpt(body);
    article.relatedPlayer = relatedPlayer;
    article.status = status;
    article.author = req.mundoAdmin._id;
    if (status === "published" && !wasPublished) article.publishedAt = new Date();
    await article.save();
    if (status === "published") {
      await publishMundoEvent({
        type: "article",
        emoji: wasPublished ? "✏️" : "📰",
        message: `${wasPublished ? "Noticia actualizada" : "Nueva noticia publicada"}: ${article.title}`,
        metadata: { articleId: article._id, slug: article.slug }
      });
    }
    res.json({ message: status === "published" ? "Noticia actualizada y publicada." : "Borrador actualizado.", article: serializeArticle(article, { includeBody: true }) });
  } catch (error) {
    publicError(res, error, "No se pudo actualizar la noticia.");
  }
}));

mundoAdminRouter.delete("/articles/:id", asyncRoute(async (req, res) => {
  const article = await MundoArticle.findByIdAndDelete(req.params.id);
  if (!article) return res.status(404).json({ message: "Noticia no encontrada." });
  res.json({ message: "Noticia eliminada." });
}));

mundoAdminRouter.get("/catalog", asyncRoute(async (_req, res) => {
  const [clubs, players, gameweeks] = await Promise.all([
    Club.find({}).sort({ name: 1 }).lean(),
    Player.find({}).populate("club").sort({ name: 1 }).lean(),
    Gameweek.find({}).sort({ number: -1 }).populate("matches.homeClub matches.awayClub").lean()
  ]);
  const statuses = await playerStatusMap(players.map((player) => player._id));
  res.json({
    clubs,
    players: players.map((player) => ({ ...player, mundoStatus: statuses.get(String(player._id)) || { status: "available", note: "" } })),
    gameweeks
  });
}));

mundoAdminRouter.patch("/players/:id/status", asyncRoute(async (req, res) => {
  const status = String(req.body.status || "");
  const note = String(req.body.note || "").trim();
  if (!VALID_PLAYER_STATUSES.has(status)) return res.status(400).json({ message: "Estado no valido." });
  const player = await Player.findById(req.params.id).populate("club");
  if (!player) return res.status(404).json({ message: "Jugador no encontrado." });
  const previous = await MundoPlayerStatus.findOne({ player: player._id });
  const changed = (previous?.status || "available") !== status || (previous?.note || "") !== note;
  const row = await MundoPlayerStatus.findOneAndUpdate(
    { player: player._id },
    { status, note, updatedBy: req.mundoAdmin._id },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  if (changed) {
    const presentation = statusPresentation(status);
    await publishMundoEvent({
      type: "player_status",
      emoji: presentation.emoji,
      message: `${player.name} (${player.club?.shortName || player.club?.name}) esta ${presentation.label.toLowerCase()}${note ? `: ${note}` : "."}`,
      metadata: { playerId: player._id, clubId: player.club?._id, status }
    });
  }
  res.json({ message: "Estado actualizado.", playerStatus: row });
}));

mundoAdminRouter.get("/predictions/:gameweekId/:matchId", asyncRoute(async (req, res) => {
  const gameweek = await Gameweek.findById(req.params.gameweekId).populate("matches.homeClub matches.awayClub");
  const match = gameweek && findMatch(gameweek, req.params.matchId);
  if (!gameweek || !match) return res.status(404).json({ message: "Partido no encontrado." });
  const prediction = await populatedPrediction({ gameweek: gameweek._id, matchId: match._id });
  const clubIds = [match.homeClub._id, match.awayClub._id];
  const players = await Player.find({ club: { $in: clubIds } }).populate("club").sort({ position: 1, name: 1 }).lean();
  const statuses = await playerStatusMap(players.map((player) => player._id));
  res.json({
    gameweek,
    match,
    prediction,
    players: players.map((player) => ({ ...player, mundoStatus: statuses.get(String(player._id)) || { status: "available", note: "" } }))
  });
}));

mundoAdminRouter.put("/predictions/:gameweekId/:matchId", asyncRoute(async (req, res) => {
  try {
    const gameweek = await Gameweek.findById(req.params.gameweekId).populate("matches.homeClub matches.awayClub");
    const match = gameweek && findMatch(gameweek, req.params.matchId);
    if (!gameweek || !match) return res.status(404).json({ message: "Partido no encontrado." });
    const status = req.body.status === "published" ? "published" : "draft";
    const teams = await validatePredictionPayload(req.body, gameweek, match);
    const existing = await MundoPrediction.findOne({ gameweek: gameweek._id, matchId: match._id });
    const wasPublished = existing?.status === "published";
    const prediction = await MundoPrediction.findOneAndUpdate(
      { gameweek: gameweek._id, matchId: match._id },
      {
        teams,
        status,
        publishedAt: status === "published" ? existing?.publishedAt || new Date() : null,
        updatedBy: req.mundoAdmin._id
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    if (status === "published") {
      const home = match.homeClub?.shortName || match.homeClub?.name;
      const away = match.awayClub?.shortName || match.awayClub?.name;
      await publishMundoEvent({
        type: "prediction",
        emoji: "📋",
        message: `${wasPublished ? "Actualizada" : "Publicada"} la alineacion probable de ${home} - ${away}.`,
        metadata: { gameweekId: gameweek._id, matchId: match._id }
      });
    }
    res.json({ message: status === "published" ? "Prediccion publicada." : "Borrador de prediccion guardado.", prediction });
  } catch (error) {
    publicError(res, error, "No se pudo guardar la prediccion.");
  }
}));

mundoAdminRouter.delete("/predictions/:gameweekId/:matchId", asyncRoute(async (req, res) => {
  const prediction = await MundoPrediction.findOneAndDelete({ gameweek: req.params.gameweekId, matchId: req.params.matchId });
  if (!prediction) return res.status(404).json({ message: "Prediccion no encontrada." });
  res.json({ message: "Prediccion eliminada." });
}));

mundoRouter.use("/admin", mundoAdminRouter);

mundoRouter.use((error, _req, res, _next) => {
  publicError(res, error, "Error interno de Mundo Las Pulgas.");
});

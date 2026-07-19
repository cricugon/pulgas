import { NewsItem } from "../models/NewsItem.js";
import { generateFormations, parseFormation } from "./formations.js";

const BEST_SEVEN_POSITIONS = ["POR", "DEF", "MED", "DEL"];

function documentId(value) {
  return String(value?._id || value || "");
}

function playerScoreRow(score, clubLookup) {
  const player = score?.player;
  if (!player?.name || !player?.position || !BEST_SEVEN_POSITIONS.includes(player.position)) return null;

  const club = clubLookup.get(documentId(player.club));
  return {
    _id: player._id,
    name: String(player.name),
    position: player.position,
    points: Number(score.points || 0),
    club: club ? {
      _id: club._id,
      name: club.name,
      shortName: club.shortName,
      primaryColor: club.primaryColor,
      badgeContentType: club.badgeContentType,
      badgeUpdatedAt: club.badgeUpdatedAt
    } : null,
    photoContentType: player.photoContentType || "",
    photoUpdatedAt: player.photoUpdatedAt || null
  };
}

function compareBestSevenPlayers(left, right) {
  return right.points - left.points || left.name.localeCompare(right.name, "es");
}

export function buildGameweekBestSeven(gameweek) {
  const clubLookup = new Map();
  for (const match of gameweek?.matches || []) {
    for (const club of [match.homeClub, match.awayClub]) {
      if (club?._id) clubLookup.set(documentId(club), club);
    }
  }

  const playersById = new Map();
  for (const match of gameweek?.matches || []) {
    for (const score of match.playerScores || []) {
      if (score.played !== true) continue;
      const row = playerScoreRow(score, clubLookup);
      if (!row?._id) continue;

      const id = documentId(row._id);
      const existing = playersById.get(id);
      if (existing) existing.points += row.points;
      else playersById.set(id, row);
    }
  }

  const grouped = Object.fromEntries(BEST_SEVEN_POSITIONS.map((position) => [position, []]));
  for (const player of playersById.values()) grouped[player.position].push(player);
  for (const players of Object.values(grouped)) players.sort(compareBestSevenPlayers);

  let best = null;
  for (const formation of generateFormations()) {
    const counts = parseFormation(formation);
    const players = BEST_SEVEN_POSITIONS.flatMap((position) => grouped[position].slice(0, counts[position]));
    if (players.length !== 7) continue;

    const candidate = {
      formation,
      totalPoints: players.reduce((total, player) => total + player.points, 0),
      players
    };
    if (!best
      || candidate.totalPoints > best.totalPoints
      || (candidate.totalPoints === best.totalPoints && candidate.formation.localeCompare(best.formation) < 0)) {
      best = candidate;
    }
  }

  return best;
}

export async function publishGameweekBestSevenNews(gameweek) {
  const bestSeven = buildGameweekBestSeven(gameweek);
  if (!bestSeven) return null;

  const gameweekId = documentId(gameweek);
  return publishNews({
    type: "gameweek_best_seven",
    title: `El 7 ideal de ${gameweek.name}`,
    body: `La formacion ${bestSeven.formation} reune a los jugadores mas destacados y suma ${bestSeven.totalPoints} puntos.`,
    metadata: {
      gameweekId: gameweek._id,
      number: gameweek.number,
      formation: bestSeven.formation,
      totalPoints: bestSeven.totalPoints,
      players: bestSeven.players
    },
    eventKey: `gameweek:${gameweekId}:best-seven`,
    dedupeFilter: { type: "gameweek_best_seven", "metadata.gameweekId": gameweek._id },
    updateExisting: true
  });
}

export async function publishNews({
  type = "system",
  title,
  body = "",
  metadata = {},
  eventKey = "",
  dedupeFilter = null,
  updateExisting = false
}) {
  if (!title) return null;

  try {
    const normalizedEventKey = String(eventKey || "").trim();
    if (normalizedEventKey) {
      const filters = [{ eventKey: normalizedEventKey }];
      if (dedupeFilter) filters.push(dedupeFilter);

      const existing = await NewsItem.findOne({ $or: filters }).sort({ createdAt: 1 });
      if (existing) {
        if (!existing.eventKey) {
          await NewsItem.updateOne(
            { _id: existing._id, eventKey: { $exists: false } },
            { $set: { eventKey: normalizedEventKey } }
          );
          existing.eventKey = normalizedEventKey;
        }
        if (updateExisting) {
          existing.type = type;
          existing.title = title;
          existing.body = body;
          existing.metadata = metadata;
          await existing.save();
        }
        return existing;
      }
    }

    return await NewsItem.create({
      type,
      title,
      body,
      ...(normalizedEventKey ? { eventKey: normalizedEventKey } : {}),
      metadata
    });
  } catch (error) {
    if (error?.code === 11000 && eventKey) {
      return NewsItem.findOne({ eventKey: String(eventKey).trim() });
    }
    console.warn("No se pudo publicar la noticia:", error.message);
    return null;
  }
}

export function buildGameweekStandings(lineups = [], limit = 10) {
  const eligible = lineups
    .filter((lineup) => lineup?.user?.role === "user")
    .map((lineup) => ({
      teamId: lineup.user._id,
      teamName: String(lineup.user.teamName || "Equipo sin nombre"),
      points: Number(lineup.points || 0),
      totalPoints: Number(lineup.user.totalPoints || 0)
    }))
    .sort((a, b) => b.points - a.points || a.teamName.localeCompare(b.teamName, "es"));

  return {
    participantCount: eligible.length,
    standings: eligible.slice(0, Math.max(0, Number(limit) || 10)).map((team, index) => ({
      rank: index + 1,
      ...team
    }))
  };
}

export function matchLabel(match) {
  const home = match.homeClub?.shortName || match.homeClub?.name || "Local";
  const away = match.awayClub?.shortName || match.awayClub?.name || "Visitante";
  const score = match.homeScore !== null && match.awayScore !== null
    ? ` ${match.homeScore}-${match.awayScore}`
    : " vs";

  return `${home}${score} ${away}`;
}

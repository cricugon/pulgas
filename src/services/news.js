import { NewsItem } from "../models/NewsItem.js";

export async function publishNews({
  type = "system",
  title,
  body = "",
  metadata = {},
  eventKey = "",
  dedupeFilter = null
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

export function matchLabel(match) {
  const home = match.homeClub?.shortName || match.homeClub?.name || "Local";
  const away = match.awayClub?.shortName || match.awayClub?.name || "Visitante";
  const score = match.homeScore !== null && match.awayScore !== null
    ? ` ${match.homeScore}-${match.awayScore}`
    : " vs";

  return `${home}${score} ${away}`;
}

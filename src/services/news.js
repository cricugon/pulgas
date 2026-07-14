import { NewsItem } from "../models/NewsItem.js";

export async function publishNews({ type = "system", title, body = "", metadata = {} }) {
  if (!title) return null;

  try {
    return await NewsItem.create({
      type,
      title,
      body,
      metadata
    });
  } catch (error) {
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

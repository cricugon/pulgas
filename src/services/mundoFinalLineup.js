import { generateFormations, getFormationSlots } from "./formations.js";

const POSITIONS = ["POR", "DEF", "MED", "DEL"];

function sameId(a, b) {
  return String(a?._id || a || "") === String(b?._id || b || "");
}

function hasResultValue(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function scorePoints(score) {
  return Number(score?.points || 0);
}

function compareScores(a, b) {
  return scorePoints(b) - scorePoints(a)
    || Number(Boolean(b.played)) - Number(Boolean(a.played))
    || String(a.player?.name || "").localeCompare(String(b.player?.name || ""), "es");
}

export function hasOfficialMatchScores(match) {
  return hasResultValue(match?.homeScore)
    && hasResultValue(match?.awayScore)
    && Array.isArray(match?.playerScores)
    && match.playerScores.length > 0;
}

function buildBestTeam(match, side, club) {
  const clubScores = (match.playerScores || [])
    .filter((score) => score.player && sameId(score.player.club, club))
    .sort(compareScores);

  const grouped = Object.fromEntries(POSITIONS.map((position) => [
    position,
    clubScores.filter((score) => score.player.position === position)
  ]));

  let best = null;
  for (const formation of generateFormations()) {
    const slots = getFormationSlots(formation);
    const usedByPosition = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
    const picks = slots.map((slot) => {
      const score = grouped[slot.position][usedByPosition[slot.position]];
      usedByPosition[slot.position] += 1;
      if (!score) return null;

      return {
        slotKey: slot.key,
        position: slot.position,
        starter: score.player,
        points: scorePoints(score),
        played: Boolean(score.played),
        isMvp: sameId(score.player, match.mvp)
      };
    });

    if (picks.some((pick) => !pick)) continue;

    const candidate = {
      side,
      club,
      formation,
      totalPoints: picks.reduce((total, pick) => total + pick.points, 0),
      playedPlayers: picks.filter((pick) => pick.played).length,
      picks
    };

    if (!best
      || candidate.totalPoints > best.totalPoints
      || (candidate.totalPoints === best.totalPoints && candidate.playedPlayers > best.playedPlayers)) {
      best = candidate;
    }
  }

  return best;
}

export function buildFinalMatchLineup(match) {
  if (!hasOfficialMatchScores(match)) return null;

  const home = buildBestTeam(match, "home", match.homeClub);
  const away = buildBestTeam(match, "away", match.awayClub);
  if (!home || !away) return null;

  return {
    mode: "final",
    status: "final",
    updatedAt: match.updatedAt,
    teams: [home, away]
  };
}

import express from "express";
import { requireAuth, requireTeamUser } from "../middleware/auth.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";
import { getFormationSlots, parseFormation } from "../services/formations.js";
import { buildGameweekScoreMap, scoreLineupFromGameweek } from "../services/scoring.js";

export const lineupRouter = express.Router();

lineupRouter.use(requireAuth, requireTeamUser);

async function findLineup(userId, gameweekId) {
  return Lineup.findOne({ user: userId, gameweek: gameweekId })
    .populate({ path: "players", populate: { path: "club" } })
    .populate("gameweek");
}

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function gameweekClubIds(gameweek) {
  const clubIds = new Set();
  for (const match of gameweek?.matches || []) {
    if (match.homeClub) clubIds.add(objectId(match.homeClub));
    if (match.awayClub) clubIds.add(objectId(match.awayClub));
  }
  return clubIds;
}

async function serializeLineup(lineup) {
  if (!lineup) return null;

  const gameweek = lineup.gameweek?.matches
    ? lineup.gameweek
    : await Gameweek.findById(lineup.gameweek).populate("matches.playerScores.player");
  const scoreMap = buildGameweekScoreMap(gameweek || { matches: [] });
  const data = lineup.toObject();

  data.players = (data.players || [])
    .filter(Boolean)
    .map((player) => ({
      ...player,
      gameweekPoints: scoreMap.get(player._id.toString()) || 0
    }));

  return data;
}

lineupRouter.get("/:gameweekId", async (req, res) => {
  const lineup = await findLineup(req.user._id, req.params.gameweekId);
  res.json({ lineup: await serializeLineup(lineup) });
});

lineupRouter.post("/:gameweekId", async (req, res) => {
  try {
    const formation = String(req.body.formation || "2-2-2");
    const slots = getFormationSlots(formation);
    const playerIds = [...new Set((req.body.playerIds || []).map(String))];

    if (!parseFormation(formation)) {
      return res.status(400).json({ message: "Formacion no valida." });
    }

    if (playerIds.length !== slots.length || playerIds.length !== (req.body.playerIds || []).length) {
      return res.status(400).json({ message: "Completa todos los puestos sin repetir jugadores." });
    }

    const gameweek = await Gameweek.findById(req.params.gameweekId);
    if (!gameweek) {
      return res.status(404).json({ message: "Jornada no encontrada." });
    }

    if (gameweek.status !== "draft") {
      return res.status(400).json({ message: "Solo se puede editar la alineacion antes de comenzar la jornada." });
    }

    const user = await User.findById(req.user._id);
    const players = await Player.find({ _id: { $in: playerIds } });
    if (players.length !== playerIds.length) {
      return res.status(400).json({ message: "Alguno de los jugadores seleccionados no existe." });
    }

    const eligibleClubIds = gameweekClubIds(gameweek);
    if (!eligibleClubIds.size) {
      return res.status(400).json({ message: "La jornada no tiene partidos configurados para hacer alineacion." });
    }

    const ineligible = players.find((player) => !eligibleClubIds.has(objectId(player.club)));
    if (ineligible) {
      return res.status(400).json({ message: `${ineligible.name} no juega esta jornada.` });
    }

    const playerById = new Map(players.map((player) => [player._id.toString(), player]));

    for (const [index, slot] of slots.entries()) {
      const player = playerById.get(playerIds[index]);
      if (!player || player.position !== slot.position) {
        return res.status(400).json({ message: `El puesto ${slot.key} necesita un jugador ${slot.position}.` });
      }
    }

    const unavailable = players.find((player) => player.status !== "available");
    if (unavailable) {
      return res.status(400).json({ message: `${unavailable.name} no esta disponible.` });
    }

    const budgetValue = players.reduce((sum, player) => sum + Number(player.marketValue || 0), 0);
    if (budgetValue > user.budget) {
      return res.status(400).json({ message: "La alineacion supera tu presupuesto disponible." });
    }

    const points = scoreLineupFromGameweek(playerIds, gameweek);
    const lineup = await Lineup.findOneAndUpdate(
      { user: user._id, gameweek: gameweek._id },
      {
        formation,
        players: playerIds,
        budgetValue,
        points,
        lockedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate({ path: "players", populate: { path: "club" } })
      .populate("gameweek");

    res.json({ message: "Alineacion guardada.", lineup: await serializeLineup(lineup) });
  } catch (error) {
    res.status(500).json({ message: "No se pudo guardar la alineacion.", detail: error.message });
  }
});

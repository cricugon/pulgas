import express from "express";
import { requireAuth, requireTeamUser } from "../middleware/auth.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { MundoPlayerStatus } from "../models/MundoPlayerStatus.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";

export const marketRouter = express.Router();

marketRouter.use(requireAuth, requireTeamUser);

marketRouter.get("/", async (req, res) => {
  const [user, players, totalUsage, latestGameweek, mundoStatuses] = await Promise.all([
    User.findById(req.user._id).select("budget"),
    Player.find({}).populate("club").sort({ marketValue: -1, name: 1 }),
    Lineup.aggregate([
      { $match: { lockedAt: { $exists: true, $ne: null } } },
      { $unwind: "$players" },
      { $group: { _id: "$players", count: { $sum: 1 } } }
    ]),
    Gameweek.findOne({ status: { $in: ["live", "finished"] } }).sort({ number: -1 }).select("_id number name status"),
    MundoPlayerStatus.find({}).lean()
  ]);

  const latestUsage = latestGameweek
    ? await Lineup.aggregate([
        { $match: { gameweek: latestGameweek._id, lockedAt: { $exists: true, $ne: null } } },
        { $unwind: "$players" },
        { $group: { _id: "$players", count: { $sum: 1 } } }
      ])
    : [];
  const usageMap = new Map(totalUsage.map((row) => [row._id.toString(), row.count]));
  const latestUsageMap = new Map(latestUsage.map((row) => [row._id.toString(), row.count]));
  const mundoStatusMap = new Map(mundoStatuses.map((row) => [row.player.toString(), {
    status: row.status,
    note: row.note || "",
    updatedAt: row.updatedAt
  }]));

  res.json({
    budget: user.budget,
    latestUsageGameweek: latestGameweek,
    players: players.map((player) => {
      const id = player._id.toString();
      return {
        ...player.toObject(),
        mundoStatus: mundoStatusMap.get(id) || { status: "available", note: "", updatedAt: null },
        lineupUsage: usageMap.get(id) || 0,
        latestLineupUsage: latestUsageMap.get(id) || 0
      };
    })
  });
});

marketRouter.post(["/buy/:playerId", "/sell/:playerId"], (_req, res) => {
  res.status(410).json({ message: "El mercado ahora es solo de consulta. Elige jugadores directamente en Alineacion." });
});

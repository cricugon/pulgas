import express from "express";
import { requireAuth, requireTeamUser } from "../middleware/auth.js";
import { Player } from "../models/Player.js";
import { User } from "../models/User.js";

export const marketRouter = express.Router();

marketRouter.use(requireAuth, requireTeamUser);

marketRouter.get("/", async (req, res) => {
  const user = await User.findById(req.user._id).select("budget");
  const players = await Player.find({}).populate("club").sort({ marketValue: -1, name: 1 });

  res.json({
    budget: user.budget,
    players
  });
});

marketRouter.post(["/buy/:playerId", "/sell/:playerId"], (_req, res) => {
  res.status(410).json({ message: "El mercado ahora es solo de consulta. Elige jugadores directamente en Alineacion." });
});

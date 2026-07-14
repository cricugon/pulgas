import mongoose from "mongoose";

const lineupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameweek: { type: mongoose.Schema.Types.ObjectId, ref: "Gameweek", required: true },
    formation: { type: String, default: "2-2-2", trim: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true }],
    budgetValue: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    lockedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

lineupSchema.index({ user: 1, gameweek: 1 }, { unique: true });

export const Lineup = mongoose.model("Lineup", lineupSchema);

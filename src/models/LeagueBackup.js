import mongoose from "mongoose";

const leagueBackupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    reason: {
      type: String,
      enum: ["manual", "before_gameweek_start", "before_restore"],
      default: "manual"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdByEmail: { type: String, trim: true, default: "" },
    gameweek: { type: mongoose.Schema.Types.ObjectId, ref: "Gameweek", default: null },
    counts: {
      users: { type: Number, default: 0 },
      clubs: { type: Number, default: 0 },
      players: { type: Number, default: 0 },
      gameweeks: { type: Number, default: 0 },
      lineups: { type: Number, default: 0 },
      news: { type: Number, default: 0 }
    },
    snapshot: {
      users: [{ type: mongoose.Schema.Types.Mixed }],
      clubs: [{ type: mongoose.Schema.Types.Mixed }],
      players: [{ type: mongoose.Schema.Types.Mixed }],
      gameweeks: [{ type: mongoose.Schema.Types.Mixed }],
      lineups: [{ type: mongoose.Schema.Types.Mixed }],
      settings: [{ type: mongoose.Schema.Types.Mixed }],
      news: [{ type: mongoose.Schema.Types.Mixed }]
    }
  },
  { timestamps: true }
);

leagueBackupSchema.index({ createdAt: -1 });

export const LeagueBackup = mongoose.model("LeagueBackup", leagueBackupSchema);

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
      settings: { type: Number, default: 0 },
      collections: { type: Number, default: 0 },
      news: { type: Number, default: 0 },
      mundoArticles: { type: Number, default: 0 },
      mundoEvents: { type: Number, default: 0 },
      mundoPlayerStatuses: { type: Number, default: 0 },
      mundoPredictions: { type: Number, default: 0 }
    },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

leagueBackupSchema.index({ createdAt: -1 });

export const LeagueBackup = mongoose.model("LeagueBackup", leagueBackupSchema);

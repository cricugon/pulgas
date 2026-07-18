import mongoose from "mongoose";

const playerScoreSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    points: { type: Number, required: true, default: 0 },
    played: { type: Boolean, default: false },
    commonGoals: { type: Number, default: 0, min: 0 },
    specialGoals: { type: Number, default: 0, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
    penaltySaves: { type: Number, default: 0, min: 0 },
    picas: { type: Number, default: 0, min: 0, max: 3 },
    card: {
      type: String,
      enum: ["none", "direct_red", "second_yellow"],
      default: "none"
    },
    note: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    homeClub: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    awayClub: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    kickoff: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled"
    },
    homeScore: { type: Number, default: null },
    awayScore: { type: Number, default: null },
    mvp: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    playerScores: [playerScoreSchema]
  },
  { timestamps: true }
);

const gameweekSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "live", "finished"],
      default: "draft"
    },
    lineupBudgetCap: { type: Number, default: 100000000, min: 0 },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
    matches: [matchSchema]
  },
  { timestamps: true }
);

export const Gameweek = mongoose.model("Gameweek", gameweekSchema);

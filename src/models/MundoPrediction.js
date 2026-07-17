import mongoose from "mongoose";

const predictionPickSchema = new mongoose.Schema(
  {
    slotKey: { type: String, required: true, trim: true },
    position: { type: String, required: true, enum: ["POR", "DEF", "MED", "DEL"] },
    starter: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    probability: { type: Number, required: true, min: 0, max: 100, default: 80 },
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null }
  },
  { _id: false }
);

const predictionTeamSchema = new mongoose.Schema(
  {
    side: { type: String, enum: ["home", "away"], required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    formation: { type: String, required: true, default: "2-2-2" },
    picks: { type: [predictionPickSchema], default: [] }
  },
  { _id: false }
);

const mundoPredictionSchema = new mongoose.Schema(
  {
    gameweek: { type: mongoose.Schema.Types.ObjectId, ref: "Gameweek", required: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, required: true },
    teams: { type: [predictionTeamSchema], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MundoAdmin", default: null }
  },
  { timestamps: true }
);

mundoPredictionSchema.index({ gameweek: 1, matchId: 1 }, { unique: true });
mundoPredictionSchema.index({ status: 1, publishedAt: -1 });

export const MundoPrediction = mongoose.model("MundoPrediction", mundoPredictionSchema);

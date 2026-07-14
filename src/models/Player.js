import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    position: {
      type: String,
      required: true,
      enum: ["POR", "DEF", "MED", "DEL"]
    },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    marketValue: { type: Number, required: true, min: 0 },
    totalPoints: { type: Number, default: 0 },
    form: { type: Number, default: 50, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["available", "injured", "suspended"],
      default: "available"
    },
    shirtNumber: { type: Number, default: 0, min: 0, max: 99 },
    bio: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

playerSchema.index({ name: 1, club: 1 }, { unique: true });

export const Player = mongoose.model("Player", playerSchema);

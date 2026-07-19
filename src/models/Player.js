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
    previousMarketValue: { type: Number, default: 0, min: 0 },
    marketValueChange: { type: Number, default: 0 },
    marketValueUpdatedAt: { type: Date, default: null },
    totalPoints: { type: Number, default: 0 },
    form: { type: Number, default: 50, min: 0, max: 100 },
    photoData: { type: Buffer, select: false },
    photoContentType: { type: String, trim: true, default: "" },
    photoFilename: { type: String, trim: true, default: "" },
    photoUpdatedAt: { type: Date, default: null },
    photoWidth: { type: Number, min: 1, default: null },
    photoHeight: { type: Number, min: 1, default: null },
    photoSizeBytes: { type: Number, min: 0, default: null },
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
playerSchema.set("toJSON", {
  transform: (_document, result) => {
    delete result.photoData;
    return result;
  }
});

export const Player = mongoose.model("Player", playerSchema);

import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "league" },
    initialBudget: {
      type: Number,
      required: true,
      min: 0,
      default: Number(process.env.DEFAULT_BUDGET || 120000000)
    },
    promoEnabled: { type: Boolean, default: false },
    promoDurationSeconds: { type: Number, min: 3, max: 300, default: 15 },
    promoImageData: { type: Buffer, select: false },
    promoImageContentType: { type: String, trim: true, default: "" },
    promoImageFilename: { type: String, trim: true, default: "" },
    promoImageUpdatedAt: { type: Date, default: null },
    promoUpdatedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

export async function getLeagueSettings() {
  return Settings.findOneAndUpdate(
    { key: "league" },
    {
      $setOnInsert: {
        key: "league",
        initialBudget: Number(process.env.DEFAULT_BUDGET || 120000000),
        promoEnabled: false,
        promoDurationSeconds: 15
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

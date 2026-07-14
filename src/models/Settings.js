import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "league" },
    initialBudget: {
      type: Number,
      required: true,
      min: 0,
      default: Number(process.env.DEFAULT_BUDGET || 120000000)
    }
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
        initialBudget: Number(process.env.DEFAULT_BUDGET || 120000000)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

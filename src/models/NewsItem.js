import mongoose from "mongoose";

const newsItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["gameweek_started", "gameweek_finished", "match_scored", "player_created", "team_registered", "system"],
      default: "system"
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: "" },
    pinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

newsItemSchema.index({ pinned: -1, pinnedAt: -1, createdAt: -1 });
newsItemSchema.index({ createdAt: -1 });
newsItemSchema.index({ type: 1, createdAt: -1 });

export const NewsItem = mongoose.model("NewsItem", newsItemSchema);

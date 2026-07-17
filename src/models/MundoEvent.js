import mongoose from "mongoose";

const mundoEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["article", "player_status", "prediction"],
      required: true
    },
    emoji: { type: String, trim: true, maxlength: 12, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 320 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

mundoEventSchema.index({ createdAt: -1 });

export const MundoEvent = mongoose.model("MundoEvent", mundoEventSchema);

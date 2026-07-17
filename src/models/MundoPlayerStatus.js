import mongoose from "mongoose";

const mundoPlayerStatusSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
    status: { type: String, enum: ["available", "doubt", "out"], default: "available" },
    note: { type: String, trim: true, maxlength: 240, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MundoAdmin", default: null }
  },
  { timestamps: true }
);

export const MundoPlayerStatus = mongoose.model("MundoPlayerStatus", mundoPlayerStatusSchema);

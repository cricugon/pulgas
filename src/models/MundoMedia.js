import mongoose from "mongoose";

const mundoMediaSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, required: true },
    filename: { type: String, trim: true, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MundoAdmin", default: null }
  },
  { timestamps: true }
);

export const MundoMedia = mongoose.model("MundoMedia", mundoMediaSchema);

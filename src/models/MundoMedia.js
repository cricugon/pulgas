import mongoose from "mongoose";

const mundoMediaSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, required: true },
    filename: { type: String, trim: true, default: "" },
    width: { type: Number, min: 1, default: null },
    height: { type: Number, min: 1, default: null },
    sizeBytes: { type: Number, min: 0, default: null },
    sourceSizeBytes: { type: Number, min: 0, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MundoAdmin", default: null }
  },
  { timestamps: true }
);

export const MundoMedia = mongoose.model("MundoMedia", mundoMediaSchema);

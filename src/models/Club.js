import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    shortName: { type: String, required: true, trim: true, uppercase: true, maxlength: 5 },
    city: { type: String, trim: true, default: "" },
    primaryColor: { type: String, trim: true, default: "#1d4ed8" },
    secondaryColor: { type: String, trim: true, default: "#ffffff" }
  },
  { timestamps: true }
);

export const Club = mongoose.model("Club", clubSchema);

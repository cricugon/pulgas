import mongoose from "mongoose";

const mundoAdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true, default: "Redaccion Mundo Las Pulgas" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const MundoAdmin = mongoose.model("MundoAdmin", mundoAdminSchema);

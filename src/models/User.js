import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    teamName: {
      type: String,
      trim: true,
      required() {
        return this.role === "user";
      }
    },
    budget: { type: Number, default: 0, min: 0 },
    squad: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    totalPoints: { type: Number, default: 0 }
  },
  { timestamps: true }
);

userSchema.pre("validate", function normalizeAdmin(next) {
  if (this.role === "admin") {
    this.teamName = undefined;
    this.budget = 0;
    this.squad = [];
    this.totalPoints = 0;
  }

  next();
});

export const User = mongoose.model("User", userSchema);

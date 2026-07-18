import mongoose from "mongoose";

const mundoArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    excerpt: { type: String, trim: true, maxlength: 320, default: "" },
    body: { type: String, required: true, trim: true, maxlength: 30000 },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "MundoMedia", default: null },
    relatedPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "MundoAdmin", default: null },
    views: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

mundoArticleSchema.index({ status: 1, publishedAt: -1 });

export const MundoArticle = mongoose.model("MundoArticle", mundoArticleSchema);

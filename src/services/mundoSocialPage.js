import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MundoArticle } from "../models/MundoArticle.js";
import { markdownToPlainText } from "./markdown.js";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const mundoIndexPath = path.join(serviceDirectory, "..", "..", "public", "mundolaspulgas", "index.html");
let mundoIndexTemplatePromise;

function escapeHtmlAttribute(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function firstForwardedValue(value = "") {
  return String(value).split(",")[0].trim();
}

function requestOrigin(req) {
  const configuredOrigin = String(process.env.PUBLIC_BASE_URL || "").trim();
  const forwardedProtocol = firstForwardedValue(req.get("x-forwarded-proto"));
  const protocol = ["http", "https"].includes(forwardedProtocol) ? forwardedProtocol : req.protocol;
  const host = firstForwardedValue(req.get("x-forwarded-host")) || req.get("host");

  try {
    return new URL(configuredOrigin || `${protocol}://${host}`).origin;
  } catch {
    return `http://localhost:${process.env.PORT || 3000}`;
  }
}

function mundoIndexTemplate() {
  if (!mundoIndexTemplatePromise) mundoIndexTemplatePromise = readFile(mundoIndexPath, "utf8");
  return mundoIndexTemplatePromise;
}

function articleDescription(article) {
  const text = markdownToPlainText(article.body || article.excerpt || "");
  return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
}

export async function renderMundoArticleSocialPage(req) {
  const article = await MundoArticle.findOne({ slug: req.params.slug, status: "published" })
    .populate("image", "contentType width height")
    .lean();
  if (!article) return null;

  const origin = requestOrigin(req);
  const canonicalUrl = new URL(`/mundolaspulgas/noticias/${encodeURIComponent(article.slug)}`, origin).href;
  const requestedUrl = new URL(req.originalUrl, origin).href;
  const imageVersion = article.updatedAt ? new Date(article.updatedAt).getTime() : "1";
  const imageUrl = article.image
    ? new URL(`/api/mundo/articles/${article._id}/image?v=${imageVersion}`, origin).href
    : new URL("/assets/las-pulgas-fantasy-logo.png", origin).href;
  const title = `${article.title} | Mundo Las Pulgas`;
  const description = articleDescription(article);
  const publishedAt = article.publishedAt ? new Date(article.publishedAt).toISOString() : "";
  const tags = `
    <link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}" />
    <meta property="og:locale" content="es_ES" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Mundo Las Pulgas" />
    <meta property="og:title" content="${escapeHtmlAttribute(article.title)}" />
    <meta property="og:description" content="${escapeHtmlAttribute(description)}" />
    <meta property="og:url" content="${escapeHtmlAttribute(requestedUrl)}" />
    <meta property="og:image" content="${escapeHtmlAttribute(imageUrl)}" />
    ${imageUrl.startsWith("https://") ? `<meta property="og:image:secure_url" content="${escapeHtmlAttribute(imageUrl)}" />` : ""}
    <meta property="og:image:type" content="${escapeHtmlAttribute(article.image?.contentType || "image/png")}" />
    ${article.image?.width ? `<meta property="og:image:width" content="${Number(article.image.width)}" />` : ""}
    ${article.image?.height ? `<meta property="og:image:height" content="${Number(article.image.height)}" />` : ""}
    <meta property="og:image:alt" content="Imagen principal de ${escapeHtmlAttribute(article.title)}" />
    ${publishedAt ? `<meta property="article:published_time" content="${escapeHtmlAttribute(publishedAt)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtmlAttribute(article.title)}" />
    <meta name="twitter:description" content="${escapeHtmlAttribute(description)}" />
    <meta name="twitter:image" content="${escapeHtmlAttribute(imageUrl)}" />`;
  const template = await mundoIndexTemplate();

  return template
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttribute(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtmlAttribute(description)}" />`)
    .replace("</head>", `${tags}\n  </head>`);
}

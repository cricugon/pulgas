import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { lineupRouter } from "./routes/lineups.js";
import { marketRouter } from "./routes/market.js";
import { mundoRouter } from "./routes/mundo.js";
import { publicRouter } from "./routes/public.js";
import { renderMundoArticleSocialPage } from "./services/mundoSocialPage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use("/api/mundo/admin/articles", express.json({ limit: "8mb" }));
app.use("/api/admin/clubs", express.json({ limit: "4mb" }));
app.use("/api/admin/promo", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/mundolaspulgas/noticias/:slug", async (req, res, next) => {
  try {
    const page = await renderMundoArticleSocialPage(req);
    if (!page) return next();
    res.set("Cache-Control", "public, max-age=300");
    return res.type("html").send(page);
  } catch (error) {
    console.error("No se pudieron generar los metadatos sociales:", error.message);
    return next();
  }
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Las Pulgas Fantasy" });
});

app.use("/api/auth", authRouter);
app.use("/api", publicRouter);
app.use("/api/market", marketRouter);
app.use("/api/lineups", lineupRouter);
app.use("/api/admin", adminRouter);
app.use("/api/mundo", mundoRouter);

app.get("/mundolaspulgas/gestion-editorial-7", (_req, res) => {
  res.sendFile(path.join(__dirname, "views", "mundo-admin.html"));
});

app.get("/mundolaspulgas/*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "mundolaspulgas", "index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Las Pulgas Fantasy escuchando en http://localhost:${port}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
}

start();

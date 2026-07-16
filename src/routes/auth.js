import bcrypt from "bcryptjs";
import express from "express";
import { signToken, requireAuth, requireTeamUser } from "../middleware/auth.js";
import { getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";
import { publishNews } from "../services/news.js";

export const authRouter = express.Router();

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function publicUser(user) {
  const isAdmin = user.role === "admin";

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    teamName: isAdmin ? null : user.teamName,
    budget: isAdmin ? 0 : user.budget,
    squad: isAdmin ? [] : user.squad,
    totalPoints: isAdmin ? 0 : user.totalPoints
  };
}

authRouter.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const teamName = String(req.body.teamName || `Equipo ${email.split("@")[0]}`).trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Email no valido." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La password debe tener al menos 6 caracteres." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }

    const settings = await getLeagueSettings();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      teamName,
      budget: settings.initialBudget
    });
    await publishNews({
      type: "team_registered",
      title: `Nuevo equipo inscrito: ${teamName}`,
      body: "La liga suma un nuevo rival en la clasificacion.",
      metadata: { teamId: user._id, teamName }
    });
    const token = signToken(user);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "No se pudo registrar el usuario.", detail: error.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Credenciales no validas." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales no validas." });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Equipo suspendido por administracion." });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "No se pudo iniciar sesion.", detail: error.message });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-passwordHash")
    .populate({ path: "squad", populate: { path: "club" } });

  res.json({ user: publicUser(user) });
});

authRouter.patch("/profile", requireAuth, requireTeamUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    if (req.body.teamName !== undefined) {
      const teamName = String(req.body.teamName || "").trim();
      if (!teamName) {
        return res.status(400).json({ message: "El nombre del equipo no puede estar vacio." });
      }
      user.teamName = teamName;
    }

    const newPassword = String(req.body.newPassword || "");
    if (newPassword) {
      const currentPassword = String(req.body.currentPassword || "");
      const confirmPassword = String(req.body.confirmPassword || "");

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "La nueva password debe tener al menos 6 caracteres." });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "La confirmacion de password no coincide." });
      }

      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "La password actual no es correcta." });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    res.json({ message: "Perfil actualizado.", user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ message: "No se pudo actualizar el perfil.", detail: error.message });
  }
});

import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No autenticado." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Equipo suspendido por administracion." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesion no valida.", detail: error.message });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acceso solo para administradores." });
  }

  next();
}

export function requireTeamUser(req, res, next) {
  if (req.user?.role !== "user") {
    return res.status(403).json({ message: "Los administradores no tienen equipo de juego." });
  }

  next();
}

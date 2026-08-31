import crypto from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";

const scrypt = promisify(crypto.scrypt);

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const TOKEN_TTL = "30d";

export function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function generateOtp() {
  return String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");
}

export function passwordError(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Пароль должен быть не короче 8 символов";
  }
  if (password.length > 200) return "Пароль слишком длинный";
  return null;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof password !== "string") return false;
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== derived.length) return false;
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function allowedDomain() {
  return (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
}

export function emailAllowed(email) {
  const domain = allowedDomain();
  if (!domain) return true;
  return email.endsWith(`@${domain}`);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

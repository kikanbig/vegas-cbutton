import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, query } from "./db.js";
import {
  authMiddleware,
  allowedDomain,
  emailAllowed,
  generateOtp,
  hashCode,
  hashPassword,
  passwordError,
  signToken,
  verifyPassword,
} from "./auth.js";
import { adminRouter } from "./admin.js";
import { isValidSalon } from "./salons.js";
import { isEmailConfigured, sendOtpEmail } from "./mail.js";
import { isAdminEmail } from "./admins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const FUNNEL_FROM = "2026-06-30T21:00:00.000Z";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", (_req, res) => {
  const domain = allowedDomain();
  res.json({
    allowedEmailDomain: domain || null,
    emailConfigured: isEmailConfigured(),
  });
});

function isValidEmail(email) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254);
}

async function sessionPayload(user) {
  const roleRes = await query(
    `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin' LIMIT 1`,
    [user.id]
  );
  return {
    token: signToken(user),
    user: { id: user.id, email: user.email },
    profile: {
      id: user.id,
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      company: user.company,
      last_salon: user.last_salon || null,
    },
    isAdmin: roleRes.rowCount > 0,
  };
}

async function maybeMakeFirstAdmin(userId) {
  const admins = await query("SELECT 1 FROM user_roles WHERE role = 'admin' LIMIT 1");
  if (admins.rowCount === 0) {
    await query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')", [userId]);
  }
}

async function ensureAdmin(userId, email) {
  if (isAdminEmail(email)) {
    await query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId]
    );
    return;
  }
  await maybeMakeFirstAdmin(userId);
}

async function issueConfirmationCode(email, fullName) {
  await query(`UPDATE otp_codes SET used = true WHERE email = $1 AND used = false`, [email]);
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query(
    `INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [email, hashCode(code), expiresAt.toISOString()]
  );
  const emailConfigured = isEmailConfigured();
  if (emailConfigured) {
    await sendOtpEmail(email, code, fullName);
    return { emailConfigured };
  }
  console.log(`OTP for ${email}: ${code}`);
  return { emailConfigured, devCode: code };
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const fullName = req.body?.fullName ? String(req.body.fullName).trim() : "";
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;

    if (!isValidEmail(email)) return res.status(400).json({ error: "Укажите корректный email" });
    if (!emailAllowed(email)) {
      return res.status(403).json({ error: `Доступ только для домена @${allowedDomain()}` });
    }
    if (!fullName) return res.status(400).json({ error: "Укажите имя" });
    const pwdError = passwordError(password);
    if (pwdError) return res.status(400).json({ error: pwdError });

    const existing = await query(
      `SELECT id, password_hash, email_verified FROM users WHERE email = $1`,
      [email]
    );
    const passwordHash = await hashPassword(password);

    let userId;
    if (existing.rowCount > 0) {
      const user = existing.rows[0];
      if (user.email_verified && user.password_hash) {
        return res.status(400).json({ error: "Этот email уже зарегистрирован. Войдите." });
      }
      await query(
        `UPDATE users
         SET password_hash = $2, full_name = $3, phone = COALESCE($4, phone), updated_at = now()
         WHERE id = $1`,
        [user.id, passwordHash, fullName, phone]
      );
      userId = user.id;
    } else {
      const created = await query(
        `INSERT INTO users (email, full_name, phone, password_hash, email_verified)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [email, fullName, phone, passwordHash]
      );
      userId = created.rows[0].id;
    }
    await ensureAdmin(userId, email);

    try {
      const sent = await issueConfirmationCode(email, fullName);
      res.json({ success: true, ...sent });
    } catch (err) {
      console.error("Email send failed:", err);
      return res.status(500).json({ error: "Не удалось отправить письмо. Попробуйте позже." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось зарегистрироваться" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    const userRes = await query(
      `SELECT id, email, full_name, phone, company, last_salon, password_hash, email_verified
       FROM users WHERE email = $1`,
      [email]
    );
    if (userRes.rowCount === 0) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }
    const user = userRes.rows[0];
    if (!user.password_hash) {
      return res.status(400).json({
        error: "Для этого аккаунта ещё нет пароля. Откройте регистрацию с тем же email и задайте пароль.",
      });
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }
    if (!user.email_verified) {
      try {
        await issueConfirmationCode(email, user.full_name);
      } catch (err) {
        console.error("Email send failed:", err);
      }
      return res.status(403).json({
        error: "Подтвердите почту — мы отправили код ещё раз",
        needsVerification: true,
      });
    }

    res.json(await sessionPayload(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось войти" });
  }
});

app.post("/api/auth/resend-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ error: "Укажите корректный email" });
    const userRes = await query(
      `SELECT full_name, email_verified FROM users WHERE email = $1`,
      [email]
    );
    if (userRes.rowCount === 0) return res.status(400).json({ error: "Аккаунт не найден" });
    if (userRes.rows[0].email_verified) {
      return res.status(400).json({ error: "Почта уже подтверждена. Войдите." });
    }
    const sent = await issueConfirmationCode(email, userRes.rows[0].full_name);
    res.json({ success: true, ...sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось отправить код" });
  }
});

app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || code.length !== 8) {
      return res.status(400).json({ error: "Неверный код" });
    }

    const found = await query(
      `SELECT id FROM otp_codes
       WHERE email = $1 AND code_hash = $2 AND used = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email, hashCode(code)]
    );
    if (found.rowCount === 0) {
      return res.status(400).json({ error: "Неверный или истёкший код" });
    }

    await query("UPDATE otp_codes SET used = true WHERE id = $1", [found.rows[0].id]);
    const userRes = await query(
      `UPDATE users SET email_verified = true, updated_at = now()
       WHERE email = $1
       RETURNING id, email, full_name, phone, company, last_salon`,
      [email]
    );
    if (userRes.rowCount === 0) {
      return res.status(400).json({ error: "Аккаунт не найден" });
    }
    res.json(await sessionPayload(userRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не удалось подтвердить почту" });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const userRes = await query(
    `SELECT id, email, full_name, phone, company, last_salon FROM users WHERE id = $1`,
    [req.user.sub]
  );
  if (userRes.rowCount === 0) return res.status(401).json({ error: "Unauthorized" });
  const user = userRes.rows[0];
  const roleRes = await query(
    `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin' LIMIT 1`,
    [user.id]
  );
  res.json({
    user: { id: user.id, email: user.email },
    profile: {
      id: user.id,
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      company: user.company,
      last_salon: user.last_salon,
    },
    isAdmin: roleRes.rowCount > 0,
  });
});

app.patch("/api/me", authMiddleware, async (req, res) => {
  const fullName = req.body?.full_name ?? null;
  const company = req.body?.company ?? null;
  const phone = req.body?.phone ?? null;
  const updated = await query(
    `UPDATE users
     SET full_name = COALESCE($2, full_name),
         company = COALESCE($3, company),
         phone = COALESCE($4, phone),
         updated_at = now()
     WHERE id = $1
     RETURNING id, email, full_name, phone, company`,
    [req.user.sub, fullName, company, phone]
  );
  const user = updated.rows[0];
  res.json({
    profile: {
      id: user.id,
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      company: user.company,
    },
  });
});

app.get("/api/presses", authMiddleware, async (req, res) => {
  const from = req.query.from ? String(req.query.from) : null;
  const rows = await query(
    `SELECT id, people_count, pressed_at, sector
     FROM button_presses
     WHERE user_id = $1 AND ($2::timestamptz IS NULL OR pressed_at >= $2)
     ORDER BY pressed_at DESC`,
    [req.user.sub, from]
  );
  res.json(rows.rows);
});

app.post("/api/presses", authMiddleware, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  let synced = 0;
  for (const item of items) {
    if (!item?.id || item.sector == null || item.people_count == null) continue;
    await query(
      `INSERT INTO button_presses (id, user_id, sector, people_count, pressed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [item.id, req.user.sub, item.sector, item.people_count, item.pressed_at || new Date().toISOString()]
    );
    synced += 1;
  }
  res.json({ synced });
});

app.post("/api/consultations", authMiddleware, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  let synced = 0;
  const failed = [];
  for (const item of items) {
    try {
      if (!item?.id || !item.button_press_id) {
        failed.push(item?.id);
        continue;
      }
      await query(
        `INSERT INTO client_consultations
          (id, button_press_id, user_id, consultation_type, outcome, refusal_reason, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.button_press_id,
          req.user.sub,
          item.consultation_type,
          item.outcome === "project_offered" ? "sale" : item.outcome,
          item.refusal_reason || null,
          item.recorded_at || new Date().toISOString(),
        ]
      );
      synced += 1;
    } catch (err) {
      console.error("consultation sync failed", err.message);
      failed.push(item.id);
    }
  }
  res.json({ synced, failed: failed.length });
});

async function shiftPayload(userId) {
  const user = await query(`SELECT last_salon FROM users WHERE id = $1`, [userId]);
  const lastSalon = user.rows[0]?.last_salon || null;
  const shift = await query(
    `SELECT id, salon FROM seller_shifts
     WHERE user_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  if (shift.rowCount === 0) {
    return {
      isShiftActive: false,
      activeShiftId: null,
      isOnBreak: false,
      activeBreakId: null,
      salon: null,
      lastSalon,
    };
  }
  const brk = await query(
    `SELECT id FROM seller_breaks
     WHERE shift_id = $1 AND ended_at IS NULL
     LIMIT 1`,
    [shift.rows[0].id]
  );
  return {
    isShiftActive: true,
    activeShiftId: shift.rows[0].id,
    isOnBreak: brk.rowCount > 0,
    activeBreakId: brk.rows[0]?.id || null,
    salon: shift.rows[0].salon || null,
    lastSalon,
  };
}

app.get("/api/shift", authMiddleware, async (req, res) => {
  res.json(await shiftPayload(req.user.sub));
});

app.post("/api/shift/toggle", authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const open = await query(
    `SELECT id FROM seller_shifts WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  if (open.rowCount > 0) {
    await query(
      `UPDATE seller_breaks SET ended_at = now() WHERE user_id = $1 AND ended_at IS NULL`,
      [userId]
    );
    await query(`UPDATE seller_shifts SET ended_at = now() WHERE id = $1`, [open.rows[0].id]);
    return res.json(await shiftPayload(userId));
  }

  const user = await query(`SELECT last_salon FROM users WHERE id = $1`, [userId]);
  const salon = isValidSalon(req.body?.salon) ? req.body.salon : user.rows[0]?.last_salon;
  if (!isValidSalon(salon)) {
    return res.status(400).json({ error: "Выберите салон, где вы сегодня работаете" });
  }

  await query(`UPDATE users SET last_salon = $2, updated_at = now() WHERE id = $1`, [userId, salon]);
  await query(
    `INSERT INTO seller_shifts (user_id, salon, started_at) VALUES ($1, $2, now())`,
    [userId, salon]
  );
  res.json(await shiftPayload(userId));
});

app.post("/api/shift/salon", authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const salon = req.body?.salon;
  if (!isValidSalon(salon)) {
    return res.status(400).json({ error: "Выберите салон из списка" });
  }
  await query(`UPDATE users SET last_salon = $2, updated_at = now() WHERE id = $1`, [userId, salon]);
  await query(
    `UPDATE seller_shifts SET salon = $2 WHERE user_id = $1 AND ended_at IS NULL`,
    [userId, salon]
  );
  res.json(await shiftPayload(userId));
});

app.post("/api/shift/break", authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const shift = await query(
    `SELECT id FROM seller_shifts WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [userId]
  );
  if (shift.rowCount === 0) {
    return res.status(400).json({ error: "Сначала откройте смену" });
  }
  const openBreak = await query(
    `SELECT id FROM seller_breaks WHERE user_id = $1 AND ended_at IS NULL LIMIT 1`,
    [userId]
  );
  if (openBreak.rowCount > 0) {
    await query(`UPDATE seller_breaks SET ended_at = now() WHERE id = $1`, [openBreak.rows[0].id]);
    return res.json(await shiftPayload(userId));
  }
  await query(
    `INSERT INTO seller_breaks (shift_id, user_id, started_at) VALUES ($1, $2, now())`,
    [shift.rows[0].id, userId]
  );
  res.json(await shiftPayload(userId));
});

app.use("/api/admin", authMiddleware, adminRouter({ query, FUNNEL_FROM }));

const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(dist, "index.html"));
});

migrate()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Vegas button listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start", err);
    process.exit(1);
  });

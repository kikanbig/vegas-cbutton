import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiter (per edge instance).
// Limits: 3 requests per email per hour, 10 requests per IP per hour.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_LIMIT = 3;
const IP_LIMIT = 10;
const rateMap = new Map<string, number[]>();

function checkRate(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (rateMap.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= limit) {
    rateMap.set(key, arr);
    return false;
  }
  arr.push(now);
  rateMap.set(key, arr);
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, redirectTo } = await req.json();

    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Basic format & length guard
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Invalid email");
    }
    const allowedDomain = Deno.env.get("ALLOWED_EMAIL_DOMAIN") || "vegas.by";
    if (!normalizedEmail.endsWith(`@${allowedDomain}`)) {
      // Generic response to avoid email enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!checkRate(`email:${normalizedEmail}`, EMAIL_LIMIT) || !checkRate(`ip:${ip}`, IP_LIMIT)) {
      return new Response(
        JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Generate magic link using Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: redirectTo || undefined,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });

    if (error) {
      // Generic response to avoid email enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }


    const magicLink = data?.properties?.action_link;
    const emailOtp = data?.properties?.email_otp;
    const hashedToken =
      (data as any)?.properties?.hashed_token ||
      (data as any)?.properties?.hashedToken ||
      (data as any)?.hashed_token ||
      (data as any)?.hashedToken;

    if (!magicLink || !hashedToken || !emailOtp) {
      throw new Error("Failed to generate magic link");
    }

    // Build fallback browser link
    const appBase = (redirectTo || "").replace(/\/$/, "");
    const safeNext = "/app";
    const loginLink = `${appBase}/auth/callback?type=magiclink&token_hash=${encodeURIComponent(
      hashedToken
    )}&next=${encodeURIComponent(safeNext)}`;

    // Send email via Resend with the standard Supabase OTP code
    const emailResponse = await resend.emails.send({
      from: "Vegas <noreply@vegas.by>",
      to: [normalizedEmail],
      subject: "Войдите в Vegas · Кнопка контакта",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #060810;">
          <h1 style="font-size: 24px; margin-bottom: 24px;">Вход в Vegas</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            ${fullName ? `Здравствуйте, ${fullName}!` : 'Здравствуйте!'}<br><br>
            Введите этот код в приложении:
          </p>
          <div style="background: #0b0f1e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #5bba47;">${emailOtp}</span>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center; margin-bottom: 24px;">
            Код действителен 1 час.
          </p>
          <p style="font-size: 14px; color: #888; margin-top: 32px;">
            Если вы не запрашивали вход, просто проигнорируйте это письмо.<br>
            Код действителен 1 час.
          </p>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (_error: any) {
    // Generic response — never echo internal errors
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the custom OTP
    const { data: otpRow, error: lookupError } = await admin
      .from("custom_otps")
      .select("*")
      .eq("email", email)
      .eq("custom_code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError || !otpRow) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as used
    await admin
      .from("custom_otps")
      .update({ used: true })
      .eq("id", otpRow.id);

    // Verify the original OTP with Supabase Auth
    const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
      email,
      token: otpRow.original_otp,
      type: "email",
    });

    if (verifyError) {
      console.error("Supabase verifyOtp error:", verifyError);
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return session to the client
    return new Response(
      JSON.stringify({
        session: verifyData.session,
        user: verifyData.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-custom-otp:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ALLOWED_EMAIL_DOMAIN, BRAND_NAME } from "@/lib/brand";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthMode = "login" | "register";

const AuthPage = () => {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/app");
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
        toast.error(`⛔ Доступ только для домена @${ALLOWED_EMAIL_DOMAIN}`, {
          style: {
            background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(340 80% 50%))",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: "15px",
            boxShadow: "0 8px 30px rgba(239, 68, 68, 0.4)",
          },
          duration: 5000,
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-magic-link", {
        body: {
          email,
          fullName: mode === "register" ? fullName : undefined,
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      toast.success("Код отправлен на вашу почту!");
    } catch (err: any) {
      // Error suppressed; user message shown via toast
      toast.error(err.message || "Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;

      toast.success("Вы вошли!");
      navigate("/app", { replace: true });
    } catch (e: any) {
      // OTP error suppressed; user message shown via toast
      toast.error("Неверный или истёкший код. Попробуйте снова.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (otp.length === 8) {
      handleVerifyOtp();
    }
  }, [otp]);

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-glass p-8 md:p-12 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Введите код из письма</h1>
          <p className="text-muted-foreground">
            Мы отправили 8-значный код на <span className="font-semibold text-foreground">{email}</span>
          </p>

          <div className="flex justify-center">
            <InputOTP maxLength={8} value={otp} onChange={setOtp} disabled={verifying}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверяем...
            </div>
          )}

          <Button
            variant="ghost"
            className="text-accent hover:text-accent/80"
            onClick={() => { setSent(false); setEmail(""); setOtp(""); }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Другой email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card-glass p-8 md:p-12 max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <p
            className="text-primary font-extrabold text-lg tracking-wide cursor-pointer"
            onClick={() => navigate("/")}
          >
            {BRAND_NAME}
          </p>
          <h1 className="text-2xl font-bold text-primary">
            {mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login"
              ? "Введите email — мы отправим код для входа"
              : "Заполните данные для регистрации"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Имя и фамилия</Label>
                <Input
                  id="fullName"
                  placeholder="Иван Иванов"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Доступно только для домена @{ALLOWED_EMAIL_DOMAIN}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {mode === "login" ? "Получить код для входа" : "Зарегистрироваться"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Нет аккаунта? Зарегистрируйтесь"
              : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

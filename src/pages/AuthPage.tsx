import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthMode = "login" | "register";

const AuthPage = () => {
  const { user, isLoading, applySession } = useAuth();
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
  const [devCode, setDevCode] = useState<string | null>(null);
  const [allowedDomain, setAllowedDomain] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) navigate("/app");
  }, [user, isLoading, navigate]);

  useEffect(() => {
    api<{ allowedEmailDomain: string | null }>("/config")
      .then((cfg) => setAllowedDomain(cfg.allowedEmailDomain))
      .catch(() => setAllowedDomain(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
        toast.error(`Доступ только для домена @${allowedDomain}`);
        return;
      }
      const data = await api<{ success: boolean; emailConfigured: boolean; devCode?: string }>(
        "/auth/request-code",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            fullName: mode === "register" ? fullName : undefined,
            phone: mode === "register" ? phone : undefined,
            mode,
          }),
        }
      );
      setDevCode(data.devCode || null);
      setSent(true);
      toast.success(data.devCode ? "Код готов — почта ещё не подключена" : "Код отправлен на почту");
    } catch (err: any) {
      toast.error(err.message || "Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) return;
    setVerifying(true);
    try {
      const data = await api<{
        token: string;
        user: { id: string; email: string };
        profile: any;
        isAdmin: boolean;
      }>("/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email, code: otp }),
      });
      applySession(data);
      toast.success("Вы вошли!");
      navigate("/app", { replace: true });
    } catch {
      toast.error("Неверный или истёкший код. Попробуйте снова.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (otp.length === 8) handleVerifyOtp();
  }, [otp]);

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-glass p-8 md:p-12 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Введите код</h1>
          <p className="text-muted-foreground">
            {devCode
              ? "Почта ещё не подключена — используйте код ниже."
              : <>Мы отправили 8-значный код на <span className="font-semibold text-foreground">{email}</span></>}
          </p>
          {devCode && (
            <p className="text-3xl font-black tracking-[0.3em] text-primary">{devCode}</p>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={8} value={otp} onChange={setOtp} disabled={verifying}>
              <InputOTPGroup>
                {Array.from({ length: 8 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
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
            onClick={() => { setSent(false); setEmail(""); setOtp(""); setDevCode(null); }}
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
          <BrandLogo className="justify-center w-full" imgClassName="h-10" onClick={() => navigate("/")} />
          <h1 className="text-2xl font-bold">
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
                <Input id="fullName" placeholder="Иван Иванов" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input id="phone" type="tel" placeholder="+375 (29) 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={allowedDomain ? `you@${allowedDomain}` : "you@vegas.by"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {allowedDomain && (
              <p className="text-xs text-muted-foreground">Доступно только для домена @{allowedDomain}</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            {mode === "login" ? "Получить код для входа" : "Зарегистрироваться"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

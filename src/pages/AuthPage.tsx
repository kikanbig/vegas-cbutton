import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthMode = "login" | "register";

type SessionPayload = {
  token: string;
  user: { id: string; email: string };
  profile: {
    id: string;
    user_id: string;
    full_name: string | null;
    phone: string | null;
    company: string | null;
    last_salon?: string | null;
  };
  isAdmin: boolean;
};

const AuthPage = () => {
  const { user, isLoading, applySession } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
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

  const finishLogin = (data: SessionPayload, message: string) => {
    applySession(data);
    toast.success(message);
    navigate("/app", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      toast.error(`Доступ только для домена @${allowedDomain}`);
      return;
    }
    if (mode === "register") {
      if (password !== passwordConfirm) {
        toast.error("Пароли не совпадают");
        return;
      }
      if (password.length < 8) {
        toast.error("Пароль должен быть не короче 8 символов");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        try {
          const data = await api<SessionPayload>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          finishLogin(data, "Вы вошли!");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "";
          if (message.toLowerCase().includes("подтвердите почту")) {
            setAwaitingCode(true);
            toast.message("Подтвердите почту — код отправлен ещё раз");
            return;
          }
          throw err;
        }
        return;
      }

      const data = await api<{ success: boolean; emailConfigured: boolean; devCode?: string }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password, fullName, phone }),
        }
      );
      setDevCode(data.devCode || null);
      setAwaitingCode(true);
      toast.success(data.devCode ? "Код готов — почта ещё не подключена" : "Код отправлен на почту");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 8) return;
    setVerifying(true);
    try {
      const data = await api<SessionPayload>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code: otp }),
      });
      finishLogin(data, "Почта подтверждена. Вы вошли!");
    } catch {
      toast.error("Неверный или истёкший код. Попробуйте снова.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      const data = await api<{ emailConfigured: boolean; devCode?: string }>("/auth/resend-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDevCode(data.devCode || null);
      toast.success(data.devCode ? "Новый код готов" : "Код отправлен ещё раз");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить код");
    }
  };

  useEffect(() => {
    if (otp.length === 8) handleVerifyOtp();
  }, [otp]);

  if (awaitingCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card-glass p-8 md:p-12 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Подтвердите почту</h1>
          <p className="text-muted-foreground">
            {devCode
              ? "Почта ещё не подключена — используйте код ниже."
              : <>Мы отправили 8-значный код на <span className="font-semibold text-foreground">{email}</span>. Это нужно один раз.</>}
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

          <button type="button" className="text-sm text-accent hover:text-accent/80" onClick={handleResend}>
            Отправить код ещё раз
          </button>

          <Button
            variant="ghost"
            className="text-accent hover:text-accent/80"
            onClick={() => { setAwaitingCode(false); setOtp(""); setDevCode(null); }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
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
              ? "Введите email и пароль"
              : "После регистрации придёт код — почту подтверждаем один раз"}
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
              autoComplete="email"
            />
            {allowedDomain && (
              <p className="text-xs text-muted-foreground">Доступно только для домена @{allowedDomain}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === "register" && (
              <p className="text-xs text-muted-foreground">Не меньше 8 символов</p>
            )}
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Повторите пароль</Label>
              <Input
                id="passwordConfirm"
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          )}

          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : mode === "login" ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setPassword("");
              setPasswordConfirm("");
            }}
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

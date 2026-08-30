import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const tokenHash = query.get("token_hash") || "";
  const type = (query.get("type") || "magiclink") as "magiclink";
  const next = query.get("next") || "/app";
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!tokenHash) {
      toast.error("Некорректная ссылка входа. Запросите новую.");
      navigate("/auth", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) throw error;

      navigate(next, { replace: true });
    } catch (e: any) {
      // verifyOtp error suppressed
      toast.error(e?.message || "Ссылка недействительна или истекла. Запросите новую.");
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card-glass p-8 md:p-12 max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Подтвердите вход</h1>
        <p className="text-muted-foreground">
          Нажмите кнопку ниже, чтобы завершить авторизацию и перейти в приложение.
        </p>

        <Button
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold"
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Войти
        </Button>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

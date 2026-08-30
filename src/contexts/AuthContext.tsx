import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, getToken, setToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  last_salon?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  applySession: (payload: { token: string; user: AuthUser; profile: Profile; isAdmin: boolean }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshProfile = async () => {
    const data = await api<{ user: AuthUser; profile: Profile; isAdmin: boolean }>("/me");
    setUser(data.user);
    setProfile(data.profile);
    setIsAdmin(data.isAdmin);
  };

  const applySession = (payload: { token: string; user: AuthUser; profile: Profile; isAdmin: boolean }) => {
    setToken(payload.token);
    setUser(payload.user);
    setProfile(payload.profile);
    setIsAdmin(payload.isAdmin);
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!getToken()) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshProfile();
        if (!cancelled && (location.pathname === "/" || location.pathname === "/auth")) {
          navigate("/app", { replace: true });
        }
      } catch {
        setToken(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isLoading, signOut, refreshProfile, applySession }}>
      {children}
    </AuthContext.Provider>
  );
};

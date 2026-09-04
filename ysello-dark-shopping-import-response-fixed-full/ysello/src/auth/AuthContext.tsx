import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, resetCsrfToken, type User } from "../api/client";

type SignInPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (payload: SignInPayload) => Promise<User>;
  register: (payload: FormData) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: User }>("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const signIn = useCallback(async (payload: SignInPayload) => {
    const data = await apiRequest<{
      user: User;
      message: string;
      csrfToken: string;
    }>(
      "/api/auth/login",
      {
        method: "POST",
        body: payload,
      },
      false,
    );
    setUser(data.user);

    return data.user;
  }, []);

  const register = useCallback(async (payload: FormData) => {
    const data = await apiRequest<{
      user: User;
      message: string;
      csrfToken: string;
    }>(
      "/api/auth/register",
      {
        method: "POST",
        body: payload,
      },
      false,
    );
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" }, false);
    } finally {
      resetCsrfToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      register,
      refreshUser,
      logout,
      setUser,
    }),
    [loading, logout, refreshUser, register, signIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

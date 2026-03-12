import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";

const AuthContext = createContext(null);
const notifyAuthChanged = () => window.dispatchEvent(new Event("bookvillage-auth-changed"));

const isUnauthorizedError = (err) => {
  if (!err) return false;
  if (typeof err?.status === "number" && err.status === 401) return true;
  return err instanceof Error && /unauthorized/i.test(err.message);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem("bookvillage_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const token = sessionStorage.getItem("bookvillage_session_token");
    if (!token) return;
    api.users.me()
      .then((me) => {
        sessionStorage.setItem("bookvillage_user", JSON.stringify(me));
        setUser(me);
        notifyAuthChanged();
      })
      .catch(() => {
        sessionStorage.removeItem("bookvillage_session_token");
        sessionStorage.removeItem("bookvillage_user");
        setUser(null);
        notifyAuthChanged();
      });
  }, []);

  const login = async (username, password) => {
    let me;
    try {
      me = await api.auth.login({ username, password });
    } catch (err) {
      if (isUnauthorizedError(err)) {
        throw new Error("\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
      }
      throw err;
    }

    // 세션 토큰 저장 (쿠키는 서버에서 Set-Cookie로 자동 설정됨)
    if (me.sessionToken) {
      sessionStorage.setItem("bookvillage_session_token", me.sessionToken);
    }
    sessionStorage.setItem("bookvillage_user", JSON.stringify(me));
    setUser(me);
    notifyAuthChanged();
    return me;
  };

  const register = async (payload) => {
    await api.auth.register(payload);
    await login(payload.username, payload.password);
  };

  const deleteAccount = async (password) => {
    if (!user?.id) {
      throw new Error("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
    }
    await api.users.deleteMe(user.id, password);
    sessionStorage.removeItem("bookvillage_session_token");
    sessionStorage.removeItem("bookvillage_user");
    setUser(null);
    notifyAuthChanged();
  };

  const logout = () => {
    api.auth.logout().catch(() => undefined);
    sessionStorage.removeItem("bookvillage_session_token");
    sessionStorage.removeItem("bookvillage_user");
    setUser(null);
    notifyAuthChanged();
  };

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      deleteAccount,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

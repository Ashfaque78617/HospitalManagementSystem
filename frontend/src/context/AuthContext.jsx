import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { http, TOKEN_KEY, USER_KEY } from "../api/client";

const AuthContext = createContext(null);

export const ROLES = {
  Admin: "Admin",
  Receptionist: "Receptionist",
  Billing: "Billing Staff",
  Doctor: "Doctor",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  const login = useCallback(async (username, password) => {
    const res = await http.post("/auth/login", { username, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      // hasRole() with no arguments just means "signed in"
      hasRole: (...roles) => !!user && (roles.length === 0 || roles.includes(user.role)),
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { http } from "../api/client";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext({ settings: {}, money: (v) => v, refresh: () => {} });

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});

  const refresh = useCallback(async () => {
    try {
      const list = await http.get("/settings");
      setSettings(Object.fromEntries(list.map((s) => [s.settingKey, s.settingValue])));
    } catch {
      /* settings are cosmetic; ignore failures */
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const value = useMemo(() => {
    const symbol = settings.CurrencySymbol ?? "$";
    const money = (v) =>
      `${symbol}${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return { settings, money, refresh };
  }, [settings, refresh]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

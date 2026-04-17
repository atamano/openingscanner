"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearLichessToken,
  getLichessToken,
  LICHESS_AUTH_EVENT,
  startLichessOAuth,
} from "@/lib/lichess/oauth";

export function useLichessAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToken(getLichessToken());
    const handler = () => setToken(getLichessToken());
    window.addEventListener(LICHESS_AUTH_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(LICHESS_AUTH_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const login = useCallback(() => {
    void startLichessOAuth();
  }, []);

  const logout = useCallback(() => {
    clearLichessToken();
  }, []);

  return { token, mounted, login, logout };
}

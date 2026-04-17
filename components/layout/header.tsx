"use client";

import { GitBranch, LogIn, LogOut } from "lucide-react";
import { useLichessAuth } from "@/hooks/use-lichess-auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function Header() {
  const { token, mounted, login, logout } = useLichessAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <GitBranch className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Repertoire Scanner</span>
          <span className="hidden rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
            beta
          </span>
        </div>
        <div className="flex items-center gap-1">
          {mounted && token ? (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Lichess connected</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={login}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Connect Lichess</span>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

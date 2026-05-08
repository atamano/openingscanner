"use client";

import type { ReactNode } from "react";

interface ChipButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Base classes always applied (sizing, padding, etc.). */
  className?: string;
  /** Override the classes applied when `active` is true. */
  activeClassName?: string;
  /** Override the classes applied when `active` is false. */
  inactiveClassName?: string;
  title?: string;
  ariaPressed?: boolean;
}

const DEFAULT_ACTIVE = "border-amber/40 text-amber-dark";
const DEFAULT_INACTIVE =
  "border-border text-ink-light hover:border-amber/30 hover:text-foreground";

/**
 * Shared chip-style toggle button used across the scan form.
 *
 * Active background goes through `--color-chip-active` (CSS var, dark variant
 * in globals.css) rather than a Tailwind utility — `bg-amber/12` was unreliable
 * under v3 JIT and the var lets dark mode swap to a higher-contrast tint.
 */
export function ChipButton({
  active = false,
  disabled,
  onClick,
  children,
  className = "",
  activeClassName = DEFAULT_ACTIVE,
  inactiveClassName = DEFAULT_INACTIVE,
  title,
  ariaPressed,
}: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={ariaPressed}
      className={`${className} transition-all ${
        active ? activeClassName : inactiveClassName
      } disabled:opacity-40`}
      style={
        active ? { backgroundColor: "var(--color-chip-active)" } : undefined
      }
    >
      {children}
    </button>
  );
}

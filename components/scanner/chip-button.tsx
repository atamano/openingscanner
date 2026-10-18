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

const DEFAULT_ACTIVE = "border-line text-on-pop font-bold";
const DEFAULT_INACTIVE =
  "border-border bg-card text-ink-light hover:border-line hover:text-foreground";

/**
 * Shared chip-style toggle button used across the scan form.
 *
 * Active chips are yellow stickers (`--color-pop-yellow` with `on-pop` ink
 * text), the same in both themes so the selection always reads at a glance.
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
        active ? { backgroundColor: "var(--color-pop-yellow)" } : undefined
      }
    >
      {children}
    </button>
  );
}

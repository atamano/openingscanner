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
 * The inline `rgba(176,122,46,0.12)` background is a deliberate workaround:
 * Tailwind JIT wasn't catching `bg-amber/12` reliably, so we inline the color
 * when the chip is active. Keep it that way.
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
        active ? { backgroundColor: "rgba(176,122,46,0.12)" } : undefined
      }
    >
      {children}
    </button>
  );
}

"use client";

import { ReactNode } from "react";
import clsx from "clsx";

type FullscreenReaderOverlayProps = {
  isOpen: boolean;
  leftSlot?: ReactNode;
  fontSizePercent?: number;
  onDecreaseFontSize?: () => void;
  onIncreaseFontSize?: () => void;
  onOpenSettings?: () => void;
  onExitFullscreen: () => void;
  className?: string;
};

export function FullscreenReaderOverlay({
  isOpen,
  leftSlot,
  fontSizePercent,
  onDecreaseFontSize,
  onIncreaseFontSize,
  onOpenSettings,
  onExitFullscreen,
  className,
}: FullscreenReaderOverlayProps) {
  if (!isOpen) return null;

  const defaultLeft =
    typeof fontSizePercent === "number" || Boolean(onOpenSettings) ? (
      <>
        {typeof fontSizePercent === "number" && (
          <>
            <button
              type="button"
              onClick={onDecreaseFontSize}
              className="rounded-full bg-white/10 px-2.5 py-1 text-sm font-bold hover:bg-white/20"
              aria-label="Decrease text size"
            >
              A-
            </button>
            <span className="min-w-14 text-center text-xs font-semibold opacity-90">
              {fontSizePercent}%
            </span>
            <button
              type="button"
              onClick={onIncreaseFontSize}
              className="rounded-full bg-white/10 px-2.5 py-1 text-sm font-bold hover:bg-white/20"
              aria-label="Increase text size"
            >
              A+
            </button>
          </>
        )}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full bg-white/10 px-2.5 py-1 text-sm font-bold hover:bg-white/20"
            aria-label="Open reading settings"
          >
            ⚙️
          </button>
        )}
      </>
    ) : null;

  const leftContent = leftSlot ?? defaultLeft;

  return (
    <div
      className={clsx(
        "fixed inset-x-3 top-3 z-[10000] flex items-start gap-3 pointer-events-none sm:inset-x-4 sm:top-4",
        leftContent ? "justify-between" : "justify-end",
        className,
      )}
    >
      {leftContent && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-white shadow-2xl backdrop-blur-sm">
          {leftContent}
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-white shadow-2xl backdrop-blur-sm">
        <span className="hidden text-xs font-semibold opacity-80 sm:inline">
          Esc
        </span>
        <button
          type="button"
          onClick={onExitFullscreen}
          className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold hover:bg-white/20"
          aria-label="Exit fullscreen"
          title="Exit fullscreen (Esc)"
        >
          ✕ Exit
        </button>
      </div>
    </div>
  );
}

"use client";

/**
 * Reading Settings Component
 * Provides UI for customizing the reading experience
 */

import { useState, useCallback } from "react";

export interface ReadingPreferences {
    fontSize: number; // 80-200 as percentage
    lineSpacing: "tight" | "normal" | "relaxed" | "loose";
    fontFamily: "system" | "sans" | "serif" | "readable" | "dyslexic";
    theme: "light" | "dark" | "sepia";
    pageMargin: "narrow" | "normal" | "wide";
}

const DEFAULT_PREFERENCES: ReadingPreferences = {
    fontSize: 100,
    lineSpacing: "normal",
    fontFamily: "readable",
    theme: "light",
    pageMargin: "normal",
};

const STORAGE_KEY = "reading-buddy-preferences";

export function useReadingPreferences() {
    // Use lazy initialization to load from localStorage
    const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
        if (typeof window === "undefined") return DEFAULT_PREFERENCES;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<ReadingPreferences>;
                return { ...DEFAULT_PREFERENCES, ...parsed };
            }
        } catch (error) {
            console.error("Failed to load reading preferences:", error);
        }
        return DEFAULT_PREFERENCES;
    });
    // Track if we've hydrated - start true since lazy init handles localStorage
    const [isLoaded] = useState(true);

    // Save preferences to localStorage when they change
    const updatePreferences = useCallback((updates: Partial<ReadingPreferences>) => {
        setPreferences((prev) => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (error) {
                console.error("Failed to save reading preferences:", error);
            }
            return next;
        });
    }, []);

    const resetPreferences = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Failed to reset reading preferences:", error);
        }
    }, []);

    return {
        preferences,
        updatePreferences,
        resetPreferences,
        isLoaded,
    };
}

// Get CSS classes for current preferences
export function getPreferenceClasses(preferences: ReadingPreferences): string {
    const classes: string[] = [];

    // Theme
    classes.push(`reader-theme-${preferences.theme}`);

    // Font family
    classes.push(`reader-font-${preferences.fontFamily}`);

    // Line spacing
    classes.push(`reader-spacing-${preferences.lineSpacing}`);

    return classes.join(" ");
}

// Get inline styles for font size
export function getPreferenceStyles(preferences: ReadingPreferences): React.CSSProperties {
    // Base font size is 16px, calculate actual px value
    const baseFontSize = 16;
    const fontSizePx = Math.round((preferences.fontSize / 100) * baseFontSize);
    return {
        fontSize: `${fontSizePx}px`,
    };
}

interface ReadingSettingsProps {
    preferences: ReadingPreferences;
    onUpdate: (updates: Partial<ReadingPreferences>) => void;
    onReset: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export function ReadingSettings({
    preferences,
    onUpdate,
    onReset,
    isOpen,
    onClose,
}: ReadingSettingsProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border-4 border-purple-300 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-purple-800">⚙️ Reading Settings</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Font Size */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                            📏 Font Size: {preferences.fontSize}%
                        </label>
                        <input
                            type="range"
                            min="80"
                            max="200"
                            step="10"
                            value={preferences.fontSize}
                            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                            className="w-full accent-purple-500"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                            <span>Small</span>
                            <span>Large</span>
                        </div>
                    </div>

                    {/* Font Family */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                            🔤 Font Family
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "system", label: "System", preview: "Aa" },
                                { value: "sans", label: "Inter", preview: "Aa" },
                                { value: "serif", label: "Lora", preview: "Aa" },
                                { value: "readable", label: "Open Sans", preview: "Aa" },
                                { value: "dyslexic", label: "Dyslexic", preview: "Aa" },
                            ].map((font) => (
                                <button
                                    key={font.value}
                                    onClick={() => onUpdate({ fontFamily: font.value as ReadingPreferences["fontFamily"] })}
                                    className={`rounded-lg border-2 p-2 text-sm transition ${preferences.fontFamily === font.value
                                        ? "border-purple-500 bg-purple-50"
                                        : "border-gray-200 hover:border-purple-300"
                                        }`}
                                >
                                    <span className={`reader-font-${font.value} text-lg`}>{font.preview}</span>
                                    <span className="ml-2 text-xs">{font.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Line Spacing */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                            ↕️ Line Spacing
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: "tight", label: "Tight" },
                                { value: "normal", label: "Normal" },
                                { value: "relaxed", label: "Relaxed" },
                                { value: "loose", label: "Loose" },
                            ].map((spacing) => (
                                <button
                                    key={spacing.value}
                                    onClick={() => onUpdate({ lineSpacing: spacing.value as ReadingPreferences["lineSpacing"] })}
                                    className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${preferences.lineSpacing === spacing.value
                                        ? "border-purple-500 bg-purple-50"
                                        : "border-gray-200 hover:border-purple-300"
                                        }`}
                                >
                                    {spacing.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                            🎨 Theme
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: "light", label: "Light", bg: "bg-white", text: "text-gray-900" },
                                { value: "dark", label: "Dark", bg: "bg-gray-900", text: "text-white" },
                                { value: "sepia", label: "Sepia", bg: "bg-amber-50", text: "text-amber-900" },
                            ].map((theme) => (
                                <button
                                    key={theme.value}
                                    onClick={() => onUpdate({ theme: theme.value as ReadingPreferences["theme"] })}
                                    className={`flex-1 rounded-lg border-2 px-3 py-3 text-sm font-medium transition ${theme.bg} ${theme.text} ${preferences.theme === theme.value
                                        ? "border-purple-500 ring-2 ring-purple-200"
                                        : "border-gray-300 hover:border-purple-300"
                                        }`}
                                >
                                    {theme.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-between">
                    <button
                        onClick={onReset}
                        className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-purple-500 px-6 py-2 text-sm font-bold text-white hover:bg-purple-600"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

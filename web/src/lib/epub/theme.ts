import type { ReadingPreferences } from "@/components/dashboard/reader/ReadingSettings";

type ThemeConfig = {
  background: string;
  foreground: string;
  muted: string;
};

const FONT_FAMILIES: Record<ReadingPreferences["fontFamily"], string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: '"Lora", Georgia, "Times New Roman", serif',
  readable: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  dyslexic:
    '"OpenDyslexic", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const LINE_HEIGHTS: Record<ReadingPreferences["lineSpacing"], string> = {
  tight: "1.4",
  normal: "1.6",
  relaxed: "1.8",
  loose: "2",
};

const PAGE_MARGINS: Record<ReadingPreferences["pageMargin"], string> = {
  narrow: "16px",
  normal: "24px",
  wide: "32px",
};

const THEMES: Record<ReadingPreferences["theme"], ThemeConfig> = {
  light: {
    background: "#ffffff",
    foreground: "#1a1a1a",
    muted: "#666666",
  },
  dark: {
    background: "#1a1a1a",
    foreground: "#e5e5e5",
    muted: "#999999",
  },
  sepia: {
    background: "#f8f1e3",
    foreground: "#3d3d3d",
    muted: "#6b5f52",
  },
};

export function getReaderThemeConfig(preferences: ReadingPreferences) {
  const theme = THEMES[preferences.theme];

  return {
    ...theme,
    fontFamily: FONT_FAMILIES[preferences.fontFamily],
    lineHeight: LINE_HEIGHTS[preferences.lineSpacing],
    margin: PAGE_MARGINS[preferences.pageMargin],
    fontSize: `${preferences.fontSize}%`,
  };
}

export function applyReaderTheme(
  rendition: {
    themes: {
      register: (name: string, rules: object) => void;
      select: (name: string) => void;
      override: (name: string, value: string, priority?: boolean) => void;
      fontSize: (size: string) => void;
      font: (family: string) => void;
    };
  },
  preferences: ReadingPreferences,
) {
  const theme = getReaderThemeConfig(preferences);

  rendition.themes.register("reading-buddy", {
    body: {
      background: `${theme.background} !important`,
      color: `${theme.foreground} !important`,
      "font-family": `${theme.fontFamily} !important`,
      "line-height": `${theme.lineHeight} !important`,
      padding: `${theme.margin} !important`,
      margin: "0 !important",
      "box-sizing": "border-box !important",
    },
    p: {
      "margin-top": "0 !important",
      "margin-bottom": "1em !important",
    },
    img: {
      "max-width": "100% !important",
      height: "auto !important",
    },
    table: {
      "max-width": "100% !important",
    },
    a: {
      color: `${theme.foreground} !important`,
    },
  });

  rendition.themes.select("reading-buddy");
  rendition.themes.fontSize(theme.fontSize);
  rendition.themes.font(theme.fontFamily);
  rendition.themes.override("color", theme.foreground, true);
  rendition.themes.override("background", theme.background, true);
  rendition.themes.override("line-height", theme.lineHeight, true);
}

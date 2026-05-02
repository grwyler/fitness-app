export const colors = {
  background: "#f6f7f9",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  surfaceElevated: "#ffffff",
  textPrimary: "#111827",
  textSecondary: "#667085",
  textTertiary: "#98a2b3",
  accent: "#2563eb",
  accentMuted: "#eff6ff",
  accentStrong: "#2563eb",
  success: "#16794c",
  danger: "#b42318",
  border: "#e5e7eb",
  borderStrong: "#d0d5dd",
  overlay: "rgba(17, 24, 39, 0.46)",
  shadow: "rgba(2, 6, 23, 0.28)"
} as const;

export const gradients = {
  // Intentionally minimal: only used if/when a gradient component is introduced.
  accent: [colors.accentStrong, "#1d4ed8"] as const
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
} as const;

export const borderWidths = {
  hairline: 1,
  thin: 1,
  thick: 2
} as const;

export const typography = {
  fontFamily: {
    system: undefined as string | undefined
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 28
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    md: 21,
    lg: 22,
    xl: 26,
    "2xl": 30,
    "3xl": 34
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700"
  }
} as const;

export const elevation = {
  none: {
    elevation: 0,
    shadowColor: colors.shadow,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 }
  },
  sm: {
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }
  },
  md: {
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  }
} as const;

export const motion = {
  durationMs: {
    instant: 0,
    fast: 90,
    normal: 160,
    slow: 240
  },
  // Cubic bezier control points (for Easing.bezier if needed)
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    emphasize: [0.2, 0, 0, 1] as const
  }
} as const;

export const pressable = {
  pressedOpacity: 0.92,
  pressedScale: 0.98,
  disabledOpacity: 0.55
} as const;

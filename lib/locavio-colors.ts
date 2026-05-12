/** Palette Locavio — utiliser en `style={{ ... }}` (pas d’utilitaires Tailwind couleur). */
export const PC = {
  // Fonds
  bg: "#f8f7ff",
  card: "#ffffff",
  cardHover: "#fafaf9",
  sidebar: "#ffffff",
  inputBg: "#f9f8ff",

  // Bordures
  border: "rgba(124, 58, 237, 0.1)",
  borderStrong: "rgba(124, 58, 237, 0.2)",
  borderGlow: "rgba(124, 58, 237, 0.35)",
  borderRow: "rgba(0, 0, 0, 0.05)",

  // Textes
  text: "#1a0533",
  muted: "#6b7280",
  tertiary: "#9ca3af",

  // Primaire (violet inchangé)
  primary: "#7c3aed",
  primaryHover: "#6d28d9",
  primaryLight: "#8b5cf6",
  primaryGlow: "rgba(124, 58, 237, 0.3)",
  secondary: "#7c3aed",

  // Gradients
  gradientPrimary: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
  gradientCard: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0.02) 100%)",
  gradientBg: "radial-gradient(ellipse at top, rgba(124,58,237,0.06) 0%, transparent 60%)",

  // Utilitaires
  white: "#FFFFFF",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  accentBlue: "#6366F1",

  // Glass (navbar uniquement)
  glassBg: "rgba(255, 255, 255, 0.85)",
  glassBlur: "blur(16px)",
  glassBorder: "rgba(124, 58, 237, 0.1)",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.3)",
  overlayDark: "rgba(0, 0, 0, 0.5)",

  // Ombres
  cardShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(124,58,237,0.1)",
  cardShadowHover: "0 4px 16px rgba(124,58,237,0.12), 0 0 0 1px rgba(124,58,237,0.2)",
  glowShadow: "0 4px 20px rgba(124, 58, 237, 0.25)",
  activeRing: "0 0 0 2px rgba(124, 58, 237, 0.4)",

  // Backgrounds états
  dangerBg10: "rgba(239, 68, 68, 0.08)",
  dangerBg15: "rgba(239, 68, 68, 0.1)",
  dangerBg25: "rgba(239, 68, 68, 0.15)",
  successBg10: "rgba(16, 185, 129, 0.08)",
  successBg20: "rgba(16, 185, 129, 0.12)",
  primaryBg05: "rgba(124, 58, 237, 0.04)",
  primaryBg10: "rgba(124, 58, 237, 0.06)",
  primaryBg15: "rgba(124, 58, 237, 0.08)",
  primaryBg20: "rgba(124, 58, 237, 0.1)",
  primaryBg25: "rgba(124, 58, 237, 0.15)",
  primaryBg40: "rgba(124, 58, 237, 0.25)",
  warningBg10: "rgba(245, 158, 11, 0.08)",
  warningBg15: "rgba(245, 158, 11, 0.1)",
  warningBg20: "rgba(245, 158, 11, 0.15)",

  // Couleurs fixes
  cardAlpha80: "rgba(255, 255, 255, 0.9)",
  cardAlpha90: "rgba(255, 255, 255, 0.95)",
  red600: "#DC2626",
  red50: "#FEF2F2",
  red200: "#FECACA",
  red800: "#991B1B",
  violet50: "#F5F3FF",
  violet200: "#DDD6FE",

  // Bordures états
  borderPrimary50: "rgba(124, 58, 237, 0.4)",
  borderSuccess40: "rgba(16, 185, 129, 0.35)",
  borderDanger40: "rgba(239, 68, 68, 0.35)",
  borderDanger50: "rgba(239, 68, 68, 0.4)",
  primaryBorder40: "rgba(124, 58, 237, 0.35)",
} as const;

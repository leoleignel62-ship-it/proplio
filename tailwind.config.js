/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        locavio: {
          bg: "#06060f",
          sidebar: "#08080f",
          card: "#0f0f1a",
          "card-hover": "#141422",
          border: "rgba(139,92,246,0.12)",
          "border-strong": "rgba(139,92,246,0.20)",
          text: "#f0f0ff",
          muted: "#8888a0",
          tertiary: "#55556a",
          primary: "#7c3aed",
          "primary-hover": "#6d28d9",
          "primary-light": "#8b5cf6",
          secondary: "#a78bfa",
          success: "#10b981",
          danger: "#ef4444",
          warning: "#f59e0b",
          "accent-blue": "#6366f1",
          white: "#ffffff",
        },
      },
      borderRadius: {
        "locavio-card": "12px",
      },
      boxShadow: {
        "locavio-card": "0 4px 24px -4px rgba(0, 0, 0, 0.45)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

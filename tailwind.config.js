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
          bg: "#0f0f13",
          sidebar: "#13131a",
          card: "#1a1a24",
          border: "#2d2d3d",
          text: "#f1f1f5",
          muted: "#9090a8",
          primary: "#7c3aed",
          "primary-hover": "#6d28d9",
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

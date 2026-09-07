/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFEBDD", // page background
        panel: "#F6F3E7", // card / panel background
        ink: "#121210", // primary text, borders, strong elements
        muted: "#6B675C", // secondary text
        accent: "#EA580C", // orange — brand, links, active states, ticket IDs
        success: "#3F7D4A",
        warning: "#B8860B",
        danger: "#DC2626",
      },
      fontFamily: {
        // kept the token names "display"/"body" used throughout the app so
        // existing className usages don't need to change — both now resolve
        // to the brutalist mono stack.
        display: ['"JetBrains Mono"', "monospace"],
        body: ['"JetBrains Mono"', "monospace"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        // hard brutalist offset shadow — no blur, just an offset duplicate.
        panel: "4px 4px 0 0 #121210",
        "panel-sm": "3px 3px 0 0 #121210",
      },
      backgroundImage: {
        "dot-grid": "radial-gradient(circle, #c9c4b0 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "22px 22px",
      },
    },
  },
  plugins: [],
};
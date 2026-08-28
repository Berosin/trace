/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        porcelain: "#FCFAF5",
        linen: "#F6F1E6",
        ink: "#1F3B4D",
        delft: "#2E6B8A",
        door: {
          light: "#BFE1EE",
          DEFAULT: "#7FB8D6",
          deep: "#4A93B8",
        },
        peony: "#D85D91",
        leaf: "#4F7A55",
        amber: "#C4883A",
        rust: "#B5522F",
      },
      fontFamily: {
        display: ["\"Fraunces\"", "serif"],
        body: ["\"Inter\"", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(31,59,77,0.06), 0 8px 24px -12px rgba(31,59,77,0.18)",
      },
      backgroundImage: {
        "door-glass": "linear-gradient(180deg, #DCEFF5 0%, #BFE1EE 100%)",
      },
    },
  },
  plugins: [],
};

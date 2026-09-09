import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cohere: {
          primary: "#17171c",
          black: "#000000",
          ink: "#212121",
          deepGreen: "#003c33",
          darkNavy: "#071829",
          canvas: "#ffffff",
          softStone: "#eeece7",
          paleGreen: "#edfce9",
          paleBlue: "#f1f5ff",
          hairline: "#d9d9dd",
          borderLight: "#e5e7eb",
          cardBorder: "#f2f2f2",
          muted: "#93939f",
          slate: "#75758a",
          bodyMuted: "#616161",
          actionBlue: "#1863dc",
          focusBlue: "#4c6ee6",
          coral: "#ff7759",
          coralSoft: "#ffad9b",
          formFocus: "#9b60aa",
          error: "#b30000",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "22px",
        xl: "30px",
        pill: "32px",
      },
    },
  },
  plugins: [],
};
export default config;

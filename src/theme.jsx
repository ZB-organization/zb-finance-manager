import { createContext, useContext, useState, useEffect } from "react";
import { loadTheme, saveTheme } from "./db";

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => loadTheme());
  const toggle = () => setTheme(t => { const n = t==="dark"?"light":"dark"; saveTheme(n); return n; });
  return <ThemeCtx.Provider value={{ theme, toggle, dark: theme==="dark" }}>{children}</ThemeCtx.Provider>;
}
export const useTheme   = () => useContext(ThemeCtx);
export const usePalette = () => { const {dark} = useTheme(); return dark ? DARK : LIGHT; };

const DARK = {
  bg:          "linear-gradient(160deg,#080d1a 0%,#0b1221 50%,#070d1b 100%)",
  bgSolid:     "#080d1a",
  // Cards get animated gradient in component
  surface:     "rgba(255,255,255,0.04)",
  surfaceElevated: "rgba(255,255,255,0.065)",
  surfaceHigh: "rgba(255,255,255,0.10)",
  border:      "rgba(255,255,255,0.08)",
  borderMid:   "rgba(255,255,255,0.13)",
  sidebar:     "rgba(6,9,18,0.98)",
  sidebarBorder:"rgba(255,255,255,0.07)",
  text:        "#f0f4ff",
  textSub:     "#8fa3c0",
  textMute:    "#4a6280",
  textFaint:   "#2a3d55",
  overlay:     "rgba(0,0,0,0.8)",
  drawer:      "#0c1120",
  inpBg:       "rgba(255,255,255,0.055)",
  inpBorder:   "rgba(255,255,255,0.11)",
  shadow:      "0 4px 24px rgba(0,0,0,0.5)",
  shadowLg:    "0 12px 48px rgba(0,0,0,0.6)",
  cardGrad1:   "rgba(6,182,212,0.03)",
  cardGrad2:   "rgba(139,92,246,0.03)",
};

const LIGHT = {
  bg:          "linear-gradient(160deg,#f0f2f7 0%,#e8ecf5 50%,#f2f4f9 100%)",
  bgSolid:     "#f0f2f7",
  surface:     "rgba(255,255,255,0.85)",
  surfaceElevated: "rgba(255,255,255,0.95)",
  surfaceHigh: "#ffffff",
  border:      "rgba(0,0,0,0.07)",
  borderMid:   "rgba(0,0,0,0.12)",
  sidebar:     "rgba(243,245,250,0.98)",
  sidebarBorder:"rgba(0,0,0,0.08)",
  text:        "#0d1b2e",
  textSub:     "#334e68",
  textMute:    "#5a7592",
  textFaint:   "#94afc8",
  overlay:     "rgba(0,0,0,0.45)",
  drawer:      "#f8fafd",
  inpBg:       "rgba(255,255,255,0.95)",
  inpBorder:   "rgba(0,0,0,0.13)",
  shadow:      "0 4px 20px rgba(0,0,0,0.1)",
  shadowLg:    "0 12px 40px rgba(0,0,0,0.15)",
  cardGrad1:   "rgba(6,182,212,0.04)",
  cardGrad2:   "rgba(139,92,246,0.04)",
};

import { useEffect } from "react";

export function useTheme() {
  useEffect(() => {
    const saved = localStorage.getItem("fp-theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem("fp-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("fp-theme") as "light" | "dark") || "light";
}

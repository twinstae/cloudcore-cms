import { useAtom } from "jotai";
import { useEffect, useSyncExternalStore } from "react";
import { colorSchemeAtom } from "../state/color-scheme";
import { Button } from "./ui";

const systemDarkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
const subscribeSystemDark = (onChange: () => void) => {
  const query = systemDarkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getSystemDark = () => systemDarkQuery().matches;

export function ThemeToggle() {
  const [scheme, setScheme] = useAtom(colorSchemeAtom);
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false);
  const isDark = scheme === "system" ? systemDark : scheme === "dark";

  // Panda의 dark 조건은 <html data-theme>를 본다. system이면 속성을 지워 OS 설정을 따른다.
  useEffect(() => {
    const { dataset } = document.documentElement;
    if (scheme === "system") delete dataset["theme"];
    else dataset["theme"] = scheme;
  }, [scheme]);

  return (
    <Button
      tone="ghost"
      size="sm"
      aria-pressed={isDark}
      onClick={() => setScheme(isDark ? "light" : "dark")}
    >
      {isDark ? "라이트 모드" : "다크 모드"}
    </Button>
  );
}

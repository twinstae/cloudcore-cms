import { atomWithStorage } from "jotai/utils";

/** system은 OS 설정을 따르고, 나머지는 data-theme으로 덮어쓴다. */
export type ColorScheme = "system" | "light" | "dark";

export const colorSchemeAtom = atomWithStorage<ColorScheme>("cloudcore:color-scheme", "system");

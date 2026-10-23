import { getDefaultStore } from "jotai";
import { expect, it, vi } from "vitest";
import { colorSchemeAtom } from "../state/color-scheme";
import { actions, given, query, runSiheom } from "../test/siheom";
import { ThemeToggle } from "./ThemeToggle";

it("다크 모드 버튼은 html의 data-theme을 dark로 바꾼다", async () => {
  getDefaultStore().set(colorSchemeAtom, "light");

  await runSiheom(given.render(<ThemeToggle />), actions.click(query.button("다크 모드")));

  await vi.waitFor(() => {
    expect(document.documentElement.dataset["theme"]).toBe("dark");
  });
});

it("라이트 모드 버튼은 html의 data-theme을 light로 되돌린다", async () => {
  getDefaultStore().set(colorSchemeAtom, "dark");

  await runSiheom(given.render(<ThemeToggle />), actions.click(query.button("라이트 모드")));

  await vi.waitFor(() => {
    expect(document.documentElement.dataset["theme"]).toBe("light");
  });
});

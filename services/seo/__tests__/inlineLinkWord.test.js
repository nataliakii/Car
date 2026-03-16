import { getOnlineInlineLinkWord } from "../inlineLinkWord";

describe("getOnlineInlineLinkWord", () => {
  test("returns the correct inline link word for each supported locale", () => {
    expect(getOnlineInlineLinkWord("en")).toBe("online");
    expect(getOnlineInlineLinkWord("ru")).toBe("онлайн");
    expect(getOnlineInlineLinkWord("uk")).toBe("онлайн");
    expect(getOnlineInlineLinkWord("el")).toBe("online");
    expect(getOnlineInlineLinkWord("de")).toBe("online");
    expect(getOnlineInlineLinkWord("bg")).toBe("онлайн");
    expect(getOnlineInlineLinkWord("ro")).toBe("online");
    expect(getOnlineInlineLinkWord("sr")).toBe("online");
  });

  test("falls back to online for unsupported locales", () => {
    expect(getOnlineInlineLinkWord("fr")).toBe("online");
    expect(getOnlineInlineLinkWord(undefined)).toBe("online");
  });
});

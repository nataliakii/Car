const ONLINE_INLINE_LINK_WORD_BY_LOCALE = {
  en: "online",
  ru: "онлайн",
  uk: "онлайн",
  el: "online",
  de: "online",
  bg: "онлайн",
  ro: "online",
  sr: "online",
};

export function getOnlineInlineLinkWord(locale) {
  return ONLINE_INLINE_LINK_WORD_BY_LOCALE[locale] || "online";
}

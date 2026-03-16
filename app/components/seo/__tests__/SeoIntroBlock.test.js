import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SeoIntroBlock } from "../SeoContentBlocks";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("SeoIntroBlock", () => {
  test("renders the configured word as a link inside intro text", () => {
    const html = renderToStaticMarkup(
      <SeoIntroBlock
        title="Аренда авто в Салониках"
        introText="Бронируйте онлайн авто в Салониках без депозита."
        inlineLink={{ word: "онлайн", href: "/ru/cars" }}
      />
    );

    expect(html).toContain('href="/ru/cars"');
    expect(html).toContain(">онлайн<");
    expect(html).toContain("Бронируйте");
  });

  test("keeps intro text plain when the configured word is absent", () => {
    const html = renderToStaticMarkup(
      <SeoIntroBlock
        title="Car rental in Thessaloniki"
        introText="Book your rental car directly in the city."
        inlineLink={{ word: "онлайн", href: "/ru/cars" }}
      />
    );

    expect(html).not.toContain('href="/ru/cars"');
    expect(html).toContain("Book your rental car directly in the city.");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SeoWhyRentBlock } from "../SeoContentBlocks";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("SeoWhyRentBlock", () => {
  test("renders airport quick benefits with checkmarks only and no default list bullets", () => {
    const html = renderToStaticMarkup(
      <SeoWhyRentBlock
        title="Why rent at the airport"
        bullets={["\u2714 Free booking", "No deposit"]}
        withCheckmarks
      />
    );

    expect(html).toContain("list-style:none");
    expect((html.match(/✔/g) || []).length).toBe(2);
    expect(html).toContain(">Free booking<");
    expect(html).not.toContain(">✔ Free booking<");
  });

  test("keeps default bullet list styling when checkmarks mode is disabled", () => {
    const html = renderToStaticMarkup(
      <SeoWhyRentBlock
        title="Why rent this car"
        bullets={["Fuel efficient", "Easy parking"]}
      />
    );

    expect(html).toContain("padding-left:20px");
    expect(html).not.toContain("list-style:none");
  });
});

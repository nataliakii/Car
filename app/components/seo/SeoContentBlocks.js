import Link from "next/link";

function renderIntroTextWithInlineLink(introText, inlineLink) {
  if (
    typeof introText !== "string" ||
    !inlineLink?.word ||
    !inlineLink?.href
  ) {
    return introText;
  }

  const normalizedText = introText.toLocaleLowerCase();
  const normalizedWord = inlineLink.word.toLocaleLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedWord);

  if (matchIndex === -1) {
    return introText;
  }

  const before = introText.slice(0, matchIndex);
  const linkedWord = introText.slice(
    matchIndex,
    matchIndex + inlineLink.word.length
  );
  const after = introText.slice(matchIndex + inlineLink.word.length);

  return (
    <>
      {before}
      <Link
        href={inlineLink.href}
        style={{
          color: "#1a73e8",
          textDecoration: "none",
          fontSize: "inherit",
          fontFamily: "inherit",
          fontWeight: "inherit",
          lineHeight: "inherit",
        }}
      >
        {linkedWord}
      </Link>
      {after}
    </>
  );
}

export function SeoIntroBlock({ title, introText, skipTitle, inlineLink }) {
  if (!introText && !title) return null;
  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px 8px" }}>
      {!skipTitle && title && <h1 style={{ marginBottom: 12 }}>{title}</h1>}
      {introText && (
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {renderIntroTextWithInlineLink(introText, inlineLink)}
        </p>
      )}
    </section>
  );
}

export function SeoLinksBlock({ title, links }) {
  if (!links || links.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 16px",
        marginTop: 16,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <h2
        style={{
          marginBottom: 12,
          marginTop: 0,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "#333",
        }}
      >
        {title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, listStyle: "disc" }}>
        {links.map((link) => (
          <li key={link.href} style={{ marginBottom: 6 }}>
            <Link
              href={link.href}
              style={{
                color: "#1976d2",
                textDecoration: "none",
                fontSize: "1rem",
              }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeoSingleLinkBlock({ title, href, label }) {
  if (!href || !label) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "8px 16px" }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <p style={{ margin: 0 }}>
        <Link href={href}>{label}</Link>
      </p>
    </section>
  );
}

export function SeoPickupGuidanceBlock({ title, pickupGuidance }) {
  if (!pickupGuidance || !pickupGuidance.trim()) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{pickupGuidance}</p>
    </section>
  );
}

export function SeoNearbyPlacesBlock({ title, nearbyPlaces }) {
  if (!nearbyPlaces || nearbyPlaces.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 16px",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <h2 style={{ marginBottom: 12, marginTop: 0, fontSize: "1.125rem", fontWeight: 600, color: "#333" }}>
        {title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, listStyle: "disc", fontSize: "1rem" }}>
        {nearbyPlaces.map((place, i) => (
          <li key={i}>{place}</li>
        ))}
      </ul>
    </section>
  );
}

/** Useful tips block — bulleted list of travel/rental tips. Matches SeoLinksBlock styling. */
export function SeoTipsBlock({ title, tips }) {
  if (!tips || tips.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 16px",
        marginTop: 16,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <h2 style={{ marginBottom: 12, marginTop: 0, fontSize: "1.125rem", fontWeight: 600, color: "#333" }}>
        {title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, listStyle: "disc", fontSize: "1rem" }}>
        {tips.map((tip, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeoFaqBlock({ title, faq }) {
  if (!faq || faq.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 16px",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <h2 style={{ marginBottom: 12, marginTop: 0, fontSize: "1.125rem", fontWeight: 600, color: "#333" }}>
        {title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "1rem" }}>
        {faq.map((item, i) => (
          <li key={i} style={{ marginBottom: 16 }}>
            <strong style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>{item.question}</strong>
            <span style={{ lineHeight: 1.6 }}>{item.answer}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeoVehicleSpecsBlock({ title, specs }) {
  if (!specs || specs.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "8px 24px",
        }}
      >
        {specs.map((spec) => (
          <div
            key={spec.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span style={{ color: "#666", fontSize: "0.95rem" }}>{spec.label}</span>
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{spec.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Quick specs: Transmission, Fuel, Seats, AC, Luggage — at a glance above the fold */
export function SeoQuickSpecsBlock({ title, specs }) {
  if (!specs || specs.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "12px 16px 16px" }}>
      <h2 style={{ marginBottom: 12, fontSize: "1.1rem" }}>{title}</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px 24px",
        }}
      >
        {specs.map((spec) => (
          <div key={spec.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#666", fontSize: "0.9rem" }}>{spec.label}:</span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{spec.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Car features list with checkmarks */
export function SeoCarFeaturesBlock({ title, features }) {
  if (!features || features.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <ul style={{ margin: 0, paddingLeft: 20, listStyle: "none" }}>
        {features.map((feature, i) => (
          <li key={i} style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: "#0a0", fontWeight: "bold" }} aria-hidden="true">✔</span>
            <span style={{ lineHeight: 1.5 }}>{feature}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Why rent this car — semantic block */
export function SeoWhyRentBlock({
  title,
  bullets,
  withCheckmarks = false,
}) {
  if (!bullets || bullets.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <ul
        style={{
          margin: 0,
          paddingLeft: withCheckmarks ? 0 : 20,
          lineHeight: 1.7,
          listStyle: withCheckmarks ? "none" : undefined,
        }}
      >
        {bullets.map((bullet, i) => (
          <li
            key={i}
            style={
              withCheckmarks
                ? {
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }
                : undefined
            }
          >
            {withCheckmarks ? (
              <>
                <span
                  style={{ color: "#0a0", fontWeight: "bold" }}
                  aria-hidden="true"
                >
                  {"\u2714"}
                </span>
                <span style={{ lineHeight: 1.5 }}>
                  {String(bullet).replace(/^\s*(?:[✔✓]|âœ”)\s*/, "")}
                </span>
              </>
            ) : (
              bullet
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Distance table (e.g. from airport) */
export function SeoDistanceTableBlock({ title, rows, hideHeader = false }) {
  if (!rows || rows.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      {title ? <h2 style={{ marginBottom: 12 }}>{title}</h2> : null}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 280,
          }}
        >
          {!hideHeader && (
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Location</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>Distance</th>
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 12px" }}>{row.location}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{row.distance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Map section — optional embed or link */
export function SeoMapBlock({ title, mapUrl, mapEmbedHtml }) {
  if (!title) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 8px" }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      {mapEmbedHtml ? (
        <div
          style={{ width: "100%", maxWidth: 560, aspectRatio: "16/10", borderRadius: 8, overflow: "hidden" }}
          dangerouslySetInnerHTML={{ __html: mapEmbedHtml }}
        />
      ) : mapUrl ? (
        <p style={{ margin: 0 }}>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1a73e8", textDecoration: "none" }}
          >
            View pickup location on map →
          </a>
        </p>
      ) : null}
    </section>
  );
}

/** Pillar links: Car rental in Halkidiki, Car rental at Thessaloniki Airport */
export function SeoPillarLinksBlock({ title, links }) {
  if (!links || links.length === 0) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "8px 16px 16px" }}>
      <h2 style={{ marginBottom: 8, fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "#1a73e8", textDecoration: "none" }}>
            {link.label}
          </Link>
        ))}
      </p>
    </section>
  );
}

export function SeoBreadcrumbNav({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 0" }}
    >
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          listStyle: "none",
          margin: 0,
          padding: 0,
          fontSize: "0.85rem",
          color: "#666",
          gap: "0 4px",
        }}
      >
        {items.map((item, i) => (
          <li key={item.href} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i < items.length - 1 ? (
              <Link href={item.href} style={{ color: "#1a73e8", textDecoration: "none" }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "#333" }} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SeoLocationCtaBlock({ href, label }) {
  if (!href || !label) return null;

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#1a1a1a",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </Link>
    </section>
  );
}

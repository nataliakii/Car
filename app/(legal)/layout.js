/**
 * Legal Layout
 * 
 * This layout is used for static legal pages:
 * - /privacy-policy
 * - /terms-of-service
 * - /cookie-policy
 * - /rental-terms
 * 
 * Uses shared Navbar to keep header behavior consistent with main pages.
 */

import "@styles/globals.css";
import { getSeoConfig } from "@config/seo";
import Providers from "../providers";
import Navbar from "@app/components/Navbar";

const seoConfig = getSeoConfig();

export const metadata = {
  metadataBase: new URL(seoConfig.baseUrl),
  robots: {
    index: true,
    follow: true,
  },
};

// Minimal footer component (no client-side JS)
function MinimalFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#008989",
        color: "#ffffff",
        padding: "32px 24px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>
          © {new Date().getFullYear()} Natali Cars. All rights reserved.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          <a
            href="/privacy-policy"
            style={{ color: "#b0bec5", textDecoration: "none", fontSize: "12px" }}
          >
            Privacy Policy
          </a>
          <a
            href="/terms-of-service"
            style={{ color: "#b0bec5", textDecoration: "none", fontSize: "12px" }}
          >
            Terms of Service
          </a>
          <a
            href="/cookie-policy"
            style={{ color: "#b0bec5", textDecoration: "none", fontSize: "12px" }}
          >
            Cookie Policy
          </a>
          <a
            href="/rental-terms"
            style={{ color: "#b0bec5", textDecoration: "none", fontSize: "12px" }}
          >
            Rental Terms
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function LegalLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light only" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#ffffff",
          color: "#1a237e",
        }}
      >
        <Providers>
          <Navbar isMain={false} />
          <main
            style={{
              flex: 1,
              maxWidth: "800px",
              margin: "0 auto",
              padding: "110px 24px 48px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {children}
          </main>
          <MinimalFooter />
        </Providers>
      </body>
    </html>
  );
}

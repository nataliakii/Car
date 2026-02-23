/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  basePath: "",
  reactStrictMode: true,
  images: { unoptimized: true },
  env: {
    NEXT_LOCAL_API_BASE_URL: "http://localhost:3025",
    NEXT_PUBLIC_API_BASE_URL: "https://natali-cars.com/",
    NEXT_PUBLIC_SECOND_DRIVER_PRICE_PER_DAY:
      process.env.SECOND_DRIVER_PRICE_PER_DAY ||
      process.env.NEXT_PUBLIC_SECOND_DRIVER_PRICE_PER_DAY ||
      "5",
  },
  // Canonical domain redirect: www → non-www (SEO + CORS fix)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.natali-cars.com" }],
        destination: "https://natali-cars.com/:path*",
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias["@"] = path.resolve(__dirname);
    config.resolve.alias["@app"] = path.resolve(__dirname, "app");
    config.resolve.alias["@utils"] = path.resolve(__dirname, "utils");
    config.resolve.alias["@styles"] = path.resolve(__dirname, "styles");
    config.resolve.alias["@config"] = path.resolve(__dirname, "config");
    config.resolve.alias["@domain"] = path.resolve(__dirname, "domain");
    config.resolve.alias["@models"] = path.resolve(__dirname, "models");
    config.resolve.alias["@theme"] = path.resolve(__dirname, "theme.js");
    config.resolve.alias["@locales"] = path.resolve(__dirname, "locales");
    config.resolve.alias["@lib"] = path.resolve(__dirname, "lib");
    return config;
  },
};

export default nextConfig;

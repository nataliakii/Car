"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Stack } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Image from "next/image";
import Link from "next/link";
import ActionButton from "@/app/components/ui/buttons/ActionButton";

const AUTO_MS = 6000;
const PHONE_PORTRAIT_QUERY =
  "(max-width: 767px) and (orientation: portrait) and (pointer: coarse)";

// Matches Feed mainPt so hero sits under nav with no white stripe
const HERO_TOP_PADDING = { xs: "110px", md: "90px" };
const HERO_NEGATIVE_MARGIN = { xs: "-110px", md: "-90px" };

export default function SeoHeroSliderCard({
  title,
  paragraphs = [],
  imageUrls = [],
  imageAlt = "",
  ctaHref,
  ctaLabel,
  fullBleedUnderNav = false,
  disableImageOverlays = false,
  ctaPlacement = "inline",
  preserveTitleCase = false,
  stretchContentToEdge = false,
  ctaSx,
  enableTextShadow = false,
  textShadowValue = "",
  heroBenefits = [],
  hideSecondaryContentOnPortraitPhone = false,
}) {
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(PHONE_PORTRAIT_QUERY);
    const applyMatch = () => setIsPortraitPhone(mediaQuery.matches);
    applyMatch();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyMatch);
      return () => mediaQuery.removeEventListener("change", applyMatch);
    }

    mediaQuery.addListener(applyMatch);
    return () => mediaQuery.removeListener(applyMatch);
  }, []);

  const images =
    Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            if (!item || typeof item !== "object") {
              return "";
            }

            return isPortraitPhone
              ? item.portraitPhoneSrc || item.defaultSrc || ""
              : item.defaultSrc || item.portraitPhoneSrc || "";
          })
          .filter(Boolean)
      : [];

  const [index, setIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, AUTO_MS);

    return () => clearInterval(intervalRef.current);
  }, [images.length]);

  const shouldShowBottomRightCta =
    ctaPlacement === "bottomRight" && ctaHref && ctaLabel;
  const hasHeroBenefits = Array.isArray(heroBenefits) && heroBenefits.length > 0;
  const shouldHideSecondaryContent =
    hideSecondaryContentOnPortraitPhone && isPortraitPhone;
  const heroTextShadow = enableTextShadow
    ? (textShadowValue || "0 1px 2px rgba(0,0,0,0.4)")
    : "none";

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        width: "100%",
        minHeight: { xs: 480, md: 600 },
        overflow: "hidden",
        ...(fullBleedUnderNav && { mt: HERO_NEGATIVE_MARGIN }),
      }}
    >
      {/* SLIDES */}
      {images.map((src, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            inset: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 1s ease",
          }}
        >
          <Image
            src={src}
            alt={imageAlt}
            fill
            priority={i === 0}
            style={{ objectFit: "cover" }}
          />
        </Box>
      ))}

      {!disableImageOverlays && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.7) 100%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* CONTENT: CTA above title, then paragraphs (no absolute positioning) */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          maxWidth: stretchContentToEdge ? "100%" : 1200,
          mx: "auto",
          px: 3,
          py: { xs: 6, md: 10 },
          color: "common.white",
          display: "flex",
          justifyContent: "flex-end",
          ...(fullBleedUnderNav && { pt: HERO_TOP_PADDING }),
        }}
      >
        <Box sx={{ maxWidth: 680, textAlign: "right" }}>
          {ctaHref && ctaLabel && ctaPlacement !== "bottomRight" && (
            <Box sx={{ mb: 2 }}>
              <ActionButton
                component={Link}
                href={ctaHref}
                label={ctaLabel}
                color="primary"
                variant="contained"
                size="large"
                sx={ctaSx}
              />
            </Box>
          )}
          <Typography
            component="h1"
            variant="h2"
            sx={{
              fontWeight: 1000,
              lineHeight: 1.2,
              mb: 2,
              color: "common.white",
              textTransform: preserveTitleCase ? "none" : "uppercase",
              letterSpacing: "0.05em",
              fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
              textShadow: heroTextShadow,
            }}
          >
            {title}
          </Typography>

          {!shouldHideSecondaryContent &&
            paragraphs.map((p, i) => (
              <Typography
                key={i}
                variant="body1"
                sx={{
                  opacity: 0.92,
                  lineHeight: 1.7,
                  mb: 1.5,
                  color: "common.white",
                  textShadow: heroTextShadow,
                }}
              >
                {p}
              </Typography>
            ))}

          {!shouldHideSecondaryContent && hasHeroBenefits && (
            <Box
              sx={{
                mt: { xs: 2, md: 2.5 },
                ml: "auto",
                width: { xs: "100%", md: "min(340px, 100%)" },
                maxWidth: 340,
                px: { xs: 1.35, md: 1.7 },
                py: { xs: 1.1, md: 1.4 },
                borderRadius: { xs: "12px", md: "14px" },
                backgroundColor: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Stack spacing={{ xs: 0.7, md: 0.85 }}>
                {heroBenefits.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      gap: 0.75,
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        color: "common.white",
                        lineHeight: 1.3,
                        fontWeight: 500,
                        fontSize: { xs: "0.9rem", md: "0.98rem" },
                        textShadow: heroTextShadow,
                      }}
                    >
                      {item}
                    </Typography>
                    <CheckCircleRoundedIcon
                      sx={{
                        color: "rgba(53,199,89,0.95)",
                        fontSize: { xs: 20, md: 22 },
                        mt: "1px",
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      {shouldShowBottomRightCta && (
        <Box
          sx={{
            position: "absolute",
            right: { xs: 16, md: 32 },
            bottom: images.length > 1 ? { xs: 56, md: 72 } : { xs: 24, md: 32 },
            zIndex: 4,
          }}
        >
          <ActionButton
            component={Link}
            href={ctaHref}
            label={ctaLabel}
            color="primary"
            variant="contained"
            size="large"
            sx={ctaSx}
          />
        </Box>
      )}

      {/* DOTS */}
      {images.length > 1 && (
        <Stack
          direction="row"
          justifyContent="center"
          spacing={1}
          sx={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            zIndex: 3,
          }}
        >
          {images.map((_, i) => (
            <Box
              key={i}
              onClick={() => setIndex(i)}
              sx={(theme) => ({
                width: 10,
                height: 10,
                borderRadius: "50%",
                cursor: "pointer",
                bgcolor:
                  i === index
                    ? theme.palette.primary.main
                    : "rgba(255,255,255,0.5)",
                transition: "all 0.3s ease",
              })}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

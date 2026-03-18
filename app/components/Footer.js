"use client";

import React from "react";
import { Typography, Stack, Link as MuiLink, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import dynamic from "next/dynamic";
import DefaultButton from "@/app/components/ui/buttons/DefaultButton";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useMainContext } from "@app/Context";
import { withLocalePrefix } from "@domain/locationSeo/locationSeoService";

// Lazy-load icons (Footer is below fold)
const DirectionsIcon = dynamic(() => import("@mui/icons-material/Directions"), { ssr: false });
const CallIcon = dynamic(() => import("@mui/icons-material/Call"), { ssr: false });
const EmailIcon = dynamic(() => import("@mui/icons-material/Email"), { ssr: false });
const LocationOnIcon = dynamic(() => import("@mui/icons-material/LocationOn"), { ssr: false });
const QrCode2Icon = dynamic(() => import("@mui/icons-material/QrCode2"), { ssr: false });
const CodeIcon = dynamic(() => import("@mui/icons-material/Code"), { ssr: false });
const LinkedInIcon = dynamic(() => import("@mui/icons-material/LinkedIn"), { ssr: false });

// ============================================================
// STYLED COMPONENTS - Minimal & Mobile-First
// ============================================================

const Section = styled("section")(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: "center",
  background: theme.palette.secondary.main,
  color: theme.palette.text.light,
}));

const LogoImg = styled(Image)(() => ({
  display: "block",
  marginInline: "auto",
}));

const Slogan = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: "0.75rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#ffffff",
}));

const ContactInfo = styled(Stack)(({ theme }) => ({
  marginTop: theme.spacing(3),
  fontSize: "0.9rem",
  gap: theme.spacing(1.5),
  alignItems: "center",
}));

const ContactLink = styled("a")(({ theme }) => ({
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "0.9rem",
  "&:hover": {
    textDecoration: "underline",
  },
}));

const ContactIcon = styled("span")(({ theme }) => ({
  marginRight: theme.spacing(1),
  verticalAlign: "middle",
  "& svg": {
    fontSize: "1.1rem",
    color: "#ffffff",
  },
}));

const ContactItem = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const LegalLink = styled(Link)(({ theme }) => ({
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  textDecoration: "none",
  color: "#ffffff",
  "&:hover": {
    textDecoration: "underline",
  },
}));

const CreditsSection = styled("div")(({ theme }) => ({
  marginTop: theme.spacing(3),
  fontSize: "0.7rem",
  color: "#ffffff",
}));

const CreditLink = styled(MuiLink)(({ theme }) => ({
  color: "#ffffff",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  fontSize: "0.7rem",
  "&:hover": {
    textDecoration: "underline",
  },
}));

// ============================================================
// FOOTER COMPONENT
// ============================================================

function Footer() {
  const { company, lang } = useMainContext();
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  const router = useRouter();

  // Fallback для SSR или если company ещё не загружена
  const name = company?.name || "NATALI CARS";
  const slogan = company?.slogan || "best rent car online service in Chalkidiki";
  const tel = company?.tel || "+30 6970 034 707";
  const tel2 = company?.tel2 || "+30 6989 922 366";
  const email = company?.email || "natali2015makarova@gmail.com";
  const address = company?.address || "Antonioy Kelesi 12, Nea Kallikratia 630 80";
  const coords = company?.coords || { lat: "40.311273589340836", lon: "23.06426516796098" };

  const handleClick = () => {
    const destinationURL = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`;
    router.push(destinationURL);
  };

  const localeLink = (path) => withLocalePrefix(lang || "en", path);

  return (
    <Section>
      {/* Logo */}
      <LogoImg
        src="/favicon.png"
        width={130}
        height={130}
        alt={name}
      />

      {/* Slogan */}
      <Slogan>{slogan}</Slogan>

      {/* CTA - Get Directions (mobile-first, первый экран) */}
      <Box sx={{ mt: 3, mb: 2 }}>
        <DefaultButton
          onClick={handleClick}
          label="Get Directions"
          relative={true}
          startIcon={<DirectionsIcon />}
          sx={{
            width: "100%",
            maxWidth: 520,
            marginInline: "auto",
            backgroundColor: "primary.main",
            color: "white",

            m: 0,
            "&:hover": {
              backgroundColor: "primary.dark",
            },
          }}
        />
      </Box>

      {/* Contacts */}
      <ContactInfo>
        {/* Phone */}
        <ContactItem>
          <ContactIcon>
            <CallIcon />
          </ContactIcon>
          <ContactLink href={`tel:${tel}`}>{tel}</ContactLink>
          {tel2 && (
            <>
              <span style={{ margin: "0 8px", opacity: 0.6 }}>·</span>
              <ContactLink href={`tel:${tel2}`}>{tel2}</ContactLink>
            </>
          )}
        </ContactItem>

        {/* Email */}
        <ContactItem>
          <ContactIcon>
            <EmailIcon />
          </ContactIcon>
          <ContactLink href={`mailto:${email}`}>{email}</ContactLink>
        </ContactItem>

        {/* Address */}
        <ContactItem>
          <ContactIcon>
            <LocationOnIcon />
          </ContactIcon>
          <span style={{ color: "#ffffff" }}>{address}</span>
        </ContactItem>
      </ContactInfo>

      {/* Nea Kallikratia Guide banner */}
      <Box
        component="a"
        href={`https://kalikratia.bbqr.site/${lang || "en"}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1.5,
          mt: 3,
          mb: 1,
          px: 2,
          py: 1.25,
          borderRadius: "10px",
          backgroundColor: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          textDecoration: "none",
          color: "#ffffff",
          fontSize: "0.8rem",
          transition: "background-color 0.2s, border-color 0.2s",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.2)",
            borderColor: "rgba(255,255,255,0.4)",
          },
        }}
      >
        <Image
          src="/nk/9.png"
          alt="Nea Kallikratia Guide"
          width={36}
          height={36}
          style={{ borderRadius: 6, objectFit: "cover" }}
        />
        <Typography component="span" sx={{ fontSize: "inherit", lineHeight: 1.3 }}>
          {t("footer.kallikratiaBanner", {
            defaultValue: "Don't Know Where to Go Halkidiki?",
          })}{" "}
          {t("footer.kallikratiaBannerLink", {
            defaultValue: "Nea Kallikratia Guide",
          })}
        </Typography>
      </Box>

      {/* Legal Links - строка, не блок */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        flexWrap="wrap"
        sx={{ mt: 4 }}
      >
        <LegalLink href={localeLink("/privacy-policy")}>
          {t("footer.privacyPolicy", { defaultValue: "Privacy" })}
        </LegalLink>
        <span>·</span>
        <LegalLink href={localeLink("/terms-of-service")}>
          {t("footer.termsOfService", { defaultValue: "Terms" })}
        </LegalLink>
        <span>·</span>
        <LegalLink href={localeLink("/cookie-policy")}>
          {t("footer.cookiePolicy", { defaultValue: "Cookies" })}
        </LegalLink>
        <span>·</span>
        <LegalLink href={localeLink("/rental-terms")}>
          {t("footer.rentalTerms", { defaultValue: "Rental" })}
        </LegalLink>
      </Stack>

      {/* Credits - самый тихий слой */}
      <CreditsSection>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems="center"
          justifyContent="center"
          sx={{ mb: 2 }}
        >
          <CreditLink
            href="https://www.bbqr.site"
            target="_blank"
            rel="noopener noreferrer"
          >
            <QrCode2Icon sx={{ fontSize: 20 }} />
            BBQR - Solutions for Restaurants
          </CreditLink>

          <CreditLink
            href="https://www.linkedin.com/in/natalia-kirejeva/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CodeIcon sx={{ fontSize: 20 }} />
            Developed by NataliaKi
            <LinkedInIcon sx={{ fontSize: 18 }} />
          </CreditLink>
        </Stack>
        © {currentYear} {name}. All rights reserved.
      </CreditsSection>
    </Section>
  );
}

export default Footer;

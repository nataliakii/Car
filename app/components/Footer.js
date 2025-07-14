"use client";

import React, { useState } from "react";
import { Grid, ButtonBase, Link as MuiLink, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import FacebookIcon from "@mui/icons-material/Facebook";

import InstagramIcon from "@mui/icons-material/Instagram";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import DefaultButton from "@app/components/common/DefaultButton";
import DirectionsIcon from "@mui/icons-material/Directions";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { companyData } from "@utils/companyData";

const Section = styled("section")(({ theme }) => ({
  padding: theme.spacing(5),
  borderTop: `1px solid ${theme.palette.secondary.complement}`,
  textAlign: "center",
  background: theme.palette.primary.main1,
  backdropFilter: "blur(60px)",
  color: theme.palette.text.dark,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontFamily: theme.typography.h1.fontFamily,
  lineHeight: "2rem",
  fontSize: "2.9rem",
  marginBottom: theme.spacing(2),
}));

const Slogan = styled(Typography)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  textTransform: "uppercase",
  fontSize: "1.2rem",
  lineHeight: "1.8rem",
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const FooterContainer = styled(Grid)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  fontFamily: theme.typography.fontFamily,
  display: "flex",
  flexDirection: "column",
  alignContent: "center",
  alignItems: "center",
  textAlign: "center",
}));

const SocialLinks = styled("div")(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

const ContactInfo = styled(Grid)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: "1rem",
}));

const ContactIcon = styled("span")(({ theme }) => ({
  marginRight: theme.spacing(1),
  verticalAlign: "middle",
}));

const CopyrightInfo = styled("div")(({ theme }) => ({
  marginTop: theme.spacing(2),
  fontSize: "1rem",
  opacity: 0.8,
}));

const LogoImg = styled(Image)(({ theme }) => ({
  // marginBottom: "-5px",
  // marginTop: "-4px",
  display: "flex",
  alignContent: "center",
  alignItems: "center",
  textAlign: "center",
}));

function Footer() {
  // const { contacts } = useMyContext();
  const { name, slogan, tel, tel2, email, address, coords } = companyData;

  const router = useRouter();

  const handleClick = () => {
    const destinationURL = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`;
    router.push(destinationURL);
  };
  return (
    <Section>
      <FooterContainer>
        {/* <SectionTitle variant="h3">{name}</SectionTitle> */}
        <LogoImg
          src="/favicon.png"
          width={175}
          height={175}
          alt="to kati allo"
          priority
        ></LogoImg>
        <Slogan>{slogan}</Slogan>
        <SocialLinks>
          <MuiLink
            href="https://www.facebook.com/people/Natali-carscom/100053110548109/?sk=about"
            color="inherit"
            target="_blank"
          >
            <FacebookIcon fontSize="large" />
          </MuiLink>
          <MuiLink
            href="https://www.facebook.com/people/Natali-carscom/100053110548109/?sk=about"
            color="inherit"
            target="_blank"
          >
            <InstagramIcon fontSize="large" />
          </MuiLink>
        </SocialLinks>
        <ContactInfo container spacing={2}>
          <DefaultButton
            onClick={handleClick}
            label="Get Directions"
            relative={true}
            minWidth="100%"
            startIcon={<DirectionsIcon />}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              "&:hover": {
                color: "white",
              },
            }}
          />
          <Grid item xs={12} md={4}>
            <ContactIcon>
              <LocationOnIcon />
            </ContactIcon>
            {address}
          </Grid>
          <Grid item xs={12} md={4}>
            <ContactIcon>
              <EmailIcon />
            </ContactIcon>
            <a style={{ fontSize: "1.3rem" }} href={`mailto:${email}`}>
              {email}
            </a>
          </Grid>
          <Grid item xs={12} md={4}>
            <ContactIcon>
              <CallIcon />
            </ContactIcon>
            <a
              style={{ fontSize: "1.3rem", marginRight: "1px" }}
              href={`tel:${tel}`}
            >
              {tel}
            </a>
            <ContactIcon sx={{ ml: 1 }}>
              <CallIcon />
            </ContactIcon>
            <a style={{ fontSize: "1.3rem" }} href={`tel:${tel2}`}>
              {tel2}
            </a>
          </Grid>
        </ContactInfo>
      </FooterContainer>
    </Section>
  );
}

export default Footer;

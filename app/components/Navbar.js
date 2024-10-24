"use client";
import { useState, useRef, useEffect } from "react";
import { styled } from "@mui/system";
import {
  AppBar,
  Button,
  Typography,
  Stack,
  Toolbar,
  Container,
  IconButton,
  Popover,
  MenuItem,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { animateScroll as scroll } from "react-scroll";
import { companyData } from "@utils/companyData";
import { useMainContext } from "@app/Context";

const GradientAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== "scrolled",
})(({ theme, scrolled }) => ({
  position: "fixed",
  transition: theme.transitions.create(["height", "background-color"], {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  willChange: "height, background-color",
  height: scrolled ? 52 : 60,
  backgroundColor: theme.palette.secondary.main,
  boxShadow: scrolled ? theme.shadows[2] : "none",
  backdropFilter: scrolled ? "blur(10px)" : "none",
}));

const Logo = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.h1?.fontWeight || 400,
  display: "flex",
  fontSize: 29,
  fontFamily: theme.typography.h1.fontFamily,
  color: theme.palette.text.light,
}));

const LanguageSwitcher = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text?.black || theme.palette.text?.light,
  display: "flex",
  alignItems: "center",
}));

const LanguagePopover = styled(Popover)(({ theme }) => ({
  width: "150px",
  fontFamily: theme.typography.fontFamily,
}));

export default function NavBar({
  isAdmin = false,
  isCarInfo = false,
  setIsCarInfo = null,
}) {
  const headerRef = useRef(null);
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const { scrolled } = useMainContext();

  const handleLanguageClick = (event) => {
    event.preventDefault();
    setLanguageAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageAnchor(null);
  };

  const handleLanguageSelect = (selectedLanguage) => {
    i18n.changeLanguage(selectedLanguage);
    handleLanguageClose();
  };

  return (
    <GradientAppBar ref={headerRef} scrolled={scrolled}>
      <Toolbar>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Link href="/">
            <Logo>
              {companyData.name}
              {isAdmin && " ADMIN"}
            </Logo>
          </Link>
          <Stack direction="row" spacing={2} alignItems="center">
            {isAdmin && (
              <ToggleButtons
                isCarInfo={isCarInfo}
                setIsCarInfo={setIsCarInfo}
              />
            )}
            <LanguageSwitcher color="inherit" onClick={handleLanguageClick}>
              {/* <LanguageIcon /> */}
              <Typography
                className="language-text"
                sx={{
                  fontStretch: "extra-condensed",
                  textTransform: "uppercase",
                }}
              >
                {lang}
              </Typography>
            </LanguageSwitcher>
          </Stack>
        </Stack>
        <LanguagePopover
          open={Boolean(languageAnchor)}
          anchorEl={languageAnchor}
          onClose={handleLanguageClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem onClick={() => handleLanguageSelect("en")}>
            English
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("el")}>
            Ελληνικά
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("ru")}>
            Русский
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("de")}>
            Deutsch
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("ro")}>Română</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("sr")}>Српски</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("bg")}>
            Български
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("fr")}>
            Française
          </MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("ar")}>Arabic</MenuItem>
        </LanguagePopover>
      </Toolbar>
    </GradientAppBar>
  );
}

const ToggleButtons = ({ isCarInfo, setIsCarInfo }) => {
  return (
    typeof setIsCarInfo === "function" && (
      <Stack direction="row" spacing={3} alignItems="center">
        <Button
          variant={isCarInfo ? "contained" : "outlined"}
          onClick={() => setIsCarInfo(true)}
        >
          Автопарк
        </Button>
        <Button
          variant={!isCarInfo ? "contained" : "outlined"}
          onClick={() => setIsCarInfo(false)}
        >
          Заказы
        </Button>
      </Stack>
    )
  );
};

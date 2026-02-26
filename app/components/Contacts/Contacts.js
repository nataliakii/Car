"use client";

import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "notistack";
import { useMainContext } from "@app/Context";
import { ActionButton } from "@app/components/ui/buttons";
import sendEmail from "@utils/sendEmail";
import { DEVELOPER_EMAIL } from "@config/email";

function Contacts() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useMainContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyEmail = DEVELOPER_EMAIL;

  const validateEmail = (email) => {
    if (!email) return true;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = t("contact.errors.nameRequired", {
        defaultValue: "Имя обязательно для заполнения",
      });
    }

    if (!email.trim()) {
      newErrors.email = t("contact.errors.emailRequired", {
        defaultValue: "Email обязателен для заполнения",
      });
    } else if (!validateEmail(email)) {
      newErrors.email = t("contact.errors.emailInvalid", {
        defaultValue: "Некорректный формат email",
      });
    }

    if (!subject.trim()) {
      newErrors.subject = t("contact.errors.subjectRequired", {
        defaultValue: "Тема обязательна для заполнения",
      });
    }

    if (!message.trim()) {
      newErrors.message = t("contact.errors.messageRequired", {
        defaultValue: "Сообщение обязательно для заполнения",
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await sendEmail(
        {
          email,
          title: `Сообщение из формы на сайте :${subject}`,
          message: `${t("contact.emailNameLabel", {
            defaultValue: "Имя",
          })}: ${name}\n${t("order.email", {
            defaultValue: "Email",
          })}: ${email}\n\n${t("contact.message", {
            defaultValue: "Сообщение",
          })}:\n${message}`,
        },
        companyEmail
      );

      enqueueSnackbar(
        t("contact.success", {
          defaultValue:
            "Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.",
        }),
        { variant: "success" }
      );

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setErrors({
        submit:
          error.message ||
          t("contact.errors.sendFailed", {
            defaultValue:
              "Не удалось отправить сообщение. Пожалуйста, попробуйте позже.",
          }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container
      sx={{
        maxWidth: "lg",
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          maxWidth: 700,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h4"
          align="center"
          color="secondary.main"
          sx={{ mb: 3, mt: { xs: 2, sm: 0 } }}
        >
          {t("contact.title", { defaultValue: "Свяжитесь с нами" })}
        </Typography>

        <Typography
          variant="bodyLarge"
          align="center"
          color="secondary.main"
          sx={{ mb: 4, px: { xs: 1, sm: 0 } }}
        >
          {t("contact.subtitle", {
            defaultValue: "У вас есть вопросы? Мы всегда рады помочь!",
          })}
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            maxWidth: 600,
          }}
        >
          <Typography
            variant="bodyLarge"
            align="center"
            color="secondary.main"
            sx={{ mb: 3 }}
          >
            {t("contact.description", {
              defaultValue:
                "Заполните форму ниже, и наша команда свяжется с вами в ближайшее время.",
            })}
          </Typography>

          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="bodyLarge"
              color="secondary.main"
              sx={{ mb: 2, fontWeight: 500 }}
            >
              {t("contact.emailLabel", { defaultValue: "Email поддержки" })}
            </Typography>
            <MuiLink
              href={`mailto:${companyEmail}`}
              color="primary"
              sx={{
                fontSize: "clamp(1rem, 1.25vw, 1.125rem)",
                textDecoration: "none",
                display: "block",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {companyEmail}
            </MuiLink>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label={t("order.name", { defaultValue: "Имя" })}
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
              size="medium"
            />

            <TextField
              label={t("order.email", { defaultValue: "Email" })}
              variant="outlined"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
              size="medium"
            />

            <TextField
              label={t("contact.subject", { defaultValue: "Тема" })}
              variant="outlined"
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              error={!!errors.subject}
              helperText={errors.subject}
              required
              size="medium"
            />

            <TextField
              label={t("contact.message", { defaultValue: "Сообщение" })}
              variant="outlined"
              fullWidth
              multiline
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={!!errors.message}
              helperText={errors.message}
              required
              size="medium"
            />

            {errors.submit && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errors.submit}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <ActionButton
                onClick={handleSubmit}
                label={t("contact.send", { defaultValue: "Отправить" })}
                loading={isSubmitting}
                disabled={isSubmitting}
                color="primary"
                variant="contained"
                size="large"
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Contacts;

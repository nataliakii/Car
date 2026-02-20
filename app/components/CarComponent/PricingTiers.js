import React from "react";
import { Paper, Stack, Typography, Divider } from "@mui/material";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { seasons as fallbackSeasons } from "@utils/companyData";
import { useTranslation } from "react-i18next";
import { useMainContext } from "@app/Context";

const DAY_RANGE_TRANSLATION_KEYS = {
  4: "carPark.1-4days",
  7: "carPark.5-14days",
  14: "carPark.14+days",
};

const getCurrentSeason = (date = dayjs(), seasons) => {
  let targetDate;
  if (!date || dayjs(date).isSame(dayjs(), "month")) {
    targetDate = dayjs().startOf("month");
  } else {
    targetDate = dayjs(date);
  }
  const currentYear = targetDate.year();

  for (const [season, range] of Object.entries(seasons)) {
    const startDate = dayjs(`${range.start}/${currentYear}`, "DD/MM/YYYY");
    const endDate = dayjs(`${range.end}/${currentYear}`, "DD/MM/YYYY");

    // Включаем граничные даты сезона
    if (
      targetDate.isSameOrAfter(startDate, "day") &&
      targetDate.isSameOrBefore(endDate, "day")
    ) {
      return season;
    }
  }

  return "NoSeason"; // Default season
};

const PricingDisplay = ({
  prices,
  selectedDate,
  discount,
  discountStart,
  discountEnd,
}) => {
  const seasonDate = selectedDate ? dayjs(selectedDate) : dayjs();
  // Проверка скидки: для будущих месяцев используем весь месяц,
  // для текущего месяца — диапазон от сегодня (включительно) до конца месяца.
  const isCurrentMonth = seasonDate.isSame(dayjs(), "month");
  const monthStart = seasonDate.startOf("month");
  const monthEnd = seasonDate.endOf("month");
  const rangeStart = isCurrentMonth ? dayjs().startOf("day") : monthStart;
  let discountType = "none"; // 'full', 'partial', 'none'
  if (
    typeof discount === "number" &&
    discount > 0 &&
    discountStart &&
    discountEnd
  ) {
    // Полное покрытие выбранного диапазона
    if (
      rangeStart.isSameOrAfter(discountStart, "day") &&
      monthEnd.isSameOrBefore(discountEnd, "day")
    ) {
      discountType = "full";
    } else if (
      // Пересечение выбранного диапазона со скидкой
      monthEnd.isSameOrAfter(discountStart, "day") &&
      rangeStart.isSameOrBefore(discountEnd, "day")
    ) {
      discountType = "partial";
    } else {
      discountType = "none";
    }
  }
  const { t } = useTranslation();
  const seasons = useMainContext()?.company?.seasons ?? fallbackSeasons;
  const currentSeason = getCurrentSeason(seasonDate, seasons);
  const pricingData = prices[currentSeason]?.days || {};
  const pricingEntries = Object.entries(pricingData);
  const totalPricingEntries = pricingEntries.length;
  const discountFactor = 1 - (discount || 0) / 100;
  const currentSeasonRange = seasons[currentSeason];

  // Helper function для формирования шапки таблицы цен при аренде авто
  const getDayRangeText = (days) => {
    const key = DAY_RANGE_TRANSLATION_KEYS[Number(days)];
    return key ? t(key) : "";
  };

  return (
    <>
      {" "}
      <Typography>
        {t("car.pricesFor")} {currentSeason} ({t("basic.from")}{" "}
        {currentSeasonRange?.start} {t("basic.till")}{" "}
        {currentSeasonRange?.end})
      </Typography>
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 1.2, sm: 2 }, // Уменьшили отступы для более компактного вида
          "@media (max-width:900px) and (orientation: landscape)": {
            padding: 0.6,
          },
          display: "flex",
          justifyContent: "space-evenly",
          alignItems: "center",
          backgroundColor: "secondary.light",

        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: 0,
          }}
        >
          {/* Map over the day tiers and prices */}
          {pricingEntries.map(([days, amount], index) => {
            const discountedPrice = Math.round(amount * discountFactor);
            let priceDisplay;
            if (discountType === "full") {
              // Скидка действует весь месяц
              priceDisplay = (
                <>
                  <span>€{discountedPrice}</span>
                </>
              );
            } else if (discountType === "partial") {
              // Скидка действует частично
              priceDisplay = (
                <>
                  <span>€{discountedPrice}</span>
                  <span style={{ margin: "0 6px" }}> - </span>
                  <span>€{amount}</span>
                  {/* <span style={{ color: '#388e3c', marginLeft: 4 }}>
                    ({discount}% скидка частично)
                  </span> */}
                </>
              );
            } else {
              // Скидка не действует
              priceDisplay = <>{`€${amount}`}</>;
            }
            return (
              <React.Fragment key={index}>
                <Stack direction="column" alignItems="center">
                  <Typography
                    sx={{
                      lineHeight: { xs: "0.9rem", sm: "0.9rem" },
                      fontSize: { xs: "0.8rem", sm: "0.9rem" },
                      "@media (max-width:900px) and (orientation: landscape)": {
                        fontSize: "0.7rem",
                        lineHeight: "0.8rem",
                        color: "text.inverse", // Светлый текст для тёмного фона
                      },
                      mb: 1,
                    }}
                  >
                    {getDayRangeText(days)}
                  </Typography>
                  <Typography
                    sx={{
                      lineHeight: { xs: "1rem", sm: "1.2rem" },
                      fontSize: { xs: "1rem", sm: "1.2rem" },
                      "@media (max-width:900px) and (orientation: landscape)": {
                        fontSize: "0.95rem",
                        lineHeight: "1rem",
                      },
                      color: "text.inverse", // Светлый текст для тёмного фона
                    }}
                    color="primary"
                  >
                    {priceDisplay}
                  </Typography>
                </Stack>
                {/* Divider between prices */}
                {index + 1 < totalPricingEntries && (
                  <Divider orientation="vertical" flexItem />
                )}
              </React.Fragment>
            );
          })}
        </Stack>
      </Paper>
    </>
  );
};

export default PricingDisplay;

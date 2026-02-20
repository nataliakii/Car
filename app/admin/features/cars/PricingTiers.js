import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Grid, Typography, CircularProgress, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import debounce from "lodash/debounce";
import { seasons as fallbackSeasons } from "@utils/companyData";
import { updateCar } from "@utils/action";
import { useTranslation } from "react-i18next";

const getSeasonDates = (season, seasons) => {
  const dates = seasons[season];
  return dates
    ? `${dates.start} - ${dates.end}`
    : `Season "${season}" not found`;
};

const buildRows = (prices, seasons) => {
  if (!prices) return [];

  return Object.entries(prices).map(([season, pricing]) => {
    const row = {
      id: season,
      season,
      seasonDates: getSeasonDates(season, seasons),
    };

    for (const [day, value] of Object.entries(pricing?.days || {})) {
      row[`days${day}`] = value || 0;
    }

    return row;
  });
};

const PricingTiersTable = ({
  car = {},
  handleChange,
  disabled,
  isAddcar = false,
  defaultPrices = {},
}) => {
  const [pendingUpdates, setPendingUpdates] = useState({});
  const prices = isAddcar ? defaultPrices : car?.pricingTiers;
  const seasons = fallbackSeasons;
  const rows = useMemo(() => buildRows(prices, seasons), [prices, seasons]);
  const dayKeys = useMemo(() => {
    const firstSeasonKey = Object.keys(prices || {})[0];
    if (!firstSeasonKey) return [];
    return Object.keys(prices?.[firstSeasonKey]?.days || {});
  }, [prices]);

  const debouncedUpdate = useMemo(
    () =>
      debounce(async (updatedCarData) => {
        try {
          await updateCar(updatedCarData);
          setPendingUpdates({});
        } catch (error) {
          console.error("Failed to update car:", error);
        }
      }, 1000),
    []
  );
  useEffect(() => () => debouncedUpdate.cancel(), [debouncedUpdate]);

  const handlePricingTierChange = useCallback(
    (season, day, newPrice) => {
      setPendingUpdates((prev) => ({
        ...prev,
        [`${season}-${day}`]: true,
      }));

      // Update the car data and notify parent
      const updatedCarData = {
        ...car,
        pricingTiers: {
          ...car.pricingTiers,
          [season]: {
            ...car.pricingTiers[season],
            days: {
              ...car.pricingTiers[season].days,
              [day]: parseFloat(newPrice),
            },
          },
        },
      };
      // console.log("UPDATED CARDATA", updatedCarData);
      handleChange({
        target: { name: "pricingTiers", value: updatedCarData.pricingTiers },
      });
      if (!isAddcar) {
        debouncedUpdate(updatedCarData);
      } else {
        setPendingUpdates({});
      }
    },
    [car, debouncedUpdate, handleChange, isAddcar]
  );

  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      { field: "season", headerName: t("carPark.season"), width: 150 },
      {
        field: "seasonDates",
        headerName: t("carPark.seasonDat"),
        width: 200,
      },
      ...dayKeys.map((dayKey) => {
        const dayNumber = Number(dayKey);
        return {
          field: `days${dayKey}`,
          headerName:
            dayNumber <= 5
              ? t("carPark.1-4days")
              : dayNumber <= 7
              ? t("carPark.5-14days")
              : t("carPark.14+days"),
          type: "number",
          width: 120,
          editable: true,
          renderCell: (params) => {
            const isUpdating = pendingUpdates[`${params.row.season}-${dayKey}`];
            return (
              <Box sx={{ position: "relative", opacity: isUpdating ? 0.5 : 1 }}>
                {params.value}
                {isUpdating && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress size={20} />
                  </Box>
                )}
              </Box>
            );
          },
        };
      }),
    ],
    [dayKeys, pendingUpdates, t]
  );

  const handleRowUpdate = useCallback(
    (newRow, oldRow) => {
      for (const dayKey of dayKeys) {
        const field = `days${dayKey}`;
        if (newRow[field] !== oldRow[field]) {
          handlePricingTierChange(newRow.season, dayKey, newRow[field]);
        }
      }
      return newRow;
    },
    [dayKeys, handlePricingTierChange]
  );

  return (
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        {t("carPark.prices")}
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        processRowUpdate={handleRowUpdate}
        disableRowSelectionOnClick
        loading={disabled}
        hideFooter
      />
    </Grid>
  );
};

export default PricingTiersTable;

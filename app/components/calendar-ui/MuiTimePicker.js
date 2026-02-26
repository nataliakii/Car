/**
 * MuiTimePicker
 *
 * ❗ КАНОН:
 * - НИКОГДА не блокирует ввод
 * - Показывает ТОЛЬКО warnings (жёлтые)
 * - Block-сообщения показываются ТОЛЬКО при save
 *
 * 🎯 TIMEZONE:
 * - Отображает время как HH:mm (визуально Athens)
 * - При изменении создаёт dayjs с тем же HH:mm
 * - НЕ конвертирует между таймзонами
 */

import { TextField, Box, Typography, Alert } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useTranslation } from "react-i18next";
import { formatTimeHHMM, createAthensDateTime } from "@/domain/time/athensTime";
import { keyframes } from "@mui/material/styles";
import { BufferSettingsLinkifiedText } from "@/app/components/ui";

// Необходимо для dayjs("18:00", "HH:mm")
dayjs.extend(customParseFormat);

// Анимация мигающей красной рамки для конфликтов
const pulseRedBorder = keyframes`
  0%, 100% {
    border-color: #d32f2f;
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4);
  }
  50% {
    border-color: #f44336;
    box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.2);
  }
`;

/**
 * @param {Object} props
 * @param {dayjs.Dayjs} props.startTime - Время в Athens timezone
 * @param {dayjs.Dayjs} props.endTime - Время в Athens timezone
 * @param {Function} props.setStartTime
 * @param {Function} props.setEndTime
 * @param {boolean} props.disabled - Disabled по бизнес-причинам (viewOnly)
 * @param {boolean} props.pickupDisabled
 * @param {boolean} props.returnDisabled
 * @param {Object} props.pickupSummary - { level: "block"|"warning", message }
 * @param {Object} props.returnSummary - { level: "block"|"warning", message }
 * @param {boolean} props.compact - Compact UI mode for multi-modal layout
 */
export default function TimePicker({
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  disabled = false,
  pickupDisabled = false,
  returnDisabled = false,
  pickupSummary = null,
  returnSummary = null,
  onOpenBufferSettings,
  compact = false,
}) {
  const { t } = useTranslation();

  // Показываем ТОЛЬКО warnings (жёлтые) — block-сообщения показываются при save
  const showPickupWarning = pickupSummary?.level === "warning";
  const showReturnWarning = returnSummary?.level === "warning";
  
  // Определяем есть ли конфликт (block или warning) для визуального выделения
  const hasPickupConflict = pickupSummary !== null; // Есть конфликт (block или warning)
  const hasReturnConflict = returnSummary !== null; // Есть конфликт (block или warning)

  /**
   * 🎯 Обработчик изменения времени
   *
   * КРИТИЧНО: Нельзя использовать dayjs(timeStr, "HH:mm") — это создаёт
   * объект в локальной таймзоне браузера, а нам нужен Athens!
   *
   * Извлекаем дату из существующего объекта (который в Athens)
   * и создаём новый объект в Athens с новым временем.
   */
  const handleStartTimeChange = (e) => {
    const timeStr = e.target.value; // "HH:mm"
    // Получаем дату из существующего startTime (в Athens timezone)
    const dateStr = startTime && dayjs.isDayjs(startTime) 
      ? startTime.format("YYYY-MM-DD") 
      : dayjs().format("YYYY-MM-DD");
    // Создаём НОВЫЙ объект в Athens timezone с той же датой и новым временем
    const newTime = createAthensDateTime(dateStr, timeStr);
    
    // 🔍 DEV: отладка timezone
    if (process.env.NODE_ENV === "development") {
      console.log(`🕐 [TimePicker] startTime changed:`, {
        inputTimeStr: timeStr,
        dateFromExisting: dateStr,
        newTimeHHMM: newTime?.format("HH:mm"),
        newTimeISO: newTime?.toISOString(),
        browserTZ: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
    
    setStartTime(newTime);
  };

  const handleEndTimeChange = (e) => {
    const timeStr = e.target.value; // "HH:mm"
    const dateStr = endTime && dayjs.isDayjs(endTime) 
      ? endTime.format("YYYY-MM-DD") 
      : dayjs().format("YYYY-MM-DD");
    const newTime = createAthensDateTime(dateStr, timeStr);
    
    // 🔍 DEV: отладка timezone
    if (process.env.NODE_ENV === "development") {
      console.log(`🕐 [TimePicker] endTime changed:`, {
        inputTimeStr: timeStr,
        dateFromExisting: dateStr,
        newTimeHHMM: newTime?.format("HH:mm"),
        newTimeISO: newTime?.toISOString(),
        browserTZ: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
    
    setEndTime(newTime);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {/* Два TimePicker в ряд */}
      <Box
        sx={{
          display: "flex",
          gap: compact ? { xs: 1, sm: 1 } : { xs: 1, sm: 2 },
          mb: compact ? 0.5 : 1,
        }}
      >
        {/* Pickup Time — НИКОГДА не блокируется из-за конфликтов */}
        <TextField
          label={t("order.pickupTime")}
          type="time"
          value={formatTimeHHMM(startTime)}
          onChange={handleStartTimeChange}
          disabled={disabled || pickupDisabled} // Только viewOnly/isCurrentOrder
          size="small"
          fullWidth
          sx={{
            flex: 1,
            ...(compact && {
              "& .MuiOutlinedInput-root": {
                height: "36px !important",
                minHeight: "36px !important",
              },
              "& .MuiInputBase-input": {
                fontSize: "0.8rem !important",
                paddingTop: "6px !important",
                paddingBottom: "6px !important",
              },
              "& .MuiInputLabel-root": { fontSize: "0.74rem !important" },
            }),
            ...(hasPickupConflict && {
              "& .MuiOutlinedInput-root": {
                animation: `${pulseRedBorder} 2s ease-in-out infinite`,
                borderWidth: "2px",
                "& fieldset": {
                  borderColor: "error.main",
                  borderWidth: "2px",
                },
                "&:hover fieldset": {
                  borderColor: "error.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "error.main",
                  borderWidth: "2px",
                },
              },
            }),
          }}
        />

        {/* Return Time — НИКОГДА не блокируется из-за конфликтов */}
        <TextField
          label={t("order.returnTime")}
          type="time"
          value={formatTimeHHMM(endTime)}
          onChange={handleEndTimeChange}
          disabled={disabled || returnDisabled} // Только viewOnly
          size="small"
          fullWidth
          sx={{
            flex: 1,
            ...(compact && {
              "& .MuiOutlinedInput-root": {
                height: "36px !important",
                minHeight: "36px !important",
              },
              "& .MuiInputBase-input": {
                fontSize: "0.8rem !important",
                paddingTop: "6px !important",
                paddingBottom: "6px !important",
              },
              "& .MuiInputLabel-root": { fontSize: "0.74rem !important" },
            }),
            ...(hasReturnConflict && {
              "& .MuiOutlinedInput-root": {
                animation: `${pulseRedBorder} 2s ease-in-out infinite`,
                borderWidth: "2px",
                "& fieldset": {
                  borderColor: "error.main",
                  borderWidth: "2px",
                },
                "&:hover fieldset": {
                  borderColor: "error.main",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "error.main",
                  borderWidth: "2px",
                },
              },
            }),
          }}
        />
      </Box>

      {/* Только WARNING сообщения (жёлтые) — показываются сразу */}
      {showPickupWarning && (
        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            <BufferSettingsLinkifiedText
              text={pickupSummary.message}
              onOpen={onOpenBufferSettings}
            />
          </Typography>
        </Alert>
      )}

      {showReturnWarning && returnSummary?.message !== pickupSummary?.message && (
        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            <BufferSettingsLinkifiedText
              text={returnSummary.message}
              onOpen={onOpenBufferSettings}
            />
          </Typography>
        </Alert>
      )}
    </LocalizationProvider>
  );
}

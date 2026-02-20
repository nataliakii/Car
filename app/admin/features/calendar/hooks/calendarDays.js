"use client";
import { useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);

const BUSINESS_TZ = "Europe/Athens";

/* =========================
   Pure helpers
========================= */

/**
 * Генерирует массив дней для календаря
 * @param {Object} params
 * @param {number} params.month - месяц (0-11)
 * @param {number} params.year - год
 * @param {string} params.viewMode - 'full' | 'range15'
 * @param {string} params.rangeDirection - 'forward' | 'backward'
 * @returns {Array} массив дней с dayjs, date, weekday, isSunday
 */
export function buildCalendarDays({ month, year, viewMode, rangeDirection }) {
  if (viewMode === "range15") {
    const start =
      rangeDirection === "forward"
        ? dayjs().year(year).month(month).date(15)
        : dayjs().year(year).month(month).subtract(1, "month").date(15);

    const end =
      rangeDirection === "forward"
        ? start.add(1, "month").date(15)
        : dayjs().year(year).month(month).date(15);

    const totalDays = end.diff(start, "day");

    return Array.from({ length: totalDays + 1 }, (_, index) => {
      const date = start.add(index, "day");
      return {
        dayjs: date,
        date: date.date(),
        weekday: date.format("dd"),
        isSunday: date.day() === 0,
      };
    });
  }

  // Полный месяц
  const dim = dayjs().year(year).month(month).daysInMonth();

  return Array.from({ length: dim }, (_, index) => {
    const date = dayjs().year(year).month(month).date(1).add(index, "day");
    return {
      dayjs: date,
      date: date.date(),
      weekday: date.format("dd"),
      isSunday: date.day() === 0,
    };
  });
}

/**
 * Генерирует массив дат (строки YYYY-MM-DD) для заказа
 * @param {Object} order - заказ с rentalStartDate и rentalEndDate
 * @returns {Array<string>} массив дат в формате YYYY-MM-DD
 */
export function buildOrderDateRange(order) {
  if (!order?.rentalStartDate || !order?.rentalEndDate) return [];

  const startDate = dayjs
    .utc(order.rentalStartDate)
    .tz(BUSINESS_TZ)
    .startOf("day");
  const endDate = dayjs
    .utc(order.rentalEndDate)
    .tz(BUSINESS_TZ)
    .startOf("day");
  const dates = [];

  let currentDate = startDate;
  while (currentDate.isSameOrBefore(endDate, "day")) {
    dates.push(currentDate.format("YYYY-MM-DD"));
    currentDate = currentDate.add(1, "day");
  }

  return dates;
}

/**
 * Возвращает индекс текущего дня в массиве days
 * @param {Array} days - массив дней календаря
 * @returns {number} индекс текущего дня или -1
 */
export function getTodayIndex(days) {
  const today = dayjs();
  return days.findIndex((d) => d.dayjs.isSame(today, "day"));
}

/**
 * Проверяет, является ли viewport мобильным телефоном
 * @returns {boolean}
 */
export function isPhoneViewport() {
  if (typeof window === "undefined") return false;

  const isPortraitPhone = window.matchMedia(
    "(max-width: 600px) and (orientation: portrait)"
  ).matches;

  const isSmallLandscape = window.matchMedia(
    "(max-width: 900px) and (orientation: landscape)"
  ).matches;

  return isPortraitPhone || isSmallLandscape;
}

/**
 * Скроллит контейнер календаря к текущему дню
 * @param {Object} params
 * @param {HTMLElement} params.container - контейнер календаря
 * @param {number} params.todayIndex - индекс текущего дня
 */
export function scrollCalendarToToday({ container, todayIndex }) {
  if (!container || todayIndex < 0) return;

  try {
    const table =
      container.querySelector(".MuiTable-root") ||
      container.querySelector("table");

    if (!table) return;

    const headerCells = table.querySelectorAll("thead .MuiTableCell-root");

    if (!headerCells || headerCells.length === 0) return;

    const offsetDays = 2;
    const desiredDayIdx = Math.max(0, todayIndex - offsetDays);
    const targetIndex = 1 + desiredDayIdx;

    if (targetIndex < 1 || targetIndex >= headerCells.length) return;

    const targetCell = headerCells[targetIndex];
    const firstCell = headerCells[0];

    const tableRect = table.getBoundingClientRect();
    const cellRect = targetCell.getBoundingClientRect();
    const firstRect = firstCell
      ? firstCell.getBoundingClientRect()
      : { width: 0 };

    const offset = cellRect.left - tableRect.left;
    const scrollLeft = Math.max(0, offset - firstRect.width - 4);

    if (typeof container.scrollTo === "function") {
      try {
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      } catch {
        container.scrollLeft = scrollLeft;
      }
    } else {
      container.scrollLeft = scrollLeft;
    }
  } catch {
    // ignore
  }
}

/* =========================
   Hooks
========================= */

/**
 * Хук для генерации дней календаря и вычисления todayIndex
 * @param {Object} params
 * @param {number} params.month - месяц (0-11)
 * @param {number} params.year - год
 * @param {string} params.viewMode - 'full' | 'range15'
 * @param {string} params.rangeDirection - 'forward' | 'backward'
 * @returns {{ days: Array, todayIndex: number }}
 */
export function useCalendarDays({ month, year, viewMode, rangeDirection }) {
  const days = useMemo(
    () => buildCalendarDays({ month, year, viewMode, rangeDirection }),
    [month, year, viewMode, rangeDirection]
  );

  const todayIndex = useMemo(() => getTodayIndex(days), [days]);

  return { days, todayIndex };
}

/**
 * Хук для автоматического скролла к текущему дню на мобильных устройствах
 * @param {Object} params
 * @param {Array} params.days - массив дней календаря
 * @param {number} params.todayIndex - индекс текущего дня
 */
export function useMobileCalendarScroll({ days, todayIndex }) {
  useEffect(() => {
    if (!isPhoneViewport()) return;

    const container =
      document.querySelector(".bigcalendar-root .MuiTableContainer-root") ||
      document.querySelector(".bigcalendar-root");

    if (!container) return;

    const runScroll = () =>
      scrollCalendarToToday({
        container,
        todayIndex,
      });

    const t = setTimeout(runScroll, 50);

    const onResize = () => setTimeout(runScroll, 50);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [todayIndex, days]);
}

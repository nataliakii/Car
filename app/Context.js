"use client";
import { useTranslation } from "react-i18next";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  fetchAllCars,
  reFetchAllOrders,
  reFetchActiveOrders,
  updateCar,
  deleteCar,
} from "@utils/action";
import { COMPANY_ID } from "@config/company";
import { buildPendingConfirmBlockMap } from "@/domain/orders/buildPendingConfirmBlockMap";

const MainContext = createContext({
  cars: [],
  allOrders: [],
  setCars: () => {},
  setAllOrders: () => {},
  fetchAndUpdateOrders: () => {}, // 🔴 ADMIN ONLY — fetches ALL orders
  fetchAndUpdateActiveOrders: () => {}, // ✅ CLIENT-SAFE — fetches only active orders
  ordersByCarId: () => {},
  isLoading: false,
  resubmitCars: () => {},
  scrolled: false,
  company: {},
  pendingConfirmBlockById: {}, // Map pending order ID -> block message
  conflictHighlightById: {}, // Map orderId -> { level: "block"|"warning", message: string, sourceOrderId?: string }
  setConflictHighlightsFromResult: () => {},
  clearConflictHighlights: () => {},
  clearConflictHighlightsAfter: () => {},
});

export function useMainContext() {
  return useContext(MainContext);
}

export const MainContextProvider = ({
  carsData,
  ordersData,
  companyData,
  children,
}) => {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);

  const changeLanguage = useCallback(
    (newLang) => {
      const supportedLngs = ["en", "el", "ru", "uk", "de", "bg", "ro", "sr"];
      if (supportedLngs.includes(newLang)) {
        i18n.changeLanguage(newLang);
        setLang(newLang);
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedLanguage", newLang);
        }
      }
    },
    [i18n]
  );

  // Эффект для синхронизации языка при изменении в i18n
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setLang(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  // Стабилизируем companyData с помощью useRef
  const companyDataRef = useRef(companyData);
  const hasLoadedCompanyRef = useRef(false);
  
  // Обновляем ref только если companyData действительно изменилась (по ID)
  const companyDataId = companyData?._id;
  useEffect(() => {
    if (companyData && companyData._id !== companyDataRef.current?._id) {
      companyDataRef.current = companyData;
      hasLoadedCompanyRef.current = true;
    }
  }, [companyData, companyDataId]);

  const [company, setCompany] = useState(companyDataRef.current || companyData);
  const [companyLoading, setCompanyLoading] = useState(!companyData);
  const [companyError, setCompanyError] = useState(null);

  // Загрузка компании ТОЛЬКО если она не была передана с сервера
  // Используем ref для предотвращения повторных загрузок
  useEffect(() => {
    // Если данные уже есть или уже загружались - не делаем повторный запрос
    if (companyData || hasLoadedCompanyRef.current) {
      setCompanyLoading(false);
      if (companyData) {
        setCompany(companyData);
      }
      return;
    }

    // Предотвращаем повторные вызовы
    if (hasLoadedCompanyRef.current) {
      return;
    }

    async function loadCompany() {
      hasLoadedCompanyRef.current = true;
      setCompanyLoading(true);
      setCompanyError(null);
      try {
        const { fetchCompany } = await import("@utils/action");
        const freshCompany = await fetchCompany(COMPANY_ID);
        setCompany(freshCompany);
        companyDataRef.current = freshCompany;
      } catch (err) {
        setCompanyError(err.message || "Ошибка загрузки компании");
        hasLoadedCompanyRef.current = false; // Разрешаем повторную попытку при ошибке
      } finally {
        setCompanyLoading(false);
      }
    }
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - загружаем только один раз при монтировании
  const [scrolled, setScrolled] = useState(false);
  
  // Стабилизируем начальные данные с помощью useRef
  const initialCarsRef = useRef(carsData);
  const initialOrdersRef = useRef(ordersData);
  
  // Обновляем refs только если данные действительно изменились (по длине или ID первого элемента)
  const carsDataLength = carsData?.length;
  const carsDataFirstId = carsData?.[0]?._id;
  useEffect(() => {
    if (carsData && carsData.length > 0) {
      const carsChanged = 
        !initialCarsRef.current || 
        initialCarsRef.current.length !== carsData.length ||
        initialCarsRef.current[0]?._id !== carsData[0]?._id;
      if (carsChanged) {
        initialCarsRef.current = carsData;
      }
    }
  }, [carsData, carsDataLength, carsDataFirstId]);
  
  const ordersDataLength = ordersData?.length;
  const ordersDataFirstId = ordersData?.[0]?._id;
  useEffect(() => {
    if (ordersData && ordersData.length > 0) {
      const ordersChanged = 
        !initialOrdersRef.current || 
        initialOrdersRef.current.length !== ordersData.length ||
        initialOrdersRef.current[0]?._id !== ordersData[0]?._id;
      if (ordersChanged) {
        initialOrdersRef.current = ordersData;
      }
    }
  }, [ordersData, ordersDataLength, ordersDataFirstId]);
  
  const [cars, setCars] = useState(initialCarsRef.current || []);
  const [allOrders, setAllOrders] = useState(initialOrdersRef.current || []);
  const [isLoading, setIsLoading] = useState(false);
  
  // Синхронизируем state с пропсами только если данные действительно изменились
  useEffect(() => {
    if (carsData && carsData.length > 0) {
      const carsChanged = 
        cars.length !== carsData.length ||
        cars[0]?._id !== carsData[0]?._id;
      if (carsChanged) {
        setCars(carsData);
      }
    }
  }, [carsData?.length, carsData?.[0]?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (ordersData && ordersData.length > 0) {
      const ordersChanged = 
        allOrders.length !== ordersData.length ||
        allOrders[0]?._id !== ordersData[0]?._id;
      if (ordersChanged) {
        setAllOrders(ordersData);
      }
    }
  }, [ordersData?.length, ordersData?.[0]?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedTransmission, setSelectedTransmission] = useState("All"); // Новый фильтр по коробке передач
  const arrayOfAvailableClasses = useMemo(() => {
    return [...new Set(cars.map((car) => car.class))];
  }, [cars]);
  const arrayOfAvailableTransmissions = useMemo(() => {
    return [...new Set(cars.map((car) => car.transmission))];
  }, [cars]);
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    setScrolled(scrollPosition > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ============================================================
  // 🔴 ADMIN ONLY — Fetches ALL orders including historical data.
  // Use fetchAndUpdateActiveOrders() for client/public pages.
  // ============================================================
  const fetchAndUpdateOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const newOrdersData = await reFetchAllOrders();
      setAllOrders(newOrdersData);
      if (process.env.NODE_ENV === "development") {
        console.log("Updated orders data:", newOrdersData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching orders:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================
  // ✅ CLIENT-SAFE — Fetches only active orders (startDate >= today Athens).
  // Use this in client/public pages (BookingModal, CarItemComponent, etc.)
  // ============================================================
  const fetchAndUpdateActiveOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const newOrdersData = await reFetchActiveOrders();
      setAllOrders(newOrdersData);
      if (process.env.NODE_ENV === "development") {
        console.log("Updated active orders data:", newOrdersData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching active orders:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resubmitCars = useCallback(async (callback) => {
    setIsLoading(true);
    try {
      const newCarsData = await fetchAllCars({ skipCache: true });
      setCars(newCarsData);
      if (process.env.NODE_ENV === "development") {
        console.log("Updated cars data:", newCarsData);
      }

      if (typeof callback === "function") {
        callback(newCarsData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching cars:", error);
      }
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCarInContext = useCallback(async (updatedCar) => {
    try {
      const newCar = await updateCar(updatedCar);
      setCars((prevCars) =>
        prevCars.map((car) => (car._id === newCar._id ? newCar : car))
      );
      if (process.env.NODE_ENV === "development") {
        console.log("FROM CONTEXT?", newCar.photoUrl);
      }
      setUpdateStatus({
        type: 200,
        message: "Car updated successfully",
        data: newCar,
      });
      return { data: newCar, type: 200, message: "Car updated successfully" };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update car:", error);
      }
      setUpdateStatus({
        type: 500,
        message: error.message || "Car WAS NOT successfully",
      });
    }
  }, []);

  const deleteCarInContext = useCallback(async (carId) => {
    try {
      const response = await fetch(`/api/car/delete/${carId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setCars((prevCars) => prevCars.filter((car) => car._id !== carId));
        return { success: true, message: data.message };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          errorMessage: errorData.error || "Failed to delete car",
        };
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error deleting car:", error);
      }
      return {
        success: false,
        errorMessage: error.message || "An unexpected error occurred",
      };
    }
  }, []);

  // Функция для обновления компании в контексте
  const updateCompanyInContext = useCallback(async (companyId, updatedCompany = null) => {
    try {
      if (updatedCompany && typeof updatedCompany === "object") {
        if (process.env.NODE_ENV === "development") {
          console.log("[MainContext] Updating company from mutation response", {
            oldBufferTime: company?.bufferTime,
            newBufferTime: updatedCompany?.bufferTime,
          });
        }
        setCompany(updatedCompany);
        companyDataRef.current = updatedCompany;
        return { success: true, data: updatedCompany };
      }

      const { fetchCompany } = await import("@utils/action");
      const freshCompany = await fetchCompany(companyId, { skipCache: true });
      if (process.env.NODE_ENV === "development") {
        if (process.env.NODE_ENV === "development") {
          console.log("[MainContext] Updating company", {
            oldBufferTime: company?.bufferTime,
            newBufferTime: freshCompany?.bufferTime,
          });
        }
      }
      setCompany(freshCompany);
      companyDataRef.current = freshCompany;
      return { success: true, data: freshCompany };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error updating company in context:", error);
      }
      return {
        success: false,
        errorMessage: error.message || "Failed to update company",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // company не нужен в зависимостях, так как мы используем его только для логирования
  const ordersByCarId = useCallback(
    (carId) => {
      return allOrders?.filter((order) => {
        const orderCarId = order.car?._id ?? order.car;
        return orderCarId != null && String(orderCarId) === String(carId);
      }) ?? [];
    },
    [allOrders]
  );

  // 🎯 Computed map: какие pending заказы НЕ МОГУТ быть подтверждены
  // Извлекаем bufferTime чтобы избежать пересчёта при изменении других полей company
  const bufferTime = company?.bufferTime;
  
  const { pendingConfirmBlockById } = useMemo(() => {
    // Ранний выход если нет заказов - нечего считать
    if (!allOrders || allOrders.length === 0) {
      return { pendingConfirmBlockById: {} };
    }
    
    // Передаём объект с bufferTime для совместимости с buildPendingConfirmBlockMap
    return buildPendingConfirmBlockMap(allOrders, { bufferTime });
  }, [allOrders, bufferTime]);

  // 🎯 Conflict highlight state for calendar visualization
  const [conflictHighlightById, setConflictHighlightById] = useState({});

  // Helper: Build conflict highlight map from API result
  const setConflictHighlightsFromResult = useCallback(({ sourceOrderId, result }) => {
    if (!result || !sourceOrderId) return;

    const map = {};

    // Highlight the source order (the one being updated)
    map[sourceOrderId] = {
      level: result.level || "block",
      message: result.message || "Update blocked",
      sourceOrderId: sourceOrderId,
    };

    // Highlight conflicting orders (blockedByConfirmed)
    if (result.conflicts && Array.isArray(result.conflicts)) {
      result.conflicts.forEach((conflict) => {
        const conflictOrderId = conflict.orderId || conflict._id;
        if (conflictOrderId) {
          map[conflictOrderId] = {
            level: "block",
            message: result.message || "Conflicts with this order",
            sourceOrderId: sourceOrderId,
          };
        }
      });
    }

    // Highlight affected pending orders (optional warning)
    if (result.affectedOrders && Array.isArray(result.affectedOrders)) {
      result.affectedOrders.forEach((affected) => {
        const affectedOrderId = affected.orderId || affected._id;
        if (affectedOrderId && !map[affectedOrderId]) {
          map[affectedOrderId] = {
            level: "warning",
            message: "Pending order affected by confirmation",
            sourceOrderId: sourceOrderId,
          };
        }
      });
    }

    setConflictHighlightById(map);
  }, []);

  // Helper: Clear all conflict highlights
  const clearConflictHighlights = useCallback(() => {
    setConflictHighlightById({});
  }, []);

  // Helper: Clear conflict highlights after delay
  const clearConflictHighlightsAfter = useCallback((ms = 20000) => {
    const timer = setTimeout(() => {
      setConflictHighlightById({});
    }, ms);
    return () => clearTimeout(timer);
  }, []);

  const contextValue = useMemo(
    () => ({
      cars,
      allOrders,
      setCars,
      setAllOrders,
      fetchAndUpdateOrders, // 🔴 ADMIN ONLY
      fetchAndUpdateActiveOrders, // ✅ CLIENT-SAFE
      ordersByCarId,
      isLoading,
      setIsLoading,
      resubmitCars,
      scrolled,
      updateCarInContext,
      deleteCarInContext,
      error,
      updateStatus,
      setUpdateStatus,
      setSelectedClass,
      selectedClass,
      arrayOfAvailableClasses,
      setSelectedTransmission, // Новые значения для фильтра коробки передач
      selectedTransmission,
      arrayOfAvailableTransmissions,
      lang,
      setLang,
      changeLanguage, // Добавляем функцию смены языка
      company,
      companyLoading,
      companyError,
      updateCompanyInContext, // Функция для обновления компании
      pendingConfirmBlockById, // 🎯 Map pending order ID -> block message
      conflictHighlightById, // 🎯 Map orderId -> conflict highlight info
      setConflictHighlightsFromResult, // Helper to set highlights from API result
      clearConflictHighlights, // Helper to clear all highlights
      clearConflictHighlightsAfter, // Helper to clear highlights after delay
    }),
    [
      cars,
      arrayOfAvailableClasses,
      arrayOfAvailableTransmissions,
      error,
      ordersByCarId,
      updateStatus,
      allOrders,
      isLoading,
      scrolled,
      selectedClass,
      selectedTransmission,
      lang,
      changeLanguage,
      company,
      companyLoading,
      companyError,
      updateCompanyInContext,
      fetchAndUpdateOrders,
      fetchAndUpdateActiveOrders,
      resubmitCars,
      updateCarInContext,
      deleteCarInContext,
      pendingConfirmBlockById,
      conflictHighlightById,
      setConflictHighlightsFromResult,
      clearConflictHighlights,
      clearConflictHighlightsAfter,
    ]
  );

  return (
    <MainContext.Provider value={contextValue}>{children}</MainContext.Provider>
  );
};

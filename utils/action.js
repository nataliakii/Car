import { revalidateTag } from "next/cache";
export const API_URL =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_LOCAL_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL;

// Fetch a single car by ID using fetch
export const fetchCar = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/car/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      throw new Error("Car not found");
    }

    const data = await response.json();
    console.log("Fetched Car:", data);
    return data;
  } catch (error) {
    console.error("Error fetching car:", error.message);
    throw error;
  }
};

// Fetch all cars using fetch
export const fetchAll = async () => {
  try {
    const apiUrl = `${API_URL}/api/car/all`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch cars");
    }
    const carsData = await response.json();
    return carsData;
  } catch (error) {
    console.error("Error fetching cars:", error);
    throw error;
  }
};

// Fetch all orders using fetch
export const fetchAllOrders = async () => {
  try {
    const apiUrl = `${API_URL}/api/order/all`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: {
        tags: ["orders"],
        revalidate: 30,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }
    const ordersData = await response.json();
    return ordersData;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// Add a new order using fetch
export const addOrder = async (orderData) => {
  try {
    console.log(orderData);

    const response = await fetch(`${API_URL}/api/order/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error(`Failed to add order. Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Order added:", result);

    return result;
  } catch (error) {
    console.error("Error adding order:", error.message);
    throw error;
  }
};

//Adding new order using new order api
export const addOrderNew = async (orderData) => {
  try {
    console.log(orderData);

    const response = await fetch(`${API_URL}/api/order/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Order added:", result);
      return { status: "success", data: result };
    } else if (response.status === 402) {
      // Non-confirmed dates conflict
      return { status: "pending", message: result.message };
    } else if (response.status === 409) {
      // Confirmed dates conflict
      return { status: "conflict", message: result.message };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error occurred:", error.message);

    // Handling fetch-specific errors
    if (error.message === "Failed to fetch") {
      return { status: "error", message: "No response received from server." };
    } else {
      return {
        status: "error",
        message: error.message || "An error occurred.",
      };
    }
  }
};

// Fetch orders by car ID using fetch
export const fetchOrdersByCar = async (carId) => {
  try {
    const response = await fetch(`${API_URL}/api/order/${carId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }

    const orders = await response.json();
    return orders; // Return the orders data
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// Update price using fetch
export const updatePrice = async (restId, menuNumber, newPrice) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/priceUpd`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restId, menuNumber, newPrice }),
    });

    if (!response.ok) {
      throw new Error("Failed to update price");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating price:", error);
    throw error;
  }
};

// Toggle active status using fetch
export const toggleIsActive = async (restId, menuNumber) => {
  try {
    const apiUrl = `${API_URL}/api/auth/toggleActive`;
    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restId, menuNumber }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to toggle isActive status of the menu item with number ${menuNumber}`
      );
    }

    const updatedMenu = await response.json();
    return updatedMenu;
  } catch (error) {
    console.error(
      `Error toggling isActive status with rest ID ${restId} and menu number ${menuNumber}:`,
      error
    );
    throw error;
  }
};

// Update name using fetch
export const updateName = async (restId, menuNumber, newName, lang = "en") => {
  try {
    const apiUrl = `${API_URL}/api/auth/changeName`;
    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restId, menuNumber, newName, lang }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update name of the menu item with number ${menuNumber} in ${lang}`
      );
    }

    const updatedMenu = await response.json();
    return updatedMenu;
  } catch (error) {
    console.error(
      `Error updating name in English with rest ID ${restId} and menu number ${menuNumber}:`,
      error
    );
    throw error;
  }
};

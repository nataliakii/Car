import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
// 🔧 FIX: Import Car model to ensure it's registered before pre-save middleware
import { Car } from "./car";
import { getBusinessRentalDaysByMinutes } from "@/domain/orders/numberOfDays";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.utc();

const OrderSchema = new mongoose.Schema({
  rentalStartDate: {
    type: Date,
    required: true,
    set: (value) => dayjs(value).utc().toDate(),
  },
  rentalEndDate: {
    type: Date,
    required: true,
    set: (value) => dayjs(value).utc().toDate(),
  },
  timeIn: {
    type: Date,
    default: function () {
      if (this.rentalStartDate) {
        return dayjs(this.rentalStartDate).hour(12).minute(0).utc().toDate();
      }
      return null;
    },
  },
  timeOut: {
    type: Date,
    default: function () {
      if (this.rentalEndDate) {
        return dayjs(this.rentalEndDate).hour(10).minute(0).utc().toDate();
      }
      return null;
    },
  },
  placeIn: {
    type: String,
    default: "Nea Kallikratia",
  },
  placeOut: {
    type: String,
    default: "Nea Kallikratia",
  },
  customerName: {
    type: String,
    required: true,
  },
  carNumber: {
    type: String,
    required: true,
  },
  regNumber: {
    type: String,
    default: "",
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  IsConfirmedEmailSent: {
    type: Boolean,
    default: false,
  },
  confirmationEmailHistory: {
    type: [
      {
        sentAt: {
          type: Date,
          default: Date.now,
        },
        sentTo: {
          type: String,
          default: "",
        },
        cc: {
          type: String,
          default: "",
        },
        locale: {
          type: String,
          default: "en",
        },
        sentBy: {
          id: {
            type: String,
            default: "",
          },
          name: {
            type: String,
            default: "",
          },
          email: {
            type: String,
            default: "",
          },
          role: {
            type: String,
            default: "",
          },
        },
        snapshot: {
          rentalStartDate: {
            type: Date,
            default: null,
          },
          rentalEndDate: {
            type: Date,
            default: null,
          },
          timeIn: {
            type: Date,
            default: null,
          },
          timeOut: {
            type: Date,
            default: null,
          },
          totalPrice: {
            type: Number,
            default: null,
          },
          overridePrice: {
            type: Number,
            default: null,
          },
          effectiveTotalPrice: {
            type: Number,
            default: null,
          },
        },
        changesSincePrevious: {
          hasPrevious: {
            type: Boolean,
            default: false,
          },
          hasChanges: {
            type: Boolean,
            default: false,
          },
          price: {
            changed: {
              type: Boolean,
              default: false,
            },
            old: {
              type: Number,
              default: null,
            },
            new: {
              type: Number,
              default: null,
            },
          },
          dates: {
            changed: {
              type: Boolean,
              default: false,
            },
            oldStartDate: {
              type: Date,
              default: null,
            },
            newStartDate: {
              type: Date,
              default: null,
            },
            oldEndDate: {
              type: Date,
              default: null,
            },
            newEndDate: {
              type: Date,
              default: null,
            },
          },
          times: {
            changed: {
              type: Boolean,
              default: false,
            },
            oldTimeIn: {
              type: Date,
              default: null,
            },
            newTimeIn: {
              type: Date,
              default: null,
            },
            oldTimeOut: {
              type: Date,
              default: null,
            },
            newTimeOut: {
              type: Date,
              default: null,
            },
          },
        },
      },
    ],
    default: [],
  },
  hasConflictDates: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Order",
    default: [],
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false, // исправлено на false, чтобы email был необязательным
  },
  secondDriver: {
    type: Boolean,
    default: false,
  },
  Viber: {
    type: Boolean,
    default: false,
  },
  Whatsapp: {
    type: Boolean,
    default: false,
  },
  Telegram: {
    type: Boolean,
    default: false,
  },
  numberOfDays: {
    type: Number,
  },
  /**
   * totalPrice
   * Auto-calculated rental price based on car, dates, and options.
   * This value is ALWAYS preserved as the real calculated price.
   * Never manually overridden - use OverridePrice for manual pricing.
   */
  totalPrice: {
    type: Number,
    required: true,
  },
  /**
   * OverridePrice
   * Manual price entered by admin/superadmin.
   * If set, it overrides totalPrice in UI and payments.
   * Set to null to return to automatic pricing.
   * 
   * Rules:
   * - OverridePrice NEVER changes automatically
   * - When rental params change, totalPrice recalculates but OverridePrice stays
   * - Admin must explicitly reset OverridePrice to return to auto pricing
   */
  OverridePrice: {
    type: Number,
    default: null,
  },
  carModel: {
    type: String,
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
    required: true,
  },
  date: {
    type: Date,
    default: dayjs().tz("Europe/Athens").toDate(),
  },
  my_order: {
    type: Boolean,
    default: false,
  },
  /**
   * Role of admin who created this order:
   * 0 = regular admin (default)
   * 1 = superadmin
   * 
   * Used for permission control:
   * - If my_order=true OR createdByRole=1, only superadmin can edit/delete
   */
  createdByRole: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  /**
   * ID of admin who created this order (optional tracking)
   */
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  ChildSeats: {
    type: Number,
    default: 0,
  },
  // 🔧 TEMPORARY: Support old field name during migration
  // This will be removed after migration is complete
  childSeats: {
    type: Number,
    default: 0,
    select: false, // Don't include in queries by default
  },
  insurance: {
    type: String,
    default: "TPL", // "TPL", "CDW"
  },
  franchiseOrder: {
    type: Number,
    default: 0,
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  flightNumber: {
    type: String,
    default: "",
  },
});

// 🔧 MIGRATION SUPPORT: Sync childSeats (old) to ChildSeats (new) if needed
OrderSchema.pre("save", async function (next) {
  // If childSeats exists but ChildSeats doesn't, copy value
  if (this.childSeats !== undefined && this.ChildSeats === undefined) {
    this.ChildSeats = this.childSeats;
  }
  // Always use ChildSeats for calculations
  const childSeatsValue = this.ChildSeats ?? this.childSeats ?? 0;
  
  const calculationStart = this.timeIn ?? this.rentalStartDate;
  const calculationEnd = this.timeOut ?? this.rentalEndDate;
  this.numberOfDays = getBusinessRentalDaysByMinutes(
    calculationStart,
    calculationEnd
  );

  // Fetch car details and calculate price based on the number of days
  // 🔧 FIX: Use imported Car model instead of mongoose.model() to avoid registration errors
  const car = await Car.findById(this.car);

  if (car) {
    this.carNumber = car.carNumber;
    this.regNumber = car.regNumber || "";
    this.carModel = car.model;

    // Новый алгоритм расчёта итоговой цены
    const { total } = await car.calculateTotalRentalPricePerDay(
      calculationStart,
      calculationEnd,
      this.insurance,
      childSeatsValue,
      Boolean(this.secondDriver)
    );
    this.totalPrice = total;
  }

  next();
});

// 🔧 MIGRATION SUPPORT: After loading, sync childSeats to ChildSeats if needed
OrderSchema.post("init", function () {
  if (this.childSeats !== undefined && (this.ChildSeats === undefined || this.ChildSeats === 0)) {
    this.ChildSeats = this.childSeats;
  }
});

const Order = mongoose.models?.Order || mongoose.model("Order", OrderSchema);

// HMR/cache safety: ensure secondDriver path exists on cached model schema.
if (Order?.schema && !Order.schema.path("secondDriver")) {
  Order.schema.add({
    secondDriver: {
      type: Boolean,
      default: false,
    },
  });
}

// HMR/cache safety: ensure IsConfirmedEmailSent exists on cached model schema.
if (Order?.schema && !Order.schema.path("IsConfirmedEmailSent")) {
  Order.schema.add({
    IsConfirmedEmailSent: {
      type: Boolean,
      default: false,
    },
  });
}

// HMR/cache safety: ensure confirmationEmailHistory exists on cached model schema.
if (Order?.schema && !Order.schema.path("confirmationEmailHistory")) {
  Order.schema.add({
    confirmationEmailHistory: {
      type: Array,
      default: [],
    },
  });
}

// HMR/cache safety: ensure regNumber exists on cached model schema.
if (Order?.schema && !Order.schema.path("regNumber")) {
  Order.schema.add({
    regNumber: {
      type: String,
      default: "",
    },
  });
}

export { OrderSchema, Order };

import {
  DEFAULT_LOCALE,
  LOCATION_CONTENT_KEYS,
  LOCATION_IDS,
  STATIC_PAGE_KEYS,
  SUPPORTED_LOCALES,
  type LocationContentKey,
  type SupportedLocale,
} from "./locationSeoKeys";
import type {
  LocaleSeoDictionary,
  LocationSeoContent,
  LocationSeoFaqItem,
  LocationSeoRepoItem,
} from "./types";
import {
  appendLocationBookingSentence,
  shouldApplyLocationBookingCopyToContentKey,
} from "./locationBookingCopy";

type PartialLocaleRecord<T> = Partial<Record<SupportedLocale, T>>;

function expandLocaleRecord<T>(partial: PartialLocaleRecord<T>): Record<SupportedLocale, T> {
  const fallback = partial[DEFAULT_LOCALE];
  if (!fallback) {
    throw new Error("[locationSeoRepo] Missing default locale content");
  }

  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    acc[locale] = partial[locale] || fallback;
    return acc;
  }, {} as Record<SupportedLocale, T>);
}

const localeSeoDictionaryRaw: PartialLocaleRecord<LocaleSeoDictionary> = {
  en: {
    hub: {
      h1: "Car Rental in Halkidiki and Thessaloniki",
      seoTitle: "Car Rental in Halkidiki, Thessaloniki and Airport | Natali Cars",
      seoDescription:
        "Book a rental car in Halkidiki, Thessaloniki city, and Thessaloniki Airport with localized pickup options, transparent pricing, and direct support.",
      introText:
        "Natali Cars provides car rental coverage across Halkidiki sub-regions and Thessaloniki access points with one booking flow and location-specific pickup guidance.",
    },
    car: {
      seoTitleTemplate: "Rent {carModel} in Halkidiki | Natali Cars",
      seoDescriptionTemplate:
        "Book {carModel} car rental in Halkidiki with pickup at Thessaloniki Airport (SKG) or {locationName}. {transmission} transmission, air conditioning, fuel efficient. Comfortable and easy to drive.",
      carH1Template: "Rent {carModel} in {locationName}",
      introTemplate:
        "The {carModel} is available for rent in {locationName} with flexible pickup and return options. {transmission} transmission, {fuelType} fuel, {seats} seats — a great choice for your trip to Halkidiki.",
      introLongTemplate:
        "The {carModel} is one of the most convenient cars to rent in {locationName}. This compact and fuel-efficient vehicle is ideal for exploring beaches, villages and scenic coastal roads. With {transmission} transmission and air conditioning, the {carModel} offers comfortable driving both in Thessaloniki city traffic and along the Halkidiki peninsula. Natali Cars offers pickup at Thessaloniki Airport (SKG) and Nea Kallikratia, making it easy to start your trip immediately after arrival. All rentals include comprehensive insurance and free cancellation. Book online to secure the best rate for your dates.",
      specsTitle: "Vehicle Specifications",
      quickSpecsTitle: "At a glance",
      featuresTitle: "Features of {carModel}",
      whyRentTitle: "Why choose {carModel} for your {locationName} trip",
      whyRentBullets: [
        "Easy parking — compact size fits narrow village streets",
        "Fuel efficient — lower cost for long drives",
        "Perfect for couples or small families",
        "Reliable and comfortable for city and coast",
      ],
      faqTitle: "Frequently Asked Questions",
      faq: [
        { question: "Can I pick up this car at Thessaloniki Airport?", answer: "Yes, we offer pickup and return at Thessaloniki Airport (SKG), as well as at locations across Halkidiki including Nea Kallikratia, Kassandra, and Sithonia." },
        { question: "Is insurance included in the rental price?", answer: "Basic TPL insurance is included at no extra cost. You can also add full CDW coverage for additional peace of mind during your rental." },
        { question: "Do I need a credit card to rent a car?", answer: "No, a credit card is not required. We accept cash payments and offer rentals without a deposit on selected vehicles." },
        { question: "What documents do I need to rent a car?", answer: "You need a valid driving license held for at least 1 year and a passport or ID card. International driving permits are accepted." },
        { question: "Can I return the car to a different location?", answer: "Yes, one-way rentals are available. You can pick up in one location and return in another across our Halkidiki and Thessaloniki network." },
      ],
      breadcrumbHome: "Home",
      breadcrumbCars: "Cars",
      breadcrumbCarRentalLocation: "Car rental {locationName}",
      pickupTitle: "Pickup Locations",
      pillarLinksTitle: "Car rental by location",
    },
    links: {
      hubToLocationsTitle: "Explore Car Rental Locations",
      locationToCarsTitle: "Available Cars for This Location",
      locationToHubLabel: "Back to Main Car Rental Hub",
      locationToParentLabel: "Back to Parent Location",
      locationToChildrenTitle: "Sub-locations",
      locationToSiblingTitle: "Nearby Alternative Locations",
      carsToLocationsTitle: "Popular Pickup Locations",
      carsToHubLabel: "Back to Main Hub",
      carsListTitle: "Browse Car Models",
      mainHubLabel: "Main Car Rental Hub",
      locationSearchCtaLabel: "Search cars in {locationName}",
      locationHeroCtaLabel: "Find your car",
      pickupGuidanceTitle: "Pickup guidance",
      nearbyPlacesTitle: "Nearby places",
      usefulTipsTitle: "Useful tips",
      distanceToThessalonikiTitle: "Distance to Thessaloniki",
      localFaqTitle: "Local FAQ",
      navLocationsDropdownDescription:
        "Pickup and return across Thessaloniki, airport, and Halkidiki peninsula. Choose your area for details and car search.",
      otherCarsTitle: "Other cars you may like",
    },
    staticPages: {
      [STATIC_PAGE_KEYS.CONTACTS]: {
        seoTitle: "Contact Natali Cars | Car Rental Support",
        seoDescription:
          "Contact Natali Cars for booking questions, pickup planning, and support for Halkidiki and Thessaloniki car rental.",
      },
      [STATIC_PAGE_KEYS.PRIVACY_POLICY]: {
        seoTitle: "Privacy Policy | Natali Cars",
        seoDescription:
          "Read how Natali Cars processes and protects personal data for bookings and customer communication.",
      },
      [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: {
        seoTitle: "Terms of Service | Natali Cars",
        seoDescription:
          "Review Natali Cars service terms, booking obligations, and responsibilities for rental agreements.",
      },
      [STATIC_PAGE_KEYS.COOKIE_POLICY]: {
        seoTitle: "Cookie Policy | Natali Cars",
        seoDescription:
          "Learn which cookies Natali Cars uses and how they support booking flow, analytics, and website performance.",
      },
      [STATIC_PAGE_KEYS.RENTAL_TERMS]: {
        seoTitle: "Rental Terms and Conditions | Natali Cars",
        seoDescription:
          "Review Natali Cars rental conditions, insurance scope, and vehicle handover rules before booking.",
      },
    },
  },
  ru: {
    hub: {
      h1: "Прокат авто в Халкидиках и Салониках",
      seoTitle: "Прокат авто в Халкидиках, Салониках и аэропорту | Natali Cars",
      seoDescription:
        "Арендуйте автомобиль в Халкидиках, Салониках и аэропорту Салоники с локальными точками выдачи и прозрачными условиями.",
      introText:
        "Natali Cars покрывает основные зоны Халкидик и Салоник через единую систему бронирования и локальные SEO-страницы.",
    },
    car: {
      seoTitleTemplate: "Аренда {carModel} в Халкидиках | Natali Cars",
      seoDescriptionTemplate:
        "Забронируйте аренду {carModel} в Халкидиках с подачей в аэропорту Салоников (SKG) или {locationName}. {transmission}, кондиционер, экономичный расход.",
      carH1Template: "Аренда {carModel} в {locationName}",
      introTemplate:
        "{carModel} доступен для аренды в {locationName} с гибкими условиями выдачи и возврата. КПП {transmission}, топливо {fuelType}, {seats} мест — отличный выбор для поездки в Халкидики.",
      introLongTemplate:
        "{carModel} — один из самых удобных автомобилей для аренды в {locationName}. Компактный и экономичный, он идеален для поездок по пляжам, деревням и живописным дорогам побережья. С {transmission} и кондиционером {carModel} обеспечивает комфортную езду и в городе Салоники, и по полуострову Халкидики. Natali Cars предлагает подачу в аэропорту Салоников (SKG) и в Неа Каликратии. В стоимость входят страховка и бесплатная отмена. Забронируйте онлайн по лучшей цене.",
      specsTitle: "Характеристики автомобиля",
      quickSpecsTitle: "Кратко",
      featuresTitle: "Особенности {carModel}",
      whyRentTitle: "Почему выбрать {carModel} для поездки в {locationName}",
      whyRentBullets: [
        "Удобная парковка — компактный размер для узких улиц",
        "Экономичный расход — выгодно для дальних поездок",
        "Идеален для пары или небольшой семьи",
        "Надёжный и комфортный в городе и на побережье",
      ],
      faqTitle: "Часто задаваемые вопросы",
      faq: [
        { question: "Можно ли забрать этот автомобиль в аэропорту Салоников?", answer: "Да, мы предлагаем выдачу и возврат в аэропорту Салоников (SKG), а также в Халкидиках: Неа Каликратия, Кассандра, Ситония." },
        { question: "Включена ли страховка в стоимость аренды?", answer: "Базовая страховка ОСАГО (TPL) включена бесплатно. Вы также можете добавить полное КАСКО (CDW) для дополнительной защиты." },
        { question: "Нужна ли кредитная карта для аренды?", answer: "Нет, кредитная карта не требуется. Мы принимаем оплату наличными и предлагаем аренду без депозита на отдельные автомобили." },
        { question: "Какие документы нужны для аренды?", answer: "Вам понадобятся действующие водительские права со стажем не менее 1 года и паспорт или удостоверение личности. Принимаются международные права." },
        { question: "Можно ли вернуть машину в другом месте?", answer: "Да, возможна аренда в одну сторону. Вы можете получить авто в одной точке и вернуть в другой по нашей сети в Халкидиках и Салониках." },
      ],
      breadcrumbHome: "Главная",
      breadcrumbCars: "Автомобили",
      breadcrumbCarRentalLocation: "Аренда авто в {locationName}",
      pickupTitle: "Пункты выдачи",
      pillarLinksTitle: "Аренда авто по локациям",
    },
    links: {
      hubToLocationsTitle: "Локации проката авто",
      locationToCarsTitle: "Автомобили для этой локации",
      locationToHubLabel: "Вернуться в главный хаб",
      locationToParentLabel: "Вернуться к родительской локации",
      locationToChildrenTitle: "Подлокации",
      locationToSiblingTitle: "Альтернативные ближайшие локации",
      carsToLocationsTitle: "Популярные точки выдачи",
      carsToHubLabel: "Вернуться в главный хаб",
      carsListTitle: "Список моделей",
      mainHubLabel: "Главный хаб проката",
      locationSearchCtaLabel: "Поиск авто в {locationName}",
      locationHeroCtaLabel: "Подобрать авто",
      pickupGuidanceTitle: "Инструкция по выдаче",
      nearbyPlacesTitle: "Рядом",
      usefulTipsTitle: "Полезные советы",
      distanceToThessalonikiTitle: "Расстояние до Салоник",
      localFaqTitle: "Частые вопросы",
      navLocationsDropdownDescription:
        "Выдача и возврат в Салониках, аэропорту и на полуострове Халкидики. Выберите район для деталей и поиска авто.",
      otherCarsTitle: "Другие автомобили, которые могут вам понравиться",
    },
    staticPages: {
      [STATIC_PAGE_KEYS.CONTACTS]: {
        seoTitle: "Контакты Natali Cars | Поддержка проката авто",
        seoDescription:
          "Свяжитесь с Natali Cars по вопросам бронирования, выдачи автомобиля и поддержки по Халкидикам и Салоникам.",
      },
      [STATIC_PAGE_KEYS.PRIVACY_POLICY]: {
        seoTitle: "Политика конфиденциальности | Natali Cars",
        seoDescription:
          "Узнайте, как Natali Cars обрабатывает персональные данные при бронировании и клиентской коммуникации.",
      },
      [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: {
        seoTitle: "Условия сервиса | Natali Cars",
        seoDescription:
          "Ознакомьтесь с условиями сервиса Natali Cars и обязанностями сторон при аренде автомобиля.",
      },
      [STATIC_PAGE_KEYS.COOKIE_POLICY]: {
        seoTitle: "Политика cookies | Natali Cars",
        seoDescription:
          "Узнайте, какие cookies используются на сайте Natali Cars и для каких задач они нужны.",
      },
      [STATIC_PAGE_KEYS.RENTAL_TERMS]: {
        seoTitle: "Условия аренды | Natali Cars",
        seoDescription:
          "Проверьте правила аренды, страховки и передачи автомобиля перед бронированием в Natali Cars.",
      },
    },
  },
  uk: {
    hub: {
      h1: "Оренда авто в Халкідіках і Салоніках",
      seoTitle: "Оренда авто в Халкідіках, Салоніках і аеропорту | Natali Cars",
      seoDescription:
        "Орендуйте авто в Халкідіках, Салоніках і аеропорту Салоніки з локальними точками отримання та прозорими умовами.",
      introText:
        "Natali Cars покриває ключові локації Халкідік та Салонік через єдину систему бронювання і локальні SEO-сторінки.",
    },
    car: {
      seoTitleTemplate: "Оренда {carModel} в Халкідіках | Natali Cars",
      seoDescriptionTemplate:
        "Забронюйте оренду {carModel} в Халкідіках з подачею в аеропорту Салонік (SKG) або {locationName}. {transmission}, кондиціонер, економний витрата.",
      carH1Template: "Оренда {carModel} у {locationName}",
      introTemplate:
        "{carModel} доступний для оренди в {locationName} з гнучкими умовами видачі та повернення. КПП {transmission}, паливо {fuelType}, {seats} місць — чудовий вибір для подорожі до Халкідік.",
      introLongTemplate:
        "{carModel} — один із найзручніших автомобілів для оренди у {locationName}. Компактний та економний, він ідеальний для поїздок узбережжям, селами та мальовничими дорогами. З {transmission} та кондиціонером {carModel} забезпечує комфортну їзду в місті Салоніки та по Халкідіках. Natali Cars пропонує подачу в аеропорту Салонік (SKG) та в Неа Калікратії. У вартість входить страховка та безкоштовне скасування.",
      specsTitle: "Характеристики автомобіля",
      quickSpecsTitle: "Коротко",
      featuresTitle: "Особливості {carModel}",
      whyRentTitle: "Чому обрати {carModel} для поїздки у {locationName}",
      whyRentBullets: [
        "Зручна парковка — компактний розмір для вузьких вулиць",
        "Економний витрата палива",
        "Ідеален для пари або невеликої сім'ї",
        "Надійний і комфортний у місті та на узбережжі",
      ],
      faqTitle: "Поширені запитання",
      faq: [
        { question: "Чи можна забрати цей автомобіль в аеропорту Салонік?", answer: "Так, ми пропонуємо видачу та повернення в аеропорту Салонік (SKG), а також у Халкідіках: Неа Калікратія, Кассандра, Сітонія." },
        { question: "Чи включена страховка у вартість оренди?", answer: "Базова страховка ОСАГО (TPL) включена безкоштовно. Ви також можете додати повне КАСКО (CDW) для додаткового захисту." },
        { question: "Чи потрібна кредитна картка для оренди?", answer: "Ні, кредитна картка не потрібна. Ми приймаємо оплату готівкою та пропонуємо оренду без депозиту на окремі автомобілі." },
        { question: "Які документи потрібні для оренди?", answer: "Вам знадобляться дійсне водійське посвідчення зі стажем не менше 1 року та паспорт або посвідчення особи. Приймаються міжнародні права." },
        { question: "Чи можна повернути авто в іншому місці?", answer: "Так, можлива оренда в один бік. Ви можете отримати авто в одній точці та повернути в іншій по нашій мережі в Халкідіках і Салоніках." },
      ],
      breadcrumbHome: "Головна",
      breadcrumbCars: "Автомобілі",
      breadcrumbCarRentalLocation: "Оренда авто у {locationName}",
      pickupTitle: "Пункти видачі",
      pillarLinksTitle: "Оренда авто за локаціями",
    },
    links: {
      hubToLocationsTitle: "Локації оренди авто",
      locationToCarsTitle: "Автомобілі для цієї локації",
      locationToHubLabel: "Повернутися до головного хабу",
      locationToParentLabel: "Повернутися до батьківської локації",
      locationToChildrenTitle: "Підлокації",
      locationToSiblingTitle: "Альтернативні найближчі локації",
      carsToLocationsTitle: "Популярні точки отримання",
      carsToHubLabel: "Повернутися до головного хабу",
      carsListTitle: "Список моделей",
      mainHubLabel: "Головний хаб оренди",
      locationSearchCtaLabel: "Пошук авто в {locationName}",
      locationHeroCtaLabel: "Знайти авто",
      pickupGuidanceTitle: "Інструкція з отримання",
      nearbyPlacesTitle: "Поруч",
      usefulTipsTitle: "Корисні поради",
      distanceToThessalonikiTitle: "Відстань до Салонік",
      localFaqTitle: "Часті питання",
      navLocationsDropdownDescription:
        "Отримання та повернення в Салоніках, аеропорту та на півострові Халкідіки. Оберіть регіон для деталей та пошуку авто.",
      otherCarsTitle: "Інші автомобілі, які можуть вам сподобатися",
    },
    staticPages: {
      [STATIC_PAGE_KEYS.CONTACTS]: {
        seoTitle: "Контакти Natali Cars | Підтримка оренди авто",
        seoDescription:
          "Звертайтесь до Natali Cars щодо бронювання, отримання авто та підтримки у Халкідіках і Салоніках.",
      },
      [STATIC_PAGE_KEYS.PRIVACY_POLICY]: {
        seoTitle: "Політика конфіденційності | Natali Cars",
        seoDescription:
          "Дізнайтеся, як Natali Cars обробляє персональні дані під час бронювання і взаємодії з клієнтами.",
      },
      [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: {
        seoTitle: "Умови сервісу | Natali Cars",
        seoDescription:
          "Ознайомтесь з умовами сервісу Natali Cars та відповідальністю сторін під час оренди авто.",
      },
      [STATIC_PAGE_KEYS.COOKIE_POLICY]: {
        seoTitle: "Політика cookies | Natali Cars",
        seoDescription:
          "Дізнайтеся, які cookies використовує Natali Cars і як вони впливають на роботу сайту.",
      },
      [STATIC_PAGE_KEYS.RENTAL_TERMS]: {
        seoTitle: "Умови оренди | Natali Cars",
        seoDescription:
          "Перегляньте умови оренди, страхування та передачі авто перед бронюванням у Natali Cars.",
      },
    },
  },
  el: {
    hub: {
      h1: "Ενοικίαση αυτοκινήτου σε Χαλκιδική και Θεσσαλονίκη",
      seoTitle: "Ενοικίαση αυτοκινήτου σε Χαλκιδική, Θεσσαλονίκη και αεροδρόμιο | Natali Cars",
      seoDescription:
        "Κλείστε αυτοκίνητο στη Χαλκιδική, στη Θεσσαλονίκη και στο αεροδρόμιο με τοπικά σημεία παραλαβής και διαφανείς όρους.",
      introText:
        "Η Natali Cars καλύπτει βασικές τοποθεσίες Χαλκιδικής και Θεσσαλονίκης με ενιαία ροή κράτησης και τοπικές SEO σελίδες.",
    },
    car: {
      seoTitleTemplate: "Ενοικίαση {carModel} στη Χαλκιδική | Natali Cars",
      seoDescriptionTemplate:
        "Κλείστε ενοικίαση {carModel} στη Χαλκιδική με παραλαβή στο αεροδρόμιο Θεσσαλονίκης (SKG) ή στη {locationName}. {transmission}, κλιματισμός, οικονομία καυσίμου.",
      carH1Template: "Ενοικίαση {carModel} στη {locationName}",
      introTemplate:
        "Το {carModel} είναι διαθέσιμο προς ενοικίαση στη {locationName} με ευέλικτες επιλογές παραλαβής και επιστροφής. Κιβώτιο {transmission}, καύσιμο {fuelType}, {seats} θέσεις — ιδανική επιλογή για τη Χαλκιδική.",
      introLongTemplate:
        "Το {carModel} είναι ένα από τα πιο βολικά αυτοκίνητα για ενοικίαση στη {locationName}. Κομψό και οικονομικό, ιδανικό για παραλίες, χωριά και πανοραμικούς δρόμους. Με κιβώτιο {transmission} και κλιματισμό, το {carModel} προσφέρει άνετη οδήγηση τόσο στην πόλη της Θεσσαλονίκης όσο και στη Χαλκιδική. Η Natali Cars προσφέρει παραλαβή στο αεροδρόμιο Θεσσαλονίκης (SKG) και στη Νέα Καλλικράτεια. Όλες οι ενοικιάσεις περιλαμβάνουν ασφάλιση και δωρεάν ακύρωση.",
      specsTitle: "Προδιαγραφές οχήματος",
      quickSpecsTitle: "Σύντομα",
      featuresTitle: "Χαρακτηριστικά του {carModel}",
      whyRentTitle: "Γιατί να επιλέξετε το {carModel} για το ταξίδι σας στη {locationName}",
      whyRentBullets: [
        "Εύκολο πάρκινγκ — compact μέγεθος για στενά δρομάκια",
        "Οικονομία καυσίμου",
        "Ιδανικό για ζευγάρια ή μικρές οικογένειες",
        "Αξιόπιστο και άνετο στην πόλη και στην ακτή",
      ],
      faqTitle: "Συχνές ερωτήσεις",
      faq: [
        { question: "Μπορώ να παραλάβω αυτό το αυτοκίνητο στο αεροδρόμιο Θεσσαλονίκης;", answer: "Ναι, προσφέρουμε παραλαβή και επιστροφή στο αεροδρόμιο Θεσσαλονίκης (SKG), καθώς και σε τοποθεσίες στη Χαλκιδική: Νέα Καλλικράτεια, Κασσάνδρα, Σιθωνία." },
        { question: "Περιλαμβάνεται ασφάλιση στην τιμή ενοικίασης;", answer: "Η βασική ασφάλιση αστικής ευθύνης (TPL) περιλαμβάνεται χωρίς επιπλέον κόστος. Μπορείτε επίσης να προσθέσετε πλήρη κάλυψη CDW." },
        { question: "Χρειάζομαι πιστωτική κάρτα για ενοικίαση;", answer: "Όχι, δεν απαιτείται πιστωτική κάρτα. Δεχόμαστε πληρωμή με μετρητά και προσφέρουμε ενοικίαση χωρίς εγγύηση σε επιλεγμένα οχήματα." },
        { question: "Τι έγγραφα χρειάζομαι;", answer: "Χρειάζεστε έγκυρη άδεια οδήγησης με τουλάχιστον 1 έτος εμπειρίας και διαβατήριο ή ταυτότητα. Γίνονται δεκτές διεθνείς άδειες." },
        { question: "Μπορώ να επιστρέψω το αυτοκίνητο σε άλλη τοποθεσία;", answer: "Ναι, είναι διαθέσιμη η ενοικίαση μόνης κατεύθυνσης. Μπορείτε να παραλάβετε σε μία τοποθεσία και να επιστρέψετε σε άλλη." },
      ],
      breadcrumbHome: "Αρχική",
      breadcrumbCars: "Αυτοκίνητα",
      breadcrumbCarRentalLocation: "Ενοικίαση αυτοκινήτου στη {locationName}",
      pickupTitle: "Σημεία παραλαβής",
      pillarLinksTitle: "Ενοικίαση ανά τοποθεσία",
    },
    links: {
      hubToLocationsTitle: "Τοποθεσίες ενοικίασης",
      locationToCarsTitle: "Διαθέσιμα αυτοκίνητα για αυτή την τοποθεσία",
      locationToHubLabel: "Επιστροφή στο κεντρικό hub",
      locationToParentLabel: "Επιστροφή στη γονική τοποθεσία",
      locationToChildrenTitle: "Υποτοποθεσίες",
      locationToSiblingTitle: "Εναλλακτικές κοντινές τοποθεσίες",
      carsToLocationsTitle: "Δημοφιλή σημεία παραλαβής",
      carsToHubLabel: "Επιστροφή στο κεντρικό hub",
      carsListTitle: "Λίστα μοντέλων",
      mainHubLabel: "Κεντρικό hub ενοικίασης",
      locationSearchCtaLabel: "Αναζήτηση αυτοκινήτων στην {locationName}",
      locationHeroCtaLabel: "Βρείτε το αυτοκίνητό σας",
      pickupGuidanceTitle: "Οδηγίες παραλαβής",
      nearbyPlacesTitle: "Κοντινά σημεία",
      usefulTipsTitle: "Χρήσιμες συμβουλές",
      distanceToThessalonikiTitle: "Απόσταση από τη Θεσσαλονίκη",
      localFaqTitle: "Συχνές ερωτήσεις",
      navLocationsDropdownDescription:
        "Παραλαβή και επιστροφή στη Θεσσαλονίκη, αεροδρόμιο και Χαλκιδική. Επιλέξτε περιοχή για λεπτομέρειες και αναζήτηση αυτοκινήτου.",
      otherCarsTitle: "Άλλα αυτοκίνητα που μπορεί να σας αρέσουν",
    },
    staticPages: {
      [STATIC_PAGE_KEYS.CONTACTS]: {
        seoTitle: "Επικοινωνία Natali Cars | Υποστήριξη ενοικίασης",
        seoDescription:
          "Επικοινωνήστε με τη Natali Cars για κρατήσεις, παραλαβή οχήματος και υποστήριξη σε Χαλκιδική και Θεσσαλονίκη.",
      },
      [STATIC_PAGE_KEYS.PRIVACY_POLICY]: {
        seoTitle: "Πολιτική Απορρήτου | Natali Cars",
        seoDescription:
          "Μάθετε πώς η Natali Cars διαχειρίζεται προσωπικά δεδομένα για κρατήσεις και επικοινωνία πελατών.",
      },
      [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: {
        seoTitle: "Όροι Υπηρεσίας | Natali Cars",
        seoDescription:
          "Διαβάστε τους όρους υπηρεσίας της Natali Cars και τις ευθύνες των μερών στις μισθώσεις.",
      },
      [STATIC_PAGE_KEYS.COOKIE_POLICY]: {
        seoTitle: "Πολιτική Cookies | Natali Cars",
        seoDescription:
          "Μάθετε ποια cookies χρησιμοποιεί η Natali Cars και γιατί είναι απαραίτητα για τη λειτουργία του site.",
      },
      [STATIC_PAGE_KEYS.RENTAL_TERMS]: {
        seoTitle: "Όροι Ενοικίασης | Natali Cars",
        seoDescription:
          "Διαβάστε όρους ενοικίασης, κάλυψη ασφάλισης και διαδικασία παράδοσης οχήματος πριν την κράτηση.",
      },
    },
  },
  bg: {
    hub: {
      h1: "Коли под наем в Халкидики и Солун",
      seoTitle: "Коли под наем в Халкидики, Солун и летището | Natali Cars",
      seoDescription:
        "Резервирайте кола под наем в Халкидики, град Солун и летище Солун с удобни места за получаване, прозрачни цени и директна поддръжка.",
      introText:
        "Natali Cars предлага коли под наем в основните райони на Халкидики и Солун чрез една система за резервации и локализирани SEO страници.",
    },
    car: {
      seoTitleTemplate: "Наем на {carModel} в Халкидики | Natali Cars",
      seoDescriptionTemplate:
        "Резервирайте {carModel} в Халкидики с получаване на летище Солун (SKG) или {locationName}. {transmission}, климатик, икономичен разход.",
      carH1Template: "Наем на {carModel} в {locationName}",
      introTemplate:
        "{carModel} е на разположение за наем в {locationName} с гъвкави опции за получаване и връщане. Скоростна кутия {transmission}, гориво {fuelType}, {seats} места — отличен избор за Халкидики.",
      introLongTemplate:
        "{carModel} е един от най-удобните автомобили за наем в {locationName}. Компактен и икономичен, идеален за плажове, села и сценични пътища. С {transmission} и климатик {carModel} предлага комфортно шофиране в Солун и по полуостров Халкидики. Natali Cars предлага получаване на летище Солун (SKG) и в Неа Каликратия. Всички наеми включват застраховка и безплатна отмяна.",
      specsTitle: "Спецификации на автомобила",
      quickSpecsTitle: "Накратко",
      featuresTitle: "Характеристики на {carModel}",
      whyRentTitle: "Защо да изберете {carModel} за пътуване в {locationName}",
      whyRentBullets: [
        "Лесно паркиране — компактен размер за тесни улици",
        "Икономичен разход на гориво",
        "Идеален за двойки или малки семейства",
        "Надежден и комфортен в града и на крайбрежието",
      ],
      faqTitle: "Често задавани въпроси",
      faq: [
        { question: "Мога ли да взема този автомобил от летище Солун?", answer: "Да, предлагаме получаване и връщане на летище Солун (SKG), както и в Халкидики: Неа Каликратия, Касандра, Ситония." },
        { question: "Включена ли е застраховка в цената за наем?", answer: "Базовата застраховка ГО (TPL) е включена безплатно. Можете да добавите и пълна CDW застраховка за допълнително спокойствие." },
        { question: "Нужна ли ми е кредитна карта за наем?", answer: "Не, кредитна карта не е необходима. Приемаме плащане в брой и предлагаме наем без депозит за избрани автомобили." },
        { question: "Какви документи са необходими?", answer: "Необходима ви е валидна шофьорска книжка с минимум 1 година стаж и паспорт или лична карта. Приемат се международни шофьорски книжки." },
        { question: "Мога ли да върна колата на друго място?", answer: "Да, еднопосочен наем е възможен. Можете да вземете автомобила от едно място и да го върнете на друго в нашата мрежа." },
      ],
      breadcrumbHome: "Начало",
      breadcrumbCars: "Автомобили",
      breadcrumbCarRentalLocation: "Наем на кола в {locationName}",
      pickupTitle: "Места за получаване",
      pillarLinksTitle: "Наем на кола по локация",
    },
    links: {
      hubToLocationsTitle: "Разгледайте локациите за коли под наем",
      locationToCarsTitle: "Налични автомобили за тази локация",
      locationToHubLabel: "Обратно към основния hub",
      locationToParentLabel: "Обратно към родителската локация",
      locationToChildrenTitle: "Подлокации",
      locationToSiblingTitle: "Алтернативни близки локации",
      carsToLocationsTitle: "Популярни места за получаване",
      carsToHubLabel: "Обратно към основния hub",
      carsListTitle: "Разгледайте моделите автомобили",
      mainHubLabel: "Основен hub за коли под наем",
      locationSearchCtaLabel: "Търсене на автомобили в {locationName}",
      locationHeroCtaLabel: "Намерете своя автомобил",
      pickupGuidanceTitle: "Информация за получаване",
      nearbyPlacesTitle: "Близки места",
      usefulTipsTitle: "Полезни съвети",
      distanceToThessalonikiTitle: "Разстояние до Солун",
      localFaqTitle: "Често задавани въпроси",
      navLocationsDropdownDescription:
        "Получаване и връщане в Солун, летището и на полуостров Халкидики. Изберете район за подробности и търсене на автомобил.",
      otherCarsTitle: "Други автомобили, които може да ви харесат",
    },
    staticPages: {
      [STATIC_PAGE_KEYS.CONTACTS]: {
        seoTitle: "Контакти Natali Cars | Поддръжка за коли под наем",
        seoDescription:
          "Свържете се с Natali Cars за въпроси относно резервации, получаване на автомобил и поддръжка за коли под наем в Халкидики и Солун.",
      },
      [STATIC_PAGE_KEYS.PRIVACY_POLICY]: {
        seoTitle: "Политика за поверителност | Natali Cars",
        seoDescription:
          "Вижте как Natali Cars обработва и защитава личните данни при резервации и комуникация с клиенти.",
      },
      [STATIC_PAGE_KEYS.TERMS_OF_SERVICE]: {
        seoTitle: "Условия за ползване | Natali Cars",
        seoDescription:
          "Прегледайте условията за ползване на Natali Cars, задълженията при резервация и отговорностите по договора за наем.",
      },
      [STATIC_PAGE_KEYS.COOKIE_POLICY]: {
        seoTitle: "Политика за бисквитки | Natali Cars",
        seoDescription:
          "Научете какви бисквитки използва Natali Cars и как те подпомагат резервациите, анализа и работата на сайта.",
      },
      [STATIC_PAGE_KEYS.RENTAL_TERMS]: {
        seoTitle: "Условия за наем | Natali Cars",
        seoDescription:
          "Прегледайте условията за наем на Natali Cars, застрахователното покритие и правилата за предаване на автомобила преди резервация.",
      },
    },
  },
};

const locationHeroCtaLabelOverrides: Partial<Record<SupportedLocale, string>> = {
  de: "Finden Sie Ihr Auto",
  ro: "Găsiți mașina dvs.",
  sr: "Pronađite svoj automobil",
};

const localFaqTitleOverrides: Partial<Record<SupportedLocale, string>> = {
  de: "Lokale FAQ",
  ro: "Intrebari locale frecvente",
  sr: "Lokalna FAQ",
};

const distanceToThessalonikiTitleOverrides: Partial<Record<SupportedLocale, string>> = {
  de: "Entfernung nach Thessaloniki",
  ro: "Distanța până la Salonic",
  sr: "Udaljenost do Soluna",
};

const distanceToThessalonikiTextOverridesByContentKey: Partial<
  Record<LocationContentKey, Partial<Record<SupportedLocale, string>>>
> = {
  [LOCATION_CONTENT_KEYS.THESSALONIKI]: {
    ru: "Салоники — второй по величине город Греции и главный центр Северной Греции.",
    uk: "Салоніки — друге за величиною місто Греції та головний центр Північної Греції.",
    el: "Η Θεσσαλονίκη είναι η δεύτερη μεγαλύτερη πόλη της Ελλάδας και το κύριο κέντρο της Βόρειας Ελλάδας.",
    de: "Thessaloniki ist die zweitgrößte Stadt Griechenlands und das wichtigste Zentrum Nordgriechenlands.",
    bg: "Солун е вторият по големина град в Гърция и основният център на Северна Гърция.",
    ro: "Salonic este al doilea oraș ca mărime din Grecia și principalul centru al Greciei de Nord.",
    sr: "Solun je drugi najveći grad u Grčkoj i glavni centar severne Grčke.",
  },
  [LOCATION_CONTENT_KEYS.THESSALONIKI_AIRPORT]: {
    ru: "Аэропорт Салоники (SKG) — главный международный аэропорт, обслуживающий Салоники и весь регион.",
    uk: "Аеропорт Салоніки (SKG) — головний міжнародний аеропорт, що обслуговує Салоніки та весь регіон.",
    el: "Το αεροδρόμιο Θεσσαλονίκης (SKG) είναι το κύριο διεθνές αεροδρόμιο που εξυπηρετεί τη Θεσσαλονίκη και την ευρύτερη περιοχή.",
    de: "Der Flughafen Thessaloniki (SKG) ist der wichtigste internationale Flughafen für Thessaloniki und die weitere Region.",
    bg: "Летище Солун (SKG) е основното международно летище, което обслужва Солун и по-широкия регион.",
    ro: "Aeroportul Salonic (SKG) este principalul aeroport internațional care deservește Salonicul și întreaga regiune.",
    sr: "Aerodrom Solun (SKG) je glavni međunarodni aerodrom koji opslužuje Solun i širi region.",
  },
  [LOCATION_CONTENT_KEYS.HALKIDIKI]: {
    ru: "Халкидики находятся примерно в 110 км от Салоник и примерно в 90 км от аэропорта Салоники (SKG).",
    uk: "Халкідіки розташовані приблизно за 110 км від Салонік і приблизно за 90 км від аеропорту Салоніки (SKG).",
    el: "Η Χαλκιδική βρίσκεται περίπου 110 χλμ. από τη Θεσσαλονίκη και περίπου 90 χλμ. από το αεροδρόμιο Θεσσαλονίκης (SKG).",
    de: "Chalkidiki liegt etwa 110 km von Thessaloniki und rund 90 km vom Flughafen Thessaloniki (SKG) entfernt.",
    bg: "Халкидики се намира на около 110 км от Солун и на около 90 км от летище Солун (SKG).",
    ro: "Halkidiki se află la aproximativ 110 km de Salonic și la aproximativ 90 km de Aeroportul Salonic (SKG).",
    sr: "Halkidiki se nalazi na oko 110 km od Soluna i na oko 90 km od aerodroma Solun (SKG).",
  },
};

const localeSeoDictionaryExpanded = expandLocaleRecord(localeSeoDictionaryRaw);

// Patch fallback-only locales with translated hero CTA labels.
// expandLocaleRecord shares the same object reference for fallback locales,
// so we must clone the links object before mutating to avoid corrupting "en".
for (const locale of SUPPORTED_LOCALES) {
  const label = locationHeroCtaLabelOverrides[locale];
  const localFaqTitle = localFaqTitleOverrides[locale];
  const distanceToThessalonikiTitle =
    distanceToThessalonikiTitleOverrides[locale];
  if (label || localFaqTitle || distanceToThessalonikiTitle) {
    localeSeoDictionaryExpanded[locale] = {
      ...localeSeoDictionaryExpanded[locale],
      links: {
        ...localeSeoDictionaryExpanded[locale].links,
        ...(label ? { locationHeroCtaLabel: label } : {}),
        ...(localFaqTitle ? { localFaqTitle } : {}),
        ...(distanceToThessalonikiTitle
          ? { distanceToThessalonikiTitle }
          : {}),
      },
    };
  }
}

export const localeSeoDictionary = localeSeoDictionaryExpanded;

type LocationContentFallbackTemplate = {
  h1: string;
  seoTitle: string;
  seoDescription: string;
  introText: string;
  pickupLocation: string;
  offerName: string;
  offerDescription: string;
  pickupGuidance: string;
};

type LocationFaqFallbackTemplate = LocationSeoFaqItem[];

const locationContentFallbackTemplates: Partial<
  Record<SupportedLocale, LocationContentFallbackTemplate>
> = {
  ru: {
    h1: "\u041F\u0440\u043E\u043A\u0430\u0442 \u0430\u0432\u0442\u043E \u0432 {locationName}",
    seoTitle:
      "\u041F\u0440\u043E\u043A\u0430\u0442 \u0430\u0432\u0442\u043E \u0432 {locationName} | Natali Cars",
    seoDescription:
      "\u0410\u0440\u0435\u043D\u0434\u0443\u0439\u0442\u0435 \u0430\u0432\u0442\u043E\u043C\u043E\u0431\u0438\u043B\u044C \u0432 {locationName} \u0441 \u0443\u0434\u043E\u0431\u043D\u043E\u0439 \u0432\u044B\u0434\u0430\u0447\u0435\u0439 \u0438 \u043F\u0440\u044F\u043C\u043E\u0439 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 Natali Cars.",
    introText:
      "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 {locationName} \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u043A\u0430\u0442 \u0430\u0432\u0442\u043E \u0441 \u0432\u044B\u0434\u0430\u0447\u0435\u0439 \u0443 \u043C\u0435\u0441\u0442\u0430 \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F \u0438\u043B\u0438 \u0432 \u0433\u043E\u0440\u043E\u0434\u0435.",
    pickupLocation:
      "\u0422\u043E\u0447\u043A\u0430 \u0432\u044B\u0434\u0430\u0447\u0438 \u0432 {locationName}",
    offerName:
      "\u0410\u0440\u0435\u043D\u0434\u0430 \u0430\u0432\u0442\u043E \u0432 {locationName}",
    offerDescription:
      "\u0412\u044B\u0434\u0430\u0447\u0430 \u0443 \u043E\u0442\u0435\u043B\u044F \u0438\u043B\u0438 \u0432 \u0433\u043E\u0440\u043E\u0434\u0435 \u0434\u043B\u044F \u043F\u043E\u0435\u0437\u0434\u043E\u043A \u043F\u043E {locationName} \u0438 \u043E\u043A\u0440\u0435\u0441\u0442\u043D\u043E\u0441\u0442\u044F\u043C.",
    pickupGuidance:
      "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u0430\u0432\u0442\u043E \u0432 {locationName} \u043C\u043E\u0436\u043D\u043E \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u0443 \u043C\u0435\u0441\u0442\u0430 \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F \u0438\u043B\u0438 \u0432 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u043E\u0439 \u0442\u043E\u0447\u043A\u0435. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u043F\u0440\u0438 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438.",
  },
  uk: {
    h1: "Оренда авто у {locationName}",
    seoTitle: "Оренда авто у {locationName} | Natali Cars",
    seoDescription:
      "Орендуйте авто у {locationName} зі зручною видачею та прямою підтримкою від Natali Cars.",
    introText:
      "Сторінка {locationName} допомагає організувати оренду авто з отриманням біля місця проживання або у місті.",
    pickupLocation: "Точка отримання у {locationName}",
    offerName: "Оренда авто у {locationName}",
    offerDescription:
      "Отримання біля готелю або у місті для поїздок по {locationName} та околицях.",
    pickupGuidance:
      "Передачу авто у {locationName} можна організувати біля місця проживання або в узгодженій точці. Вкажіть адресу під час бронювання.",
  },
  el: {
    h1: "Ενοικίαση αυτοκινήτου στο {locationName}",
    seoTitle: "Ενοικίαση αυτοκινήτου στο {locationName} | Natali Cars",
    seoDescription:
      "Νοικιάστε αυτοκίνητο στο {locationName} με εύκολη παραλαβή και άμεση υποστήριξη από τη Natali Cars.",
    introText:
      "Η σελίδα του {locationName} σας βοηθά να οργανώσετε ενοικίαση αυτοκινήτου με παραλαβή στο κατάλυμα ή μέσα στην περιοχή.",
    pickupLocation: "Σημείο παραλαβής στο {locationName}",
    offerName: "Ενοικίαση αυτοκινήτου στο {locationName}",
    offerDescription:
      "Παραλαβή σε ξενοδοχείο ή μέσα στην περιοχή για διαδρομές στο {locationName} και γύρω μέρη.",
    pickupGuidance:
      "Η παράδοση αυτοκινήτου στο {locationName} μπορεί να οργανωθεί στο κατάλυμά σας ή σε συμφωνημένο σημείο. Δηλώστε τη διεύθυνση κατά την κράτηση.",
  },
  de: {
    h1: "Mietwagen in {locationName}",
    seoTitle: "Mietwagen in {locationName} | Natali Cars",
    seoDescription:
      "Mieten Sie ein Auto in {locationName} mit bequemer Uebergabe und direktem Support von Natali Cars.",
    introText:
      "Die Seite fuer {locationName} hilft Ihnen, einen Mietwagen mit Uebergabe an Ihrer Unterkunft oder im Ort zu organisieren.",
    pickupLocation: "Abholpunkt in {locationName}",
    offerName: "Mietwagen in {locationName}",
    offerDescription:
      "Uebergabe am Hotel oder im Ort fuer Fahrten in {locationName} und Umgebung.",
    pickupGuidance:
      "Die Fahrzeuguebergabe in {locationName} kann an Ihrer Unterkunft oder an einem vereinbarten Treffpunkt erfolgen. Geben Sie Ihre Adresse bei der Buchung an.",
  },
  bg: {
    h1: "Коли под наем в {locationName}",
    seoTitle: "Коли под наем в {locationName} | Natali Cars",
    seoDescription:
      "Наемете автомобил в {locationName} с удобно получаване и директна поддръжка от Natali Cars.",
    introText:
      "Страницата за {locationName} ви помага да организирате кола под наем с получаване до мястото за настаняване или в населеното място.",
    pickupLocation: "Точка за получаване в {locationName}",
    offerName: "Коли под наем в {locationName}",
    offerDescription:
      "Получаване до хотел или в населеното място за пътувания из {locationName} и околностите.",
    pickupGuidance:
      "Предаването на автомобила в {locationName} може да бъде организирано до мястото за настаняване или на уговорена точка. Посочете адреса при резервация.",
  },
  ro: {
    h1: "Inchirieri auto in {locationName}",
    seoTitle: "Inchirieri auto in {locationName} | Natali Cars",
    seoDescription:
      "Inchiriati o masina in {locationName} cu predare convenabila si suport direct de la Natali Cars.",
    introText:
      "Pagina pentru {locationName} va ajuta sa organizati inchirierea unei masini cu predare la cazare sau in localitate.",
    pickupLocation: "Punct de preluare in {locationName}",
    offerName: "Inchirieri auto in {locationName}",
    offerDescription:
      "Predare la hotel sau in localitate pentru drumuri prin {locationName} si imprejurimi.",
    pickupGuidance:
      "Predarea masinii in {locationName} poate fi organizata la cazarea dvs. sau intr-un punct convenit. Indicati adresa la rezervare.",
  },
  sr: {
    h1: "Rent a car u {locationName}",
    seoTitle: "Rent a car u {locationName} | Natali Cars",
    seoDescription:
      "Iznajmite automobil u {locationName} uz lako preuzimanje i direktnu podrsku kompanije Natali Cars.",
    introText:
      "Stranica za {locationName} pomaze da organizujete rent a car sa preuzimanjem kod smestaja ili u mestu.",
    pickupLocation: "Mesto preuzimanja u {locationName}",
    offerName: "Rent a car u {locationName}",
    offerDescription:
      "Preuzimanje kod hotela ili u mestu za voznju kroz {locationName} i okolinu.",
    pickupGuidance:
      "Preuzimanje automobila u {locationName} moze se organizovati kod smestaja ili na dogovorenom mestu. Unesite adresu pri rezervaciji.",
  },
};

const locationIntroTranslationTemplates: Partial<
  Record<SupportedLocale, Partial<Record<LocationContentKey, string>>>
> = {
  ru: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Эта страница локации ориентирована на спрос в Thessaloniki и помогает быстро организовать выдачу автомобиля для поездок по городу, деловых визитов и трансферов в Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Халкидики — один из самых популярных курортных регионов Греции, где аренда авто особенно удобна для поездок между пляжами, поселками и полуостровами Кассандра и Ситония. Natali Cars поможет быстро организовать прокат авто в Халкидиках для комфортного отдыха и удобного передвижения по региону.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Неа Калликратия — популярный прибрежный город на пути в Халкидики.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Эта страница субрегиона ориентирована на поездки по восточному побережью Halkidiki, отдых на виллах и гибкую выдачу автомобиля для длительных каникул в {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Эта страница {locationName} создана для туристов, ориентированных на курортный отдых, и связана с основным разделом Halkidiki для удобного планирования поездки.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} — главный порт и въезд в Halkidiki. Организуйте аренду авто с выдачей в городе или рядом с портом для удобного начала поездки.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} — один из главных городков Sithonia. Эта страница помогает подобрать аренду авто с выдачей, удобной для вашего отдыха в {locationName} или рядом.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} — оживлённый курортный город на Sithonia с гаванью и большим выбором жилья. Организуйте аренду с выдачей, которая подходит под ваши планы.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} известен длинным пляжем и расслабленной атмосферой. Эта страница помогает забронировать аренду авто с выдачей в {locationName} или у места проживания.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} — популярный курорт на Kassandra с оживлённой главной улицей и хорошими пляжами.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} предлагает длинный пляж и оживлённую центральную улицу. Эта страница помогает организовать аренду авто с удобной выдачей на время вашего отдыха.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} — оживлённый курорт с длинным пляжем и развитой инфраструктурой. Организуйте аренду с выдачей, подходящей под ваше проживание.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} — семейный курорт с длинным пляжем. Эта страница помогает подобрать аренду авто с выдачей, удобной для вашего отдыха.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} — живописная деревня на Kassandra с каменными домами и видом со скалы.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} расположен между более оживлёнными курортами и подходит для спокойного отдыха. Эта страница помогает забронировать аренду авто с выдачей в {locationName} или рядом.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} известен премиальным курортом и мариной. Организуйте аренду авто с выдачей в {locationName} или у места проживания для поездок по Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} — главный город в центральной части полуострова Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} — небольшой курорт на западном побережье. Организуйте аренду с выдачей в {locationName} или у места проживания для спокойного отдыха.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} — небольшая деревня на Sithonia с расслабленной атмосферой. Эта страница помогает забронировать аренду авто с выдачей в {locationName} или рядом.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} — живописная деревня на восточном побережье Sithonia. Организуйте аренду с выдачей, подходящей под ваше проживание и планы.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} находится по пути в Halkidiki из Thessaloniki. Эта страница помогает организовать аренду авто с выдачей в {locationName} или у места проживания.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} известна пещерой Петралона и расположена в глубине материка недалеко от побережья. Организуйте аренду с выдачей в {locationName} или рядом для гибкой поездки.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} — прибрежная деревня в восточной части Halkidiki. Эта страница помогает организовать аренду с выдачей в {locationName} или у места проживания.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} — прибрежная деревня рядом с древней Стагирой. Организуйте аренду с выдачей в {locationName} или у места проживания для поездок к историческим местам и на пляжи.",
  },
  uk: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Ця сторінка локації орієнтована на попит у Thessaloniki та допомагає швидко організувати видачу авто для міських поїздок, ділових візитів і трансферів до Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Халкідіки — один із найпопулярніших курортних регіонів Греції, де оренда авто особливо зручна для поїздок між пляжами, селищами та півостровами Кассандра і Ситонія. Natali Cars допоможе швидко організувати прокат авто в Халкідіках для комфортного відпочинку та зручного пересування регіоном.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Неа Каллікратія — популярне прибережне місто на шляху в Халкідіки.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Ця сторінка субрегіону орієнтована на поїздки східним узбережжям Halkidiki, відпочинок на віллах і гнучку видачу авто для тривалих канікул у {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Ця сторінка {locationName} створена для курортно орієнтованих подорожей і пов'язана з основним розділом Halkidiki для зручного планування поїздки.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} — головний порт і в'їзд до Halkidiki. Організуйте оренду авто з видачею в місті або біля порту для зручного початку подорожі.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} — одне з головних містечок Sithonia. Ця сторінка допомагає підібрати оренду авто з видачею, зручною для вашого відпочинку в {locationName} або поруч.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} — жвавий курортний центр на Sithonia з гаванню та великим вибором житла. Організуйте оренду з видачею, що підходить під ваші плани.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} відомий довгим пляжем і спокійною атмосферою. Ця сторінка допомагає забронювати оренду авто з видачею у {locationName} або біля місця проживання.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} — популярний курорт на Kassandra з жвавою головною вулицею та гарними пляжами.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} пропонує довгий пляж і жваву центральну вулицю. Ця сторінка допомагає організувати оренду авто зі зручною видачею на час вашого відпочинку.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} — жвавий курорт із довгим пляжем і розвиненою інфраструктурою. Організуйте оренду з видачею, що підходить під ваше проживання.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} — сімейний курорт із довгим пляжем. Ця сторінка допомагає підібрати оренду авто з видачею, зручною для вашого відпочинку.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} — мальовниче селище на Kassandra з кам'яними будинками та розташуванням на скелі.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} розташований між жвавішими курортами й підходить для спокійнішого відпочинку. Ця сторінка допомагає забронювати оренду авто з видачею у {locationName} або поруч.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} відомий преміальним курортом і мариною. Організуйте оренду авто з видачею у {locationName} або біля місця проживання для поїздок Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} — головне місто в центральній частині півострова Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} — невеликий курорт на західному узбережжі. Організуйте оренду з видачею у {locationName} або біля місця проживання для спокійного відпочинку.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} — невелике селище на Sithonia зі спокійною атмосферою. Ця сторінка допомагає забронювати оренду авто з видачею у {locationName} або поруч.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} — мальовниче селище на східному узбережжі Sithonia. Організуйте оренду з видачею, що підходить під ваше проживання та плани.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} розташована по дорозі до Halkidiki з Thessaloniki. Ця сторінка допомагає організувати оренду авто з видачею у {locationName} або біля місця проживання.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} відома печерою Петралона й розташована вглибині суходолу неподалік узбережжя. Організуйте оренду з видачею у {locationName} або поруч для гнучкої подорожі.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} — прибережне селище у східній частині Halkidiki. Ця сторінка допомагає організувати оренду з видачею у {locationName} або біля місця проживання.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} — прибережне селище поруч із давньою Стагірою. Організуйте оренду з видачею у {locationName} або біля місця проживання для поїздок до історичних місць і на пляжі.",
  },
  el: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Αυτή η σελίδα τοποθεσίας απευθύνεται στη ζήτηση για Thessaloniki και συνδέει τους ταξιδιώτες με γρήγορη παραλαβή αυτοκινήτου για διαμονή στην πόλη, επαγγελματικά ταξίδια και μεταφορές προς Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Η Χαλκιδική είναι μία από τις πιο δημοφιλείς τουριστικές περιοχές της Ελλάδας, όπου η ενοικίαση αυτοκινήτου είναι ιδιαίτερα βολική για διαδρομές ανάμεσα σε παραλίες, οικισμούς και τις χερσονήσους Κασσάνδρα και Σιθωνία. Η Natali Cars σας βοηθά να οργανώσετε γρήγορα ενοικίαση αυτοκινήτου στη Χαλκιδική για άνετες διακοπές και εύκολες μετακινήσεις σε όλη την περιοχή.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Η Νέα Καλλικράτεια είναι δημοφιλής παραθαλάσσια πόλη στο δρόμο προς τη Χαλκιδική.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Αυτή η σελίδα υποπεριοχής απευθύνεται σε ταξίδια στην ανατολική ακτή της Halkidiki, σε διαμονές σε βίλες και σε ευέλικτη παραλαβή αυτοκινήτου για μεγαλύτερες διακοπές στη {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Αυτή η σελίδα για τη {locationName} έχει σχεδιαστεί για ταξίδια με προσανατολισμό στα θέρετρα και συνδέεται με τον βασικό κόμβο της Halkidiki για ευκολότερο προγραμματισμό.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "Η {locationName} είναι το κύριο λιμάνι και η πύλη προς τη Halkidiki. Οργανώστε ενοικίαση αυτοκινήτου με παραλαβή στην πόλη ή κοντά στο λιμάνι για ομαλή αρχή του ταξιδιού σας.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "Η {locationName} είναι μία από τις βασικές κωμοπόλεις της Sithonia. Αυτή η σελίδα σας βοηθά να βρείτε ενοικίαση αυτοκινήτου με παραλαβή προσαρμοσμένη στη διαμονή σας στη {locationName} ή κοντά.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "Η {locationName} είναι ένα ζωντανό θέρετρο στη Sithonia με λιμάνι και πολλές επιλογές διαμονής. Οργανώστε ενοικίαση με παραλαβή που ταιριάζει στα σχέδιά σας.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "Η {locationName} είναι γνωστή για τη μεγάλη παραλία και τη χαλαρή ατμόσφαιρά της. Αυτή η σελίδα σας βοηθά να κλείσετε ενοικίαση αυτοκινήτου με παραλαβή στη {locationName} ή στο κατάλυμά σας.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "Η {locationName} είναι ένα δημοφιλές θέρετρο στην Kassandra με ζωντανό κέντρο και όμορφες παραλίες.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "Η {locationName} προσφέρει μεγάλη παραλία και πολυσύχναστο κεντρικό δρόμο. Αυτή η σελίδα σας βοηθά να οργανώσετε ενοικίαση αυτοκινήτου με άνετη παραλαβή για τη διαμονή σας.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "Η {locationName} είναι ένα ζωντανό θέρετρο με μεγάλη παραλία και πολλές παροχές. Οργανώστε ενοικίαση με παραλαβή που ταιριάζει στο κατάλυμά σας.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "Η {locationName} είναι ένα οικογενειακό θέρετρο με μεγάλη παραλία. Αυτή η σελίδα σας συνδέει με ενοικίαση αυτοκινήτου και παραλαβή προσαρμοσμένη στη διαμονή σας.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "Η {locationName} είναι ένα γραφικό χωριό στην Kassandra με πέτρινα σπίτια και θέση πάνω στον γκρεμό.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "Η {locationName} βρίσκεται ανάμεσα στα πιο πολυσύχναστα θέρετρα και προσφέρει πιο ήρεμη βάση. Αυτή η σελίδα σας βοηθά να κλείσετε ενοικίαση αυτοκινήτου με παραλαβή στη {locationName} ή κοντά.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "Η {locationName} είναι γνωστή για το πολυτελές θέρετρο και τη μαρίνα της. Οργανώστε ενοικίαση αυτοκινήτου με παραλαβή στη {locationName} ή στο κατάλυμά σας για διαδρομές στην Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "Η {locationName} είναι η κύρια πόλη στο κέντρο της χερσονήσου Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "Η {locationName} είναι ένα μικρό θέρετρο στη δυτική ακτή. Οργανώστε ενοικίαση με παραλαβή στη {locationName} ή στο κατάλυμά σας για πιο χαλαρές διακοπές.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "Η {locationName} είναι ένα μικρό χωριό στη Sithonia με χαλαρή ατμόσφαιρα. Αυτή η σελίδα σας βοηθά να κλείσετε ενοικίαση αυτοκινήτου με παραλαβή στη {locationName} ή κοντά.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "Η {locationName} είναι ένα γραφικό χωριό στην ανατολική ακτή της Sithonia. Οργανώστε ενοικίαση με παραλαβή που ταιριάζει στο κατάλυμα και στα σχέδιά σας.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "Η {locationName} βρίσκεται στον δρόμο προς τη Halkidiki από τη Thessaloniki. Αυτή η σελίδα σας βοηθά να οργανώσετε ενοικίαση αυτοκινήτου με παραλαβή στη {locationName} ή στο κατάλυμά σας.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "Η {locationName} είναι γνωστή για το Σπήλαιο Πετραλώνων και βρίσκεται στην ενδοχώρα, κοντά στην ακτή. Οργανώστε ενοικίαση με παραλαβή στη {locationName} ή κοντά για πιο ευέλικτο ταξίδι.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "Η {locationName} είναι ένα παραθαλάσσιο χωριό στην ανατολική πλευρά της Halkidiki. Αυτή η σελίδα σας βοηθά να οργανώσετε ενοικίαση με παραλαβή στη {locationName} ή στο κατάλυμά σας.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "Η {locationName} είναι ένα παραθαλάσσιο χωριό κοντά στην αρχαία Στάγειρα. Οργανώστε ενοικίαση με παραλαβή στη {locationName} ή στο κατάλυμά σας για ιστορικές και παραλιακές διαδρομές.",
  },
  de: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Diese Standortseite richtet sich an die Nachfrage in Thessaloniki und verbindet Reisende mit schneller Fahrzeuguebergabe fuer Stadtaufenthalte, Geschaeftsreisen und Transfers nach Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Die Chalkidiki ist eine der beliebtesten Ferienregionen Griechenlands, in der ein Mietwagen besonders praktisch fuer Fahrten zwischen Straenden, Orten und den Halbinseln Kassandra und Sithonia ist. Natali Cars hilft Ihnen, die Autovermietung in Chalkidiki schnell fuer einen komfortablen Urlaub und bequeme Fahrten in der Region zu organisieren.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Nea Kallikratia ist ein beliebter Küstenort auf dem Weg in die Chalkidiki.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Diese Unterregionsseite richtet sich an Reisen an der Ostkueste von Halkidiki, an Villa-Aufenthalte und an flexible Fahrzeuguebergabe fuer laengere Ferien in {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Diese Seite fuer {locationName} ist auf resortorientierte Reisen ausgerichtet und mit dem uebergeordneten Halkidiki-Hub fuer die regionale Planung verbunden.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} ist der wichtigste Hafen und das Tor nach Halkidiki. Organisieren Sie Ihre Autovermietung mit Uebergabe in der Stadt oder in Hafennaehe fuer einen entspannten Start der Reise.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} ist einer der wichtigsten Orte auf Sithonia. Diese Seite hilft Ihnen, einen Mietwagen mit Uebergabe passend zu Ihrem Aufenthalt in {locationName} oder in der Umgebung zu buchen.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} ist ein lebhafter Ferienort auf Sithonia mit Hafen und vielen Unterkuenften. Organisieren Sie die Anmietung mit einer Uebergabe, die zu Ihren Plaenen passt.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} ist fuer seinen langen Strand und die entspannte Atmosphaere bekannt. Diese Seite hilft Ihnen, einen Mietwagen mit Uebergabe in {locationName} oder an Ihrer Unterkunft zu buchen.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} ist ein beliebter Ferienort auf Kassandra mit lebhafter Hauptstrasse und guten Straenden.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} bietet einen langen Strand und eine lebhafte Hauptstrasse. Diese Seite hilft Ihnen, eine Autovermietung mit bequemer Uebergabe fuer Ihren Aufenthalt zu organisieren.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} ist ein lebhafter Ferienort mit langem Strand und vielen Annehmlichkeiten. Organisieren Sie Ihre Anmietung mit einer Uebergabe, die zu Ihrer Unterkunft passt.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} ist ein familienfreundlicher Ferienort mit langem Strand. Diese Seite verbindet Sie mit einer Autovermietung und einer Uebergabe, die zu Ihrem Aufenthalt passt.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} ist ein malerisches Dorf auf Kassandra mit Steinhaeusern und einer Lage auf den Klippen.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} liegt zwischen den belebteren Ferienorten und bietet eine ruhigere Basis. Diese Seite hilft Ihnen, einen Mietwagen mit Uebergabe in {locationName} oder in der Naehe zu buchen.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} ist fuer sein gehobenes Resort und den Yachthafen bekannt. Organisieren Sie Ihre Autovermietung mit Uebergabe in {locationName} oder an Ihrer Unterkunft fuer Fahrten rund um Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} ist der wichtigste Ort im Zentrum der Halbinsel Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} ist ein kleiner Ferienort an der Westkueste. Organisieren Sie Ihre Anmietung mit Uebergabe in {locationName} oder an Ihrer Unterkunft fuer einen entspannten Aufenthalt.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} ist ein kleines Dorf auf Sithonia mit entspannter Atmosphaere. Diese Seite hilft Ihnen, einen Mietwagen mit Uebergabe in {locationName} oder in der Naehe zu buchen.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} ist ein malerisches Dorf an der Ostkueste von Sithonia. Organisieren Sie Ihre Anmietung mit einer Uebergabe, die zu Ihrer Unterkunft und Ihren Plaenen passt.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} liegt auf dem Weg von Thessaloniki nach Halkidiki. Diese Seite hilft Ihnen, eine Autovermietung mit Uebergabe in {locationName} oder an Ihrer Unterkunft zu organisieren.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} ist fuer die Petralona-Hoehle bekannt und liegt etwas landeinwaerts von der Kueste. Organisieren Sie Ihre Anmietung mit Uebergabe in {locationName} oder in der Naehe fuer eine flexible Reise.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} ist ein Kuestendorf im Osten von Halkidiki. Diese Seite hilft Ihnen, eine Anmietung mit Uebergabe in {locationName} oder an Ihrer Unterkunft zu organisieren.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} ist ein Kuestendorf in der Naehe des antiken Stageira. Organisieren Sie Ihre Anmietung mit Uebergabe in {locationName} oder an Ihrer Unterkunft fuer Ausfluege zu Geschichte und Strand.",
  },
  bg: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Тази страница за локацията е насочена към търсенето в Thessaloniki и помага за бързо получаване на автомобил за престой в града, бизнес пътувания и трансфери до Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Халкидики е един от най-популярните курортни региони в Гърция, където кола под наем е особено удобна за пътувания между плажове, селища и полуостровите Касандра и Ситония. Natali Cars ще ви помогне бързо да организирате наем на кола в Халкидики за комфортна почивка и удобно придвижване из региона.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Неа Каликратия е популярен крайбрежен град по пътя към Халкидики.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Тази страница за подрегиона е насочена към пътувания по източното крайбрежие на Halkidiki, престой във вили и гъвкаво получаване на автомобил за по-дълги почивки в {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Тази страница за {locationName} е създадена за пътувания с насоченост към курортите и е свързана с основния раздел за Halkidiki за по-лесно планиране.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} е главното пристанище и вход към Halkidiki. Организирайте наем на кола с получаване в града или близо до пристанището за удобен старт на пътуването.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} е едно от основните градчета на Sithonia. Тази страница ви помага да изберете кола под наем с получаване, удобно за престоя ви в {locationName} или наблизо.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} е оживен курортен град на Sithonia с пристанище и много места за настаняване. Организирайте наема с получаване, което отговаря на плановете ви.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} е известен с дългия си плаж и спокойната атмосфера. Тази страница ви помага да резервирате кола под наем с получаване в {locationName} или при мястото ви за настаняване.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} е популярен курорт на Kassandra с оживена главна улица и добри плажове.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} предлага дълъг плаж и оживена централна улица. Тази страница ви помага да организирате кола под наем с удобно получаване за престоя ви.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} е оживен курорт с дълъг плаж и много удобства. Организирайте наем с получаване, което подхожда на мястото ви за настаняване.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} е семеен курорт с дълъг плаж. Тази страница ви свързва с кола под наем и получаване, съобразено с престоя ви.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} е живописно селище на Kassandra с каменни къщи и разположение върху скала.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} се намира между по-оживените курорти и предлага по-спокойна база. Тази страница ви помага да резервирате кола под наем с получаване в {locationName} или наблизо.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} е известен с премиум курорта и яхтеното пристанище. Организирайте кола под наем с получаване в {locationName} или при мястото ви за настаняване за пътувания из Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} е главният град в централната част на полуостров Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} е малък курорт на западното крайбрежие. Организирайте наем с получаване в {locationName} или при мястото ви за настаняване за по-спокойна почивка.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} е малко селище на Sithonia със спокойна атмосфера. Тази страница ви помага да резервирате кола под наем с получаване в {locationName} или наблизо.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} е живописно селище на източния бряг на Sithonia. Организирайте наем с получаване, което подхожда на мястото ви за настаняване и плановете ви.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} е по пътя към Halkidiki от Thessaloniki. Тази страница ви помага да организирате кола под наем с получаване в {locationName} или при мястото ви за настаняване.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} е известна с пещерата Петралона и се намира навътре от брега. Организирайте наем с получаване в {locationName} или наблизо за по-гъвкаво пътуване.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} е крайбрежно селище в източната част на Halkidiki. Тази страница ви помага да организирате наем с получаване в {locationName} или при мястото ви за настаняване.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} е крайбрежно селище близо до древна Стагира. Организирайте наем с получаване в {locationName} или при мястото ви за настаняване за исторически и плажни пътувания.",
  },
  ro: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Aceasta pagina de locatie vizeaza cererea din Thessaloniki si ii conecteaza pe calatori cu preluare rapida pentru sejururi in oras, calatorii de afaceri si transferuri spre Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Halkidiki este una dintre cele mai populare regiuni de vacanta din Grecia, unde inchirierea unei masini este deosebit de convenabila pentru drumuri intre plaje, localitati si peninsulele Kassandra si Sithonia. Natali Cars va ajuta sa organizati rapid inchiriere auto in Halkidiki pentru un sejur confortabil si deplasari usoare prin regiune.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Nea Kallikratia este un oras litoral popular pe drumul spre Halkidiki.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Aceasta pagina de subregiune este orientata spre calatorii pe coasta estica din Halkidiki, sejururi in vile si preluare flexibila pentru vacante mai lungi in {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Aceasta pagina pentru {locationName} este construita pentru calatorii orientate spre statiuni si este legata de hubul principal Halkidiki pentru o planificare mai usoara.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} este portul principal si poarta de intrare spre Halkidiki. Organizati inchirierea unei masini cu preluare in oras sau langa port pentru un inceput comod al calatoriei.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} este unul dintre principalele orasele din Sithonia. Aceasta pagina va ajuta sa gasiti inchiriere auto cu preluare potrivita pentru sejurul dvs. in {locationName} sau in apropiere.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} este o statiune animata din Sithonia, cu port si multe unitati de cazare. Organizati inchirierea cu o preluare care se potriveste planurilor dvs.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} este cunoscuta pentru plaja lunga si atmosfera relaxata. Aceasta pagina va ajuta sa rezervati o masina cu preluare in {locationName} sau la cazare.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} este o statiune populara din Kassandra, cu strada principala animata si plaje bune.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} ofera o plaja lunga si o strada principala aglomerata. Aceasta pagina va ajuta sa organizati inchiriere auto cu preluare convenabila pentru sejurul dvs.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} este o statiune animata cu plaja lunga si multe facilitati. Organizati inchirierea cu o preluare potrivita pentru cazarea dvs.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} este o statiune potrivita pentru familii, cu plaja lunga. Aceasta pagina va conecteaza la inchiriere auto cu preluare adaptata sejurului dvs.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} este un sat pitoresc din Kassandra, cu case de piatra si amplasare pe faleza.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} se afla intre statiunile mai animate si ofera o baza mai linistita. Aceasta pagina va ajuta sa rezervati inchiriere auto cu preluare in {locationName} sau in apropiere.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} este cunoscuta pentru resortul premium si marina. Organizati inchiriere auto cu preluare in {locationName} sau la cazare pentru drumuri prin Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} este orasul principal din centrul peninsulei Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} este o statiune mica de pe coasta vestica. Organizati inchirierea cu preluare in {locationName} sau la cazare pentru un sejur relaxat.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} este un sat mic din Sithonia, cu atmosfera relaxata. Aceasta pagina va ajuta sa rezervati inchiriere auto cu preluare in {locationName} sau in apropiere.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} este un sat pitoresc de pe coasta estica din Sithonia. Organizati inchirierea cu o preluare potrivita pentru cazarea si planurile dvs.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} se afla pe drumul spre Halkidiki din Thessaloniki. Aceasta pagina va ajuta sa organizati inchiriere auto cu preluare in {locationName} sau la cazare.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} este cunoscuta pentru Pestera Petralona si se afla mai spre interior fata de coasta. Organizati inchirierea cu preluare in {locationName} sau in apropiere pentru o calatorie mai flexibila.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} este un sat de coasta din partea estica a Halkidiki. Aceasta pagina va ajuta sa organizati inchirierea cu preluare in {locationName} sau la cazare.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} este un sat de coasta aproape de Stageira antica. Organizati inchirierea cu preluare in {locationName} sau la cazare pentru drumuri istorice si zile la plaja.",
  },
  sr: {
    [LOCATION_CONTENT_KEYS.THESSALONIKI]:
      "Ova stranica lokacije cilja potraznju u Thessaloniki i povezuje putnike sa brzim preuzimanjem automobila za boravak u gradu, poslovna putovanja i transfere ka Halkidiki.",
    [LOCATION_CONTENT_KEYS.HALKIDIKI]:
      "Халкидики је један од најпопуларнијих летовалишних региона у Грчкој, где је изнајмљивање аута посебно практично за вожњу између плажа, места и полуострва Касандра и Ситонија. Natali Cars вам помаже да брзо организујете изнајмљивање аута у Халкидикију за удобан одмор и лако кретање по региону.",
    [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]:
      "Неа Каликратија је популарно приобално место на путу ка Халкидикију.",
    [LOCATION_CONTENT_KEYS.SITHONIA]:
      "Ova stranica podregiona namenjena je putovanjima duz istocne obale Halkidiki, boravku u vilama i fleksibilnom preuzimanju automobila za duzi odmor u {locationName}.",
    [LOCATION_CONTENT_KEYS.KASSANDRA]:
      "Ova stranica za {locationName} napravljena je za putovanja usmerena na letovalista i povezana je sa glavnim Halkidiki hubom radi lakseg planiranja puta.",
    [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]:
      "{locationName} je glavna luka i ulaz u Halkidiki. Organizujte rent a car sa preuzimanjem u mestu ili blizu luke za laksi pocetak putovanja.",
    [LOCATION_CONTENT_KEYS.NIKITI]:
      "{locationName} je jedno od glavnih mesta na Sithonia. Ova stranica vam pomaze da pronadjete rent a car sa preuzimanjem prilagodjenim vasem boravku u {locationName} ili u blizini.",
    [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]:
      "{locationName} je zivo letovaliste na Sithonia sa lukom i mnogo smestaja. Organizujte najam sa preuzimanjem koje odgovara vasim planovima.",
    [LOCATION_CONTENT_KEYS.SARTI]:
      "{locationName} je poznat po dugoj plazi i opustenoj atmosferi. Ova stranica vam pomaze da rezervisete auto sa preuzimanjem u {locationName} ili kod smestaja.",
    [LOCATION_CONTENT_KEYS.KALLITHEA]:
      "{locationName} je popularno letovaliste na Kassandra sa zivom glavnom ulicom i dobrim plazama.",
    [LOCATION_CONTENT_KEYS.PEFKOHORI]:
      "{locationName} nudi dugu plazu i prometnu glavnu ulicu. Ova stranica vam pomaze da organizujete rent a car sa prakticnim preuzimanjem za vas boravak.",
    [LOCATION_CONTENT_KEYS.HANIOTI]:
      "{locationName} je zivo letovaliste sa dugom plazom i mnogo sadrzaja. Organizujte najam sa preuzimanjem koje odgovara vasem smestaju.",
    [LOCATION_CONTENT_KEYS.POLICHRONO]:
      "{locationName} je porodicno letovaliste sa dugom plazom. Ova stranica vas povezuje sa rent a car ponudom i preuzimanjem prilagodjenim vasem boravku.",
    [LOCATION_CONTENT_KEYS.AFITOS]:
      "{locationName} je slikovito selo na Kassandra sa kamenim kucama i polozajem na litici.",
    [LOCATION_CONTENT_KEYS.KRIOPIGI]:
      "{locationName} se nalazi izmedju prometnijih letovalista i nudi mirniju bazu. Ova stranica vam pomaze da rezervisete rent a car sa preuzimanjem u {locationName} ili u blizini.",
    [LOCATION_CONTENT_KEYS.SANI]:
      "{locationName} je poznat po premium rizortu i marini. Organizujte rent a car sa preuzimanjem u {locationName} ili kod smestaja za voznje po Kassandra.",
    [LOCATION_CONTENT_KEYS.KASSANDRIA]:
      "{locationName} je glavno mesto u centralnom delu poluostrva Kassandra.",
    [LOCATION_CONTENT_KEYS.FOURKA]:
      "{locationName} je malo letovaliste na zapadnoj obali. Organizujte najam sa preuzimanjem u {locationName} ili kod smestaja za opusten boravak.",
    [LOCATION_CONTENT_KEYS.METAMORFOSI]:
      "{locationName} je malo selo na Sithonia sa opustenom atmosferom. Ova stranica vam pomaze da rezervisete rent a car sa preuzimanjem u {locationName} ili u blizini.",
    [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]:
      "{locationName} je slikovito selo na istocnoj obali Sithonia. Organizujte najam sa preuzimanjem koje odgovara vasem smestaju i planovima.",
    [LOCATION_CONTENT_KEYS.ORMILIA]:
      "{locationName} se nalazi na putu ka Halkidiki iz Thessaloniki. Ova stranica vam pomaze da organizujete rent a car sa preuzimanjem u {locationName} ili kod smestaja.",
    [LOCATION_CONTENT_KEYS.PETRALONA]:
      "{locationName} je poznata po pecini Petralona i nalazi se u unutrasnjosti, nedaleko od obale. Organizujte najam sa preuzimanjem u {locationName} ili u blizini za fleksibilnije putovanje.",
    [LOCATION_CONTENT_KEYS.VRASNA]:
      "{locationName} je primorsko selo na istocnoj strani Halkidiki. Ova stranica vam pomaze da organizujete najam sa preuzimanjem u {locationName} ili kod smestaja.",
    [LOCATION_CONTENT_KEYS.OLYMPIADA]:
      "{locationName} je primorsko selo blizu anticke Stagire. Organizujte najam sa preuzimanjem u {locationName} ili kod smestaja za istorijske i plazne izlete.",
  },
};

const locationFaqFallbackTemplates: Partial<
  Record<SupportedLocale, LocationFaqFallbackTemplate>
> = {
  ru: [
    {
      question:
        "\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0430\u0432\u0442\u043E \u0432 {locationName} \u0440\u044F\u0434\u043E\u043C \u0441 \u043E\u0442\u0435\u043B\u0435\u043C?",
      answer:
        "\u0414\u0430. \u041C\u044B \u043C\u043E\u0436\u0435\u043C \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u0442\u044C \u0432\u044B\u0434\u0430\u0447\u0443 \u0443 \u043E\u0442\u0435\u043B\u044F, \u0430\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442\u043E\u0432 \u0438\u043B\u0438 \u0432 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u043E\u0439 \u0442\u043E\u0447\u043A\u0435.",
    },
    {
      question:
        "\u041F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u043B\u0438 \u0430\u0440\u0435\u043D\u0434\u0430 \u0430\u0432\u0442\u043E \u0432 {locationName} \u0434\u043B\u044F \u043F\u043E\u0435\u0437\u0434\u043E\u043A \u043F\u043E \u0440\u0435\u0433\u0438\u043E\u043D\u0443?",
      answer:
        "\u0414\u0430. \u0421 \u0430\u0432\u0442\u043E\u043C\u043E\u0431\u0438\u043B\u0435\u043C \u0443\u0434\u043E\u0431\u043D\u043E \u043F\u043E\u0441\u0435\u0449\u0430\u0442\u044C \u043F\u043B\u044F\u0436\u0438, \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0435 \u043A\u0443\u0440\u043E\u0440\u0442\u044B \u0438 \u0434\u043E\u0441\u0442\u043E\u043F\u0440\u0438\u043C\u0435\u0447\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438.",
    },
    {
      question:
        "\u041A\u0430\u043A \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u043C\u0435\u0441\u0442\u043E \u0438 \u0432\u0440\u0435\u043C\u044F \u0432\u044B\u0434\u0430\u0447\u0438 \u0432 {locationName}?",
      answer:
        "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u0438\u044F \u0438 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u043F\u0440\u0438 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438, \u0438 \u043C\u044B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043C \u0442\u043E\u0447\u043A\u0443 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438.",
    },
  ],
  uk: [
    {
      question:
        "\u0427\u0438 \u043C\u043E\u0436\u043D\u0430 \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u0430\u0432\u0442\u043E \u0432 {locationName} \u0431\u0456\u043B\u044F \u0433\u043E\u0442\u0435\u043B\u044E?",
      answer:
        "\u0422\u0430\u043A. \u041C\u0438 \u043C\u043E\u0436\u0435\u043C\u043E \u043E\u0440\u0433\u0430\u043D\u0456\u0437\u0443\u0432\u0430\u0442\u0438 \u0432\u0438\u0434\u0430\u0447\u0443 \u0431\u0456\u043B\u044F \u0433\u043E\u0442\u0435\u043B\u044E, \u0430\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442\u0456\u0432 \u0430\u0431\u043E \u0432 \u0443\u0437\u0433\u043E\u0434\u0436\u0435\u043D\u0456\u0439 \u0442\u043E\u0447\u0446\u0456.",
    },
    {
      question:
        "\u0427\u0438 \u0437\u0440\u0443\u0447\u043D\u0430 \u043E\u0440\u0435\u043D\u0434\u0430 \u0430\u0432\u0442\u043E \u0432 {locationName} \u0434\u043B\u044F \u043F\u043E\u0457\u0437\u0434\u043E\u043A \u043E\u043A\u043E\u043B\u0438\u0446\u044F\u043C\u0438?",
      answer:
        "\u0422\u0430\u043A. \u0410\u0432\u0442\u043E\u043C\u043E\u0431\u0456\u043B\u0435\u043C \u0437\u0440\u0443\u0447\u043D\u043E \u0432\u0456\u0434\u0432\u0456\u0434\u0430\u0442\u0438 \u043F\u043B\u044F\u0436\u0456, \u0441\u0443\u0441\u0456\u0434\u043D\u0456 \u043A\u0443\u0440\u043E\u0440\u0442\u0438 \u0442\u0430 \u0446\u0456\u043A\u0430\u0432\u0456 \u043C\u0456\u0441\u0446\u044F.",
    },
    {
      question:
        "\u042F\u043A \u0443\u0437\u0433\u043E\u0434\u0438\u0442\u0438 \u043C\u0456\u0441\u0446\u0435 \u0442\u0430 \u0447\u0430\u0441 \u0432\u0438\u0434\u0430\u0447\u0456 \u0432 {locationName}?",
      answer:
        "\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u0430\u0434\u0440\u0435\u0441\u0443 \u043F\u0440\u043E\u0436\u0438\u0432\u0430\u043D\u043D\u044F \u0442\u0430 \u0437\u0440\u0443\u0447\u043D\u0438\u0439 \u0447\u0430\u0441 \u043F\u0456\u0434 \u0447\u0430\u0441 \u0431\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F, \u0456 \u043C\u0438 \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043C\u043E \u0442\u043E\u0447\u043A\u0443 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0456.",
    },
  ],
  el: [
    {
      question:
        "\u039C\u03C0\u03BF\u03C1\u03CE \u03BD\u03B1 \u03C0\u03B1\u03C1\u03B1\u03BB\u03AC\u03B2\u03C9 \u03B1\u03C5\u03C4\u03BF\u03BA\u03AF\u03BD\u03B7\u03C4\u03BF \u03C3\u03C4\u03BF {locationName} \u03BA\u03BF\u03BD\u03C4\u03AC \u03C3\u03C4\u03BF \u03BE\u03B5\u03BD\u03BF\u03B4\u03BF\u03C7\u03B5\u03AF\u03BF \u03BC\u03BF\u03C5;",
      answer:
        "\u039D\u03B1\u03B9. \u039C\u03C0\u03BF\u03C1\u03BF\u03CD\u03BC\u03B5 \u03BD\u03B1 \u03BF\u03C1\u03B3\u03B1\u03BD\u03CE\u03C3\u03BF\u03C5\u03BC\u03B5 \u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7 \u03C3\u03B5 \u03BE\u03B5\u03BD\u03BF\u03B4\u03BF\u03C7\u03B5\u03AF\u03BF, \u03B4\u03B9\u03B1\u03BC\u03AD\u03C1\u03B9\u03C3\u03BC\u03B1 \u03AE \u03C3\u03B5 \u03C3\u03C5\u03BC\u03C6\u03C9\u03BD\u03B7\u03BC\u03AD\u03BD\u03BF \u03C3\u03B7\u03BC\u03B5\u03AF\u03BF.",
    },
    {
      question:
        "\u0395\u03AF\u03BD\u03B1\u03B9 \u03C7\u03C1\u03AE\u03C3\u03B9\u03BC\u03B7 \u03B7 \u03B5\u03BD\u03BF\u03B9\u03BA\u03AF\u03B1\u03C3\u03B7 \u03B1\u03C5\u03C4\u03BF\u03BA\u03B9\u03BD\u03AE\u03C4\u03BF\u03C5 \u03C3\u03C4\u03BF {locationName} \u03B3\u03B9\u03B1 \u03B4\u03B9\u03B1\u03B4\u03C1\u03BF\u03BC\u03AD\u03C2 \u03C3\u03C4\u03B7\u03BD \u03C0\u03B5\u03C1\u03B9\u03BF\u03C7\u03AE;",
      answer:
        "\u039D\u03B1\u03B9. \u039C\u03B5 \u03B1\u03C5\u03C4\u03BF\u03BA\u03AF\u03BD\u03B7\u03C4\u03BF \u03BC\u03B5\u03C4\u03B1\u03BA\u03B9\u03BD\u03B5\u03AF\u03C3\u03C4\u03B5 \u03B5\u03CD\u03BA\u03BF\u03BB\u03B1 \u03C3\u03B5 \u03C0\u03B1\u03C1\u03B1\u03BB\u03AF\u03B5\u03C2, \u03B3\u03B5\u03B9\u03C4\u03BF\u03BD\u03B9\u03BA\u03AC \u03B8\u03AD\u03C1\u03B5\u03C4\u03C1\u03B1 \u03BA\u03B1\u03B9 \u03B1\u03BE\u03B9\u03BF\u03B8\u03AD\u03B1\u03C4\u03B1.",
    },
    {
      question:
        "\u03A0\u03CE\u03C2 \u03BA\u03B1\u03BD\u03BF\u03BD\u03AF\u03B6\u03C9 \u03C4\u03BF \u03C3\u03B7\u03BC\u03B5\u03AF\u03BF \u03BA\u03B1\u03B9 \u03C4\u03B7\u03BD \u03CE\u03C1\u03B1 \u03C0\u03B1\u03C1\u03B1\u03BB\u03B1\u03B2\u03AE\u03C2 \u03C3\u03C4\u03BF {locationName};",
      answer:
        "\u0394\u03CE\u03C3\u03C4\u03B5 \u03C3\u03C4\u03B7\u03BD \u03BA\u03C1\u03AC\u03C4\u03B7\u03C3\u03B7 \u03C4\u03B7 \u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03AE \u03C3\u03B1\u03C2 \u03BA\u03B1\u03B9 \u03C4\u03B7\u03BD \u03B5\u03C0\u03B9\u03B8\u03C5\u03BC\u03B7\u03C4\u03AE \u03CE\u03C1\u03B1 \u03BA\u03B1\u03B9 \u03B8\u03B1 \u03B5\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03B9\u03CE\u03C3\u03BF\u03C5\u03BC\u03B5 \u03C4\u03BF \u03C3\u03B7\u03BC\u03B5\u03AF\u03BF \u03C0\u03B1\u03C1\u03AC\u03B4\u03BF\u03C3\u03B7\u03C2.",
    },
  ],
  de: [
    {
      question:
        "Kann ich das Auto in {locationName} in der Naehe meines Hotels uebernehmen?",
      answer:
        "Ja. Wir koennen die Uebergabe am Hotel, Apartment oder an einem vereinbarten Treffpunkt organisieren.",
    },
    {
      question:
        "Ist ein Mietwagen in {locationName} praktisch fuer Ausfluege in die Umgebung?",
      answer:
        "Ja. Mit dem Auto erreichen Sie Straende, benachbarte Orte und Sehenswuerdigkeiten flexibel.",
    },
    {
      question: "Wie vereinbare ich Abholort und Uhrzeit in {locationName}?",
      answer:
        "Geben Sie bei der Buchung Ihre Adresse und Wunschzeit an, wir bestaetigen den Treffpunkt.",
    },
  ],
  bg: [
    {
      question:
        "\u041C\u043E\u0433\u0430 \u043B\u0438 \u0434\u0430 \u0432\u0437\u0435\u043C\u0430 \u043A\u043E\u043B\u0430 \u0432 {locationName} \u0431\u043B\u0438\u0437\u043E \u0434\u043E \u0445\u043E\u0442\u0435\u043B\u0430 \u043C\u0438?",
      answer:
        "\u0414\u0430. \u041C\u043E\u0436\u0435\u043C \u0434\u0430 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0438\u0440\u0430\u043C\u0435 \u043F\u0440\u0435\u0434\u0430\u0432\u0430\u043D\u0435 \u043F\u0440\u0438 \u0445\u043E\u0442\u0435\u043B, \u0430\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u043D\u0430 \u0443\u0433\u043E\u0432\u043E\u0440\u0435\u043D\u0430 \u0442\u043E\u0447\u043A\u0430.",
    },
    {
      question:
        "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449 \u043B\u0438 \u0435 \u043D\u0430\u0435\u043C\u044A\u0442 \u043D\u0430 \u043A\u043E\u043B\u0430 \u0432 {locationName} \u0437\u0430 \u0440\u0430\u0437\u0445\u043E\u0434\u043A\u0438 \u0432 \u0440\u0430\u0439\u043E\u043D\u0430?",
      answer:
        "\u0414\u0430. \u0421 \u043A\u043E\u043B\u0430 \u043B\u0435\u0441\u043D\u043E \u0441\u0442\u0438\u0433\u0430\u0442\u0435 \u0434\u043E \u043F\u043B\u0430\u0436\u043E\u0432\u0435, \u0441\u044A\u0441\u0435\u0434\u043D\u0438 \u043A\u0443\u0440\u043E\u0440\u0442\u0438 \u0438 \u0437\u0430\u0431\u0435\u043B\u0435\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442\u0438.",
    },
    {
      question:
        "\u041A\u0430\u043A \u0434\u0430 \u0443\u0442\u043E\u0447\u043D\u044F \u043C\u044F\u0441\u0442\u043E\u0442\u043E \u0438 \u0447\u0430\u0441\u0430 \u0437\u0430 \u043F\u0440\u0435\u0434\u0430\u0432\u0430\u043D\u0435 \u0432 {locationName}?",
      answer:
        "\u041F\u043E\u0441\u043E\u0447\u0435\u0442\u0435 \u0430\u0434\u0440\u0435\u0441\u0430 \u0438 \u0443\u0434\u043E\u0431\u043D\u0438\u044F \u0447\u0430\u0441 \u043F\u0440\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430\u0446\u0438\u044F, \u0430 \u043D\u0438\u0435 \u0449\u0435 \u043F\u043E\u0442\u0432\u044A\u0440\u0434\u0438\u043C \u0442\u043E\u0447\u043A\u0430\u0442\u0430 \u0437\u0430 \u043F\u0440\u0435\u0434\u0430\u0432\u0430\u043D\u0435.",
    },
  ],
  ro: [
    {
      question: "Pot prelua masina in {locationName} aproape de hotel?",
      answer:
        "Da. Putem organiza predarea la hotel, apartament sau intr-un punct stabilit impreuna.",
    },
    {
      question:
        "Este utila inchirierea unei masini in {locationName} pentru excursii in zona?",
      answer:
        "Da. Cu masina ajungeti usor la plaje, localitati vecine si obiective turistice.",
    },
    {
      question: "Cum stabilesc locul si ora preluarii in {locationName}?",
      answer:
        "Indicati adresa si ora dorita la rezervare, iar noi confirmam punctul de predare.",
    },
  ],
  sr: [
    {
      question: "Da li mogu preuzeti auto u {locationName} blizu hotela?",
      answer:
        "Da. Mozemo organizovati preuzimanje kod hotela, apartmana ili na dogovorenom mestu.",
    },
    {
      question: "Da li je rent a car u {locationName} dobar za izlete po okolini?",
      answer:
        "Da. Automobilom lako obilazite plaze, susedna mesta i znamenitosti.",
    },
    {
      question: "Kako da dogovorim mesto i vreme preuzimanja u {locationName}?",
      answer:
        "Unesite adresu i zeljeno vreme pri rezervaciji, a mi cemo potvrditi tacku preuzimanja.",
    },
  ],
};

const fallbackShortNameOverridesByLocale: Partial<
  Record<SupportedLocale, Record<string, string>>
> = {
  ru: {
    "Nea Moudania": "Неа Муданья",
    Nikiti: "Никити",
    "Neos Marmaras": "Неос Мармарас",
    Sarti: "Сарти",
    Kallithea: "Каллифея",
    Pefkohori: "Пефкохори",
    Hanioti: "Ханиоти",
    Polichrono: "Полихроно",
    Afitos: "Афитос",
    Kriopigi: "Криопиги",
    Sani: "Сани",
    Kassandria: "Кассандрия",
    Fourka: "Фурка",
    Metamorfosi: "Метаморфоси",
    "Agios Nikolaos": "Агиос Николаос",
    Ormilia: "Ормилия",
    Petralona: "Петралона",
    Vrasna: "Врасна",
    Olympiada: "Олимпиада",
    "Nea Fokea": "Неа Фокея",
    Sykes: "Сикья",
    Stratoni: "Стратони",
    "Porto Carras": "Порто Карас",
    Thessaloniki: "Салоники",
    Halkidiki: "Халкидики",
    Sithonia: "Ситония",
    Kassandra: "Кассандра",
    "Nea Kallikratia": "Неа Калликратия",
  },
  uk: {
    "Nea Moudania": "Неа Муданія",
    Nikiti: "Нікіті",
    "Neos Marmaras": "Неос Мармарас",
    Sarti: "Сарті",
    Kallithea: "Калліфея",
    Pefkohori: "Пефкохорі",
    Hanioti: "Ханіоті",
    Polichrono: "Поліхроно",
    Afitos: "Афітос",
    Kriopigi: "Кріопігі",
    Sani: "Сані",
    Kassandria: "Кассандрія",
    Fourka: "Фурка",
    Metamorfosi: "Метаморфосі",
    "Agios Nikolaos": "Агіос Ніколаос",
    Ormilia: "Ормілія",
    Petralona: "Петралона",
    Vrasna: "Врасна",
    Olympiada: "Олімпіада",
    "Nea Fokea": "Неа Фокея",
    Sykes: "Сікія",
    Stratoni: "Стратоні",
    "Porto Carras": "Порто Каррас",
    Thessaloniki: "Салоніки",
    Halkidiki: "Халкідікі",
    Sithonia: "Ситонія",
    Kassandra: "Кассандра",
    "Nea Kallikratia": "Неа Каллікратія",
  },
  el: {
    "Nea Moudania": "Νέα Μουδανιά",
    Nikiti: "Νικήτη",
    "Neos Marmaras": "Νέος Μαρμαράς",
    Sarti: "Σάρτη",
    Kallithea: "Καλλιθέα",
    Pefkohori: "Πευκοχώρι",
    Hanioti: "Χανιώτη",
    Polichrono: "Πολύχρονο",
    Afitos: "Άφυτος",
    Kriopigi: "Κρυοπηγή",
    Sani: "Σάνη",
    Kassandria: "Κασσάνδρεια",
    Fourka: "Φούρκα",
    Metamorfosi: "Μεταμόρφωση",
    "Agios Nikolaos": "Άγιος Νικόλαος",
    Ormilia: "Ορμύλια",
    Petralona: "Πετράλωνα",
    Vrasna: "Βρασνά",
    Olympiada: "Ολυμπιάδα",
    "Nea Fokea": "Νέα Φώκαια",
    Sykes: "Συκιά",
    Stratoni: "Στρατώνι",
    "Porto Carras": "Πόρτο Καρράς",
    Thessaloniki: "Θεσσαλονίκη",
    Halkidiki: "Χαλκιδική",
    Sithonia: "Σιθωνία",
    Kassandra: "Κασσάνδρα",
    "Nea Kallikratia": "Νέα Καλλικράτεια",
  },
  bg: {
    "Nea Moudania": "Неа Мудания",
    Nikiti: "Никити",
    "Neos Marmaras": "Неос Мармарас",
    Sarti: "Сарти",
    Kallithea: "Калитея",
    Pefkohori: "Пефкохори",
    Hanioti: "Ханиоти",
    Polichrono: "Полихроно",
    Afitos: "Афитос",
    Kriopigi: "Криопиги",
    Sani: "Сани",
    Kassandria: "Касандрия",
    Fourka: "Фурка",
    Metamorfosi: "Метаморфоси",
    "Agios Nikolaos": "Агиос Николаос",
    Ormilia: "Ормилия",
    Petralona: "Петралона",
    Vrasna: "Врасна",
    Olympiada: "Олимпиада",
    "Nea Fokea": "Неа Фокея",
    Sykes: "Сикия",
    Stratoni: "Стратони",
    "Porto Carras": "Порто Карас",
    Thessaloniki: "Солун",
    Halkidiki: "Халкидики",
    Sithonia: "Ситония",
    Kassandra: "Касандра",
    "Nea Kallikratia": "Неа Каликратия",
  },
  ro: {
    Thessaloniki: "Salonic",
    "Thessaloniki Airport": "Aeroport Salonic",
  },
  sr: {
    "Nea Moudania": "Неа Муданија",
    Nikiti: "Никити",
    "Neos Marmaras": "Неос Мармарас",
    Sarti: "Сарти",
    Kallithea: "Калитеа",
    Pefkohori: "Пефкохори",
    Hanioti: "Ханиоти",
    Polichrono: "Полихроно",
    Afitos: "Афитос",
    Kriopigi: "Криопиги",
    Sani: "Сани",
    Kassandria: "Касандрија",
    Fourka: "Фурка",
    Metamorfosi: "Метаморфоси",
    "Agios Nikolaos": "Агиос Николаос",
    Ormilia: "Ормилија",
    Petralona: "Петралона",
    Vrasna: "Врасна",
    Olympiada: "Олимпијада",
    "Nea Fokea": "Неа Фокеја",
    Sykes: "Сикија",
    Stratoni: "Стратони",
    "Porto Carras": "Порто Карас",
    Thessaloniki: "Солун",
    Halkidiki: "Халкидики",
    Sithonia: "Ситонија",
    Kassandra: "Касандра",
    "Nea Kallikratia": "Неа Каликратија",
  },
};

const fallbackNearbyPlaceOverridesByLocale: Partial<
  Record<SupportedLocale, Record<string, string>>
> = {
  ru: {
    "Agios Nikolaos (Sithonia)": "Агиос Николаос (Ситония)",
    "Mount Athos area (by boat)": "Район Афона (на лодке)",
    "Mount Athos (viewpoints)": "Афон (смотровые точки)",
    "Sykes Beach": "Пляж Сикья",
    "Thessaloniki (day trip)": "Салоники (поездка на день)",
    "Ancient Stageira": "Древняя Стагира",
  },
  uk: {
    "Agios Nikolaos (Sithonia)": "Агіос Ніколаос (Ситонія)",
    "Mount Athos area (by boat)": "Район Афону (човном)",
    "Mount Athos (viewpoints)": "Афон (оглядові точки)",
    "Sykes Beach": "Пляж Сікія",
    "Thessaloniki (day trip)": "Салоніки (поїздка на день)",
    "Ancient Stageira": "Стародавня Стагіра",
  },
  el: {
    "Agios Nikolaos (Sithonia)": "Άγιος Νικόλαος (Σιθωνία)",
    "Mount Athos area (by boat)": "Περιοχή Αγίου Όρους (με καραβάκι)",
    "Mount Athos (viewpoints)": "Άγιο Όρος (σημεία θέας)",
    "Sykes Beach": "Παραλία Συκιάς",
    "Thessaloniki (day trip)": "Θεσσαλονίκη (ημερήσια εκδρομή)",
    "Ancient Stageira": "Αρχαία Στάγειρα",
  },
  de: {
    "Agios Nikolaos (Sithonia)": "Agios Nikolaos (Sithonia)",
    "Mount Athos area (by boat)": "Gebiet Athos (mit dem Boot)",
    "Mount Athos (viewpoints)": "Athos (Aussichtspunkte)",
    "Sykes Beach": "Strand Sykes",
    "Thessaloniki (day trip)": "Thessaloniki (Tagesausflug)",
    "Ancient Stageira": "Antikes Stageira",
  },
  bg: {
    "Agios Nikolaos (Sithonia)": "Агиос Николаос (Ситония)",
    "Mount Athos area (by boat)": "Районът на Атон (с лодка)",
    "Mount Athos (viewpoints)": "Атон (панорамни точки)",
    "Sykes Beach": "Плаж Сикия",
    "Thessaloniki (day trip)": "Солун (еднодневна екскурзия)",
    "Ancient Stageira": "Древна Стагира",
  },
  ro: {
    "Agios Nikolaos (Sithonia)": "Agios Nikolaos (Sithonia)",
    "Mount Athos area (by boat)": "Zona Muntelui Athos (cu barca)",
    "Mount Athos (viewpoints)": "Muntele Athos (puncte panoramice)",
    "Sykes Beach": "Plaja Sykes",
    "Thessaloniki (day trip)": "Salonic (excursie de o zi)",
    "Ancient Stageira": "Stageira antică",
  },
  sr: {
    "Agios Nikolaos (Sithonia)": "Агиос Николаос (Ситонија)",
    "Mount Athos area (by boat)": "Област Атоса (бродом)",
    "Mount Athos (viewpoints)": "Атос (видиковци)",
    "Sykes Beach": "Плажа Сикија",
    "Thessaloniki (day trip)": "Солун (једнодневни излет)",
    "Ancient Stageira": "Античка Стагира",
  },
};

const fallbackUsefulTipsOverridesByLocale: Partial<
  Record<SupportedLocale, Record<string, string>>
> = {
  ru: {
    "Book in advance during peak season (July–August) for best availability.":
      "Бронируйте заранее в высокий сезон (июль–август), чтобы получить лучший выбор автомобилей.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Мы предлагаем бесплатную подачу к отелям и апартаментам в Неа Калликратии.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Неа Калликратия — удобная остановка по пути в Ситонию и Кассандру.",
  },
  uk: {
    "Book in advance during peak season (July–August) for best availability.":
      "Бронюйте заздалегідь у високий сезон (липень–серпень), щоб мати кращий вибір автомобілів.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Ми пропонуємо безкоштовну подачу до готелів і апартаментів у Неа Каллікратії.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Неа Каллікратія — зручна зупинка дорогою до Ситонії та Кассандри.",
  },
  el: {
    "Book in advance during peak season (July–August) for best availability.":
      "Κάντε κράτηση νωρίς στην υψηλή περίοδο (Ιούλιος–Αύγουστος) για καλύτερη διαθεσιμότητα αυτοκινήτων.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Προσφέρουμε δωρεάν παράδοση σε ξενοδοχεία και διαμερίσματα στη Νέα Καλλικράτεια.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Η Νέα Καλλικράτεια είναι μια βολική στάση στον δρόμο προς τη Σιθωνία και την Κασσάνδρα.",
  },
  de: {
    "Book in advance during peak season (July–August) for best availability.":
      "Buchen Sie in der Hochsaison (Juli–August) fruehzeitig, um die beste Auswahl zu erhalten.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Wir bieten kostenlose Zustellung zu Hotels und Apartments in Nea Kallikratia an.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Nea Kallikratia ist ein praktischer Zwischenstopp auf dem Weg nach Sithonia und Kassandra.",
  },
  bg: {
    "Book in advance during peak season (July–August) for best availability.":
      "Резервирайте предварително през активния сезон (юли–август), за да имате по-добър избор на автомобили.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Предлагаме безплатна доставка до хотели и апартаменти в Неа Каликратия.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Неа Каликратия е удобна спирка по пътя към Ситония и Касандра.",
  },
  ro: {
    "Book in advance during peak season (July–August) for best availability.":
      "Rezervati din timp in sezonul de varf (iulie–august) pentru cea mai buna disponibilitate.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Oferim livrare gratuita la hoteluri si apartamente in Nea Kallikratia.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Nea Kallikratia este o oprire convenabila pe drumul spre Sithonia si Kassandra.",
  },
  sr: {
    "Book in advance during peak season (July–August) for best availability.":
      "Rezervisite unapred u glavnoj sezoni (jul–avgust) za bolji izbor automobila.",
    "We offer free delivery to hotels and apartments in Nea Kallikratia.":
      "Nudimo besplatnu dostavu do hotela i apartmana u Nei Kalikratiji.",
    "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.":
      "Nea Kalikratija je zgodna stanica na putu ka Sitoniji i Kasandri.",
  },
};

function fillLocationNameTemplate(template: string, locationName: string): string {
  return template.replaceAll("{locationName}", locationName);
}

function localizeFallbackShortName(locale: SupportedLocale, locationName: string): string {
  return fallbackShortNameOverridesByLocale[locale]?.[locationName] || locationName;
}

function replaceLocalizedNames(locale: SupportedLocale, value: string): string {
  const replacements = fallbackShortNameOverridesByLocale[locale];
  if (!replacements) return value;

  return Object.entries(replacements)
    .sort((a, b) => b[0].length - a[0].length)
    .reduce((text, [from, to]) => text.replaceAll(from, to), value);
}

function getTranslatedLocationIntroText(
  locale: SupportedLocale,
  contentKey: LocationContentKey,
  locationName: string,
  englishIntroText: string
): string {
  if (locale === DEFAULT_LOCALE) {
    return englishIntroText;
  }

  const template = locationIntroTranslationTemplates[locale]?.[contentKey];
  if (!template) {
    throw new Error(
      `[locationSeoRepo] Missing introText translation for ${contentKey} locale ${locale}`
    );
  }

  return replaceLocalizedNames(locale, fillLocationNameTemplate(template, locationName));
}

function keepOnlyFirstSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const firstSentence = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return firstSentence ? firstSentence[0].trim() : trimmed;
}

const LOCATION_BOOKING_COPY_FULL_INTRO_CONTENT_KEYS = new Set<LocationContentKey>([
  LOCATION_CONTENT_KEYS.HALKIDIKI,
]);

function getIntroTextBeforeBookingSentence(
  contentKey: LocationContentKey,
  value: string
): string {
  if (LOCATION_BOOKING_COPY_FULL_INTRO_CONTENT_KEYS.has(contentKey)) {
    return value.trim();
  }

  return keepOnlyFirstSentence(value);
}

function localizeFallbackListItem(
  locale: SupportedLocale,
  value: string,
  overrides: Partial<Record<SupportedLocale, Record<string, string>>>
): string {
  const exactOverride = overrides[locale]?.[value];
  return replaceLocalizedNames(locale, exactOverride || value);
}

function localizeFallbackList(
  locale: SupportedLocale,
  values: string[] | undefined,
  overrides: Partial<Record<SupportedLocale, Record<string, string>>>
): string[] | undefined {
  if (!values || values.length === 0) return values;
  return values.map((value) => localizeFallbackListItem(locale, value, overrides));
}

function buildLocalizedFallbackFaq(
  locale: SupportedLocale,
  baseFaq: LocationSeoFaqItem[] | undefined,
  locationName: string
): LocationSeoFaqItem[] | undefined {
  if (!baseFaq || baseFaq.length === 0) {
    return baseFaq;
  }

  const faqTemplate = locationFaqFallbackTemplates[locale];
  if (!faqTemplate || faqTemplate.length === 0) {
    return baseFaq;
  }

  return faqTemplate.map((item) => ({
    question: fillLocationNameTemplate(item.question, locationName),
    answer: fillLocationNameTemplate(item.answer, locationName),
  }));
}

function buildLocalizedFallbackLocationContent(
  locale: SupportedLocale,
  baseContent: LocationSeoContent
): LocationSeoContent {
  const template = locationContentFallbackTemplates[locale];
  const locationName = localizeFallbackShortName(locale, baseContent.shortName);
  const localizedFaq = buildLocalizedFallbackFaq(locale, baseContent.faq, locationName);

  if (!template) {
    return {
      ...baseContent,
      shortName: locationName,
      nearbyPlaces: localizeFallbackList(
        locale,
        baseContent.nearbyPlaces,
        fallbackNearbyPlaceOverridesByLocale
      ),
      usefulTips: localizeFallbackList(
        locale,
        baseContent.usefulTips,
        fallbackUsefulTipsOverridesByLocale
      ),
      faq: localizedFaq,
    };
  }

  return {
    ...baseContent,
    shortName: locationName,
    h1: fillLocationNameTemplate(template.h1, locationName),
    seoTitle: fillLocationNameTemplate(template.seoTitle, locationName),
    seoDescription: fillLocationNameTemplate(template.seoDescription, locationName),
    introText: fillLocationNameTemplate(template.introText, locationName),
    pickupLocation: fillLocationNameTemplate(template.pickupLocation, locationName),
    offerName: fillLocationNameTemplate(template.offerName, locationName),
    offerDescription: fillLocationNameTemplate(template.offerDescription, locationName),
    pickupGuidance: baseContent.pickupGuidance
      ? fillLocationNameTemplate(template.pickupGuidance, locationName)
      : baseContent.pickupGuidance,
    nearbyPlaces: localizeFallbackList(
      locale,
      baseContent.nearbyPlaces,
      fallbackNearbyPlaceOverridesByLocale
    ),
    usefulTips: localizeFallbackList(
      locale,
      baseContent.usefulTips,
      fallbackUsefulTipsOverridesByLocale
    ),
    faq: localizedFaq,
  };
}

function expandLocationContentRecord(
  partial: PartialLocaleRecord<LocationSeoContent>
): Record<SupportedLocale, LocationSeoContent> {
  const fallbackContent = partial[DEFAULT_LOCALE];
  if (!fallbackContent) {
    throw new Error("[locationSeoRepo] Missing default locale location content");
  }

  const expanded = {} as Record<SupportedLocale, LocationSeoContent>;

  for (const locale of SUPPORTED_LOCALES) {
    const localizedFallback =
      locale === DEFAULT_LOCALE
        ? fallbackContent
        : buildLocalizedFallbackLocationContent(locale, fallbackContent);
    const localizedPartial = partial[locale];

    expanded[locale] = localizedPartial
      ? {
          ...localizedFallback,
          ...localizedPartial,
        }
      : localizedFallback;
  }

  return expanded;
}

function applyIntroTextOverrides(
  contentKey: LocationContentKey,
  localizedContent: Record<SupportedLocale, LocationSeoContent>
): Record<SupportedLocale, LocationSeoContent> {
  if (!shouldApplyLocationBookingCopyToContentKey(contentKey)) {
    return localizedContent;
  }

  const englishIntroText = localizedContent[DEFAULT_LOCALE].introText;

  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    const content = localizedContent[locale];
    const translatedIntroText = getTranslatedLocationIntroText(
      locale,
      contentKey,
      content.shortName,
      englishIntroText
    );

    acc[locale] = {
      ...content,
      introText: appendLocationBookingSentence(
        getIntroTextBeforeBookingSentence(contentKey, translatedIntroText),
        locale,
        content.shortName
      ),
    };
    return acc;
  }, {} as Record<SupportedLocale, LocationSeoContent>);
}
function applyDistanceTextOverrides(
  contentKey: LocationContentKey,
  localizedContent: Record<SupportedLocale, LocationSeoContent>
): Record<SupportedLocale, LocationSeoContent> {
  const overrides = distanceToThessalonikiTextOverridesByContentKey[contentKey];
  if (!overrides) return localizedContent;

  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    const overrideText = overrides[locale];
    acc[locale] = overrideText
      ? {
          ...localizedContent[locale],
          distanceToThessalonikiText: overrideText,
        }
      : localizedContent[locale];
    return acc;
  }, {} as Record<SupportedLocale, LocationSeoContent>);
}

/**
 * Location page content — single source of truth for all location SEO pages.
 *
 * Edit content here. Each location has per-locale content with:
 * - introText: main intro (first para = hero, rest = main info if no mainInfoText)
 * - mainInfoText (optional): extra location details block
 * - distanceToThessalonikiText (optional): "Distance to Thessaloniki" paragraph
 * - pickupGuidance (optional): pickup instructions
 * - nearbyPlaces (optional): string[] of nearby spots
 * - usefulTips (optional): string[] of travel/rental tips
 * - faq (optional): { question, answer }[] — hide block if empty
 */
const locationContentByKeyRaw: Record<
  LocationContentKey,
  PartialLocaleRecord<LocationSeoContent>
> = {
  [LOCATION_CONTENT_KEYS.THESSALONIKI]: {
    en: {
      shortName: "Thessaloniki",
      h1: "Car Rental in Thessaloniki",
      seoTitle: "Car Rental in Thessaloniki City | Natali Cars",
      seoDescription:
        "Rent a car in Thessaloniki city with hotel-area pickup, direct communication, and transfer-ready scheduling to Halkidiki.",
      introText:
        "Thessaloniki is the second-largest city in Greece and the main center of Northern Greece. Natali Cars helps you quickly arrange car pickup for city trips, business visits, and transfers to Halkidiki. Book your rental car online in Thessaloniki with no deposit, with pickup at your accommodation or in the city, and 24/7 support.",
      areaServed: ["Thessaloniki Center", "Perea", "Kalamaria"],
      pickupLocation: "Thessaloniki City Pickup Point",
      offerName: "Thessaloniki City Car Hire Offer",
      offerDescription:
        "Flexible city pickup for short stays, business schedules, and direct transfer to Halkidiki resorts.",
      distanceToThessalonikiText:
        "Thessaloniki is the second-largest city in Greece and the main hub for Northern Greece.",
      faq: [
        {
          question:
            "Can I pick up the car in Thessaloniki city center or at my hotel?",
          answer:
            "Yes. We can arrange handover near your hotel, apartment, business address, or at an agreed meeting point in the city.",
        },
        {
          question:
            "Is Thessaloniki a convenient pickup point for trips to Halkidiki?",
          answer:
            "Yes. Thessaloniki is a practical starting point for city stays and onward drives to Halkidiki, with direct routes toward Kassandra and Sithonia.",
        },
        {
          question:
            "What should I provide to arrange pickup in Thessaloniki?",
          answer:
            "Send your accommodation address or preferred meeting point and your requested time during booking, and we will confirm the handover details with you.",
        },
      ],
    },
    ru: {
      shortName: "Салоники",
      h1: "Прокат авто в Салониках",
      seoTitle: "Прокат авто в Салониках | Natali Cars",
      seoDescription:
        "Аренда автомобиля в Салониках с выдачей в городе, поддержкой напрямую и удобной передачей авто для поездок в Халкидики.",
      introText:
        "Салоники — второй по величине город Греции и главный центр Северной Греции. Natali Cars поможет вам быстро организовать выдачу автомобиля для поездок по городу, деловых визитов и трансферов в Халкидики. Бронируйте онлайн авто в Салониках без депозита с выдачей у места проживания или в городе и поддержкой 24/7.",
      areaServed: ["Центр Салоник", "Перея", "Каламария"],
      pickupLocation: "Точка выдачи в Салониках",
      offerName: "Предложение проката в Салониках",
      offerDescription:
        "Городская выдача для коротких поездок, рабочих визитов и трансфера в Халкидики.",
      faq: [
        {
          question:
            "Можно ли получить авто в центре Салоник или у отеля?",
          answer:
            "Да. Мы можем организовать выдачу рядом с вашим отелем, апартаментами, деловым адресом или в согласованной точке в городе.",
        },
        {
          question:
            "Подходят ли Салоники как точка выдачи для поездок в Халкидики?",
          answer:
            "Да. Салоники удобны как стартовая точка для пребывания в городе и дальнейших поездок в Халкидики по прямым маршрутам в сторону Кассандры и Ситонии.",
        },
        {
          question:
            "Что нужно указать для выдачи авто в Салониках?",
          answer:
            "Укажите при бронировании адрес проживания или удобную точку встречи и желаемое время, а мы подтвердим детали передачи автомобиля.",
        },
      ],
    },
    uk: {
      shortName: "Салоніки",
      h1: "Оренда авто в Салоніках",
      seoTitle: "Оренда авто в Салоніках | Natali Cars",
      seoDescription:
        "Орендуйте авто в Салоніках з отриманням у місті, прямою підтримкою та зручною передачею авто для поїздок у Халкідіки.",
      introText:
        "Салоніки — друге за величиною місто Греції та головний центр Північної Греції. Natali Cars допоможе вам швидко організувати видачу автомобіля для поїздок містом, ділових візитів і трансферів до Халкідікі. Бронюйте онлайн авто в Салоніках без депозиту з видачею біля місця проживання або в місті та з підтримкою 24/7.",
      areaServed: ["Центр Салонік", "Перея", "Каламарія"],
      pickupLocation: "Точка отримання в Салоніках",
      offerName: "Пропозиція оренди в Салоніках",
      offerDescription:
        "Міське отримання для коротких поїздок, робочих візитів і трансферу до Халкідік.",
      faq: [
        {
          question:
            "Чи можна отримати авто в центрі Салонік або біля готелю?",
          answer:
            "Так. Ми можемо організувати видачу біля вашого готелю, апартаментів, ділової адреси або в узгодженій точці в місті.",
        },
        {
          question:
            "Чи зручні Салоніки як точка отримання для поїздок до Халкідікі?",
          answer:
            "Так. Салоніки є зручною стартовою точкою для перебування в місті та подальших поїздок до Халкідікі прямими маршрутами у бік Кассандри та Сітонії.",
        },
        {
          question:
            "Що потрібно вказати для отримання авто в Салоніках?",
          answer:
            "Вкажіть під час бронювання адресу проживання або зручну точку зустрічі та бажаний час, а ми підтвердимо деталі передачі автомобіля.",
        },
      ],
    },
    el: {
      shortName: "Θεσσαλονίκη",
      h1: "Ενοικίαση αυτοκινήτου στη Θεσσαλονίκη",
      seoTitle: "Ενοικίαση αυτοκινήτου στη Θεσσαλονίκη | Natali Cars",
      seoDescription:
        "Ενοικιάστε αυτοκίνητο στη Θεσσαλονίκη με παραλαβή στην πόλη, άμεση υποστήριξη και εύκολη μετακίνηση προς Χαλκιδική.",
      introText:
        "Η Θεσσαλονίκη είναι η δεύτερη μεγαλύτερη πόλη της Ελλάδας και το κύριο κέντρο της Βόρειας Ελλάδας. Η Natali Cars σας βοηθά να οργανώσετε γρήγορα την παραλαβή αυτοκινήτου για μετακινήσεις στην πόλη, επαγγελματικά ταξίδια και μεταφορές προς τη Χαλκιδική. Κάντε online κράτηση αυτοκινήτου στη Θεσσαλονίκη χωρίς εγγύηση, με παραλαβή στο κατάλυμά σας ή στην πόλη και με υποστήριξη 24/7.",
      areaServed: ["Κέντρο Θεσσαλονίκης", "Περαία", "Καλαμαριά"],
      pickupLocation: "Σημείο παραλαβής Θεσσαλονίκης",
      offerName: "Προσφορά ενοικίασης Θεσσαλονίκης",
      offerDescription:
        "Παραλαβή στην πόλη για σύντομα ταξίδια, επαγγελματικές μετακινήσεις και άμεση μετάβαση στη Χαλκιδική.",
      faq: [
        {
          question:
            "Μπορώ να παραλάβω το αυτοκίνητο στο κέντρο της Θεσσαλονίκης ή στο ξενοδοχείο μου;",
          answer:
            "Ναι. Μπορούμε να οργανώσουμε την παραλαβή κοντά στο ξενοδοχείο, το διαμέρισμα, την επαγγελματική σας διεύθυνση ή σε συμφωνημένο σημείο μέσα στην πόλη.",
        },
        {
          question:
            "Είναι η Θεσσαλονίκη πρακτικό σημείο παραλαβής για ταξίδια προς τη Χαλκιδική;",
          answer:
            "Ναι. Η Θεσσαλονίκη είναι πρακτική αφετηρία για διαμονή στην πόλη και για συνέχεια προς τη Χαλκιδική, με άμεσες διαδρομές προς Κασσάνδρα και Σιθωνία.",
        },
        {
          question:
            "Τι πρέπει να δώσω για να οργανωθεί η παραλαβή στη Θεσσαλονίκη;",
          answer:
            "Στείλτε κατά την κράτηση τη διεύθυνση του καταλύματός σας ή το σημείο συνάντησης που προτιμάτε και την ώρα που σας εξυπηρετεί, και θα επιβεβαιώσουμε τις λεπτομέρειες παράδοσης.",
        },
      ],
    },
    de: {
      shortName: "Thessaloniki",
      h1: "Mietwagen in Thessaloniki",
      seoTitle: "Mietwagen Thessaloniki | Natali Cars",
      seoDescription:
        "Mieten Sie ein Auto in Thessaloniki mit Abholung in der Stadt, direkter Unterstützung und einfacher Weiterfahrt nach Chalkidiki.",
      introText:
        "Thessaloniki ist die zweitgroesste Stadt Griechenlands und das wichtigste Zentrum Nordgriechenlands. Natali Cars hilft Ihnen, die Fahrzeuguebergabe fuer Stadtfahrten, Geschaeftsreisen und Transfers nach Chalkidiki schnell zu organisieren. Buchen Sie Ihren Mietwagen online in Thessaloniki ohne Kaution, mit Uebergabe an Ihrer Unterkunft oder in der Stadt und mit 24/7-Support.",
      areaServed: ["Zentrum Thessaloniki", "Perea", "Kalamaria"],
      pickupLocation: "Abholpunkt Thessaloniki",
      offerName: "Mietwagen-Angebot Thessaloniki",
      offerDescription:
        "Stadt-Abholung für kurze Aufenthalte, Geschäftsreisen und direkte Fahrt nach Chalkidiki.",
      faq: [
        {
          question:
            "Kann ich das Auto im Zentrum von Thessaloniki oder an meinem Hotel uebernehmen?",
          answer:
            "Ja. Wir koennen die Uebergabe in der Naehe Ihres Hotels, Apartments, Ihrer Geschaeftsadresse oder an einem vereinbarten Treffpunkt in der Stadt organisieren.",
        },
        {
          question:
            "Ist Thessaloniki ein praktischer Abholort fuer Fahrten nach Chalkidiki?",
          answer:
            "Ja. Thessaloniki eignet sich gut als Startpunkt fuer Aufenthalte in der Stadt und Weiterfahrten nach Chalkidiki mit direkten Routen nach Kassandra und Sithonia.",
        },
        {
          question:
            "Welche Angaben brauche ich fuer die Fahrzeuguebergabe in Thessaloniki?",
          answer:
            "Senden Sie bei der Buchung die Adresse Ihrer Unterkunft oder Ihren bevorzugten Treffpunkt sowie die gewuenschte Uhrzeit, und wir bestaetigen die Uebergabedetails.",
        },
      ],
    },
    bg: {
      shortName: "Солун",
      h1: "Кола под наем в Солун",
      seoTitle: "Кола под наем Солун | Natali Cars",
      seoDescription:
        "Наемете кола в Солун с получаване в града, директна поддръжка и удобен трансфер до Халкидики.",
      introText:
        "Солун е вторият по големина град в Гърция и основният център на Северна Гърция. Natali Cars ще ви помогне бързо да организирате получаването на автомобил за пътувания в града, бизнес посещения и трансфери до Халкидики. Резервирайте онлайн кола в Солун без депозит с получаване при мястото ви за настаняване или в града и с поддръжка 24/7.",
      areaServed: ["Център Солун", "Перея", "Каламария"],
      pickupLocation: "Точка за получаване Солун",
      offerName: "Оферта за наем в Солун",
      offerDescription:
        "Получаване в града за кратки престои, бизнес посещения и трансфер до Халкидики.",
      faq: [
        {
          question:
            "Мога ли да получа колата в центъра на Солун или до хотела си?",
          answer:
            "Да. Можем да организираме получаването близо до вашия хотел, апартамент, служебен адрес или на уговорена точка в града.",
        },
        {
          question:
            "Удобен ли е Солун като точка за получаване при пътувания до Халкидики?",
          answer:
            "Да. Солун е удобна начална точка за престой в града и последващи пътувания до Халкидики по директни маршрути към Касандра и Ситония.",
        },
        {
          question:
            "Какво трябва да посоча за получаване на колата в Солун?",
          answer:
            "Посочете при резервация адреса на настаняване или удобна точка за среща и желания час, а ние ще потвърдим детайлите за предаването.",
        },
      ],
    },
    ro: {
      shortName: "Salonic",
      h1: "Închirieri auto în Salonic",
      seoTitle: "Închirieri auto Salonic | Natali Cars",
      seoDescription:
        "Închiriați mașină în Salonic cu preluare în oraș, asistență directă și transfer ușor spre Halkidiki.",
      introText:
        "Salonic este al doilea oraș ca mărime din Grecia și principalul centru al Greciei de Nord. Natali Cars vă ajută să organizați rapid preluarea mașinii pentru deplasări în oraș, vizite de afaceri și transferuri spre Halkidiki. Rezervați online mașina în Salonic fără depozit, cu preluare la cazare sau în oraș și cu asistență 24/7.",
      areaServed: ["Centrul Salonicului", "Perea", "Kalamaria"],
      pickupLocation: "Punct de preluare Salonic",
      offerName: "Ofertă închirieri Salonic",
      offerDescription:
        "Preluare în oraș pentru scurte șederi, vizite de afaceri și transfer spre Halkidiki.",
      faq: [
        {
          question:
            "Pot prelua mașina în centrul Salonicului sau la hotel?",
          answer:
            "Da. Putem organiza predarea lângă hotelul, apartamentul, adresa dvs. de afaceri sau într-un punct de întâlnire stabilit în oraș.",
        },
        {
          question:
            "Este Salonicul un punct convenabil de preluare pentru drumuri spre Halkidiki?",
          answer:
            "Da. Salonicul este un punct practic de pornire pentru șederi în oraș și continuarea drumului spre Halkidiki, cu rute directe către Kassandra și Sithonia.",
        },
        {
          question:
            "Ce trebuie să trimit pentru a organiza preluarea în Salonic?",
          answer:
            "Trimiteți la rezervare adresa cazării sau punctul de întâlnire preferat și ora dorită, iar noi vom confirma detaliile predării.",
        },
      ],
    },
    sr: {
      shortName: "Solun",
      h1: "Rent a car u Solunu",
      seoTitle: "Rent a car Solun | Natali Cars",
      seoDescription:
        "Iznajmite auto u Solunu sa preuzimanjem u gradu, direktnom podrškom i transferom ka Halkidikiju.",
      introText:
        "Solun je drugi najveći grad u Grčkoj i glavni centar severne Grčke. Natali Cars vam pomaže da brzo organizujete preuzimanje automobila za vožnju po gradu, poslovne posete i transfere ka Halkidikiju. Rezervišite online auto u Solunu bez depozita, uz preuzimanje kod smeštaja ili u gradu i uz podršku 24/7.",
      areaServed: ["Centar Soluna", "Perea", "Kalamaria"],
      pickupLocation: "Tačka preuzimanja Solun",
      offerName: "Ponuda iznajmljivanja Solun",
      offerDescription:
        "Preuzimanje u gradu za kratke boravke, poslovne posete i transfer ka Halkidikiju.",
      faq: [
        {
          question:
            "Mogu li da preuzmem auto u centru Soluna ili kod hotela?",
          answer:
            "Da. Mozemo organizovati preuzimanje blizu vaseg hotela, apartmana, poslovne adrese ili na dogovorenom mestu u gradu.",
        },
        {
          question:
            "Da li je Solun zgodna tacka preuzimanja za putovanja ka Halkidikiju?",
          answer:
            "Da. Solun je prakticna pocetna tacka za boravak u gradu i nastavak voznje ka Halkidikiju, sa direktnim rutama prema Kasandri i Sitoniji.",
        },
        {
          question:
            "Sta treba da posaljem da bih organizovao preuzimanje u Solunu?",
          answer:
            "Posaljite pri rezervaciji adresu smestaja ili zeljeno mesto sastanka i vreme koje vam odgovara, a mi cemo potvrditi detalje primopredaje.",
        },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.THESSALONIKI_AIRPORT]: {
    en: {
      shortName: "Thessaloniki Airport",
      h1: "Car Rental at Thessaloniki Airport (SKG)",
      seoTitle: "Car Rental at Thessaloniki Airport (SKG) | Natali Cars",
      seoDescription:
        "Book airport car rental at Thessaloniki (SKG) with handover-ready pickup, direct customer support, and coastal transfer coverage.",
      introText:
        "The Thessaloniki Airport (SKG) page is intended for travelers arriving in Northern Greece who want to continue their journey directly from the airport. Thessaloniki Airport is the main gateway to Halkidiki, and from here it's an easy drive toward the region's beaches, seaside villages, and resorts. Starting your trip from SKG makes it simple to reach destinations across Sithonia, Kassandra, and the wider Halkidiki area.",
      areaServed: ["SKG Airport", "Perea", "Nea Kallikratia"],
      pickupLocation: "Thessaloniki Airport Pickup Point",
      offerName: "Airport Pickup Rental Offer",
      offerDescription:
        "Fast airport handover with route-ready setup for resorts and villas in Halkidiki.",
      distanceToThessalonikiText:
        "Thessaloniki Airport (SKG) is the main international airport serving Thessaloniki and the wider region.",
    },
    ru: {
      shortName: "Аэропорт Салоники",
      h1: "Прокат авто в аэропорту Салоники (SKG)",
      seoTitle: "Прокат авто в аэропорту Салоники (SKG) | Natali Cars",
      seoDescription:
        "Арендуйте авто в аэропорту Салоники (SKG) с быстрой выдачей, прямой поддержкой и удобным выездом в Халкидики.",
      introText:
        "Страница аэропорта Салоники (SKG) предназначена для путешественников, прибывающих на север Греции и планирующих продолжить поездку прямо из аэропорта. Аэропорт Салоники является главными воротами на Халкидики, и отсюда удобно отправиться к пляжам, курортам и прибрежным деревням региона. Начав путешествие из SKG, легко добраться до направлений по всей Ситонии, Кассандре и другим частям Халкидики.",
      areaServed: ["Аэропорт SKG", "Перея", "Неа Каликратия"],
      pickupLocation: "Точка выдачи в аэропорту Салоники",
      offerName: "Предложение проката с выдачей в аэропорту",
      offerDescription:
        "Быстрая выдача после прилета и готовый маршрут к курортам Халкидик.",
    },
    uk: {
      shortName: "Аеропорт Салоніки",
      h1: "Оренда авто в аеропорту Салоніки (SKG)",
      seoTitle: "Оренда авто в аеропорту Салоніки (SKG) | Natali Cars",
      seoDescription:
        "Орендуйте авто в аеропорту Салоніки (SKG) з швидкою передачею, прямою підтримкою та зручним виїздом до Халкідік.",
      introText:
        "Сторінка аеропорту Салоніки (SKG) призначена для мандрівників, які прилітають на північ Греції та планують продовжити подорож безпосередньо з аеропорту. Аеропорт Салоніки є головними воротами до Халкідікі, звідки легко дістатися до пляжів, курортів і прибережних містечок регіону. Почавши подорож зі SKG, зручно доїхати до напрямків на Ситонії, Кассандрі та інших частинах Халкідікі.",
      areaServed: ["Аеропорт SKG", "Перея", "Неа Каллікратія"],
      pickupLocation: "Точка отримання в аеропорту Салоніки",
      offerName: "Пропозиція оренди з отриманням в аеропорту",
      offerDescription:
        "Швидка передача авто після прильоту та готовий маршрут до курортів Халкідік.",
    },
    el: {
      shortName: "Αεροδρόμιο Θεσσαλονίκης",
      h1: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης (SKG)",
      seoTitle: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης (SKG) | Natali Cars",
      seoDescription:
        "Κλείστε αυτοκίνητο στο αεροδρόμιο Θεσσαλονίκης (SKG) με γρήγορη παράδοση, άμεση υποστήριξη και εύκολη μετάβαση στη Χαλκιδική.",
      introText:
        "Η σελίδα του αεροδρομίου Θεσσαλονίκης (SKG) απευθύνεται σε ταξιδιώτες που φτάνουν στη Βόρεια Ελλάδα και θέλουν να συνεχίσουν το ταξίδι τους απευθείας από το αεροδρόμιο. Το αεροδρόμιο Θεσσαλονίκης αποτελεί την κύρια πύλη προς τη Χαλκιδική και από εδώ η διαδρομή προς τις παραλίες, τα θέρετρα και τα παραθαλάσσια χωριά της περιοχής είναι εύκολη. Ξεκινώντας από το SKG μπορείτε να φτάσετε γρήγορα σε προορισμούς σε όλη τη Σιθωνία, την Κασσάνδρα και την ευρύτερη Χαλκιδική.",
      areaServed: ["Αεροδρόμιο SKG", "Περαία", "Νέα Καλλικράτεια"],
      pickupLocation: "Σημείο παραλαβής στο αεροδρόμιο Θεσσαλονίκης",
      offerName: "Προσφορά ενοικίασης με παραλαβή στο αεροδρόμιο",
      offerDescription:
        "Άμεση παραλαβή μετά την άφιξη και έτοιμη διαδρομή προς θέρετρα Χαλκιδικής.",
    },
    de: {
      shortName: "Flughafen Thessaloniki",
      h1: "Mietwagen am Flughafen Thessaloniki (SKG)",
      seoTitle: "Mietwagen am Flughafen Thessaloniki (SKG) | Natali Cars",
      seoDescription:
        "Buchen Sie einen Mietwagen am Flughafen Thessaloniki (SKG) mit Abholung, direktem Kundenservice und Transfer an die Küste.",
      introText:
        "Die Seite zum Flughafen Thessaloniki (SKG) richtet sich an Reisende, die in Nordgriechenland ankommen und ihre Reise direkt vom Flughafen aus fortsetzen möchten. Der Flughafen Thessaloniki ist das wichtigste Tor nach Chalkidiki, und von hier aus erreicht man schnell die Strände, Küstenorte und Resorts der Region. Wenn Sie Ihre Reise vom SKG aus beginnen, gelangen Sie bequem zu Zielen in Sithonia, Kassandra und anderen Teilen von Chalkidiki.",
      areaServed: ["Flughafen SKG", "Perea", "Nea Kallikratia"],
      pickupLocation: "Abholpunkt Flughafen Thessaloniki",
      offerName: "Angebot Mietwagen Flughafen",
      offerDescription:
        "Schnelle Übergabe am Flughafen und direkte Fahrt zu den Resorts in Chalkidiki.",
    },
    bg: {
      shortName: "Летище Солун",
      h1: "Под наем на кола на летище Солун (SKG)",
      seoTitle: "Под наем на кола на летище Солун (SKG) | Natali Cars",
      seoDescription:
        "Наем на кола на летище Солун (SKG) с бърза получаване, пряка поддръжка и удобен трансфер до Халкидики.",
      introText:
        "Страницата за летище Солун (SKG) е предназначена за пътници, които пристигат в Северна Гърция и искат да продължат пътуването си директно от летището. Летище Солун е основната врата към Халкидики и оттук лесно се стига до плажовете, курортите и крайбрежните селища на региона. Започвайки пътуването си от SKG, можете бързо да достигнете до дестинации в Ситония, Касандра и останалите части на Халкидики.",
      areaServed: ["Летище SKG", "Перея", "Неа Каликратия"],
      pickupLocation: "Място за получаване летище Солун",
      offerName: "Оферта наем на кола летище",
      offerDescription:
        "Бързо получаване след пристигане и маршрут до курорти в Халкидики.",
    },
    ro: {
      shortName: "Aeroport Salonic",
      h1: "Închirieri auto la aeroportul Salonic (SKG)",
      seoTitle: "Închirieri auto la aeroportul Salonic (SKG) | Natali Cars",
      seoDescription:
        "Închiriați mașină la aeroportul Salonic (SKG) cu preluare rapidă, suport direct și transfer la coastă.",
      introText:
        "Pagina aeroportului Salonic (SKG) este destinată călătorilor care sosesc în nordul Greciei și doresc să își continue călătoria direct de la aeroport. Aeroportul Salonic este principala poartă către Halkidiki, iar de aici se ajunge ușor către plajele, stațiunile și satele de coastă ale regiunii. Începând călătoria din SKG, puteți ajunge rapid în destinații din Sithonia, Kassandra și din întreaga zonă Halkidiki.",
      areaServed: ["Aeroport SKG", "Perea", "Nea Kallikratia"],
      pickupLocation: "Punct de preluare aeroport Salonic",
      offerName: "Ofertă închirieri aeroport",
      offerDescription:
        "Preluare rapidă la aeroport și traseu gata pentru stațiunile din Halkidiki.",
    },
    sr: {
      shortName: "Аеродром Солун",
      h1: "Изнајмљивање аута на аеродрому Солун (SKG)",
      seoTitle: "Изнајмљивање аута на аеродрому Солун (SKG) | Natali Cars",
      seoDescription:
        "Изнајмите ауто на аеродрому Солун (SKG) са брзим преузимањем, директном подршком и трансфером до обале.",
      introText:
        "Stranica aerodroma Solun (SKG) namenjena je putnicima koji dolaze u severnu Grčku i žele da nastave putovanje direktno sa aerodroma. Aerodrom Solun predstavlja glavnu kapiju ka Halkidikiju, a odavde je lako stići do plaža, letovališta i primorskih mesta regiona. Ako putovanje započnete sa SKG, jednostavno možete doći do destinacija širom Sitonije, Kasandre i ostatka Halkidikija.",
      areaServed: ["Аеродром SKG", "Переја", "Неа Каликратија"],
      pickupLocation: "Место преузимања аеродром Солун",
      offerName: "Понуда изнајмљивања аеродром",
      offerDescription:
        "Брзо преузимање на аеродрому и маршрут до летовалишта у Халкидикију.",
    },
  },
  [LOCATION_CONTENT_KEYS.HALKIDIKI]: {
    en: {
      shortName: "Halkidiki",
      h1: "Car Rental in Halkidiki",
      seoTitle: "Car Rental in Halkidiki Region | Natali Cars",
      seoDescription:
        "Rent a car in Halkidiki with localized pickup coverage across regional hubs, beach zones, and major transfer routes.",
      introText:
        "Halkidiki is one of Greece's most popular resort regions, where car rental is especially convenient for trips between beaches, villages, and the Kassandra and Sithonia peninsulas. Natali Cars helps you quickly arrange car rental in Halkidiki for a comfortable holiday and convenient travel around the region.",
      areaServed: ["Nea Kallikratia", "Sithonia", "Kassandra"],
      pickupLocation: "Halkidiki Regional Pickup",
      offerName: "Halkidiki Regional Rental Offer",
      offerDescription:
        "Regional pickup coverage for beaches, villas, and family travel across Halkidiki.",
      distanceToThessalonikiText:
        "Halkidiki is about 110 km from Thessaloniki and roughly 90 km from Thessaloniki Airport (SKG).",
      faq: [
        {
          question:
            "Can I arrange car pickup in different parts of Halkidiki?",
          answer:
            "Yes. We can coordinate pickup near your accommodation or at an agreed point in Kassandra, Sithonia, Nea Kallikratia, and other accessible areas of Halkidiki.",
        },
        {
          question:
            "Is a rental car in Halkidiki convenient for trips between Kassandra and Sithonia?",
          answer:
            "Yes. A car is one of the easiest ways to move between beaches, villages, and resort areas across the peninsulas at your own pace.",
        },
        {
          question:
            "What should I provide to organize pickup in Halkidiki?",
          answer:
            "Send your accommodation area or address, your preferred meeting point if needed, and your requested time during booking, and we will confirm the handover details.",
        },
      ],
    },
    ru: {
      shortName: "Халкидики",
      h1: "Прокат авто в Халкидиках",
      seoTitle: "Прокат авто в регионе Халкидики | Natali Cars",
      seoDescription:
        "Арендуйте авто в Халкидиках с покрытием по региону, пляжным зонам и ключевым маршрутам к курортам.",
      introText:
        "Халкидики — один из самых популярных курортных регионов Греции, где аренда авто особенно удобна для поездок между пляжами, поселками и полуостровами Кассандра и Ситония. Natali Cars поможет быстро организовать прокат авто в Халкидиках для комфортного отдыха и удобного передвижения по региону.",
      areaServed: ["Неа Каликратия", "Ситония", "Кассандра"],
      pickupLocation: "Региональная точка выдачи Халкидики",
      offerName: "Региональное предложение Халкидики",
      offerDescription:
        "Выдача по региону для пляжного отдыха, вилл и семейных поездок.",
      faq: [
        {
          question:
            "Можно ли организовать выдачу авто в разных частях Халкидик?",
          answer:
            "Да. Мы можем согласовать выдачу рядом с вашим жильем или в удобной точке в Кассандре, Ситонии, Неа Каликратии и других доступных районах Халкидик.",
        },
        {
          question:
            "Удобен ли прокат авто в Халкидиках для поездок между Кассандрой и Ситонией?",
          answer:
            "Да. Автомобиль — один из самых удобных способов свободно перемещаться между пляжами, поселками и курортными зонами полуостровов.",
        },
        {
          question:
            "Что нужно указать для организации выдачи в Халкидиках?",
          answer:
            "Укажите при бронировании район или адрес проживания, при необходимости удобную точку встречи и желаемое время, а мы подтвердим детали передачи автомобиля.",
        },
      ],
    },
    uk: {
      shortName: "Халкідіки",
      h1: "Оренда авто в Халкідіках",
      seoTitle: "Оренда авто в регіоні Халкідіки | Natali Cars",
      seoDescription:
        "Орендуйте авто в Халкідіках з покриттям по регіону, пляжних зонах і ключових маршрутах до курортів.",
      introText:
        "Халкідіки — один із найпопулярніших курортних регіонів Греції, де оренда авто особливо зручна для поїздок між пляжами, селищами та півостровами Кассандра і Ситонія. Natali Cars допоможе швидко організувати прокат авто в Халкідіках для комфортного відпочинку та зручного пересування регіоном.",
      areaServed: ["Неа Каллікратія", "Ситонія", "Кассандра"],
      pickupLocation: "Регіональна точка отримання Халкідіки",
      offerName: "Регіональна пропозиція Халкідіки",
      offerDescription:
        "Отримання авто по регіону для пляжного відпочинку, вілл і сімейних поїздок.",
      faq: [
        {
          question:
            "Чи можна організувати отримання авто в різних частинах Халкідіків?",
          answer:
            "Так. Ми можемо узгодити отримання біля вашого житла або у зручній точці в Кассандрі, Ситонії, Неа Каллікратії та інших доступних районах Халкідіків.",
        },
        {
          question:
            "Чи зручна оренда авто в Халкідіках для поїздок між Кассандрою та Ситонією?",
          answer:
            "Так. Автомобіль — один із найзручніших способів вільно пересуватися між пляжами, селищами та курортними зонами півостровів.",
        },
        {
          question:
            "Що потрібно вказати для організації отримання в Халкідіках?",
          answer:
            "Вкажіть під час бронювання район або адресу проживання, за потреби зручну точку зустрічі та бажаний час, а ми підтвердимо деталі передачі автомобіля.",
        },
      ],
    },
    el: {
      shortName: "Χαλκιδική",
      h1: "Ενοικίαση αυτοκινήτου στη Χαλκιδική",
      seoTitle: "Ενοικίαση αυτοκινήτου στη Χαλκιδική | Natali Cars",
      seoDescription:
        "Ενοικιάστε αυτοκίνητο στη Χαλκιδική με κάλυψη σε παραλιακές περιοχές, υπο-περιοχές και βασικές διαδρομές μεταφοράς.",
      introText:
        "Η Χαλκιδική είναι μία από τις πιο δημοφιλείς τουριστικές περιοχές της Ελλάδας, όπου η ενοικίαση αυτοκινήτου είναι ιδιαίτερα βολική για διαδρομές ανάμεσα σε παραλίες, οικισμούς και τις χερσονήσους Κασσάνδρα και Σιθωνία. Η Natali Cars σας βοηθά να οργανώσετε γρήγορα ενοικίαση αυτοκινήτου στη Χαλκιδική για άνετες διακοπές και εύκολες μετακινήσεις σε όλη την περιοχή.",
      areaServed: ["Νέα Καλλικράτεια", "Σιθωνία", "Κασσάνδρα"],
      pickupLocation: "Περιφερειακό σημείο παραλαβής Χαλκιδικής",
      offerName: "Περιφερειακή προσφορά Χαλκιδικής",
      offerDescription:
        "Κάλυψη παραλαβής για παραλίες, βίλες και οικογενειακές διαδρομές σε όλη τη Χαλκιδική.",
      faq: [
        {
          question:
            "Μπορώ να οργανώσω παραλαβή αυτοκινήτου σε διαφορετικά μέρη της Χαλκιδικής;",
          answer:
            "Ναι. Μπορούμε να συντονίσουμε παραλαβή κοντά στο κατάλυμά σας ή σε συμφωνημένο σημείο στην Κασσάνδρα, τη Σιθωνία, τη Νέα Καλλικράτεια και σε άλλες προσβάσιμες περιοχές της Χαλκιδικής.",
        },
        {
          question:
            "Είναι πρακτική η ενοικίαση αυτοκινήτου στη Χαλκιδική για διαδρομές ανάμεσα στην Κασσάνδρα και τη Σιθωνία;",
          answer:
            "Ναι. Το αυτοκίνητο είναι ένας από τους πιο εύκολους τρόπους να μετακινείστε ελεύθερα ανάμεσα σε παραλίες, οικισμούς και τουριστικές περιοχές των χερσονήσων.",
        },
        {
          question:
            "Τι πρέπει να δώσω για να οργανωθεί η παραλαβή στη Χαλκιδική;",
          answer:
            "Στείλτε κατά την κράτηση την περιοχή ή τη διεύθυνση του καταλύματός σας, αν χρειάζεται το σημείο συνάντησης που προτιμάτε και την ώρα που σας εξυπηρετεί, και θα επιβεβαιώσουμε τις λεπτομέρειες παράδοσης.",
        },
      ],
    },
    de: {
      shortName: "Chalkidiki",
      h1: "Mietwagen in Chalkidiki",
      seoTitle: "Mietwagen Chalkidiki Region | Natali Cars",
      seoDescription:
        "Mieten Sie ein Auto in Chalkidiki mit Abdeckung für regionale Zentren, Strandzonen und wichtige Transferrouten.",
      introText:
        "Chalkidiki ist eine der beliebtesten Ferienregionen Griechenlands, wo Autovermietung besonders praktisch für Fahrten zwischen Stränden, Dörfern und den Halbinseln Kassandra und Sithonia ist. Natali Cars hilft Ihnen, schnell einen Mietwagen in Chalkidiki für einen komfortablen Urlaub zu organisieren.",
      areaServed: ["Nea Kallikratia", "Sithonia", "Kassandra"],
      pickupLocation: "Regionale Abholung Chalkidiki",
      offerName: "Regionales Mietwagen-Angebot Chalkidiki",
      offerDescription:
        "Regionale Abholung für Strände, Villen und Familienreisen in Chalkidiki.",
      faq: [
        {
          question:
            "Kann ich die Fahrzeuguebergabe in verschiedenen Teilen der Chalkidiki arrangieren?",
          answer:
            "Ja. Wir koennen die Uebergabe in der Naehe Ihrer Unterkunft oder an einem vereinbarten Punkt in Kassandra, Sithonia, Nea Kallikratia und anderen gut erreichbaren Gebieten der Chalkidiki organisieren.",
        },
        {
          question:
            "Ist ein Mietwagen in Chalkidiki praktisch fuer Fahrten zwischen Kassandra und Sithonia?",
          answer:
            "Ja. Ein Auto ist eine der bequemsten Moeglichkeiten, sich frei zwischen Straenden, Orten und Feriengebieten der Halbinseln zu bewegen.",
        },
        {
          question:
            "Welche Angaben brauche ich, um die Uebergabe in Chalkidiki zu organisieren?",
          answer:
            "Senden Sie bei der Buchung den Bereich oder die Adresse Ihrer Unterkunft, falls noetig Ihren bevorzugten Treffpunkt sowie die gewuenschte Uhrzeit, und wir bestaetigen die Uebergabedetails.",
        },
      ],
    },
    bg: {
      shortName: "Халкидики",
      h1: "Кола под наем в Халкидики",
      seoTitle: "Кола под наем регион Халкидики | Natali Cars",
      seoDescription:
        "Наемете кола в Халкидики с покритие за регионални центрове, плажни зони и основни маршрути.",
      introText:
        "Халкидики е един от най-популярните курортни региони на Гърция, където наемът на кола е особено удобен за пътувания между плажове, села и полуостровите Касандра и Ситония. Natali Cars ви помага бързо да организирате наем на кола в Халкидики за комфортен отпуск.",
      areaServed: ["Неа Каликратия", "Ситония", "Касандра"],
      pickupLocation: "Регионална точка за получаване Халкидики",
      offerName: "Регионална оферта за наем Халкидики",
      offerDescription:
        "Регионално получаване за плажове, вили и семейни пътувания в Халкидики.",
      faq: [
        {
          question:
            "Мога ли да организирам получаване на кола в различни части на Халкидики?",
          answer:
            "Да. Можем да организираме получаване близо до мястото ви за настаняване или на уговорена точка в Касандра, Ситония, Неа Каликратия и други достъпни части на Халкидики.",
        },
        {
          question:
            "Удобна ли е кола под наем в Халкидики за пътувания между Касандра и Ситония?",
          answer:
            "Да. Автомобилът е един от най-удобните начини да се придвижвате свободно между плажове, селища и курортни зони на полуостровите.",
        },
        {
          question:
            "Какво трябва да посоча, за да организирам получаването в Халкидики?",
          answer:
            "Посочете при резервация района или адреса на настаняване, при нужда удобна точка за среща и желания час, а ние ще потвърдим детайлите по предаването.",
        },
      ],
    },
    ro: {
      shortName: "Halkidiki",
      h1: "Închirieri auto în Halkidiki",
      seoTitle: "Închirieri auto regiunea Halkidiki | Natali Cars",
      seoDescription:
        "Închiriați mașină în Halkidiki cu acoperire pentru centre regionale, zone de plajă și rute principale de transfer.",
      introText:
        "Halkidiki este una dintre cele mai populare regiuni de vacanță din Grecia, unde închirierea auto este deosebit de convenabilă pentru deplasări între plaje, sate și peninsulele Kassandra și Sithonia. Natali Cars vă ajută să organizați rapid închirierea auto în Halkidiki pentru o vacanță confortabilă.",
      areaServed: ["Nea Kallikratia", "Sithonia", "Kassandra"],
      pickupLocation: "Punct de preluare regional Halkidiki",
      offerName: "Ofertă închirieri regională Halkidiki",
      offerDescription:
        "Preluare regională pentru plaje, vile și călătorii de familie în Halkidiki.",
      faq: [
        {
          question:
            "Pot organiza preluarea mașinii în diferite părți ale Halkidiki?",
          answer:
            "Da. Putem organiza predarea lângă cazarea dvs. sau într-un punct stabilit în Kassandra, Sithonia, Nea Kallikratia și în alte zone accesibile din Halkidiki.",
        },
        {
          question:
            "Este convenabilă închirierea auto în Halkidiki pentru drumuri între Kassandra și Sithonia?",
          answer:
            "Da. Mașina este una dintre cele mai comode variante pentru a vă deplasa liber între plaje, localități și zone turistice de pe peninsule.",
        },
        {
          question:
            "Ce trebuie să transmit pentru a organiza preluarea în Halkidiki?",
          answer:
            "Trimiteți la rezervare zona sau adresa cazării, dacă este nevoie punctul de întâlnire preferat și ora dorită, iar noi vă confirmăm detaliile predării.",
        },
      ],
    },
    sr: {
      shortName: "Halkidiki",
      h1: "Rent a car u Halkidikiju",
      seoTitle: "Rent a car region Halkidiki | Natali Cars",
      seoDescription:
        "Iznajmite auto u Halkidikiju sa pokrivanjem regionalnih centara, plažnih zona i glavnih transfer ruta.",
      introText:
        "Halkidiki je jedan od najpopularnijih turističkih regiona Grčke, gde je iznajmljivanje auta posebno praktično za putovanja između plaža, sela i poluostrva Kassandra i Sithonia. Natali Cars vam pomaže da brzo organizujete iznajmljivanje auta u Halkidikiju za udoban odmor.",
      areaServed: ["Nea Kallikratia", "Sithonia", "Kassandra"],
      pickupLocation: "Regionalna tačka preuzimanja Halkidiki",
      offerName: "Regionalna ponuda iznajmljivanja Halkidiki",
      offerDescription:
        "Regionalno preuzimanje za plaže, vile i porodična putovanja u Halkidikiju.",
      faq: [
        {
          question:
            "Могу ли да организујем преузимање аута у различитим деловима Халкидикија?",
          answer:
            "Да. Можемо организовати преузимање близу вашег смештаја или на договореној тачки у Касандри, Ситонији, Неа Каликратији и другим доступним деловима Халкидикија.",
        },
        {
          question:
            "Да ли је изнајмљивање аута у Халкидикију практично за вожњу између Касандре и Ситоније?",
          answer:
            "Да. Ауто је један од најпрактичнијих начина да се слободно крећете између плажа, места и туристичких зона полуострва.",
        },
        {
          question:
            "Шта треба да пошаљем за организацију преузимања у Халкидикију?",
          answer:
            "Пошаљите при резервацији област или адресу смештаја, по потреби жељену тачку састанка и време које вам одговара, а ми ћемо потврдити детаље примопредаје.",
        },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.SITHONIA]: {
    en: {
      shortName: "Sithonia",
      h1: "Car Rental in Sithonia",
      seoTitle: "Car Rental in Sithonia, Halkidiki | Natali Cars",
      seoDescription:
        "Book a rental car in Sithonia with pickup options for Nikiti, Neos Marmaras, and long-stay coastal accommodations.",
      introText:
        "This sub-region page targets east-coast Halkidiki trips, villa stays, and flexible pickup for extended holidays in Sithonia.",
      areaServed: ["Nikiti", "Neos Marmaras", "Sarti"],
      pickupLocation: "Sithonia Pickup Point",
      offerName: "Sithonia Car Hire Offer",
      offerDescription:
        "Pickup for coastal hotels, villas, and weekly stays across Sithonia.",
    },
    ru: {
      shortName: "Ситония",
      h1: "Прокат авто в Ситонии",
      seoTitle: "Прокат авто в Ситонии, Халкидики | Natali Cars",
      seoDescription:
        "Забронируйте автомобиль в Ситонии с выдачей для Никити, Неос Мармараса и длительного отдыха на побережье.",
      introText:
        "Подстраница Ситонии ориентирована на длительные поездки по восточному побережью Халкидик и размещение в виллах.",
      areaServed: ["Никити", "Неос Мармарас", "Сарти"],
      pickupLocation: "Точка выдачи Ситония",
      offerName: "Предложение проката Ситония",
      offerDescription:
        "Выдача для отелей у моря, вилл и недельного отдыха в Ситонии.",
    },
    uk: {
      shortName: "Ситонія",
      h1: "Оренда авто в Ситонії",
      seoTitle: "Оренда авто в Ситонії, Халкідіки | Natali Cars",
      seoDescription:
        "Забронюйте авто в Ситонії з отриманням для Нікіті, Неос Мармарас і тривалого відпочинку на узбережжі.",
      introText:
        "Підсторінка Ситонії орієнтована на довгі поїздки східним узбережжям Халкідік і проживання у віллах.",
      areaServed: ["Нікіті", "Неос Мармарас", "Сарті"],
      pickupLocation: "Точка отримання Ситонія",
      offerName: "Пропозиція оренди Ситонія",
      offerDescription:
        "Отримання авто для готелів біля моря, вілл і тижневого відпочинку в Ситонії.",
    },
    el: {
      shortName: "Σιθωνία",
      h1: "Ενοικίαση αυτοκινήτου στη Σιθωνία",
      seoTitle: "Ενοικίαση αυτοκινήτου στη Σιθωνία, Χαλκιδική | Natali Cars",
      seoDescription:
        "Κλείστε αυτοκίνητο στη Σιθωνία με παραλαβή για Νικήτη, Νέο Μαρμαρά και παραθαλάσσιες διαμονές μεγάλης διάρκειας.",
      introText:
        "Η σελίδα Σιθωνίας στοχεύει ταξίδια ανατολικής Χαλκιδικής, διαμονές σε βίλες και ευέλικτη παραλαβή για πολυήμερες διακοπές.",
      areaServed: ["Νικήτη", "Νέος Μαρμαράς", "Σάρτη"],
      pickupLocation: "Σημείο παραλαβής Σιθωνίας",
      offerName: "Προσφορά ενοικίασης Σιθωνίας",
      offerDescription:
        "Παραλαβή για παραθαλάσσια ξενοδοχεία, βίλες και πολυήμερες διακοπές στη Σιθωνία.",
    },
  },
  [LOCATION_CONTENT_KEYS.KASSANDRA]: {
    en: {
      shortName: "Kassandra",
      h1: "Car Rental in Kassandra",
      seoTitle: "Car Rental in Kassandra, Halkidiki | Natali Cars",
      seoDescription:
        "Rent a car in Kassandra with pickup support for resort zones, family stays, and high-season coastal traffic.",
      introText:
        "This Kassandra page is built for resort-oriented travel demand and links with the wider Halkidiki hub for regional planning.",
      areaServed: ["Pefkochori", "Hanioti", "Kallithea"],
      pickupLocation: "Kassandra Pickup Point",
      offerName: "Kassandra Car Hire Offer",
      offerDescription:
        "Pickup coverage for Kassandra resorts, family accommodations, and seasonal coastal demand.",
    },
    ru: {
      shortName: "Кассандра",
      h1: "Прокат авто в Кассандре",
      seoTitle: "Прокат авто в Кассандре, Халкидики | Natali Cars",
      seoDescription:
        "Аренда авто в Кассандре с выдачей в курортных зонах, для семейного отдыха и поездок в высокий сезон.",
      introText:
        "Страница Кассандры ориентирована на курортный спрос и связана с региональным хабом Халкидик для планирования маршрутов.",
      areaServed: ["Пефкохори", "Ханиоти", "Каллифея"],
      pickupLocation: "Точка выдачи Кассандра",
      offerName: "Предложение проката Кассандра",
      offerDescription:
        "Выдача в курортных зонах Кассандры для семейного и сезонного отдыха.",
    },
    uk: {
      shortName: "Кассандра",
      h1: "Оренда авто в Кассандрі",
      seoTitle: "Оренда авто в Кассандрі, Халкідіки | Natali Cars",
      seoDescription:
        "Орендуйте авто в Кассандрі з отриманням у курортних зонах для сімейного відпочинку і поїздок у високий сезон.",
      introText:
        "Сторінка Кассандри орієнтована на курортний попит і пов'язана з регіональним хабом Халкідік для планування маршрутів.",
      areaServed: ["Пефкохорі", "Ханіоті", "Каллітея"],
      pickupLocation: "Точка отримання Кассандра",
      offerName: "Пропозиція оренди Кассандра",
      offerDescription:
        "Отримання авто в курортних зонах Кассандри для сімейного та сезонного відпочинку.",
    },
    el: {
      shortName: "Κασσάνδρα",
      h1: "Ενοικίαση αυτοκινήτου στην Κασσάνδρα",
      seoTitle: "Ενοικίαση αυτοκινήτου στην Κασσάνδρα, Χαλκιδική | Natali Cars",
      seoDescription:
        "Ενοικιάστε αυτοκίνητο στην Κασσάνδρα με παραλαβή σε τουριστικές ζώνες, οικογενειακές διαμονές και εποχική ζήτηση.",
      introText:
        "Η σελίδα Κασσάνδρας στοχεύει τουριστική κίνηση θέρετρων και συνδέεται με το περιφερειακό hub Χαλκιδικής.",
      areaServed: ["Πευκοχώρι", "Χανιώτη", "Καλλιθέα"],
      pickupLocation: "Σημείο παραλαβής Κασσάνδρας",
      offerName: "Προσφορά ενοικίασης Κασσάνδρας",
      offerDescription:
        "Κάλυψη παραλαβής σε θέρετρα Κασσάνδρας για οικογενειακές και εποχικές διαδρομές.",
    },
  },
  // —— Halkidiki city pages (SEO landings; CTA → homepage search with pickup param) ——
  [LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA]: {
    en: {
      shortName: "Nea Kallikratia",
      h1: "Car Rental in Nea Kallikratia",
      seoTitle: "Car Rental in Nea Kallikratia, Halkidiki | Natali Cars",
      seoDescription:
        "Rent a car in Nea Kallikratia with convenient pickup near the beach and main road. Ideal for coastal stays and day trips across Halkidiki.",
      introText:
        "Nea Kallikratia is a popular coastal town on the way to Halkidiki.",
      areaServed: ["Nea Kallikratia Beach", "Central Nea Kallikratia"],
      pickupLocation: "Nea Kallikratia Pickup Point",
      offerName: "Nea Kallikratia Car Hire",
      offerDescription: "Beach-area pickup for Nea Kallikratia and nearby coastal stays.",
      pickupGuidance:
        "Pickup in Nea Kallikratia is typically arranged near your accommodation or a agreed landmark along the main coastal road. Confirm the exact spot when booking so the handover is smooth.",
      nearbyPlaces: ["Thessaloniki (city)", "Nea Moudania (port)", "Sithonia peninsula"],
      distanceToThessalonikiText:
        "Nea Kallikratia is located about 35 km from Thessaloniki and about 25 km from Thessaloniki Airport (SKG).",
      usefulTips: [
        "Book in advance during peak season (July–August) for best availability.",
        "We offer free delivery to hotels and apartments in Nea Kallikratia.",
        "Nea Kallikratia is a convenient stopover en route to Sithonia and Kassandra.",
      ],
      faq: [
        { question: "Can I get a car delivered to my hotel in Nea Kallikratia?", answer: "Yes. We coordinate pickup at or near your hotel or rental; confirm the address when booking." },
        { question: "Is Nea Kallikratia a good base for exploring Halkidiki?", answer: "Yes. It sits on the main route into the peninsula, so Sithonia and Kassandra are easily reachable by car." },
        { question: "What if I arrive from Thessaloniki Airport?", answer: "Book with pickup at the airport or arrange a later handover in Nea Kallikratia after you reach your accommodation." },
      ],
    },
    ru: {
      shortName: "Неа Калликратия",
      h1: "Прокат авто в Неа Калликратии",
      seoTitle: "Прокат авто в Неа Калликратии, Халкидики | Natali Cars",
      seoDescription:
        "Аренда авто в Неа Калликратии с удобной выдачей у пляжа и главной дороги. Идеально для отдыха на побережье и поездок по Халкидикам.",
      introText:
        "Неа Калликратия — популярный прибрежный город на пути в Халкидики.",
      areaServed: ["Пляж Неа Калликратия", "Центр Неа Калликратии"],
      pickupLocation: "Точка выдачи в Неа Калликратии",
      offerName: "Прокат авто в Неа Калликратии",
      offerDescription: "Выдача у пляжа для Неа Калликратии и ближайших курортов.",
      pickupGuidance:
        "Выдачу в Неа Калликратии обычно организуют у вашего жилья или у договорной точки на прибрежной трассе. Уточните место при бронировании для удобной передачи авто.",
      nearbyPlaces: ["Салоники (город)", "Неа Муданья (порт)", "Полуостров Ситония"],
      distanceToThessalonikiText:
        "Неа Калликратия расположена примерно в 35 км от Салоник и примерно в 25 км от аэропорта Салоники (SKG).",
      faq: [
        { question: "Можно ли доставить авто к отелю в Неа Калликратии?", answer: "Да. Мы организуем выдачу у отеля или апартаментов; укажите адрес при бронировании." },
        { question: "Удобна ли Неа Калликратия как база для поездок по Халкидикам?", answer: "Да. Город на основной трассе в полуостров, до Ситонии и Кассандры легко доехать на авто." },
        { question: "Что если я прилетаю в аэропорт Салоник?", answer: "Забронируйте выдачу в аэропорту или договоритесь о передаче в Неа Калликратии после заселения." },
      ],
    },
    uk: {
      shortName: "Неа Каллікратія",
      h1: "Оренда авто в Неа Каллікратії",
      seoTitle: "Оренда авто в Неа Каллікратії, Халкідіки | Natali Cars",
      seoDescription:
        "Оренда авто в Неа Каллікратії з зручною видачею біля пляжу та головної дороги. Ідеально для відпочинку на узбережжі та поїздок по Халкідіках.",
      introText:
        "Неа Каллікратія — популярне прибережне місто на шляху в Халкідіки.",
      areaServed: ["Пляж Неа Каллікратія", "Центр Неа Каллікратії"],
      pickupLocation: "Точка отримання в Неа Каллікратії",
      offerName: "Оренда авто в Неа Каллікратії",
      offerDescription: "Видача біля пляжу для Неа Каллікратії та найближчих курортів.",
      pickupGuidance:
        "Видачу в Неа Каллікратії зазвичай організовують біля помешкання або узгодженої точки на прибережній трасі. Уточніть місце при бронюванні для зручної передачі авто.",
      nearbyPlaces: ["Салоніки (місто)", "Неа Муданія (порт)", "Півострів Сітонія"],
      distanceToThessalonikiText:
        "Неа Каллікратія розташована приблизно за 35 км від Салонік і приблизно за 25 км від аеропорту Салоніки (SKG).",
      faq: [
        { question: "Чи можна доставити авто до готелю в Неа Каллікратії?", answer: "Так. Ми організуємо видачу біля готелю або апартаментів; вкажіть адресу при бронюванні." },
        { question: "Чи зручна Неа Каллікратія як база для поїздок по Халкідіках?", answer: "Так. Місто на основній трасі півострова, до Сітонії та Кассандри легко доїхати авто." },
        { question: "Що якщо я прилітаю в аеропорт Салонік?", answer: "Забронюйте видачу в аеропорту або домовте передачу в Неа Каллікратії після заселення." },
      ],
    },
    el: {
      shortName: "Νέα Καλλικράτεια",
      h1: "Ενοικίαση αυτοκινήτου στη Νέα Καλλικράτεια",
      seoTitle: "Ενοικίαση αυτοκινήτου στη Νέα Καλλικράτεια, Χαλκιδική | Natali Cars",
      seoDescription:
        "Ενοικιάστε αυτοκίνητο στη Νέα Καλλικράτεια με βολική παραλαβή κοντά στην παραλία και τον κεντρικό δρόμο. Ιδανικό για παραθαλάσσια διαμονή και εκδρομές στη Χαλκιδική.",
      introText:
        "Η Νέα Καλλικράτεια είναι δημοφιλής παραθαλάσσια πόλη στο δρόμο προς τη Χαλκιδική.",
      areaServed: ["Παραλία Νέας Καλλικράτειας", "Κέντρο Νέας Καλλικράτειας"],
      pickupLocation: "Σημείο παραλαβής Νέα Καλλικράτεια",
      offerName: "Ενοικίαση αυτοκινήτου Νέα Καλλικράτεια",
      offerDescription: "Παραλαβή κοντά στην παραλία για Νέα Καλλικράτεια και κοντινά θέρετρα.",
      pickupGuidance:
        "Η παραλαβή στη Νέα Καλλικράτεια συνήθως κανονίζεται κοντά στο κατάλυμά σας ή σε συμφωνημένο σημείο στον παραλιακό δρόμο. Επιβεβαιώστε το ακριβές σημείο κατά την κράτηση.",
      nearbyPlaces: ["Θεσσαλονίκη (πόλη)", "Νέα Μουδανιά (λιμάνι)", "Χερσόνησος Σιθωνία"],
      distanceToThessalonikiText:
        "Η Νέα Καλλικράτεια βρίσκεται περίπου 35 χλμ. από τη Θεσσαλονίκη και περίπου 25 χλμ. από το αεροδρόμιο Θεσσαλονίκης (SKG).",
      faq: [
        { question: "Μπορώ να παραλάβω αυτοκίνητο στο ξενοδοχείο μου στη Νέα Καλλικράτεια;", answer: "Ναι. Συντονίζουμε παραλαβή στο ξενοδοχείο ή τα διαμερίσματά σας· επιβεβαιώστε τη διεύθυνση κατά την κράτηση." },
        { question: "Είναι η Νέα Καλλικράτεια καλή βάση για εξερεύνηση της Χαλκιδικής;", answer: "Ναι. Βρίσκεται στον κύριο δρόμο της χερσονήσου· η Σιθωνία και η Κασσάνδρα είναι εύκολα προσβάσιμες με αυτοκίνητο." },
        { question: "Τι γίνεται αν φτάσω από το αεροδρόμιο Θεσσαλονίκης;", answer: "Κλείστε με παραλαβή στο αεροδρόμιο ή κανονίστε μεταγενέστερη παράδοση στη Νέα Καλλικράτεια μετά την άφιξή σας." },
      ],
    },
    de: {
      shortName: "Nea Kallikratia",
      h1: "Mietwagen in Nea Kallikratia",
      seoTitle: "Mietwagen in Nea Kallikratia, Chalkidiki | Natali Cars",
      seoDescription:
        "Mieten Sie ein Auto in Nea Kallikratia mit Abholung am Strand und an der Hauptstraße. Ideal für den Küstenurlaub und Ausflüge in die Chalkidiki.",
      introText:
        "Nea Kallikratia ist ein beliebter Küstenort auf dem Weg in die Chalkidiki.",
      areaServed: ["Strand Nea Kallikratia", "Zentrum Nea Kallikratia"],
      pickupLocation: "Abholpunkt Nea Kallikratia",
      offerName: "Mietwagen Nea Kallikratia",
      offerDescription: "Strandnahe Abholung für Nea Kallikratia und nahe gelegene Küstenorte.",
      pickupGuidance:
        "Die Abholung in Nea Kallikratia erfolgt in der Regel in der Nähe Ihrer Unterkunft oder an einem vereinbarten Punkt an der Küstenstraße. Bestätigen Sie den genauen Ort bei der Buchung.",
      nearbyPlaces: ["Thessaloniki (Stadt)", "Nea Moudania (Hafen)", "Halbinsel Sithonia"],
      distanceToThessalonikiText:
        "Nea Kallikratia liegt etwa 35 km von Thessaloniki und etwa 25 km vom Flughafen Thessaloniki (SKG) entfernt.",
      faq: [
        { question: "Kann ich ein Auto zu meinem Hotel in Nea Kallikratia geliefert bekommen?", answer: "Ja. Wir koordinieren die Abholung am oder in der Nähe Ihres Hotels oder Ihrer Ferienwohnung; bestätigen Sie die Adresse bei der Buchung." },
        { question: "Eignet sich Nea Kallikratia als Basis für die Chalkidiki?", answer: "Ja. Der Ort liegt an der Hauptroute zur Halbinsel; Sithonia und Kassandra sind mit dem Auto gut erreichbar." },
        { question: "Was, wenn ich vom Flughafen Thessaloniki anreise?", answer: "Buchen Sie mit Abholung am Flughafen oder vereinbaren Sie eine spätere Übergabe in Nea Kallikratia nach Ihrer Ankunft." },
      ],
    },
    bg: {
      shortName: "Неа Каликратия",
      h1: "Под наем на кола в Неа Каликратия",
      seoTitle: "Под наем на кола в Неа Каликратия, Халкидики | Natali Cars",
      seoDescription:
        "Наем на кола в Неа Каликратия с удобна получаване до плажа и главния път. Идеално за престой на брега и разходки из Халкидики.",
      introText:
        "Неа Каликратия е популярен крайбрежен град по пътя към Халкидики.",
      areaServed: ["Плаж Неа Каликратия", "Център Неа Каликратия"],
      pickupLocation: "Място за получаване Неа Каликратия",
      offerName: "Наем на кола Неа Каликратия",
      offerDescription: "Получаване до плажа за Неа Каликратия и близки курорти.",
      pickupGuidance:
        "Получаването в Неа Каликратия обикновено се организира близо до настаняването ви или до договорена точка на крайбрежния път. Потвърдете точното място при резервация.",
      nearbyPlaces: ["Солун (град)", "Неа Мудания (пристанище)", "Полуостров Ситония"],
      distanceToThessalonikiText:
        "Неа Каликратия се намира на около 35 км от Солун и на около 25 км от летище Солун (SKG).",
      faq: [
        { question: "Мога ли да получа кола до хотела в Неа Каликратия?", answer: "Да. Координаираме получаване в или близо до хотела/апартамента; потвърдете адреса при резервация." },
        { question: "Подходяща ли е Неа Каликратия като база за Халкидики?", answer: "Да. Градът е на главния път към полуострова; Ситония и Касандра са лесно достъпни с кола." },
        { question: "Ако пристигна от летище Солун?", answer: "Резервирайте с получаване на летището или уговорете по-късна предаване в Неа Каликратия след пристигане." },
      ],
    },
    ro: {
      shortName: "Nea Kallikratia",
      h1: "Închirieri auto în Nea Kallikratia",
      seoTitle: "Închirieri auto în Nea Kallikratia, Halkidiki | Natali Cars",
      seoDescription:
        "Închiriați mașină în Nea Kallikratia cu preluare convenabilă lângă plajă și drumul principal. Ideal pentru sejur la mare și excursii în Halkidiki.",
      introText:
        "Nea Kallikratia este un oraș litoral popular pe drumul spre Halkidiki.",
      areaServed: ["Plaja Nea Kallikratia", "Centrul Nea Kallikratia"],
      pickupLocation: "Punct de preluare Nea Kallikratia",
      offerName: "Închirieri auto Nea Kallikratia",
      offerDescription: "Preluare lângă plajă pentru Nea Kallikratia și stațiuni apropiate.",
      pickupGuidance:
        "Preluarea în Nea Kallikratia se organizează de obicei lângă cazare sau la un punct convenit pe drumul litoral. Confirmați locația exactă la rezervare.",
      nearbyPlaces: ["Thessaloniki (oraș)", "Nea Moudania (port)", "Peninsula Sithonia"],
      distanceToThessalonikiText:
        "Nea Kallikratia se află la aproximativ 35 km de Salonic și la aproximativ 25 km de Aeroportul Salonic (SKG).",
      faq: [
        { question: "Pot primi mașina la hotel în Nea Kallikratia?", answer: "Da. Coordonăm preluarea la sau lângă hotel/apartament; confirmați adresa la rezervare." },
        { question: "Este Nea Kallikratia o bază bună pentru Halkidiki?", answer: "Da. Se află pe traseul principal al peninsulei; Sithonia și Kassandra sunt ușor accesibile cu mașina." },
        { question: "Dacă sosesc de la aeroportul Thessaloniki?", answer: "Rezervați cu preluare la aeroport sau stabiliți o predare ulterioară în Nea Kallikratia după sosire." },
      ],
    },
    sr: {
      shortName: "Неа Каликратија",
      h1: "Изнајмљивање аута у Неа Каликратији",
      seoTitle: "Изнајмљивање аута у Неа Каликратији, Халкидики | Natali Cars",
      seoDescription:
        "Изнајмите ауто у Неа Каликратији са погодном преузимањем код плаже и главног пута. Идеално за одмор на обали и излете по Халкидикију.",
      introText:
        "Неа Каликратија је популарно приобално место на путу ка Халкидикију.",
      areaServed: ["Плажа Неа Каликратија", "Центар Неа Каликратија"],
      pickupLocation: "Место преузимања Неа Каликратија",
      offerName: "Изнајмљивање аута Неа Каликратија",
      offerDescription: "Преузимање код плаже за Неа Каликратију и оближње курорте.",
      pickupGuidance:
        "Преузимање у Неа Каликратији обично се организује близу смештаја или на договореној тачки на обалском путу. Потврдите тачно место при резервацији.",
      nearbyPlaces: ["Солун (град)", "Неа Муданија (лука)", "Полуострво Ситонија"],
      distanceToThessalonikiText:
        "Nea Kalikratija se nalazi na oko 35 km od Soluna i na oko 25 km od aerodroma Solun (SKG).",
      faq: [
        { question: "Могу ли добити ауто испоручено до хотела у Неа Каликратији?", answer: "Да. Координишемо преузимање у или близу хотела/апартмана; потврдите адресу при резервацији." },
        { question: "Да ли је Неа Каликратија добра база за истраживање Халкидикија?", answer: "Да. Налази се на главном путу полуострва; Ситонија и Касандра су лако доступне аутом." },
        { question: "Шта ако стигнем са аеродрома Солун?", answer: "Резервишите са преузимањем на аеродрому или договорите каснију предају у Неа Каликратији након доласка." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.NEA_MOUDANIA]: {
    en: {
      shortName: "Nea Moudania",
      h1: "Car Rental in Nea Moudania",
      seoTitle: "Car Rental in Nea Moudania, Halkidiki | Natali Cars",
      seoDescription:
        "Book a rental car in Nea Moudania with pickup near the port or town. Convenient for ferry arrivals and trips across Halkidiki.",
      introText:
        "Nea Moudania is the main port and gateway to Halkidiki. Arrange car rental with pickup in town or near the port for a smooth start to your trip.",
      areaServed: ["Nea Moudania Port", "Nea Moudania Town"],
      pickupLocation: "Nea Moudania Pickup Point",
      offerName: "Nea Moudania Car Hire",
      offerDescription: "Port and town pickup for Nea Moudania and onward travel.",
      pickupGuidance:
        "Handover in Nea Moudania can be at the port area or at a agreed location in town. Specify your arrival details when booking so we can suggest the best pickup point.",
      nearbyPlaces: ["Nea Kallikratia", "Olympiada", "Mount Athos area (by boat)"],
      faq: [
        { question: "Can I pick up a car after arriving by ferry at Nea Moudania?", answer: "Yes. We can arrange handover near the port; share your ferry time when booking." },
        { question: "Is Nea Moudania good for visiting Mount Athos?", answer: "Yes. Many visitors use Nea Moudania as a base and take boats to the Athos peninsula from nearby ports." },
        { question: "How far is Nea Moudania from Thessaloniki?", answer: "About 50 km; roughly 45–60 minutes by car depending on traffic." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.NIKITI]: {
    en: {
      shortName: "Nikiti",
      h1: "Car Rental in Nikiti",
      seoTitle: "Car Rental in Nikiti, Sithonia | Natali Cars",
      seoDescription:
        "Rent a car in Nikiti with pickup for hotels and villas. Explore Sithonia beaches and villages with flexible handover options.",
      introText:
        "Nikiti is one of the main towns on Sithonia. This page connects you to car rental with pickup tailored to your stay in Nikiti or nearby.",
      areaServed: ["Nikiti Town", "Nikiti Beach", "Nearby Villas"],
      pickupLocation: "Nikiti Pickup Point",
      offerName: "Nikiti Car Hire",
      offerDescription: "Town and beach-area pickup for Nikiti and Sithonia stays.",
      pickupGuidance:
        "Pickup in Nikiti is usually at or near your accommodation or a central landmark. We’ll confirm the exact meeting point when you book so you know where to meet.",
      nearbyPlaces: ["Neos Marmaras", "Sarti", "Agios Nikolaos (Sithonia)"],
      faq: [
        { question: "Can I get a car at my villa outside Nikiti?", answer: "Yes. We arrange pickup at villas and hotels in the Nikiti area; provide the address when booking." },
        { question: "What are the best beaches near Nikiti?", answer: "Several beaches line the coast; a car lets you reach Agios Nikolaos, Kalogria, and other bays easily." },
        { question: "Is Nikiti good for families?", answer: "Yes. The town has shops, tavernas, and calm beaches; a car adds flexibility for day trips." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.NEOS_MARMARAS]: {
    en: {
      shortName: "Neos Marmaras",
      h1: "Car Rental in Neos Marmaras",
      seoTitle: "Car Rental in Neos Marmaras, Sithonia | Natali Cars",
      seoDescription:
        "Book a car in Neos Marmaras with pickup for the harbour and resorts. Ideal for exploring Sithonia and nearby beaches.",
      introText:
        "Neos Marmaras is a busy resort town on Sithonia with a harbour and many accommodations. Arrange rental with pickup that suits your plans.",
      areaServed: ["Neos Marmaras Harbour", "Neos Marmaras Town", "Resort Zone"],
      pickupLocation: "Neos Marmaras Pickup Point",
      offerName: "Neos Marmaras Car Hire",
      offerDescription: "Harbour and town pickup for Neos Marmaras and Sithonia.",
      pickupGuidance:
        "Handover in Neos Marmaras can be at the harbour, your hotel, or another agreed spot. Confirm your address or preferred meeting point at booking.",
      nearbyPlaces: ["Nikiti", "Porto Carras", "Sarti"],
      faq: [
        { question: "Can I pick up a car at Porto Carras?", answer: "Yes. We can arrange pickup at or near Porto Carras; specify your resort or hotel when booking." },
        { question: "Is Neos Marmaras good for nightlife?", answer: "Yes. The town has bars and restaurants; a car helps you explore quieter beaches by day." },
        { question: "How do I reach Sarti from Neos Marmaras?", answer: "By car along the east coast of Sithonia; the drive is scenic and takes about 30–40 minutes." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.SARTI]: {
    en: {
      shortName: "Sarti",
      h1: "Car Rental in Sarti",
      seoTitle: "Car Rental in Sarti, Sithonia | Natali Cars",
      seoDescription:
        "Rent a car in Sarti with pickup for beach and villa stays. Discover the eastern coast of Sithonia and nearby bays.",
      introText:
        "Sarti is known for its long beach and relaxed vibe. This page helps you book a rental with pickup in Sarti or at your accommodation.",
      areaServed: ["Sarti Beach", "Sarti Village", "Eastern Sithonia"],
      pickupLocation: "Sarti Pickup Point",
      offerName: "Sarti Car Hire",
      offerDescription: "Beach and village pickup for Sarti and eastern Sithonia.",
      pickupGuidance:
        "Pickup in Sarti is arranged at a agreed spot—often your hotel, villa, or a central point. Tell us your address when booking for a smooth handover.",
      nearbyPlaces: ["Neos Marmaras", "Sykes Beach", "Mount Athos (viewpoints)"],
      faq: [
        { question: "Is Sarti good for a quiet holiday?", answer: "Yes. Sarti is quieter than Neos Marmaras; a car lets you explore more beaches and villages." },
        { question: "Can I see Mount Athos from Sarti?", answer: "Yes. On clear days you can see the Athos peninsula; some viewpoints are a short drive away." },
        { question: "Are there supermarkets in Sarti?", answer: "Yes. The village has shops; a car is useful for bigger supermarkets in Neos Marmaras or Nikiti." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.KALLITHEA]: {
    en: {
      shortName: "Kallithea",
      h1: "Car Rental in Kallithea",
      seoTitle: "Car Rental in Kallithea, Kassandra | Natali Cars",
      seoDescription:
        "Book a car in Kallithea with pickup for resorts and beaches. Explore Kassandra and the west coast with flexible rental.",
      introText:
        "Kallithea is a popular resort on Kassandra with a lively strip and good beaches.",
      areaServed: ["Kallithea Beach", "Kallithea Strip", "Resort Area"],
      pickupLocation: "Kallithea Pickup Point",
      offerName: "Kallithea Car Hire",
      offerDescription: "Resort and beach pickup for Kallithea and Kassandra.",
      pickupGuidance:
        "Handover in Kallithea is usually at your hotel or a agreed spot on the main strip. Share your accommodation details when booking so we can set the best meeting point.",
      nearbyPlaces: ["Pefkohori", "Hanioti", "Afitos"],
      faq: [
        { question: "Is Kallithea good for families?", answer: "Yes. There are family-friendly beaches and amenities; a car helps with day trips to quieter spots." },
        { question: "How far is Kallithea from Thessaloniki?", answer: "About 110 km; roughly 1.5 hours by car." },
        { question: "Can I get a car at my all-inclusive in Kallithea?", answer: "Yes. We coordinate pickup at or near your hotel; confirm the name and address when booking." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.PEFKOHORI]: {
    en: {
      shortName: "Pefkohori",
      h1: "Car Rental in Pefkohori",
      seoTitle: "Car Rental in Pefkohori, Kassandra | Natali Cars",
      seoDescription:
        "Rent a car in Pefkohori with pickup for hotels and villas. Ideal for exploring Kassandra and nearby beaches.",
      introText:
        "Pefkohori offers a long beach and a busy main street. This page helps you arrange car rental with convenient pickup for your stay.",
      areaServed: ["Pefkohori Beach", "Pefkohori Village", "Surrounding Villas"],
      pickupLocation: "Pefkohori Pickup Point",
      offerName: "Pefkohori Car Hire",
      offerDescription: "Beach and village pickup for Pefkohori and Kassandra.",
      pickupGuidance:
        "Pickup in Pefkohori is arranged at or near your accommodation or a central point. Provide your address when booking so we can confirm the exact meeting place.",
      nearbyPlaces: ["Kallithea", "Hanioti", "Kriopigi"],
      faq: [
        { question: "Is Pefkohori busy in summer?", answer: "Yes. It’s one of the busier resorts on Kassandra; booking your car in advance is recommended." },
        { question: "Can I drive to Sithonia from Pefkohori?", answer: "Yes. You cross the “neck” of Halkidiki to reach Sithonia; allow about 45–60 minutes to Nikiti." },
        { question: "Are there parking options in Pefkohori?", answer: "Yes. Many hotels have parking; we can advise on the best place to leave the car when you book." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.HANIOTI]: {
    en: {
      shortName: "Hanioti",
      h1: "Car Rental in Hanioti",
      seoTitle: "Car Rental in Hanioti, Kassandra | Natali Cars",
      seoDescription:
        "Book a car in Hanioti with pickup for the centre and beaches. Explore Kassandra and nearby villages with ease.",
      introText:
        "Hanioti is a lively resort with a long beach and plenty of amenities. Arrange rental with pickup that suits your accommodation.",
      areaServed: ["Hanioti Centre", "Hanioti Beach", "Resort Zone"],
      pickupLocation: "Hanioti Pickup Point",
      offerName: "Hanioti Car Hire",
      offerDescription: "Centre and beach pickup for Hanioti and Kassandra.",
      pickupGuidance:
        "Handover in Hanioti is typically at your hotel or a agreed landmark in the centre. Share your stay details when booking for a smooth pickup.",
      nearbyPlaces: ["Pefkohori", "Polichrono", "Kassandria"],
      faq: [
        { question: "Is Hanioti good for young travellers?", answer: "Yes. It has a busy strip with bars and restaurants; a car still helps for beach-hopping and day trips." },
        { question: "Can I pick up a car at my apartment in Hanioti?", answer: "Yes. We arrange pickup at apartments and villas; provide the full address when booking." },
        { question: "How far is Hanioti from the airport?", answer: "About 120 km from Thessaloniki Airport; roughly 1.5–2 hours by car." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.POLICHRONO]: {
    en: {
      shortName: "Polichrono",
      h1: "Car Rental in Polichrono",
      seoTitle: "Car Rental in Polichrono, Kassandra | Natali Cars",
      seoDescription:
        "Rent a car in Polichrono with pickup for hotels and the beach. Discover Kassandra and nearby resorts.",
      introText:
        "Polichrono is a family-friendly resort with a long beach. This page connects you to car rental with pickup tailored to your stay.",
      areaServed: ["Polichrono Beach", "Polichrono Village", "Nearby Resorts"],
      pickupLocation: "Polichrono Pickup Point",
      offerName: "Polichrono Car Hire",
      offerDescription: "Beach and village pickup for Polichrono and Kassandra.",
      pickupGuidance:
        "Pickup in Polichrono is usually at your hotel or a agreed spot by the beach or main road. Confirm your address when booking so we can set the meeting point.",
      nearbyPlaces: ["Hanioti", "Kassandria", "Sani"],
      faq: [
        { question: "Is Polichrono suitable for families?", answer: "Yes. The beach is long and relatively shallow; a car helps for trips to Sani or other villages." },
        { question: "Can I get a car delivered to my campsite?", answer: "Yes. We can arrange handover at or near campsites; share the exact location when booking." },
        { question: "What is there to do near Polichrono?", answer: "Beaches, tavernas, and short drives to Sani, Kassandria, and other Kassandra spots." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.AFITOS]: {
    en: {
      shortName: "Afitos",
      h1: "Car Rental in Afitos",
      seoTitle: "Car Rental in Afitos, Kassandra | Natali Cars",
      seoDescription:
        "Book a car in Afitos with pickup for the old village and beach. Explore traditional Kassandra and the coast.",
      introText:
        "Afitos is a picturesque village on Kassandra with stone houses and a cliff-top setting.",
      areaServed: ["Afitos Village", "Afitos Beach", "Kassandra West"],
      pickupLocation: "Afitos Pickup Point",
      offerName: "Afitos Car Hire",
      offerDescription: "Village and beach pickup for Afitos and Kassandra.",
      pickupGuidance:
        "Handover in Afitos can be at your accommodation or a agreed point in the village or near the beach. Provide your address when booking.",
      nearbyPlaces: ["Kallithea", "Nea Fokea", "Sani"],
      faq: [
        { question: "Is Afitos good for a quiet stay?", answer: "Yes. It’s more traditional and quieter than the busier resorts; a car helps explore the peninsula." },
        { question: "Can I park in Afitos?", answer: "Yes. There are parking areas; some streets in the old village are narrow—we can suggest the best handover spot." },
        { question: "How far is Afitos from Sani?", answer: "About 15–20 minutes by car; Sani is a short drive north." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.KRIOPIGI]: {
    en: {
      shortName: "Kriopigi",
      h1: "Car Rental in Kriopigi",
      seoTitle: "Car Rental in Kriopigi, Kassandra | Natali Cars",
      seoDescription:
        "Rent a car in Kriopigi with pickup for hotels and villas. Explore the middle of Kassandra and nearby beaches.",
      introText:
        "Kriopigi sits between the busier resorts and offers a quieter base. This page helps you book a rental with pickup in Kriopigi or nearby.",
      areaServed: ["Kriopigi Village", "Kriopigi Beach", "Central Kassandra"],
      pickupLocation: "Kriopigi Pickup Point",
      offerName: "Kriopigi Car Hire",
      offerDescription: "Village and beach pickup for Kriopigi and Kassandra.",
      pickupGuidance:
        "Pickup in Kriopigi is arranged at your accommodation or a agreed spot. Share your stay details when booking so we can confirm the meeting point.",
      nearbyPlaces: ["Pefkohori", "Kallithea", "Hanioti"],
      faq: [
        { question: "Is Kriopigi good for a relaxing holiday?", answer: "Yes. It’s less busy than Pefkohori or Hanioti; a car gives you flexibility to explore." },
        { question: "Can I get a car at my villa in Kriopigi?", answer: "Yes. We arrange pickup at villas and apartments; provide the full address when booking." },
        { question: "How do I reach Kriopigi from the airport?", answer: "By car from Thessaloniki Airport via Nea Moudania and the Kassandra road; about 1.5 hours." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.SANI]: {
    en: {
      shortName: "Sani",
      h1: "Car Rental in Sani",
      seoTitle: "Car Rental in Sani, Kassandra | Natali Cars",
      seoDescription:
        "Book a car in Sani with pickup for the resort and marina. Ideal for Sani Resort guests and exploring Kassandra.",
      introText:
        "Sani is known for its upscale resort and marina. Arrange car rental with pickup at Sani or your accommodation for trips around Kassandra.",
      areaServed: ["Sani Resort", "Sani Marina", "Sani Beach"],
      pickupLocation: "Sani Pickup Point",
      offerName: "Sani Car Hire",
      offerDescription: "Resort and marina pickup for Sani and northern Kassandra.",
      pickupGuidance:
        "Handover at Sani can be at the resort, marina, or a agreed point. Confirm your accommodation or preferred meeting place when booking.",
      nearbyPlaces: ["Polichrono", "Afitos", "Thessaloniki (day trip)"],
      faq: [
        { question: "Can I pick up a car at Sani Resort?", answer: "Yes. We coordinate pickup at or near the resort; specify that you’re at Sani Resort when booking." },
        { question: "Is Sani good for a luxury stay?", answer: "Yes. The resort and marina offer high-end facilities; a car adds freedom for exploring the rest of Kassandra." },
        { question: "How far is Sani from Thessaloniki?", answer: "About 100 km; roughly 1.5 hours by car." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.KASSANDRIA]: {
    en: {
      shortName: "Kassandria",
      h1: "Car Rental in Kassandria",
      seoTitle: "Car Rental in Kassandria, Kassandra | Natali Cars",
      seoDescription:
        "Rent a car in Kassandria town with pickup for the centre and nearby resorts. Explore the peninsula from a central base.",
      introText:
        "Kassandria is the main town in the middle of Kassandra peninsula.",
      areaServed: ["Kassandria Town", "Central Kassandra", "Resort Access"],
      pickupLocation: "Kassandria Pickup Point",
      offerName: "Kassandria Car Hire",
      offerDescription: "Town and central Kassandra pickup.",
      pickupGuidance:
        "Pickup in Kassandria can be in the town centre or at your accommodation. Share your address when booking so we can agree the best meeting point.",
      nearbyPlaces: ["Hanioti", "Polichrono", "Pefkohori"],
      faq: [
        { question: "Is Kassandria a good base for the whole peninsula?", answer: "Yes. It’s central, so you can reach both northern and southern Kassandra easily." },
        { question: "Are there supermarkets in Kassandria?", answer: "Yes. The town has shops and services; many visitors stock up here before heading to resorts." },
        { question: "Can I get a car at my hotel near Kassandria?", answer: "Yes. We arrange pickup at hotels and villas in and around Kassandria; provide your address when booking." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.FOURKA]: {
    en: {
      shortName: "Fourka",
      h1: "Car Rental in Fourka",
      seoTitle: "Car Rental in Fourka, Sithonia | Natali Cars",
      seoDescription:
        "Book a car in Fourka with pickup for the beach and village. Explore western Sithonia and nearby bays.",
      introText:
        "Fourka is a small resort on the west coast of Sithonia. Arrange rental with pickup in Fourka or at your accommodation for a relaxed stay.",
      areaServed: ["Fourka Beach", "Fourka Village", "Western Sithonia"],
      pickupLocation: "Fourka Pickup Point",
      offerName: "Fourka Car Hire",
      offerDescription: "Beach and village pickup for Fourka and Sithonia.",
      pickupGuidance:
        "Handover in Fourka is usually at your hotel or a agreed spot by the beach. Tell us your address when booking so we can set the meeting point.",
      nearbyPlaces: ["Nikiti", "Neos Marmaras", "Metamorfosi"],
      faq: [
        { question: "Is Fourka good for a quiet holiday?", answer: "Yes. It’s smaller and quieter than Nikiti or Neos Marmaras; a car helps explore more of Sithonia." },
        { question: "Can I get a car at my apartment in Fourka?", answer: "Yes. We arrange pickup at apartments and villas; provide the full address when booking." },
        { question: "What beaches are near Fourka?", answer: "Several bays are within a short drive; we can suggest routes when you book." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.METAMORFOSI]: {
    en: {
      shortName: "Metamorfosi",
      h1: "Car Rental in Metamorfosi",
      seoTitle: "Car Rental in Metamorfosi, Sithonia | Natali Cars",
      seoDescription:
        "Rent a car in Metamorfosi with pickup for the village and coast. Discover western Sithonia and nearby beaches.",
      introText:
        "Metamorfosi is a small village on Sithonia with a relaxed atmosphere. This page helps you book a rental with pickup in Metamorfosi or nearby.",
      areaServed: ["Metamorfosi Village", "Metamorfosi Coast", "Western Sithonia"],
      pickupLocation: "Metamorfosi Pickup Point",
      offerName: "Metamorfosi Car Hire",
      offerDescription: "Village and coast pickup for Metamorfosi and Sithonia.",
      pickupGuidance:
        "Pickup in Metamorfosi is arranged at your accommodation or a agreed landmark. Share your stay details when booking for a smooth handover.",
      nearbyPlaces: ["Fourka", "Nikiti", "Neos Marmaras"],
      faq: [
        { question: "Is Metamorfosi family-friendly?", answer: "Yes. It’s quiet and low-key; a car helps with beach-hopping and shopping in Nikiti or Neos Marmaras." },
        { question: "Can I pick up a car at my villa in Metamorfosi?", answer: "Yes. We coordinate pickup at villas; provide the address when booking." },
        { question: "How far is Metamorfosi from the airport?", answer: "About 120 km from Thessaloniki Airport; roughly 1.5–2 hours by car." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI]: {
    en: {
      shortName: "Agios Nikolaos",
      h1: "Car Rental in Agios Nikolaos (Halkidiki)",
      seoTitle: "Car Rental in Agios Nikolaos, Sithonia | Natali Cars",
      seoDescription:
        "Book a car in Agios Nikolaos with pickup for the village and beach. Explore eastern Sithonia and nearby bays.",
      introText:
        "Agios Nikolaos is a scenic village on the east coast of Sithonia. Arrange rental with pickup that suits your accommodation and plans.",
      areaServed: ["Agios Nikolaos Village", "Agios Nikolaos Beach", "Eastern Sithonia"],
      pickupLocation: "Agios Nikolaos Pickup Point",
      offerName: "Agios Nikolaos Car Hire",
      offerDescription: "Village and beach pickup for Agios Nikolaos and Sithonia.",
      pickupGuidance:
        "Handover in Agios Nikolaos can be at your hotel or a agreed spot by the beach or village. Provide your address when booking.",
      nearbyPlaces: ["Nikiti", "Sarti", "Sykes"],
      faq: [
        { question: "Is Agios Nikolaos good for swimming?", answer: "Yes. The village has a calm bay; a car lets you discover other beaches along the coast." },
        { question: "Can I get a car at my hotel in Agios Nikolaos?", answer: "Yes. We arrange pickup at hotels and apartments; confirm your address when booking." },
        { question: "How do I reach Sarti from Agios Nikolaos?", answer: "By car along the east coast; the drive is scenic and takes about 20–30 minutes." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.ORMILIA]: {
    en: {
      shortName: "Ormilia",
      h1: "Car Rental in Ormilia",
      seoTitle: "Car Rental in Ormilia, Halkidiki | Natali Cars",
      seoDescription:
        "Rent a car in Ormilia with pickup for the village and nearby areas. Convenient for the western approach to Halkidiki.",
      introText:
        "Ormilia is on the way into Halkidiki from Thessaloniki. This page helps you arrange car rental with pickup in Ormilia or at your stay.",
      areaServed: ["Ormilia Village", "Western Halkidiki Approach"],
      pickupLocation: "Ormilia Pickup Point",
      offerName: "Ormilia Car Hire",
      offerDescription: "Village pickup for Ormilia and western Halkidiki.",
      pickupGuidance:
        "Pickup in Ormilia is arranged at a agreed point in the village or near your accommodation. Share your address when booking.",
      nearbyPlaces: ["Nea Moudania", "Nea Kallikratia", "Thessaloniki"],
      faq: [
        { question: "Is Ormilia a good stop on the way to Halkidiki?", answer: "Yes. It’s a convenient point to pick up or drop off a car when travelling from Thessaloniki." },
        { question: "Can I get a car at my hotel near Ormilia?", answer: "Yes. We coordinate pickup at hotels and villas in the area; provide your address when booking." },
        { question: "How far is Ormilia from Thessaloniki?", answer: "About 45 km; roughly 40–50 minutes by car." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.PETRALONA]: {
    en: {
      shortName: "Petralona",
      h1: "Car Rental in Petralona",
      seoTitle: "Car Rental in Petralona, Halkidiki | Natali Cars",
      seoDescription:
        "Book a car in Petralona with pickup for the village and cave area. Ideal for combining culture and beach trips in Halkidiki.",
      introText:
        "Petralona is famous for the Petralona Cave and sits inland from the coast. Arrange rental with pickup in Petralona or nearby for a flexible trip.",
      areaServed: ["Petralona Village", "Petralona Cave Area", "Inland Halkidiki"],
      pickupLocation: "Petralona Pickup Point",
      offerName: "Petralona Car Hire",
      offerDescription: "Village and cave-area pickup for Petralona and inland Halkidiki.",
      pickupGuidance:
        "Handover in Petralona can be at your accommodation or near the cave and village. Confirm your address or preferred meeting point when booking.",
      nearbyPlaces: ["Nea Moudania", "Olympiada", "Thessaloniki"],
      faq: [
        { question: "Is Petralona Cave worth visiting?", answer: "Yes. It’s a major archaeological and natural site; a car makes it easy to combine with beach stays." },
        { question: "Can I pick up a car at Petralona Cave?", answer: "We can arrange pickup near the cave or in the village; specify when booking." },
        { question: "How far is Petralona from the coast?", answer: "About 15–20 km from Nea Moudania; roughly 20–25 minutes by car." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.VRASNA]: {
    en: {
      shortName: "Vrasna",
      h1: "Car Rental in Vrasna",
      seoTitle: "Car Rental in Vrasna, Halkidiki | Natali Cars",
      seoDescription:
        "Rent a car in Vrasna with pickup for the beach and village. Explore the eastern coast and Strymon Gulf area.",
      introText:
        "Vrasna is a coastal village on the eastern side of Halkidiki. This page helps you arrange rental with pickup in Vrasna or at your accommodation.",
      areaServed: ["Vrasna Beach", "Vrasna Village", "Eastern Halkidiki Coast"],
      pickupLocation: "Vrasna Pickup Point",
      offerName: "Vrasna Car Hire",
      offerDescription: "Beach and village pickup for Vrasna and the east coast.",
      pickupGuidance:
        "Pickup in Vrasna is usually at your hotel or a agreed spot by the beach or village. Share your stay details when booking so we can set the meeting point.",
      nearbyPlaces: ["Olympiada", "Stratoni", "Nea Moudania"],
      faq: [
        { question: "Is Vrasna good for families?", answer: "Yes. The beach is calm and the village is low-key; a car helps with day trips." },
        { question: "Can I get a car at my apartment in Vrasna?", answer: "Yes. We arrange pickup at apartments and villas; provide the full address when booking." },
        { question: "How do I reach Olympiada from Vrasna?", answer: "By car along the coast; the drive takes about 30–40 minutes." },
      ],
    },
  },
  [LOCATION_CONTENT_KEYS.OLYMPIADA]: {
    en: {
      shortName: "Olympiada",
      h1: "Car Rental in Olympiada",
      seoTitle: "Car Rental in Olympiada, Halkidiki | Natali Cars",
      seoDescription:
        "Book a car in Olympiada with pickup for the village and beach. Discover ancient Stageira and the eastern Halkidiki coast.",
      introText:
        "Olympiada is a coastal village near ancient Stageira. Arrange rental with pickup in Olympiada or at your stay for history and beach trips.",
      areaServed: ["Olympiada Village", "Olympiada Beach", "Stageira Area"],
      pickupLocation: "Olympiada Pickup Point",
      offerName: "Olympiada Car Hire",
      offerDescription: "Village and beach pickup for Olympiada and eastern Halkidiki.",
      pickupGuidance:
        "Handover in Olympiada can be at your accommodation or a agreed point by the beach or village. Provide your address when booking.",
      nearbyPlaces: ["Ancient Stageira", "Vrasna", "Stratoni"],
      faq: [
        { question: "Is Olympiada near Ancient Stageira?", answer: "Yes. The archaeological site is a short drive; a car makes it easy to visit and explore the coast." },
        { question: "Can I pick up a car at my hotel in Olympiada?", answer: "Yes. We coordinate pickup at hotels and apartments; confirm your address when booking." },
        { question: "How far is Olympiada from Thessaloniki?", answer: "About 110 km; roughly 1.5–2 hours by car." },
      ],
    },
  },
};

export const locationContentByKey = Object.fromEntries(
  Object.entries(locationContentByKeyRaw).map(([contentKey, localizedValues]) => [
    contentKey,
    applyIntroTextOverrides(
      contentKey as LocationContentKey,
      applyDistanceTextOverrides(
        contentKey as LocationContentKey,
        expandLocationContentRecord(localizedValues)
      )
    ),
  ])
) as Record<LocationContentKey, Record<SupportedLocale, LocationSeoContent>>;

export const locationSeoRepo: LocationSeoRepoItem[] = [
  {
    id: LOCATION_IDS.THESSALONIKI,
    canonicalSlug: "car-rental-thessaloniki",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.THESSALONIKI,
    parentId: null,
    childIds: [LOCATION_IDS.THESSALONIKI_AIRPORT],
    slugByLocale: {
      en: "car-rental-thessaloniki",
      ru: "arenda-avto-saloniki",
      uk: "orenda-avto-saloniky",
      el: "enoikiasi-autokinitou-thessaloniki",
      de: "mietwagen-thessaloniki",
      bg: "koli-pod-naem-solun",
      ro: "inchirieri-auto-salonic",
      sr: "rent-a-car-solun",
    },
  },
  {
    id: LOCATION_IDS.THESSALONIKI_AIRPORT,
    canonicalSlug: "car-rental-thessaloniki-airport",
    locationType: "airport",
    contentKey: LOCATION_CONTENT_KEYS.THESSALONIKI_AIRPORT,
    parentId: LOCATION_IDS.THESSALONIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-thessaloniki-airport",
      ru: "arenda-avto-aeroport-saloniki",
      uk: "orenda-avto-aeroport-saloniky",
      el: "enoikiasi-autokinitou-aerodromio-thessalonikis",
      de: "mietwagen-thessaloniki-flughafen",
      bg: "koli-pod-naem-letishte-solun",
      ro: "inchirieri-auto-aeroport-salonic",
      sr: "rent-a-car-aerodrom-solun",
    },
  },
  {
    id: LOCATION_IDS.HALKIDIKI,
    canonicalSlug: "car-rental-halkidiki",
    locationType: "region",
    contentKey: LOCATION_CONTENT_KEYS.HALKIDIKI,
    parentId: null,
    childIds: [
      LOCATION_IDS.SITHONIA,
      LOCATION_IDS.KASSANDRA,
      LOCATION_IDS.NEA_KALLIKRATIA,
      LOCATION_IDS.NEA_MOUDANIA,
      LOCATION_IDS.NIKITI,
      LOCATION_IDS.NEOS_MARMARAS,
      LOCATION_IDS.SARTI,
      LOCATION_IDS.KALLITHEA,
      LOCATION_IDS.PEFKOHORI,
      LOCATION_IDS.HANIOTI,
      LOCATION_IDS.POLICHRONO,
      LOCATION_IDS.AFITOS,
      LOCATION_IDS.KRIOPIGI,
      LOCATION_IDS.SANI,
      LOCATION_IDS.KASSANDRIA,
      LOCATION_IDS.FOURKA,
      LOCATION_IDS.METAMORFOSI,
      LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI,
      LOCATION_IDS.ORMILIA,
      LOCATION_IDS.PETRALONA,
      LOCATION_IDS.VRASNA,
      LOCATION_IDS.OLYMPIADA,
    ],
    slugByLocale: {
      en: "car-rental-halkidiki",
      ru: "arenda-avto-halkidiki",
      uk: "orenda-avto-halkidiki",
      el: "enoikiasi-autokinitou-halkidiki",
      de: "mietwagen-halkidiki",
      bg: "koli-pod-naem-halkidiki",
      ro: "inchirieri-auto-halkidiki",
      sr: "rent-a-car-halkidiki",
    },
  },
  {
    id: LOCATION_IDS.SITHONIA,
    canonicalSlug: "car-rental-sithonia",
    locationType: "subRegion",
    contentKey: LOCATION_CONTENT_KEYS.SITHONIA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-sithonia",
      ru: "arenda-avto-sitoniya",
      uk: "orenda-avto-sitoniya",
      el: "enoikiasi-autokinitou-sithonia",
      de: "mietwagen-sithonia",
      bg: "koli-pod-naem-sitoniya",
      ro: "inchirieri-auto-sithonia",
      sr: "rent-a-car-sitonija",
    },
  },
  {
    id: LOCATION_IDS.KASSANDRA,
    canonicalSlug: "car-rental-kassandra",
    locationType: "subRegion",
    contentKey: LOCATION_CONTENT_KEYS.KASSANDRA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-kassandra",
      ru: "arenda-avto-kassandra",
      uk: "orenda-avto-kassandra",
      el: "enoikiasi-autokinitou-kassandra",
      de: "mietwagen-kassandra",
      bg: "koli-pod-naem-kasandra",
      ro: "inchirieri-auto-kassandra",
      sr: "rent-a-car-kasandra",
    },
  },
  // Halkidiki city pages (CTA → homepage search with pickup param)
  {
    id: LOCATION_IDS.NEA_KALLIKRATIA,
    canonicalSlug: "car-rental-nea-kallikratia",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.NEA_KALLIKRATIA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-nea-kallikratia",
      ru: "arenda-avto-nea-kallikratia",
      uk: "orenda-avto-nea-kallikratia",
      el: "enoikiasi-autokinitou-nea-kallikratia",
      de: "mietwagen-nea-kallikratia",
      bg: "koli-pod-naem-nea-kallikratia",
      ro: "inchirieri-auto-nea-kallikratia",
      sr: "rent-a-car-nea-kallikratia",
    },
  },
  {
    id: LOCATION_IDS.NEA_MOUDANIA,
    canonicalSlug: "car-rental-nea-moudania",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.NEA_MOUDANIA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-nea-moudania",
      ru: "arenda-avto-nea-mudania",
      uk: "orenda-avto-nea-mudania",
      el: "enoikiasi-nea-moudania",
      de: "mietwagen-nea-moudania",
      bg: "koli-pod-naem-nea-moudania",
      ro: "inchirieri-auto-nea-moudania",
      sr: "rent-a-car-nea-moudania",
    },
  },
  {
    id: LOCATION_IDS.NIKITI,
    canonicalSlug: "car-rental-nikiti",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.NIKITI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-nikiti",
      ru: "arenda-avto-nikiti",
      uk: "orenda-avto-nikiti",
      el: "enoikiasi-nikiti",
      de: "mietwagen-nikiti",
      bg: "koli-pod-naem-nikiti",
      ro: "inchirieri-auto-nikiti",
      sr: "rent-a-car-nikiti",
    },
  },
  {
    id: LOCATION_IDS.NEOS_MARMARAS,
    canonicalSlug: "car-rental-neos-marmaras",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.NEOS_MARMARAS,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-neos-marmaras",
      ru: "arenda-avto-neos-marmaras",
      uk: "orenda-avto-neos-marmaras",
      el: "enoikiasi-neos-marmaras",
      de: "mietwagen-neos-marmaras",
      bg: "koli-pod-naem-neos-marmaras",
      ro: "inchirieri-auto-neos-marmaras",
      sr: "rent-a-car-neos-marmaras",
    },
  },
  {
    id: LOCATION_IDS.SARTI,
    canonicalSlug: "car-rental-sarti",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.SARTI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-sarti",
      ru: "arenda-avto-sarti",
      uk: "orenda-avto-sarti",
      el: "enoikiasi-sarti",
      de: "mietwagen-sarti",
      bg: "koli-pod-naem-sarti",
      ro: "inchirieri-auto-sarti",
      sr: "rent-a-car-sarti",
    },
  },
  {
    id: LOCATION_IDS.KALLITHEA,
    canonicalSlug: "car-rental-kallithea",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.KALLITHEA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-kallithea",
      ru: "arenda-avto-kallifea",
      uk: "orenda-avto-kallifea",
      el: "enoikiasi-kallithea",
      de: "mietwagen-kallithea",
      bg: "koli-pod-naem-kallithea",
      ro: "inchirieri-auto-kallithea",
      sr: "rent-a-car-kallithea",
    },
  },
  {
    id: LOCATION_IDS.PEFKOHORI,
    canonicalSlug: "car-rental-pefkohori",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.PEFKOHORI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-pefkohori",
      ru: "arenda-avto-pefkohori",
      uk: "orenda-avto-pefkohori",
      el: "enoikiasi-pefkohori",
      de: "mietwagen-pefkohori",
      bg: "koli-pod-naem-pefkohori",
      ro: "inchirieri-auto-pefkohori",
      sr: "rent-a-car-pefkohori",
    },
  },
  {
    id: LOCATION_IDS.HANIOTI,
    canonicalSlug: "car-rental-hanioti",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.HANIOTI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-hanioti",
      ru: "arenda-avto-hanoti",
      uk: "orenda-avto-hanoti",
      el: "enoikiasi-hanioti",
      de: "mietwagen-hanioti",
      bg: "koli-pod-naem-hanioti",
      ro: "inchirieri-auto-hanioti",
      sr: "rent-a-car-hanioti",
    },
  },
  {
    id: LOCATION_IDS.POLICHRONO,
    canonicalSlug: "car-rental-polichrono",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.POLICHRONO,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-polichrono",
      ru: "arenda-avto-polihrono",
      uk: "orenda-avto-polihrono",
      el: "enoikiasi-polichrono",
      de: "mietwagen-polichrono",
      bg: "koli-pod-naem-polichrono",
      ro: "inchirieri-auto-polichrono",
      sr: "rent-a-car-polichrono",
    },
  },
  {
    id: LOCATION_IDS.AFITOS,
    canonicalSlug: "car-rental-afitos",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.AFITOS,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-afitos",
      ru: "arenda-avto-afitos",
      uk: "orenda-avto-afitos",
      el: "enoikiasi-afitos",
      de: "mietwagen-afitos",
      bg: "koli-pod-naem-afitos",
      ro: "inchirieri-auto-afitos",
      sr: "rent-a-car-afitos",
    },
  },
  {
    id: LOCATION_IDS.KRIOPIGI,
    canonicalSlug: "car-rental-kriopigi",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.KRIOPIGI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-kriopigi",
      ru: "arenda-avto-kriopigi",
      uk: "orenda-avto-kriopigi",
      el: "enoikiasi-kriopigi",
      de: "mietwagen-kriopigi",
      bg: "koli-pod-naem-kriopigi",
      ro: "inchirieri-auto-kriopigi",
      sr: "rent-a-car-kriopigi",
    },
  },
  {
    id: LOCATION_IDS.SANI,
    canonicalSlug: "car-rental-sani",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.SANI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-sani",
      ru: "arenda-avto-sani",
      uk: "orenda-avto-sani",
      el: "enoikiasi-sani",
      de: "mietwagen-sani",
      bg: "koli-pod-naem-sani",
      ro: "inchirieri-auto-sani",
      sr: "rent-a-car-sani",
    },
  },
  {
    id: LOCATION_IDS.KASSANDRIA,
    canonicalSlug: "car-rental-kassandria",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.KASSANDRIA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-kassandria",
      ru: "arenda-avto-kassandria",
      uk: "orenda-avto-kassandria",
      el: "enoikiasi-kassandria",
      de: "mietwagen-kassandria",
      bg: "koli-pod-naem-kassandria",
      ro: "inchirieri-auto-kassandria",
      sr: "rent-a-car-kassandria",
    },
  },
  {
    id: LOCATION_IDS.FOURKA,
    canonicalSlug: "car-rental-fourka",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.FOURKA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-fourka",
      ru: "arenda-avto-fourka",
      uk: "orenda-avto-fourka",
      el: "enoikiasi-fourka",
      de: "mietwagen-fourka",
      bg: "koli-pod-naem-fourka",
      ro: "inchirieri-auto-fourka",
      sr: "rent-a-car-fourka",
    },
  },
  {
    id: LOCATION_IDS.METAMORFOSI,
    canonicalSlug: "car-rental-metamorfosi",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.METAMORFOSI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-metamorfosi",
      ru: "arenda-avto-metamorfosi",
      uk: "orenda-avto-metamorfosi",
      el: "enoikiasi-metamorfosi",
      de: "mietwagen-metamorfosi",
      bg: "koli-pod-naem-metamorfosi",
      ro: "inchirieri-auto-metamorfosi",
      sr: "rent-a-car-metamorfosi",
    },
  },
  {
    id: LOCATION_IDS.AGIOS_NIKOLAOS_HALKIDIKI,
    canonicalSlug: "car-rental-agios-nikolaos-halkidiki",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.AGIOS_NIKOLAOS_HALKIDIKI,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-agios-nikolaos",
      ru: "arenda-avto-agios-nikolaos",
      uk: "orenda-avto-agios-nikolaos",
      el: "enoikiasi-agios-nikolaos",
      de: "mietwagen-agios-nikolaos",
      bg: "koli-pod-naem-agios-nikolaos",
      ro: "inchirieri-auto-agios-nikolaos",
      sr: "rent-a-car-agios-nikolaos",
    },
  },
  {
    id: LOCATION_IDS.ORMILIA,
    canonicalSlug: "car-rental-ormilia",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.ORMILIA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-ormilia",
      ru: "arenda-avto-ormilia",
      uk: "orenda-avto-ormilia",
      el: "enoikiasi-ormilia",
      de: "mietwagen-ormilia",
      bg: "koli-pod-naem-ormilia",
      ro: "inchirieri-auto-ormilia",
      sr: "rent-a-car-ormilia",
    },
  },
  {
    id: LOCATION_IDS.PETRALONA,
    canonicalSlug: "car-rental-petralona",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.PETRALONA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-petralona",
      ru: "arenda-avto-petralona",
      uk: "orenda-avto-petralona",
      el: "enoikiasi-petralona",
      de: "mietwagen-petralona",
      bg: "koli-pod-naem-petralona",
      ro: "inchirieri-auto-petralona",
      sr: "rent-a-car-petralona",
    },
  },
  {
    id: LOCATION_IDS.VRASNA,
    canonicalSlug: "car-rental-vrasna",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.VRASNA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-vrasna",
      ru: "arenda-avto-vrasna",
      uk: "orenda-avto-vrasna",
      el: "enoikiasi-vrasna",
      de: "mietwagen-vrasna",
      bg: "koli-pod-naem-vrasna",
      ro: "inchirieri-auto-vrasna",
      sr: "rent-a-car-vrasna",
    },
  },
  {
    id: LOCATION_IDS.OLYMPIADA,
    canonicalSlug: "car-rental-olympiada",
    locationType: "city",
    contentKey: LOCATION_CONTENT_KEYS.OLYMPIADA,
    parentId: LOCATION_IDS.HALKIDIKI,
    childIds: [],
    slugByLocale: {
      en: "car-rental-olympiada",
      ru: "arenda-avto-olimpiada",
      uk: "orenda-avto-olimpiada",
      el: "enoikiasi-olympiada",
      de: "mietwagen-olympiada",
      bg: "koli-pod-naem-olympiada",
      ro: "inchirieri-auto-olympiada",
      sr: "rent-a-car-olympiada",
    },
  },
];

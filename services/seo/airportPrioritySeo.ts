import {
  LOCATION_IDS,
  type SupportedLocale,
} from "@domain/locationSeo/locationSeoKeys";
import type { LocationSeoResolved } from "@domain/locationSeo/types";

export type AirportDistanceRow = { location: string; distance: string };
export type AirportFaqItem = { question: string; answer: string };

export type AirportPrioritySeoText = {
  h1: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  introText: string;
  /** Long SEO text 400–600 words */
  seoLongText: string;
  /** Title for benefits block */
  benefitBlockTitle: string;
  /** Why rent at airport — 5 bullets */
  quickBenefits: string[];
  /** Distance table title */
  distanceTableTitle: string;
  /** Rows for distance table */
  distanceTableRows: AirportDistanceRow[];
  /** Airport-specific FAQ shown in content and FAQ JSON-LD */
  faqItems: AirportFaqItem[];
  /** Map section title */
  mapSectionTitle: string;
};

const AIRPORT_PRIORITY_SEO_BY_LOCALE: Record<
  SupportedLocale,
  AirportPrioritySeoText
> = {
  en: {
    h1: "Car Rental at Thessaloniki Airport (SKG)",
    heroSubtitle:
      "Pick up your rental car directly at Thessaloniki Airport and start your Halkidiki trip without delays.",
    seoTitle: "Car Rental at Thessaloniki Airport (SKG) | Natali Cars",
    seoDescription:
      "Rent a car at Thessaloniki Airport (SKG) with pickup on arrival. Affordable car rental for Halkidiki trips. Automatic and economy cars available.",
    introText:
      "Thessaloniki Airport (SKG) is the main international airport serving Thessaloniki and the wider region of Greece. Book your rental car online with pickup at the Thessaloniki Airport (SKG) terminal, with no deposit and 24/7 support.",
    seoLongText:
      "Renting a car at Thessaloniki Airport (SKG) is the easiest way to start your trip to Halkidiki. The airport is located only about 30 minutes from Nea Kallikratia and around one hour from many popular resorts in Halkidiki. With a rental car you can explore beautiful beaches, traditional villages and coastal roads without relying on public transport. Natali Cars offers pickup directly at the airport terminal, so you can collect your vehicle as soon as you land and drive straight to your accommodation. No need for taxis or shuttle buses — your car is ready when you are. The drive from Thessaloniki Airport to Halkidiki takes you along scenic routes with views of the Gulf of Thessaloniki. Nea Kallikratia is approximately 35 km away, while the main Halkidiki peninsula resorts are within 60–90 km. Thessaloniki city center is only 15 km from the airport if you need to make a stop. We offer flexible pickup times to match your flight schedule, competitive prices and a range of vehicles from economy to automatic and family cars. All rentals include comprehensive insurance and 24/7 support. Book your car rental at Thessaloniki Airport online and enjoy a stress-free start to your Halkidiki holiday.",
    benefitBlockTitle: "Why rent a car at Thessaloniki Airport",
    quickBenefits: [
      "Immediate pickup after arrival",
      "No need for taxi or bus",
      "Direct drive to Halkidiki beaches",
      "Flexible pickup times",
      "Competitive prices",
    ],
    distanceTableTitle: "Distance from Thessaloniki Airport",
    distanceTableRows: [
      { location: "Nea Kallikratia", distance: "35 km" },
      { location: "Halkidiki", distance: "60 km" },
      { location: "Thessaloniki center", distance: "15 km" },
      { location: "Kassandra", distance: "85 km" },
      { location: "Sithonia", distance: "95 km" },
    ],
    faqItems: [
      {
        question:
          "Where does the car pickup take place at Thessaloniki Airport?",
        answer:
          "We arrange pickup near the terminal and send you the exact meeting instructions before your arrival.",
      },
      {
        question: "What should I do if my flight is delayed?",
        answer:
          "Send us your updated arrival time or your flight number during online booking, and we will adjust the handover time whenever possible.",
      },
      {
        question: "Can I return the car directly at Thessaloniki Airport?",
        answer:
          "Yes. Airport return is available, and we agree the exact drop-off point and time with you in advance.",
      },
    ],
    mapSectionTitle: "Pickup location near Thessaloniki Airport",
  },
  ru: {
    h1: "Аренда авто в аэропорту Салоники (SKG)",
    heroSubtitle:
      "Получите авто прямо в аэропорту Салоники и начните поездку в Халкидики без задержек.",
    seoTitle: "Аренда авто в аэропорту Салоники (SKG) | Natali Cars",
    seoDescription:
      "Аренда авто в аэропорту Салоники (SKG) с подачей по прилёте. Недорогой прокат для поездок в Халкидики. Автомат и эконом.",
    introText:
      "Аэропорт Салоники (SKG) — главный международный аэропорт, обслуживающий Салоники и весь регион Греции. Бронируйте онлайн авто с получением в терминале аэропорта Салоники (SKG) без депозита и с поддержкой 24/7.",
    seoLongText:
      "Аренда авто в аэропорту Салоники (SKG) — самый удобный способ начать поездку в Халкидики. Аэропорт расположен примерно в 30 минутах от Неа Каликратии и в часе езды от многих курортов Халкидиков. С арендованной машиной вы можете исследовать пляжи, деревни и побережье без общественного транспорта. Natali Cars предлагает подачу в терминале аэропорта. Не нужны такси или трансферы — машина готова к вашему прилёту. До Неа Каликратии около 35 км, до курортов Халкидиков — 60–90 км. Центр Салоников в 15 км от аэропорта. Гибкое время подачи, конкурентные цены, полная страховка. Забронируйте авто в аэропорту Салоники онлайн.",
    benefitBlockTitle: "Почему арендовать авто в аэропорту Салоники",
    quickBenefits: [
      "Бесплатное бронирование",
      "Без депозита",
      "Подача сразу после прилёта",
      "Прямая дорога к пляжам Халкидиков",
      "Поддержка 24/7",
      "Выгодные цены",
    ],
    distanceTableTitle: "Расстояние от аэропорта Салоники",
    distanceTableRows: [
      { location: "Неа Каликратия", distance: "35 км" },
      { location: "Халкидики", distance: "60 км" },
      { location: "Центр Салоников", distance: "15 км" },
      { location: "Кассандра", distance: "85 км" },
      { location: "Ситония", distance: "95 км" },
    ],
    faqItems: [
      {
        question: "Где проходит выдача авто в аэропорту Салоники?",
        answer:
          "Мы организуем выдачу рядом с терминалом и заранее отправляем точную инструкцию по встрече перед вашим прилётом.",
      },
      {
        question: "Что делать, если мой рейс задерживается?",
        answer:
          "Сообщите нам обновлённое время прилёта или номер авиарейса при онлайн-бронировании, и мы по возможности скорректируем время передачи автомобиля.",
      },
      {
        question: "Можно ли вернуть автомобиль прямо в аэропорту Салоники?",
        answer:
          "Да. Возврат в аэропорту доступен, а точку и время возврата мы согласуем с вами заранее.",
      },
    ],
    mapSectionTitle: "Подача рядом с аэропортом Салоники",
  },
  uk: {
    h1: "Оренда авто в аеропорту Салоніки (SKG)",
    heroSubtitle:
      "Отримайте авто прямо в аеропорту Салоніки та почніть поїздку до Халкідік без затримок.",
    seoTitle: "Оренда авто в аеропорту Салоніки (SKG) | Natali Cars",
    seoDescription:
      "Оренда авто в аеропорту Салоніки (SKG) з подачею по прильоту. Недорогий прокат для поїздок у Халкідіки.",
    introText:
      "Аеропорт Салоніки (SKG) — головний міжнародний аеропорт, що обслуговує Салоніки та весь регіон Греції. Бронюйте авто онлайн з видачею в терміналі аеропорту Салоніки (SKG) без депозиту та з підтримкою 24/7.",
    seoLongText:
      "Оренда авто в аеропорту Салоніки (SKG) — найзручніший спосіб почати поїздку до Халкідік. Аеропорт знаходиться приблизно за 30 хвилин від Неа Калікратії. Natali Cars пропонує подачу в терміналі. Машина готова до вашого прильоту. Гнучкий час подачі, вигідні цени. Забронюйте авто в аеропорту Салоніки онлайн.",
    benefitBlockTitle: "Чому орендувати авто в аеропорту Салоніки",
    quickBenefits: [
      "Подача одразу після прильоту",
      "Без таксі та автобусів",
      "Пряма дорога до пляжів Халкідік",
      "Гнучкий час подачі",
      "Вигідні ціни",
    ],
    distanceTableTitle: "Відстань від аеропорту Салоніки",
    distanceTableRows: [
      { location: "Неа Калікратія", distance: "35 км" },
      { location: "Халкідіки", distance: "60 км" },
      { location: "Центр Салонік", distance: "15 км" },
      { location: "Кассандра", distance: "85 км" },
      { location: "Сітонія", distance: "95 км" },
    ],
    faqItems: [
      {
        question: "Де відбувається видача авто в аеропорту Салоніки?",
        answer:
          "Ми організовуємо видачу поруч із терміналом і заздалегідь надсилаємо точні інструкції щодо зустрічі перед вашим прильотом.",
      },
      {
        question: "Що робити, якщо мій рейс затримується?",
        answer:
          "Повідомте нам оновлений час прильоту або номер рейсу під час онлайн-бронювання, і ми за можливості скоригуємо час передачі автомобіля.",
      },
      {
        question: "Чи можна повернути автомобіль прямо в аеропорту Салоніки?",
        answer:
          "Так. Повернення в аеропорту доступне, а точку та час повернення ми погоджуємо з вами заздалегідь.",
      },
    ],
    mapSectionTitle: "Подача біля аеропорту Салоніки",
  },
  el: {
    h1: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης (SKG)",
    heroSubtitle:
      "Παραλάβετε το αυτοκίνητό σας απευθείας στο αεροδρόμιο Θεσσαλονίκης και ξεκινήστε για τη Χαλκιδική χωρίς καθυστερήσεις.",
    seoTitle:
      "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης (SKG) | Natali Cars",
    seoDescription:
      "Νοικιάστε αυτοκίνητο στο αεροδρόμιο Θεσσαλονίκης (SKG) με παραλαβή upon arrival. Οικονομική ενοικίαση για τη Χαλκιδική.",
    introText:
      "Το Αεροδρόμιο Θεσσαλονίκης (SKG) είναι το κύριο διεθνές αεροδρόμιο που εξυπηρετεί τη Θεσσαλονίκη και ολόκληρη την περιοχή της Ελλάδας. Κάντε online κράτηση αυτοκινήτου με παραλαβή στον τερματικό σταθμό του Αεροδρομίου Θεσσαλονίκης (SKG), χωρίς εγγύηση και με υποστήριξη 24/7.",
    seoLongText:
      "Η ενοικίαση αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης (SKG) είναι ο ευκολότερος τρόπος να ξεκινήσετε το ταξίδι σας στη Χαλκιδική. Το αεροδρόμιο απέχει περίπου 30 λεπτά από τη Νέα Καλλικράτεια και περίπου μία ώρα από πολλά δημοφιλή θέρετρα. Με ενοικιαζόμενο αυτοκίνητο μπορείτε να εξερευνήσετε παραλίες και παραθαλάσσια χωριά. Η Natali Cars προσφέρει παραλαβή στο terminal. Κλείστε online.",
    benefitBlockTitle:
      "Γιατί να νοικιάσετε αυτοκίνητο στο αεροδρόμιο Θεσσαλονίκης",
    quickBenefits: [
      "Άμεση παραλαβή μετά την άφιξη",
      "Χωρίς ταξί ή λεωφορεία",
      "Απευθείας για τις παραλίες της Χαλκιδικής",
      "Ευέλικτες ώρες παραλαβής",
      "Ανταγωνιστικές τιμές",
    ],
    distanceTableTitle: "Απόσταση από αεροδρόμιο Θεσσαλονίκης",
    distanceTableRows: [
      { location: "Νέα Καλλικράτεια", distance: "35 km" },
      { location: "Χαλκιδική", distance: "60 km" },
      { location: "Κέντρο Θεσσαλονίκης", distance: "15 km" },
      { location: "Κασσάνδρα", distance: "85 km" },
      { location: "Σιθωνία", distance: "95 km" },
    ],
    faqItems: [
      {
        question:
          "Πού γίνεται η παραλαβή του αυτοκινήτου στο αεροδρόμιο Θεσσαλονίκης;",
        answer:
          "Οργανώνουμε την παραλαβή κοντά στο terminal και σας στέλνουμε εκ των προτέρων ακριβείς οδηγίες συνάντησης πριν από την άφιξή σας.",
      },
      {
        question: "Τι πρέπει να κάνω αν η πτήση μου καθυστερήσει;",
        answer:
          "Στείλτε μας την ενημερωμένη ώρα άφιξης ή τον αριθμό της πτήσης σας κατά την online κράτηση και θα προσαρμόσουμε, όπου είναι δυνατόν, την ώρα παράδοσης.",
      },
      {
        question:
          "Μπορώ να επιστρέψω το αυτοκίνητο απευθείας στο αεροδρόμιο Θεσσαλονίκης;",
        answer:
          "Ναι. Η επιστροφή στο αεροδρόμιο είναι διαθέσιμη και συντονίζουμε εκ των προτέρων το ακριβές σημείο και την ώρα μαζί σας.",
      },
    ],
    mapSectionTitle: "Σημείο παραλαβής κοντά στο αεροδρόμιο",
  },
  de: {
    h1: "Mietwagen am Flughafen Thessaloniki (SKG)",
    heroSubtitle:
      "Holen Sie Ihr Mietauto direkt am Flughafen Thessaloniki ab und starten Sie ohne Verzögerung in die Chalkidiki.",
    seoTitle: "Mietwagen am Flughafen Thessaloniki (SKG) | Natali Cars",
    seoDescription:
      "Mietwagen am Flughafen Thessaloniki (SKG) mit Abholung bei Ankunft. Günstige Mieten für Chalkidiki. Automatik und Economy.",
    introText:
      "Der Flughafen Thessaloniki (SKG) ist der wichtigste internationale Flughafen für Thessaloniki und die gesamte Region Griechenlands. Buchen Sie Ihren Mietwagen online mit Übergabe am Terminal des Flughafens Thessaloniki (SKG) ohne Kaution und mit 24/7-Support.",
    seoLongText:
      "Ein Mietwagen am Flughafen Thessaloniki (SKG) ist der einfachste Start in die Chalkidiki. Der Flughafen liegt etwa 30 Minuten von Nea Kallikratia und etwa eine Stunde von vielen Resorts entfernt. Mit dem Mietwagen erkunden Sie Strände und Küstenorte. Natali Cars bietet Abholung am Terminal. Buchen Sie online.",
    benefitBlockTitle: "Warum am Flughafen Thessaloniki mieten",
    quickBenefits: [
      "Abholung direkt nach Ankunft",
      "Kein Taxi oder Bus nötig",
      "Direkt zu den Stränden der Chalkidiki",
      "Flexible Abholzeiten",
      "Konkurrenzfähige Preise",
    ],
    distanceTableTitle: "Entfernung vom Flughafen Thessaloniki",
    distanceTableRows: [
      { location: "Nea Kallikratia", distance: "35 km" },
      { location: "Chalkidiki", distance: "60 km" },
      { location: "Thessaloniki Zentrum", distance: "15 km" },
      { location: "Kassandra", distance: "85 km" },
      { location: "Sithonia", distance: "95 km" },
    ],
    faqItems: [
      {
        question: "Wo erfolgt die Fahrzeugübergabe am Flughafen Thessaloniki?",
        answer:
          "Wir organisieren die Übergabe in der Nähe des Terminals und senden Ihnen vor Ihrer Ankunft genaue Treffpunktinformationen.",
      },
      {
        question: "Was soll ich tun, wenn mein Flug Verspätung hat?",
        answer:
          "Senden Sie uns Ihre aktualisierte Ankunftszeit oder Ihre Flugnummer bei der Online-Buchung, und wir passen die Übergabezeit nach Möglichkeit an.",
      },
      {
        question:
          "Kann ich das Auto direkt am Flughafen Thessaloniki zurückgeben?",
        answer:
          "Ja. Die Rückgabe am Flughafen ist möglich, und wir stimmen den genauen Ort und die Uhrzeit vorab mit Ihnen ab.",
      },
    ],
    mapSectionTitle: "Abholort am Flughafen Thessaloniki",
  },
  bg: {
    h1: "Кола под наем на летище Солун (SKG)",
    heroSubtitle:
      "Вземете колата си директно на летище Солун и тръгнете за Халкидики без забавяне.",
    seoTitle: "Кола под наем на летище Солун (SKG) | Natali Cars",
    seoDescription:
      "Наем на кола на летище Солун (SKG) с получаване при пристигане. Доступен наем за Халкидики.",
    introText:
      "Летище Солун (SKG) е главното международно летище, което обслужва Солун и целия регион на Гърция. Резервирайте онлайн кола под наем с получаване на терминала на летище Солун (SKG) без депозит и с поддръжка 24/7.",
    seoLongText:
      "Наемът на кола на летище Солун (SKG) е най-лесният старт за Халкидики. Летището е на около 30 минути от Неа Каликратия. С наета кола можете да посетите плажове и курорти. Natali Cars предлага получаване на терминала. Резервирайте онлайн.",
    benefitBlockTitle: "Защо да наемете кола на летище Солун",
    quickBenefits: [
      "Получаване веднага след пристигане",
      "Без такси или автобус",
      "Директно до плажовете на Халкидики",
      "Гъвкаво време за получаване",
      "Конкурентни цени",
    ],
    distanceTableTitle: "Разстояние от летище Солун",
    distanceTableRows: [
      { location: "Неа Каликратия", distance: "35 км" },
      { location: "Халкидики", distance: "60 км" },
      { location: "Център Солун", distance: "15 км" },
      { location: "Касандра", distance: "85 км" },
      { location: "Ситония", distance: "95 км" },
    ],
    faqItems: [
      {
        question: "Къде става получаването на автомобила на летище Солун?",
        answer:
          "Организираме получаването близо до терминала и ви изпращаме точни указания за срещата преди вашето пристигане.",
      },
      {
        question: "Какво да направя, ако полетът ми закъснее?",
        answer:
          "Изпратете ни актуализирания час на пристигане или номера на полета си при онлайн резервация и при възможност ще коригираме часа за предаване.",
      },
      {
        question: "Мога ли да върна автомобила директно на летище Солун?",
        answer:
          "Да. Връщане на летището е възможно, а точната локация и час се уточняват предварително с вас.",
      },
    ],
    mapSectionTitle: "Място за получаване при летище Солун",
  },
  ro: {
    h1: "Închirieri auto la aeroportul Salonic (SKG)",
    heroSubtitle:
      "Ridicați mașina direct de la aeroportul Salonic și porniți spre Halkidiki fără întârzieri.",
    seoTitle: "Închirieri auto la aeroportul Salonic (SKG) | Natali Cars",
    seoDescription:
      "Închirieri auto la aeroportul Salonic (SKG) cu preluare la sosire. Închirieri pentru Halkidiki. Automat și economy.",
    introText:
      "Aeroportul Salonic (SKG) este principalul aeroport internațional care deservește Salonicul și întreaga regiune a Greciei. Rezervați online mașina cu preluare la terminalul Aeroportului Salonic (SKG), fără depozit și cu asistență 24/7.",
    seoLongText:
      "Închirierea unei mașini la aeroportul Salonic (SKG) este cel mai simplu mod de a începe călătoria în Halkidiki. Aeroportul este la aproximativ 30 de minute de Nea Kallikratia. Cu mașina închiriată explorați plaje și sate. Natali Cars oferă preluare la terminal. Rezervați online.",
    benefitBlockTitle: "De ce să închiriați mașină la aeroportul Salonic",
    quickBenefits: [
      "Preluare imediat după sosire",
      "Fără taxi sau autobuz",
      "Conducere directă spre plajele din Halkidiki",
      "Ore flexibile de preluare",
      "Prețuri competitive",
    ],
    distanceTableTitle: "Distanță de la aeroportul Salonic",
    distanceTableRows: [
      { location: "Nea Kallikratia", distance: "35 km" },
      { location: "Halkidiki", distance: "60 km" },
      { location: "Centrul Salonic", distance: "15 km" },
      { location: "Kassandra", distance: "85 km" },
      { location: "Sithonia", distance: "95 km" },
    ],
    faqItems: [
      {
        question: "Unde are loc preluarea mașinii la aeroportul Salonic?",
        answer:
          "Organizăm predarea în apropierea terminalului și vă trimitem din timp instrucțiuni exacte pentru întâlnire înainte de sosire.",
      },
      {
        question: "Ce ar trebui să fac dacă zborul meu întârzie?",
        answer:
          "Trimiteți-ne ora actualizată a sosirii sau numărul zborului la rezervarea online, iar noi vom ajusta, dacă este posibil, ora predării mașinii.",
      },
      {
        question: "Pot returna mașina direct la aeroportul Salonic?",
        answer:
          "Da. Returnarea la aeroport este disponibilă, iar punctul exact și ora se stabilesc din timp împreună cu dumneavoastră.",
      },
    ],
    mapSectionTitle: "Locație preluare lângă aeroportul Salonic",
  },
  sr: {
    h1: "Iznajmljivanje auta na aerodromu Solun (SKG)",
    heroSubtitle:
      "Preuzmite auto direktno na aerodromu Solun i krenite ka Halkidikiju bez odlaganja.",
    seoTitle: "Iznajmljivanje auta na aerodromu Solun (SKG) | Natali Cars",
    seoDescription:
      "Iznajmljivanje auta na aerodromu Solun (SKG) sa preuzimanjem po dolasku. Pristupačno za Halkidiki.",
    introText:
      "Aerodrom Solun (SKG) je glavni međunarodni aerodrom koji opslužuje Solun i ceo region Grčke. Rezervišite auto online sa preuzimanjem na terminalu aerodroma Solun (SKG) bez depozita i uz podršku 24/7.",
    seoLongText:
      "Iznajmljivanje auta na aerodromu Solun (SKG) je najlakši način da započnete putovanje na Halkidiki. Aerodrom je oko 30 minuta od Nea Kalikratije. Sa iznajmljenim autom istražujete plaže i letovališta. Natali Cars nudi preuzimanje na terminalu. Rezervište online.",
    benefitBlockTitle: "Zašto iznajmiti auto na aerodromu Solun",
    quickBenefits: [
      "Preuzimanje odmah po dolasku",
      "Bez taksi ili autobusa",
      "Direktno do plaža na Halkidikiju",
      "Fleksibilno vreme preuzimanja",
      "Konkurentne cene",
    ],
    distanceTableTitle: "Udaljenost od aerodroma Solun",
    distanceTableRows: [
      { location: "Nea Kalikratija", distance: "35 km" },
      { location: "Halkidiki", distance: "60 km" },
      { location: "Centar Soluna", distance: "15 km" },
      { location: "Kasandra", distance: "85 km" },
      { location: "Sitonija", distance: "95 km" },
    ],
    faqItems: [
      {
        question: "Gde se obavlja preuzimanje auta na aerodromu Solun?",
        answer:
          "Organizujemo preuzimanje u blizini terminala i unapred vam šaljemo tačna uputstva za mesto sastanka pre dolaska.",
      },
      {
        question: "Šta da radim ako moj let kasni?",
        answer:
          "Pošaljite nam ažurirano vreme dolaska ili broj leta prilikom online rezervacije i po mogućnosti ćemo prilagoditi vreme primopredaje.",
      },
      {
        question: "Da li mogu da vratim auto direktno na aerodromu Solun?",
        answer:
          "Da. Povrat na aerodromu je moguć, a tačnu lokaciju i vreme dogovaramo unapred sa vama.",
      },
    ],
    mapSectionTitle: "Mesto preuzimanja kod aerodroma Solun",
  },
};

export function isPriorityAirportLocation(
  location: Pick<LocationSeoResolved, "id">
): boolean {
  return location.id === LOCATION_IDS.THESSALONIKI_AIRPORT;
}

export function getAirportPrioritySeo(
  locale: SupportedLocale
): AirportPrioritySeoText {
  return AIRPORT_PRIORITY_SEO_BY_LOCALE[locale];
}

const fs = require('fs');
const path = require('path');

// Загружаем пункты выдачи из встроенного модуля (для надежного деплоя на Netlify)
let pickupPoints = [];
try {
  const { pickupPointsData } = require('./pickup-points-data');
  pickupPoints = pickupPointsData || [];
} catch (error) {
  console.error('Ошибка загрузки пунктов выдачи из модуля:', error);
  // Fallback: пробуем загрузить из JSON файла
  try {
    const filePath = path.join(__dirname, 'pickup-points.json');
    const data = fs.readFileSync(filePath, 'utf8');
    pickupPoints = JSON.parse(data);
  } catch (e) {
    console.error('Ошибка загрузки пунктов выдачи из JSON:', e);
    pickupPoints = [];
  }
}

// Загрузка тарифов курьерской доставки из встроенного модуля (для надёжного деплоя на Netlify)
let _courierPricingCache = null;
function loadCourierPricing() {
  if (_courierPricingCache) return _courierPricingCache;
  try {
    const { courierPricingData } = require('./courier-pricing-data');
    _courierPricingCache = courierPricingData;
    return _courierPricingCache;
  } catch (e) {
    console.warn('Не удалось загрузить courier-pricing-data, пробуем JSON:', e.message);
  }
  // Fallback: пробуем загрузить из JSON файла
  try {
    const filePath = path.join(__dirname, 'courier-pricing.json');
    const data = fs.readFileSync(filePath, 'utf8');
    _courierPricingCache = JSON.parse(data);
    return _courierPricingCache;
  } catch (e) {
    console.warn('Не удалось загрузить courier-pricing.json, используются дефолтные тарифы:', e.message);
    return null;
  }
}

// Расчет стоимости курьерской доставки по весу
function calculateCourierPrice(weight) {
  const pricing = loadCourierPricing();
  if (pricing && pricing.weight_pricing && pricing.weight_pricing.length > 0) {
    const weightKg = parseFloat(weight) || 0;
    for (const tier of pricing.weight_pricing) {
      if (weightKg <= tier.max_weight) {
        return { price: tier.price, currency: pricing.currency || 'BYN', pricing };
      }
    }
    // Свыше максимального значения таблицы — oversized
    if (pricing.oversized_pricing) {
      const maxTier = pricing.weight_pricing[pricing.weight_pricing.length - 1];
      const extra = Math.max(0, weightKg - maxTier.max_weight);
      const price = pricing.oversized_pricing.base_price + extra * pricing.oversized_pricing.price_per_kg;
      return { price: Math.round(price * 100) / 100, currency: pricing.currency || 'BYN', pricing };
    }
  }
  // Дефолтные тарифы (fallback)
  const w = parseFloat(weight) || 0;
  if (w <= 1) return { price: 13, currency: 'BYN', pricing: null };
  if (w <= 2) return { price: 14, currency: 'BYN', pricing: null };
  if (w <= 3) return { price: 17, currency: 'BYN', pricing: null };
  if (w <= 5) return { price: 19, currency: 'BYN', pricing: null };
  if (w <= 10) return { price: 22, currency: 'BYN', pricing: null };
  if (w <= 20) return { price: 29, currency: 'BYN', pricing: null };
  if (w <= 30) return { price: 34, currency: 'BYN', pricing: null };
  if (w <= 50) return { price: 43, currency: 'BYN', pricing: null };
  return { price: 43 + Math.ceil((w - 50)) * 1, currency: 'BYN', pricing: null };
}

// ──────────────────────────────────────────────────────────────────────────
// ЗОНИРОВАНИЕ НАСЕЛЁННЫХ ПУНКТОВ — загружается из zones.json
// ──────────────────────────────────────────────────────────────────────────

// Встроенные зоны по умолчанию (fallback на случай ошибки загрузки zones-data и zones.json)
const DEFAULT_ZONES = {
  saturday: [
    'минск', 'брест', 'витебск', 'гомель', 'гродно', 'могилев', 'могилёв',
    'барановичи', 'бобруйск', 'борисов', 'жлобин', 'жодино', 'лида',
    'молодечно', 'мозырь', 'новополоцк', 'орша', 'пинск',
    'полоцк', 'речица', 'светлогорск', 'слоним', 'слуцк', 'солигорск',
    'сморгонь', 'калинковичи'
  ],
  district: [
    'береза', 'берёза', 'берестовица', 'бешенковичи', 'браслав', 'брагин',
    'буда-кошелево', 'буда-кошелёво', 'быхов', 'белоозерск', 'белоозёрск',
    'белыничи', 'ветка', 'верхнедвинск', 'вилейка', 'волковыск', 'воложин',
    'вороново', 'высокое', 'ганцевичи', 'глуск', 'глубокое', 'городок',
    'горки', 'давид-городок', 'добруш', 'докшицы', 'дрибин', 'дрогичин',
    'дубровно', 'дятлово', 'дзержинск', 'ельск', 'жабинка', 'житкович',
    'заславль', 'зельва', 'иваново', 'ивацевичи', 'ивье', 'ивьё', 'каменец',
    'кобрин', 'кировск', 'климовичи', 'кличев', 'клецк', 'копыль', 'кореличи', 'корма',
    'костюковичи', 'краснополье', 'кричев', 'круглое', 'крупки', 'лельчицы',
    'лепель', 'лиозно', 'логойск', 'лоев', 'лунинец', 'любань', 'ляховичи',
    'малорита', 'марьина горка', 'микашевичи', 'миоры', 'мстиславль',
    'мядель', 'наровля', 'несвиж', 'новогрудок', 'новолукомль', 'октябрьский',
    'осиповичи', 'ошмяны', 'петриков', 'поставы', 'пружаны', 'рогачев', 'рогачёв',
    'россоны', 'свислочь', 'сенно', 'скидель', 'смолевичи', 'столбцы',
    'столин', 'старые дороги', 'толочин', 'туров', 'узда', 'ушачи',
    'фаниполь', 'хойники', 'хотимск', 'чашники', 'червень', 'чериков',
    'чечерск', 'шарковщина', 'шклов', 'шумилино', 'щучин', 'березовка', 'берёзовка'
  ]
};

let deliveryZones = { saturday: [], district: [] };
let zonesLoadStatus = 'pending';

// Загружаем зоны из встроенного модуля (для надёжного деплоя на Netlify)
try {
  const { zonesData } = require('./zones-data');
  deliveryZones.saturday = (zonesData.saturday || []).map(s => s.toLowerCase());
  deliveryZones.district = (zonesData.district || []).map(s => s.toLowerCase());
  console.log(`[ZONES] ✅ Загружено из модуля zones-data`);
  console.log(`[ZONES] Saturday: ${deliveryZones.saturday.length} городов`);
  console.log(`[ZONES] District: ${deliveryZones.district.length} городов`);
  zonesLoadStatus = 'loaded';
} catch (e) {
  console.warn(`[ZONES] ⚠️ Модуль zones-data недоступен, пробуем zones.json: ${e.message}`);
  // Fallback: пробуем несколько путей к JSON файлу
  const possiblePaths = [
    path.join(__dirname, 'zones.json'),
    path.resolve(__dirname, 'zones.json'),
    path.join(process.cwd(), 'functions', 'zones.json'),
    path.resolve(process.cwd(), 'zones.json')
  ];

  let loaded = false;
  for (const zonesPath of possiblePaths) {
    try {
      const zonesRaw = fs.readFileSync(zonesPath, 'utf8');
      const parsed = JSON.parse(zonesRaw);
      deliveryZones.saturday = (parsed.saturday || []).map(s => s.toLowerCase());
      deliveryZones.district = (parsed.district || []).map(s => s.toLowerCase());
      console.log(`[ZONES] ✅ Загружено из: ${zonesPath}`);
      console.log(`[ZONES] Saturday: ${deliveryZones.saturday.length} городов`);
      console.log(`[ZONES] District: ${deliveryZones.district.length} городов`);
      loaded = true;
      zonesLoadStatus = 'loaded';
      break;
    } catch (pathErr) {
      // Пробуем следующий путь
    }
  }

  if (!loaded) {
    console.error('[ZONES] ❌ zones.json не найден ни по одному из путей, используем DEFAULT_ZONES');
    deliveryZones.saturday = [...DEFAULT_ZONES.saturday];
    deliveryZones.district = [...DEFAULT_ZONES.district];
    console.log(`[ZONES] Saturday (fallback): ${deliveryZones.saturday.length} городов`);
    console.log(`[ZONES] District (fallback): ${deliveryZones.district.length} городов`);
    zonesLoadStatus = 'fallback';
  }
}

// Префиксы, однозначно указывающие на сельский тип населённого пункта
// Поддерживаем варианты с точкой («д.») и без точки («д ») — InSales присылает оба формата
const VILLAGE_PREFIXES = /^(д\.?|дер\.?|деревня|аг\.?|агрогородок|пос\.?|поселок|посёлок|хутор|х\.?)\s+/i;

/**
 * Нормализует название населённого пункта для сравнения:
 * убирает префиксы «г.»/«г », «город», «д.»/«д », «аг.»/«аг » и т.п.,
 * а также суффиксы «обл.», «р-н», «район», «беларусь» и всё после запятой.
 *
 * InSales передаёт адреса в формате:
 *   «г Минск», «г. Минск», «г Столин, Брестская обл.»,
 *   «д Семоновщина, Дрогичинский район, Брестская обл.»
 */
function normalizeSettlementName(raw) {
  return raw.toLowerCase()
    .replace(/[,;].*$/, '')            // всё после первой запятой / точки с запятой
    .replace(/^г\.?\s+/i, '')          // «г.» или «г » (с точкой или без)
    .replace(/^город\s+/i, '')         // «город »
    .replace(/^д\.?\s+/i, '')          // «д.» или «д » (деревня)
    .replace(/^дер\.?\s+/i, '')        // «дер.» или «дер »
    .replace(/^деревня\s+/i, '')       // «деревня »
    .replace(/^аг\.?\s+/i, '')         // «аг.» или «аг » (агрогородок)
    .replace(/^агрогородок\s+/i, '')   // «агрогородок »
    .replace(/^пос\.?\s+/i, '')        // «пос.» или «пос » (поселок)
    .replace(/^поселок\s+/i, '')       // «поселок »
    .replace(/^посёлок\s+/i, '')       // «посёлок »
    .replace(/^с\.?\s+/i, '')          // «с.» или «с » (с точкой или пробелом — не просто «с»)
    .replace(/^х\.?\s+/i, '')          // «х.» или «х » (хутор)
    .replace(/\s+беларусь$/i, '')      // «беларусь» в конце
    .replace(/\s+обл\.?(\s|$)/i, ' ') // «обл.» или «обл»
    .replace(/\s+р-н\.?(\s|$)/i, ' ') // «р-н»
    .replace(/\s+район(\s|$)/i, ' ')   // «район»
    .trim();
}

/**
 * Классифицирует населённый пункт по зонам доставки.
 *
 * Логика:
 *  1. Явный сельский префикс (д., аг., пос.) → village
 *  2. Есть в zones.saturday → saturday (Пн–Сб)
 *  3. Есть в zones.district → district (Пн–Пт)
 *  4. Всё остальное → village (1–2 дня, Пн–Пт)
 *
 * @returns {'saturday'|'district'|'village'}
 */
function classifySettlement(rawName) {
  if (!rawName || !rawName.trim()) return 'district';

  const raw = rawName.trim();

  // Явный сельский тип — сразу village
  if (VILLAGE_PREFIXES.test(raw)) {
    console.log(`[ZONE] "${raw}" → village (сельский префикс)`);
    return 'village';
  }

  const clean = normalizeSettlementName(raw);

  if (deliveryZones.saturday.includes(clean)) {
    console.log(`[ZONE] "${raw}" → saturday (в списке saturday)`);
    return 'saturday';
  }
  if (deliveryZones.district.includes(clean)) {
    console.log(`[ZONE] "${raw}" → district (в списке district)`);
    return 'district';
  }

  // Всё остальное — village (деревни, агрогородки, малые населённые пункты)
  console.log(`[ZONE] "${raw}" → village (не найден в зонах, clean="${clean}")`);
  return 'village';
}

// ──────────────────────────────────────────────────────────────────────────
// РАСЧЁТ ДАТЫ ДОСТАВКИ
// ──────────────────────────────────────────────────────────────────────────

const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const DAYS_RU   = ['вс','пн','вт','ср','чт','пт','сб'];

function formatDate(date) {
  return `${DAYS_RU[date.getDay()]}, ${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
}

/**
 * Генерирует SVG-календарь для визуализации сроков доставки.
 * Компактный дизайн с иконкой календаря и датами.
 */
function generateDeliverySvg(dateInfo) {
  const isRange = dateInfo.min_days !== dateInfo.max_days || dateInfo.description.includes('–');
  
  // Парсим даты из description
  const dateParts = dateInfo.description.split(' – ');
  const startDate = dateParts[0] || dateInfo.description;
  const endDate = dateParts[1] || null;
  
  // Базовые размеры
  const width = isRange && endDate ? 280 : 200;
  const height = 48;
  
  // SVG шаблон
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Фон с закруглением
  svg += `<rect width="${width}" height="${height}" rx="8" fill="#E8F5E9" stroke="#4CAF50" stroke-width="1.5"/>`;
  
  // Иконка календаря (слева)
  svg += `<g transform="translate(10, 10)">
    <rect x="0" y="4" width="24" height="20" rx="3" fill="white" stroke="#4CAF50" stroke-width="1.5"/>
    <line x1="4" y1="10" x2="20" y2="10" stroke="#4CAF50" stroke-width="1.5"/>
    <line x1="8" y1="0" x2="8" y2="6" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="0" x2="16" y2="6" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
    <circle cx="8" cy="18" r="1.5" fill="#4CAF50"/>
    <circle cx="16" cy="18" r="1.5" fill="#4CAF50"/>
  </g>`;
  
  // Текст с датами
  const textX = 42;
  const textY = 20;
  
  if (isRange && endDate) {
    // Две даты с тире между ними
    svg += `<text x="${textX}" y="${textY}" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#2E7D32">${startDate}</text>`;
    svg += `<text x="${textX + 110}" y="${textY}" font-family="Arial, sans-serif" font-size="18" font-weight="300" fill="#4CAF50">–</text>`;
    svg += `<text x="${textX + 130}" y="${textY}" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#2E7D32">${endDate}</text>`;
  } else {
    // Одна дата
    svg += `<text x="${textX}" y="${textY}" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#2E7D32">${startDate}</text>`;
  }
  
  // Подпись "доставка" внизу
  svg += `<text x="${textX}" y="${textY + 16}" font-family="Arial, sans-serif" font-size="11" fill="#66BB6A">доставка</text>`;
  
  svg += `</svg>`;
  
  return svg;
}

/**
 * Добавляет рабочие дни к дате, пропуская вс (и сб для district/village).
 */
function addWorkingDays(date, days, skipSaturday) {
  let added = 0;
  const d = new Date(date);
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow === 0) continue;                    // пропускаем вс всегда
    if (skipSaturday && dow === 6) continue;    // пропускаем сб для district/village
    added++;
  }
  return d;
}

/**
 * Возвращает объект с датами и описанием доставки.
 * Отсечка: 12:00 — заказы после 12:00 уходят на следующий рабочий день.
 *
 * @param {'saturday'|'district'|'village'} zone
 */
function calcDeliveryDate(zone) {
  const now = new Date();
  const isAfterCutoff = now.getHours() >= 12;

  // skipSaturday=false только для зоны saturday (Минск и крупные города)
  const skipSaturday = (zone !== 'saturday');

  let baseDate = new Date(now);

  // После отсечки 12:00 — отправка идёт со следующего рабочего дня
  if (isAfterCutoff) {
    baseDate = addWorkingDays(baseDate, 1, skipSaturday);
  } else {
    // Убеждаемся, что сегодня — рабочий день (на случай если вызов в вс или сб для district)
    const dow = baseDate.getDay();
    if (dow === 0) {
      // Воскресенье → следующий рабочий день
      baseDate = addWorkingDays(baseDate, 1, skipSaturday);
    } else if (dow === 6 && skipSaturday) {
      // Суббота, доставки нет → следующий рабочий день (понедельник)
      baseDate = addWorkingDays(baseDate, 1, true);
    }
  }

  if (zone === 'saturday') {
    // Минск, областные, крупные города: +1 день (Пн–Сб)
    const deliveryDate = addWorkingDays(baseDate, 1, false);
    return {
      min_days: 1,
      max_days: 1,
      description: formatDate(deliveryDate),
      note: isAfterCutoff ? 'Заказы после 12:00 — следующий рабочий день' : null
    };
  }

  if (zone === 'district') {
    // Районные города: +1 рабочий день, только Пн–Пт
    const deliveryDate = addWorkingDays(baseDate, 1, true);
    return {
      min_days: 1,
      max_days: 1,
      description: formatDate(deliveryDate),
      note: 'Доставка Пн–Пт, в течение дня. Звонок от водителя утром.'
    };
  }

  // village: 1–2 рабочих дня, только Пн–Пт, время на усмотрение водителя
  const minDate = addWorkingDays(baseDate, 1, true);
  const maxDate = addWorkingDays(baseDate, 2, true);
  return {
    min_days: 1,
    max_days: 2,
    description: `${formatDate(minDate)} – ${formatDate(maxDate)}`,
    note: 'Точное время и день определяет водитель. Доставка Пн–Пт.'
  };
}

// ──────────────────────────────────────────────────────────────────────────
// УЛУЧШЕННАЯ ФИЛЬТРАЦИЯ ГОРОДОВ (без дефолтного фолбэка на крупные города)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Ищет ПВЗ по названию города.
 * Возвращает пустой массив если ничего не найдено (НЕ дефолтные города).
 */
function findBestCityMatch(inputCity, pickupPoints) {
  if (!inputCity || !inputCity.trim()) {
    return [];
  }

  const normalizedInput = inputCity.toLowerCase().trim();
  
  // Удаляем префиксы и общие слова
  const cleanInput = normalizedInput
    .replace(/^г\.?\s*/i, '')
    .replace(/^город\s+/i, '')
    .replace(/^п\.?\s*/i, '')
    .replace(/^с\.?\s*/i, '')
    .replace(/\s+беларусь$/i, '')
    .replace(/[,;].*$/, '')
    .replace(/\s+обл\.?/i, '')
    .replace(/\s+р-н\.?/i, '')
    .trim();

  const uniqueCities = [...new Set(pickupPoints.map(point => point.city))];
  
  // Точное совпадение (максимальный приоритет)
  const exactMatches = uniqueCities.filter(city => city.toLowerCase() === cleanInput);
  if (exactMatches.length > 0) {
    return pickupPoints.filter(point => exactMatches.includes(point.city));
  }

  // Частичное совпадение слов (высокий приоритет)
  const wordMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanCity === cleanInput ||
           cleanInput.includes(cleanCity) ||
           cleanCity.includes(cleanInput);
  });
  if (wordMatches.length > 0) {
    return pickupPoints.filter(point => wordMatches.includes(point.city));
  }

  // Частичное совпадение символов (средний приоритет)
  const charMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanInput.includes(cleanCity) || cleanCity.includes(cleanInput);
  });
  if (charMatches.length > 0) {
    return pickupPoints.filter(point => charMatches.includes(point.city));
  }

  // Нет совпадений — возвращаем пустой массив (вызывающий код обработает это отдельно)
  return [];
}

// Расчет стоимости доставки по весу
function calculatePrice(weight) {
  // Новые тарифы на основе актуальной информации
  if (weight <= 5.0) return 10.0;
  if (weight <= 10.0) return 12.0;
  if (weight <= 20.0) return 14.0;
  if (weight <= 30.0) return 16.0;
  if (weight <= 35.0) return 18.0;
  if (weight <= 40.0) return 20.0;
  if (weight <= 55.0) return 35.0;
  if (weight <= 90.0) return 50.0;
  if (weight <= 120.0) return 60.0;
  if (weight <= 149.0) return 70.0;
  if (weight <= 200.0) return 100.0;
  if (weight <= 250.0) return 150.0;
  return 200.0; // Для веса свыше 250 кг
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const requestPath = event.path || '';

  // ──────────────────────────────────────────────────────────────────────────
  // МАРШРУТ: /api/courier-door — внешний способ доставки «До двери»
  // Вызывается InSales при оформлении заказа (передаёт адрес покупателя)
  // ──────────────────────────────────────────────────────────────────────────
  if (requestPath.includes('/courier-door')) {
    try {
      let order = {};
      if (event.body) {
        const body = JSON.parse(event.body);
        order = body.order || body || {};
      }

      const fullLocalityName = order.shipping_address?.full_locality_name || '';
      const locationCity     = order.shipping_address?.location?.city || '';
      const locationSettl    = order.shipping_address?.location?.settlement || '';
      const shippingCity     = order.shipping_address?.city || '';
      const rawCity = fullLocalityName || locationCity || locationSettl || shippingCity;

      const totalWeight = parseFloat(order.total_weight || 0) || 0.5;
      const { price, currency } = calculateCourierPrice(totalWeight);

      console.log(`[COURIER] Запрос: город="${rawCity}", вес=${totalWeight}кг`);

      // Город не указан — заглушка
      if (!rawCity || !rawCity.trim()) {
        console.log('[COURIER] Город не указан → возвращаем заглушку');
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify([{
            tariff_id: 'courier_door_placeholder',
            shipping_company_handle: 'autolight_express',
            price,
            currency,
            title: 'Курьер до двери',
            description: 'Укажите населённый пункт, чтобы узнать сроки',
            delivery_interval: { min_days: 1, max_days: 2, description: '1–2 дня' },
            shipping_address: { full_locality_name: '', address: '', city: '', country: 'Беларусь' },
            fields_values: [
              { handle: 'shipping_address[full_locality_name]', value: '' },
              { handle: 'shipping_address[address]', value: order.shipping_address?.address || '' }
            ]
          }])
        };
      }

      const zone = classifySettlement(rawCity);
      const dateInfo = calcDeliveryDate(zone);

      console.log(`[COURIER] Зона: ${zone}, дата: ${dateInfo.description}, цена: ${price} BYN`);

      // Формируем описание в зависимости от зоны
      const zoneDescriptions = {
        saturday: 'Минск, областные и крупные города — выбор времени доступен',
        district: 'Районный город — доставка Пн–Пт, звонок от водителя',
        village:  '⚠ Деревни и агрогородки — точное время определяет водитель'
      };

      const zoneTitles = {
        saturday: 'Курьер до двери',
        district: 'Курьер до двери',
        village:  'Курьер до двери (1–2 дня)'
      };

      // Генерируем SVG-календарь для визуализации сроков доставки
      const deliverySvg = generateDeliverySvg(dateInfo);

      const currentAddress = order.shipping_address?.address || '';
      const fullAddr = fullLocalityName || [rawCity, 'Беларусь'].filter(Boolean).join(', ');

      const tariff = {
        tariff_id: `courier_door_${zone}`,
        shipping_company_handle: 'autolight_express',
        price,
        currency,
        title: zoneTitles[zone],
        description: zoneDescriptions[zone],
        delivery_interval: {
          min_days: dateInfo.min_days,
          max_days: dateInfo.max_days,
          description: dateInfo.description
        },
        shipping_address: {
          full_locality_name: fullAddr,
          address: currentAddress,
          city: rawCity,
          country: 'Беларусь'
        },
        fields_values: [
          { handle: 'shipping_address[full_locality_name]', value: fullAddr },
          { handle: 'shipping_address[address]', value: currentAddress },
          { handle: 'full_locality_name', value: fullAddr },
          { handle: 'city', value: rawCity },
          { handle: 'country', value: 'Беларусь' },
          { handle: 'delivery_zone', value: zone },
          { handle: 'delivery_date', value: dateInfo.description },
          { handle: 'delivery_svg', value: deliverySvg }
        ]
      };

      // Для деревень добавляем предупреждение отдельным нередактируемым полем
      if (zone === 'village') {
        tariff.fields_values.push({
          handle: 'delivery_note',
          value: 'Доставка 1–2 рабочих дня. Время определяет водитель. Выходные не доставляем. Утром придёт SMS с номером водителя.'
        });
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify([tariff])
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // МАРШРУТ: /api/courier/calculate — расчёт стоимости курьерской доставки
  // Вызывается виджетом на странице товара
  // ──────────────────────────────────────────────────────────────────────────
  if (requestPath.includes('/courier/calculate') || requestPath.includes('/courier')) {
    try {
      let weight = 0;
      if (event.body) {
        const body = JSON.parse(event.body);
        weight = parseFloat(body.weight || body.total_weight || 0) || 0;
      }
      if (weight <= 0) weight = 0.5; // минимальный вес по умолчанию

      const { price, currency, pricing } = calculateCourierPrice(weight);
      const deliveryDays = (pricing && pricing.delivery_days) || { min: 1, max: 2, description: '1-2 дня' };

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          price,
          currency,
          weight,
          delivery_days: deliveryDays,
          delivery_type: 'courier'
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // МАРШРУТ: /api/pickup-points — список ПВЗ по городу
  // Вызывается виджетом на странице товара
  // ──────────────────────────────────────────────────────────────────────────
  if (requestPath.includes('/pickup-points')) {
    try {
      let city = '';
      let weight = 0;
      if (event.body) {
        const body = JSON.parse(event.body);
        city = body.address?.city || body.city || '';
        weight = parseFloat((body.order && body.order.total_weight) || body.weight || 0) || 0;
      }
      if (weight <= 0) weight = 0.5;

      console.log(`[PICKUP] Запрос: город="${city}", вес=${weight}кг`);

      const points = city ? findBestCityMatch(city, pickupPoints) : pickupPoints;
      const price = calculatePrice(weight);

      console.log(`[PICKUP] Найдено ПВЗ: ${points.length}`);

      const result = points.map(point => ({
        id: point.id,
        title: point.name,
        address: point.address,
        price,
        currency: 'BYN',
        working_hours: point.working_hours,
        shipping_address: {
          city: point.city,
          address: point.address
        }
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(result)
      };
    } catch (err) {
      console.error(`[PICKUP] Ошибка: ${err.message}`);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  try {
    // Обработка специальных запросов
    if (event.body) {
      const requestBody = JSON.parse(event.body);
      
      // Проверка на пинг/информационный запрос
      if (requestBody.action === 'ping' || requestBody.action === 'getCities' || 
          requestBody.ping === true || requestBody.get_cities === true) {
        
        const uniqueCities = [...new Set(pickupPoints.map(point => point.city))].sort();
        
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            message: 'InSales External Delivery API v2 - Avtolayt Express',
            cities: uniqueCities,
            pickup_points_count: pickupPoints.length,
            cities_count: uniqueCities.length,
            weight_ranges: {
              '5кг': 10.0,
              '10кг': 12.0,
              '20кг': 14.0,
              '30кг': 16.0,
              '35кг': 18.0,
              '40кг': 20.0,
              '55кг': 35.0,
              '90кг': 50.0,
              '120кг': 60.0,
              '149кг': 70.0,
              '200кг': 100.0,
              '250кг': 150.0,
              '250кг+': 200.0
            }
          })
        };
      }

      const order = requestBody?.order || {};

      // Извлекаем город из разных возможных источников
      const fullLocalityName = order.shipping_address?.full_locality_name || '';
      const locationCity = order.shipping_address?.location?.city || '';
      const locationSettlement = order.shipping_address?.location?.settlement || '';
      const shippingCity = order.shipping_address?.city || '';

      // Пытаемся определить город по разным полям
      const city = fullLocalityName || locationCity || locationSettlement || shippingCity;
      const isCityEmpty = !city || !city.trim();

      // Получаем вес заказа
      const totalWeightStr = order.total_weight || '0';
      const totalWeight = parseFloat(totalWeightStr) || 0;

      console.log(`[API] Запрос ПВЗ: город="${city}", вес=${totalWeight}кг`);

      if (isCityEmpty) {
        console.log('[API] Город не указан → возвращаем заглушку');
        const price = calculatePrice(totalWeight);
        const placeholderTariff = [{
          id: 'pvz_enter_city',
          tariff_id: 'pvz_enter_city',
          shipping_company_handle: 'autolight_express',
          price,
          currency: 'BYN',
          title: 'Доставка в пункт выдачи',
          description: 'Укажите населённый пункт, чтобы увидеть адреса',
          delivery_interval: {
            min_days: 1,
            max_days: 1,
            description: '1 день'
          },
          shipping_address: {
            full_locality_name: '',
            address: '',
            city: '',
            country: 'Беларусь',
            postal_code: '',
            pickup_point_name: '',
            pickup_point_hours: ''
          },
          fields_values: [
            {
              handle: 'shipping_address[full_locality_name]',
              value: '',
              name: 'Полный адрес доставки'
            },
            {
              handle: 'shipping_address[address]',
              value: '',
              name: 'Адрес доставки'
            },
            {
              handle: 'shipping_address_address',
              value: ''
            },
            {
              handle: 'full_locality_name',
              value: ''
            },
            {
              handle: 'address',
              value: ''
            },
            {
              handle: 'pickup_point_hint',
              value: 'Укажите населённый пункт, чтобы выбрать адрес'
            }
          ]
        }];

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(placeholderTariff)
        };
      }

      // Фильтрация ПВЗ по городу
      const filteredPoints = findBestCityMatch(city, pickupPoints);

      console.log(`[API] Найдено ПВЗ в городе "${city}": ${filteredPoints.length}`);

      // Если ПВЗ в указанном городе нет — возвращаем тариф «недоступно»
      if (filteredPoints.length === 0) {
        const zone = classifySettlement(city);
        const dateInfo = calcDeliveryDate(zone);

        console.log(`[API] ПВЗ нет, зона: ${zone}, доставка: ${dateInfo.description}`);

        // Для деревень и агрогородков ПВЗ объективно не бывает —
        // даём понятное сообщение без ложной надежды
        const noPickupTariff = {
          tariff_id: 'pvz_not_available',
          shipping_company_handle: 'autolight_express',
          price: 0, // Цена 0 — это заглушка, а не реальная стоимость
          currency: 'BYN',
          title: 'Пункт выдачи недоступен',
          description: zone === 'village'
            ? `В деревни и агрогородки доставляем только курьером (1–2 дня). Выберите способ «Курьер до двери».`
            : `В населённом пункте «${city}» нет пунктов выдачи. Выберите доставку курьером.`,
          delivery_interval: {
            min_days: dateInfo.min_days,
            max_days: dateInfo.max_days,
            description: dateInfo.description
          },
          shipping_address: {
            full_locality_name: city,
            address: '',
            city,
            country: 'Беларусь'
          },
          fields_values: [
            { handle: 'shipping_address[full_locality_name]', value: city },
            { handle: 'shipping_address[address]', value: '' },
            { handle: 'city', value: city },
            { handle: 'country', value: 'Беларусь' }
          ]
        };

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify([noPickupTariff])
        };
      }

      // ПВЗ найдены — определяем зону для расчёта даты
      // ПВЗ есть только в городах → zone всегда district или minsk_oblast
      const pvzZone = classifySettlement(city);
      const pvzDateInfo = calcDeliveryDate(pvzZone);

      console.log(`[API] ПВЗ найдены, зона: ${pvzZone}, доставка: ${pvzDateInfo.description}`);

      // Генерируем SVG для ПВЗ
      const pvzDeliverySvg = generateDeliverySvg(pvzDateInfo);

      const tariffs = filteredPoints.map(point => {
        const price = calculatePrice(totalWeight);
        const fullAddress = point.delivery_address ||
                           `${point.address}, ${point.city}, Беларусь`;

        return {
          id: point.id,
          tariff_id: `pvz_${point.id}`,
          shipping_company_handle: 'autolight_express',
          price,
          currency: 'BYN',

          // Коротко: только название ПВЗ (адрес — в description)
          title: point.name,
          // Адрес без срока доставки (срок отображается отдельным полем в интерфейсе)
          description: point.address,

          delivery_interval: {
            min_days: pvzDateInfo.min_days,
            max_days: pvzDateInfo.max_days,
            description: pvzDateInfo.description
          },

          shipping_address: {
            full_locality_name: fullAddress,
            address: point.address,
            city: point.city,
            country: 'Беларусь',
            postal_code: '',
            pickup_point_name: point.name,
            pickup_point_hours: point.working_hours
          },

          fields_values: [
            { handle: 'shipping_address[full_locality_name]', value: fullAddress, name: 'Полный адрес доставки' },
            { handle: 'shipping_address[address]', value: point.address, name: 'Адрес доставки' },
            { handle: 'shipping_address_address', value: point.address },
            { handle: 'full_locality_name', value: fullAddress },
            { handle: 'address', value: fullAddress },
            { handle: 'pickup_point_id', value: point.id.toString() },
            { handle: 'pickup_point_name', value: point.name },
            { handle: 'city', value: point.city },
            { handle: 'country', value: 'Беларусь' },
            { handle: 'pickup_point_hours', value: point.working_hours },
            { handle: 'delivery_date', value: pvzDateInfo.description },
            { handle: 'delivery_svg', value: pvzDeliverySvg }
          ]
        };
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(tariffs)
      };
    }

    // Если нет body или не JSON
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Invalid request format',
        errors: ['Request body must be valid JSON'],
        warnings: []
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: error.message,
        errors: [error.message],
        warnings: []
      })
    };
  }
};

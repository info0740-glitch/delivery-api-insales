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

// Загрузка тарифов курьерской доставки из JSON
function loadCourierPricing() {
  try {
    const filePath = path.join(__dirname, 'courier-pricing.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
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

let deliveryZones = { saturday: [], district: [] };
try {
  const zonesPath = path.join(__dirname, 'zones.json');
  const zonesData = fs.readFileSync(zonesPath, 'utf8');
  const parsed = JSON.parse(zonesData);
  deliveryZones.saturday = (parsed.saturday || []).map(s => s.toLowerCase());
  deliveryZones.district  = (parsed.district  || []).map(s => s.toLowerCase());
} catch (e) {
  console.error('Ошибка загрузки zones.json:', e.message);
}

// Префиксы, однозначно указывающие на сельский тип населённого пункта
const VILLAGE_PREFIXES = /^(д\.|дер\.|деревня|аг\.|агрогородок|пос\.|поселок|хутор|х\.)\s+/i;

/**
 * Нормализует название населённого пункта для сравнения:
 * убирает префиксы «г.», «город», «д.», «аг.», «пос.» и суффиксы «обл.», «р-н» и т.п.
 * Важно: удаляем только однобуквенные аббревиатуры С ТОЧКОЙ или СЛОВАМИ, не просто буквы.
 */
function normalizeSettlementName(raw) {
  return raw.toLowerCase()
    .replace(/^г\.\s*/i, '')           // «г.» с точкой
    .replace(/^город\s+/i, '')         // «город »
    .replace(/^д\.\s*/i, '')           // «д.» деревня
    .replace(/^дер\.\s*/i, '')         // «дер.»
    .replace(/^деревня\s+/i, '')       // «деревня »
    .replace(/^аг\.\s*/i, '')          // «аг.» агрогородок
    .replace(/^агрогородок\s+/i, '')   // «агрогородок »
    .replace(/^пос\.\s*/i, '')         // «пос.» поселок
    .replace(/^поселок\s+/i, '')       // «поселок »
    .replace(/^с\.\s*/i, '')           // «с.» с точкой (не «с» без точки!)
    .replace(/^х\.\s*/i, '')           // «х.» хутор
    .replace(/\s+беларусь$/i, '')      // «беларусь» в конце
    .replace(/[,;].*$/, '')            // всё после запятой/точки с запятой
    .replace(/\s+обл\.?(\s|$)/i, ' ') // «обл.»
    .replace(/\s+р-н\.?(\s|$)/i, ' ') // «р-н»
    .trim();
}

/**
 * Классифицирует населённый пункт по зонам доставки.
 *
 * Логика:
 *  1. Явный сельский префикс (д., аг., пос.) → village
 *  2. Есть в zones.saturday → saturday (Пн–Сб)
 *  3. Есть в zones.district ИЛИ есть ПВЗ в базе → district (Пн–Пт)
 *  4. Всё остальное → village (1–2 дня, Пн–Пт)
 *
 * @returns {'saturday'|'district'|'village'}
 */
function classifySettlement(rawName) {
  if (!rawName || !rawName.trim()) return 'district';

  const raw = rawName.trim();

  // Явный сельский тип — сразу village
  if (VILLAGE_PREFIXES.test(raw)) return 'village';

  const clean = normalizeSettlementName(raw);

  if (deliveryZones.saturday.includes(clean)) return 'saturday';
  if (deliveryZones.district.includes(clean))  return 'district';

  // Дополнительная проверка: если в базе ПВЗ есть этот город — минимум district
  const hasPickup = pickupPoints.some(p => p.city.toLowerCase() === clean);
  if (hasPickup) return 'district';

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

      // Город не указан — заглушка
      if (!rawCity || !rawCity.trim()) {
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

      const currentAddress = order.shipping_address?.address || '';
      const fullAddr = fullLocalityName || [rawCity, 'Беларусь'].filter(Boolean).join(', ');

      const tariff = {
        tariff_id: `courier_door_${zone}`,
        shipping_company_handle: 'autolight_express',
        price,
        currency,
        title: zoneTitles[zone],
        description: `${zoneDescriptions[zone]}. Доставка: ${dateInfo.description}`,
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
          { handle: 'delivery_date', value: dateInfo.description }
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

      const points = city ? findBestCityMatch(city, pickupPoints) : pickupPoints;
      const price = calculatePrice(weight);

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

      if (isCityEmpty) {
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

      // Если ПВЗ в указанном городе нет — возвращаем тариф «недоступно»
      if (filteredPoints.length === 0) {
        const zone = classifySettlement(city);
        const dateInfo = calcDeliveryDate(zone);
        const price = calculatePrice(totalWeight);

        // Для деревень и агрогородков ПВЗ объективно не бывает —
        // даём понятное сообщение без ложной надежды
        const noPickupTariff = {
          tariff_id: 'pvz_not_available',
          shipping_company_handle: 'autolight_express',
          price,
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
          // Адрес + расчётная дата — вместо часов работы
          description: `${point.address} · ${pvzDateInfo.description}`,

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
            { handle: 'delivery_date', value: pvzDateInfo.description }
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

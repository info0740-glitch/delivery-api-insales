// ──────────────────────────────────────────────────────────────────────────
// ЗАГРУЗКА СПРАВОЧНИКОВ АВТОЛАЙТ ИЗ YANDEX OBJECT STORAGE
// ──────────────────────────────────────────────────────────────────────────
// Источники (переопределяются через env):
//   YCF_DATA_BUCKET       — бакет (например delivery-api-backet)
//   CITIES_JSON_KEY       — autolight-cities.json
//   POSTOFFICES_JSON_KEY  — autolight-postoffices.json
//
// Обновляются раз в 2 недели внешним процессом; этот код только переиспользует
// готовые JSON-файлы из бакета с in-memory кешем и single-flight.
// ──────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const s3Client = require('./s3-client');

const CITIES_KEY = process.env.CITIES_JSON_KEY || 'autolight-cities.json';
const POSTOFFICES_KEY = process.env.POSTOFFICES_JSON_KEY || 'autolight-postoffices.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

let citiesCache = { ts: 0, value: null, promise: null };
let postOfficesCache = { ts: 0, value: null, promise: null };

// ─── Helpers ─────────────────────────────────────────────────────────────

function getBucket() {
  // Если YCF_DATA_BUCKET не задан, но override лежит в том же бакете,
  // переиспользуем OVERRIDE_BUCKET.
  return process.env.YCF_DATA_BUCKET || process.env.OVERRIDE_BUCKET || '';
}

async function fetchJsonFromBucket(key) {
  const bucket = getBucket();
  if (!bucket) {
    throw new Error('YCF_DATA_BUCKET не задан');
  }
  return s3Client.getObjectJson(bucket, key);
}

function normalizeCityName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toLowerCase()
    // ё → е для совпадения "Берёза" / "Береза", "Могилёв" / "Могилев"
    .replace(/ё/g, 'е')
    // префиксы
    .replace(/^г\.?\s+/i, '')
    .replace(/^город\s+/i, '')
    .replace(/^д\.?\s+/i, '')
    .replace(/^дер\.?\s+/i, '')
    .replace(/^деревня\s+/i, '')
    .replace(/^аг\.?\s+/i, '')
    .replace(/^агрогородок\s+/i, '')
    .replace(/^пос\.?\s+/i, '')
    .replace(/^поселок\s+/i, '')
    .replace(/^посёлок\s+/i, '')
    .replace(/^с\.?\s+/i, '')
    .replace(/^х\.?\s+/i, '')
    // суффиксы
    .replace(/[,;].*$/, '')
    .replace(/\s+обл\.?(\s|$)/i, ' ')
    .replace(/\s+р-н\.?(\s|$)/i, ' ')
    .replace(/\s+район(\s|$)/i, ' ')
    .replace(/\s+беларусь$/i, '')
    .replace(/\s+г\.?$/i, '')
    .trim();
}

function hasAnyServiceDay(city) {
  return !!(
    city &&
    (city.day1 || city.day2 || city.day3 || city.day4 || city.day5 || city.day6 || city.day7)
  );
}

function hasSaturdayService(city) {
  return !!(city && city.day6);
}

// ─── Cities ──────────────────────────────────────────────────────────────

function buildCityIndex(list) {
  const index = new Map();
  for (const city of list) {
    if (!city || !city.N) continue;

    const keys = new Set();
    const key = normalizeCityName(city.N);
    if (key) keys.add(key);

    // дополнительно по полному названию, если оно отличается
    const fullKey = normalizeCityName(city.name);
    if (fullKey && fullKey !== key) keys.add(fullKey);

    for (const k of keys) {
      const existing = index.get(k);
      // Если есть дубли по названию (например "Берёза г." и "Берёза д."),
      // предпочитаем запись с обслуживанием — это город/нас.пункт в основной сети.
      if (!existing || (!hasAnyServiceDay(existing) && hasAnyServiceDay(city))) {
        index.set(k, city);
      }
    }
  }
  return index;
}

function loadFallbackCities() {
  console.warn('[CITIES] Используем fallback: zones-data.js');
  try {
    const { zonesData } = require('./zones-data');
    const index = new Map();
    for (const name of zonesData.saturday || []) {
      index.set(name.toLowerCase(), { day1: true, day2: true, day3: true, day4: true, day5: true, day6: true, day7: false });
    }
    for (const name of zonesData.district || []) {
      index.set(name.toLowerCase(), { day1: true, day2: true, day3: true, day4: true, day5: true, day6: false, day7: false });
    }
    return { list: [], index, zoneSource: 'fallback-zones' };
  } catch (e) {
    console.error('[CITIES] Fallback недоступен:', e.message);
    return { list: [], index: new Map(), zoneSource: 'empty' };
  }
}

async function loadCities() {
  const now = Date.now();
  if (citiesCache.value && (now - citiesCache.ts) < CACHE_TTL_MS) {
    return citiesCache.value;
  }
  if (citiesCache.promise) return citiesCache.promise;

  citiesCache.promise = (async () => {
    try {
      const data = await fetchJsonFromBucket(CITIES_KEY);
      const list = data && data.result ? data.result : [];
      const index = buildCityIndex(list);
      const result = { list, index, source: 'bucket' };
      citiesCache = { ts: Date.now(), value: result, promise: null };
      console.log(`[CITIES] Загружено из бакета: ${list.length} записей, индекс ${index.size}`);
      return result;
    } catch (e) {
      console.warn(`[CITIES] Ошибка загрузки из бакета: ${e.message}`);
      const fallback = loadFallbackCities();
      citiesCache = { ts: Date.now(), value: { ...fallback, source: 'fallback' }, promise: null };
      return citiesCache.value;
    }
  })();

  return citiesCache.promise;
}

function getLoadedCities() {
  return citiesCache.value;
}

// ─── Post offices / ПВЗ ──────────────────────────────────────────────────

function isPostomat(p) {
  // Почтоматы Автолайта имеют адрес вида "CityPost001, г.Минск, ..."
  // Их не показываем покупателю как ПВЗ.
  const text = `${p.address || ''} ${p.name || ''}`.toLowerCase();
  return /citypost\d+/.test(text);
}

// ПВЗ, которые никогда не показываем (сложная локация, жалобы клиентов).
const BLACKLISTED_PVZ_IDS = new Set([
  1, // Минская обл., д. Дегтяревка
]);

function buildPickupPoints(postOffices) {
  return postOffices
    .filter(p => p && p.code && !p.closed && p.deliveryAvailable !== false)
    .filter(p => !isPostomat(p) && !BLACKLISTED_PVZ_IDS.has(p.code))
    .map(p => {
      const city = normalizeCityName(p.cityName || '');
      const address = (p.address || '').trim();
      const number = p.postofficeNumber || String(p.code);
      const name = `СППС №${number}`;

      // В справочнике Автолайта:
      //   - maxWeight = 30  → ПВЗ с лимитом 30 кг
      //   - maxWeight = 0   → ПВЗ без явного ограничения, трактуем как 50 кг
      //   - maxWeight отсутствует → fallback 25 кг
      const rawMax = p.maxWeight;
      const maxWeightNum = (rawMax === undefined || rawMax === null || rawMax === '')
        ? null
        : parseFloat(rawMax);
      const weightLimit = maxWeightNum === 0 ? 50 : (maxWeightNum || 25);

      return {
        id: p.code,
        city,
        name,
        address,
        working_hours: p.workTime || '',
        delivery_address: address ? `${address}, Беларусь` : '',
        weight_limit: weightLimit,
        _raw: p
      };
    });
}

function loadFallbackPostOffices() {
  console.warn('[PVZ] Используем fallback: pickup-piont-data.js');
  try {
    const { pickupPointsData } = require('./pickup-piont-data');
    return { list: pickupPointsData || [] };
  } catch (e) {
    console.error('[PVZ] Fallback недоступен:', e.message);
    return { list: [] };
  }
}

async function loadPostOffices() {
  const now = Date.now();
  if (postOfficesCache.value && (now - postOfficesCache.ts) < CACHE_TTL_MS) {
    return postOfficesCache.value;
  }
  if (postOfficesCache.promise) return postOfficesCache.promise;

  postOfficesCache.promise = (async () => {
    try {
      const data = await fetchJsonFromBucket(POSTOFFICES_KEY);
      const list = buildPickupPoints(data && data.result ? data.result : []);
      const result = { list, source: 'bucket' };
      postOfficesCache = { ts: Date.now(), value: result, promise: null };
      console.log(`[PVZ] Загружено из бакета: ${list.length} пунктов выдачи`);
      return result;
    } catch (e) {
      console.warn(`[PVZ] Ошибка загрузки из бакета: ${e.message}`);
      const fallback = loadFallbackPostOffices();
      postOfficesCache = { ts: Date.now(), value: { ...fallback, source: 'fallback' }, promise: null };
      return postOfficesCache.value;
    }
  })();

  return postOfficesCache.promise;
}

function getLoadedPostOffices() {
  return postOfficesCache.value;
}

// ─── Exports ─────────────────────────────────────────────────────────────

function resetCache() {
  citiesCache = { ts: 0, value: null, promise: null };
  postOfficesCache = { ts: 0, value: null, promise: null };
}

module.exports = {
  loadCities,
  loadPostOffices,
  getLoadedCities,
  getLoadedPostOffices,
  normalizeCityName,
  hasAnyServiceDay,
  hasSaturdayService,
  resetCache
};

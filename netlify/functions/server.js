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

// Улучшенная функция фильтрации городов
function findBestCityMatch(inputCity, pickupPoints) {
  if (!inputCity || !inputCity.trim()) {
    return [];
  }

  const normalizedInput = inputCity.toLowerCase().trim();
  
  // Удаляем префиксы и общие слова
  const cleanInput = normalizedInput
    .replace(/^г\.?\s*/i, '')     // удаляем "г.", "г"
    .replace(/^город\s+/i, '')     // удаляем "город"
    .replace(/^п\.?\s*/i, '')     // удаляем "п.", "п" (поселок)
    .replace(/^с\.?\s*/i, '')     // удаляем "с.", "с" (село)
    .replace(/\s+беларусь$/i, '') // удаляем "беларусь" в конце
    .replace(/[,;].*$/, '')       // удаляем после запятой/точки с запятой
    .replace(/\s+обл\.?/i, '')    // удаляем "обл.", "обл" (область)
    .replace(/\s+р-н\.?/i, '')    // удаляем "р-н", "р-н." (район)
    .trim();

  // Получаем все уникальные города
  const uniqueCities = [...new Set(pickupPoints.map(point => point.city))];
  
  // Точное совпадение (максимальный приоритет)
  let exactMatches = uniqueCities.filter(city => 
    city.toLowerCase() === cleanInput
  );
  if (exactMatches.length > 0) {
    return pickupPoints.filter(point => 
      exactMatches.includes(point.city)
    );
  }

  // Частичное совпадение слов (высокий приоритет)
  let wordMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanCity === cleanInput ||
           cleanInput.includes(cleanCity) ||
           cleanCity.includes(cleanInput);
  });
  if (wordMatches.length > 0) {
    return pickupPoints.filter(point => 
      wordMatches.includes(point.city)
    );
  }

  // Частичное совпадение символов (средний приоритет)
  let charMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanInput.includes(cleanCity) || cleanCity.includes(cleanInput);
  });
  if (charMatches.length > 0) {
    return pickupPoints.filter(point => 
      charMatches.includes(point.city)
    );
  }

  // Нет совпадений - возвращаем точки по умолчанию (например, крупные города)
  return pickupPoints.filter(point => 
    ['Минск', 'Гомель', 'Витебск', 'Могилев', 'Гродно', 'Брест'].includes(point.city)
  );
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

      // Улучшенная фильтрация ПВЗ по городу
      const filteredPoints = findBestCityMatch(city, pickupPoints);

      const tariffs = filteredPoints.map(point => {
        const price = calculatePrice(totalWeight);
        
        // Формируем полный адрес для full_locality_name
        const fullAddress = point.delivery_address || 
                           `${point.address}, ${point.city}, Беларусь`;

        // Основной ответ по формату InSales документации
        return {
          // Базовые поля тарифа
          id: point.id,                    // Добавляем id для pickup points
          tariff_id: `pvz_${point.id}`,    // Обязательное поле для множественных тарифов
          shipping_company_handle: 'autolight_express',
          price: price,
          currency: 'BYN',
          
          // Информация о доставке
          title: `${point.name} ${point.address}`,
          description: `(${point.working_hours})`,
          
          // Интервал доставки
          delivery_interval: {
            min_days: 1,
            max_days: 1,
            description: `1 день`
          },
          
          // КРИТИЧНО: Правильный формат shipping_address по документации
          shipping_address: {
            // Это поле должно заполнить UI InSales
            full_locality_name: fullAddress,
            // Дополнительные поля адреса
            address: point.address,
            city: point.city,
            country: 'Беларусь',
            postal_code: '',
            
            // Дополнительная информация для pickup point
            pickup_point_name: point.name,
            pickup_point_hours: point.working_hours
          },
          
          // КРИТИЧНО: fields_values по официальному формату документации
          fields_values: [
            {
              // Поле для полного адреса в shipping_address
              handle: 'shipping_address[full_locality_name]',
              value: fullAddress,
              name: 'Полный адрес доставки'
            },
            {
              // Поле для заполнения адреса в UI (по документации InSales)
              handle: 'shipping_address[address]',
              value: point.address,
              name: 'Адрес доставки'
            },
            {
              // Альтернативный формат поля адреса
              handle: 'shipping_address_address',
              value: point.address
            },
            {
              // Дополнительное поле с полным адресом
              handle: 'full_locality_name',
              value: fullAddress
            },
            {
              // Простое поле адреса
              handle: 'address',
              value: fullAddress
            },
            {
              // Поле с ID pickup point
              handle: 'pickup_point_id',
              value: point.id.toString()
            },
            {
              // Поле с названием pickup point
              handle: 'pickup_point_name',
              value: point.name
            },
            {
              // Поле с городом
              handle: 'city',
              value: point.city
            },
            {
              // Поле со страной
              handle: 'country',
              value: 'Беларусь'
            },
            {
              // Поле с рабочими часами
              handle: 'pickup_point_hours',
              value: point.working_hours
            }
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

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

// === ЗАГРУЗКА ЦЕН ИЗ ФАЙЛОВ ===

// Цены для курьерской доставки
let courierPricing = null;
function loadCourierPricing() {
  try {
    const filePath = path.join(__dirname, 'courier-pricing.json');
    const data = fs.readFileSync(filePath, 'utf8');
    courierPricing = JSON.parse(data);
    console.log('✅ Цены курьерской доставки загружены');
    return true;
  } catch (error) {
    console.error('Ошибка загрузки цен курьерской доставки:', error);
    // Fallback
    courierPricing = {
      currency: 'BYN',
      delivery_days: { min: 1, max: 2, description: '1-2 дня' },
      weight_pricing: [
        { max_weight: 1, price: 12.90 },
        { max_weight: 2, price: 14.70 },
        { max_weight: 3, price: 16.40 },
        { max_weight: 5, price: 18.20 },
        { max_weight: 10, price: 21.60 },
        { max_weight: 15, price: 25.40 },
        { max_weight: 20, price: 28.90 },
        { max_weight: 25, price: 32.10 },
        { max_weight: 30, price: 33.80 },
        { max_weight: 35, price: 36.10 },
        { max_weight: 40, price: 38.50 },
        { max_weight: 45, price: 40.60 },
        { max_weight: 50, price: 42.80 }
      ]
    };
    return false;
  }
}

// Цены для ПВЗ
let pickupPricing = null;
function loadPickupPricing() {
  try {
    const filePath = path.join(__dirname, 'pickup-pricing.json');
    const data = fs.readFileSync(filePath, 'utf8');
    pickupPricing = JSON.parse(data);
    console.log('✅ Цены для ПВЗ загружены');
    return true;
  } catch (error) {
    console.error('Ошибка загрузки цен ПВЗ:', error);
    // Fallback
    pickupPricing = {
      currency: 'BYN',
      delivery_days: { min: 1, max: 2, description: '1-2 дня' },
      weight_pricing: [
        { max_weight: 5, price: 10.0 },
        { max_weight: 10, price: 12.0 },
        { max_weight: 20, price: 14.0 },
        { max_weight: 30, price: 16.0 },
        { max_weight: 35, price: 18.0 },
        { max_weight: 40, price: 20.0 },
        { max_weight: 55, price: 35.0 },
        { max_weight: 90, price: 50.0 },
        { max_weight: 120, price: 60.0 },
        { max_weight: 149, price: 70.0 },
        { max_weight: 200, price: 100.0 },
        { max_weight: 250, price: 150.0 }
      ]
    };
    return false;
  }
}

// Загружаем цены при старте
loadCourierPricing();
loadPickupPricing();

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Улучшенная функция фильтрации городов
function findBestCityMatch(inputCity, pickupPoints) {
  if (!inputCity || !inputCity.trim()) {
    return pickupPoints;
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
  
  // Точное совпадение
  let exactMatches = uniqueCities.filter(city => 
    city.toLowerCase() === cleanInput
  );
  if (exactMatches.length > 0) {
    return pickupPoints.filter(point => exactMatches.includes(point.city));
  }

  // Частичное совпадение
  let wordMatches = uniqueCities.filter(city => {
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

  // По умолчанию - основные города
  return pickupPoints.filter(point => 
    ['Минск', 'Гомель', 'Витебск', 'Могилев', 'Гродно', 'Брест'].includes(point.city)
  );
}

// Расчет стоимости доставки в ПВЗ (из файла)
function calculatePickupPrice(weight) {
  const w = weight || 0;
  
  if (!pickupPricing || !pickupPricing.weight_pricing) {
    return 10.0; // fallback
  }
  
  for (let step of pickupPricing.weight_pricing) {
    if (w <= step.max_weight) {
      return step.price;
    }
  }
  
  // Для веса больше максимального
  if (pickupPricing.oversized_pricing) {
    const lastStep = pickupPricing.weight_pricing[pickupPricing.weight_pricing.length - 1];
    const extraKg = w - lastStep.max_weight;
    return pickupPricing.oversized_pricing.base_price + (extraKg * pickupPricing.oversized_pricing.price_per_kg);
  }
  
  const lastStep = pickupPricing.weight_pricing[pickupPricing.weight_pricing.length - 1];
  return lastStep.price + Math.ceil((w - lastStep.max_weight) / 5) * 5;
}

// Расчет стоимости курьерской доставки (из файла)
function calculateCourierPrice(weight) {
  const w = weight || 0;
  
  if (!courierPricing || !courierPricing.weight_pricing) {
    return { price: 0, currency: 'BYN' };
  }
  
  for (let step of courierPricing.weight_pricing) {
    if (w <= step.max_weight) {
      return {
        price: step.price,
        currency: courierPricing.currency || 'BYN'
      };
    }
  }
  
  // Для веса больше максимального
  const lastStep = courierPricing.weight_pricing[courierPricing.weight_pricing.length - 1];
  if (lastStep) {
    const extraPrice = Math.ceil((w - lastStep.max_weight) / 5) * 3;
    return {
      price: lastStep.price + extraPrice,
      currency: courierPricing.currency || 'BYN'
    };
  }
  
  return { price: 0, currency: 'BYN' };
}

// === ОБРАБОТЧИК ЗАПРОСОВ ===

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  }

  try {
    // Парсим тело запроса
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        // Некорректный JSON
      }
    }

    const path = event.path || '';

    // === API для курьерской доставки ===
    if (path.includes('/courier') || requestBody.delivery_type === 'courier') {
      const weight = requestBody.weight || requestBody.order?.total_weight || 0;
      const calculation = calculateCourierPrice(parseFloat(weight));
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: calculation.price,
          currency: calculation.currency,
          weight: parseFloat(weight),
          delivery_days: courierPricing?.delivery_days || { min: 1, max: 2, description: '1-2 дня' },
          delivery_type: 'courier'
        })
      };
    }

    // === API для расчета ПВЗ (простой) ===
    if (path.includes('/pickup/calculate') || requestBody.delivery_type === 'pickup_calculate') {
      const weight = requestBody.weight || requestBody.order?.total_weight || 0;
      const price = calculatePickupPrice(parseFloat(weight));
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: price,
          currency: pickupPricing?.currency || 'BYN',
          weight: parseFloat(weight),
          delivery_days: pickupPricing?.delivery_days || { min: 1, max: 2, description: '1-2 дня' },
          delivery_type: 'pickup'
        })
      };
    }

    // === API для информации ===
    if (requestBody.action === 'ping' || requestBody.action === 'getCities' || 
        requestBody.ping === true || requestBody.get_cities === true) {
      
      const uniqueCities = [...new Set(pickupPoints.map(point => point.city))].sort();
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'InSales External Delivery API - Avtolayt Express',
          version: '2.2.0',
          cities: uniqueCities,
          pickup_points_count: pickupPoints.length,
          cities_count: uniqueCities.length,
          features: ['pickup_points', 'courier_delivery'],
          courier: {
            delivery_days: courierPricing?.delivery_days,
            currency: courierPricing?.currency,
            weight_grades: courierPricing?.weight_pricing?.length || 0
          },
          pickup: {
            delivery_days: pickupPricing?.delivery_days,
            currency: pickupPricing?.currency,
            weight_grades: pickupPricing?.weight_pricing?.length || 0
          }
        })
      };
    }

    // === API для ПВЗ (по умолчанию - список пунктов) ===
    const order = requestBody?.order || {};

    // Извлекаем город
    const fullLocalityName = order.shipping_address?.full_locality_name || '';
    const locationCity = order.shipping_address?.location?.city || '';
    const locationSettlement = order.shipping_address?.location?.settlement || '';
    const shippingCity = order.shipping_address?.city || '';
    
    const city = fullLocalityName || locationCity || locationSettlement || shippingCity;
    
    // Получаем вес
    const totalWeightStr = order.total_weight || '0';
    const totalWeight = parseFloat(totalWeightStr) || 0;

    // Фильтрация ПВЗ по городу
    const filteredPoints = findBestCityMatch(city, pickupPoints);

    // Формируем ответ
    const tariffs = filteredPoints.map(point => {
      const price = calculatePickupPrice(totalWeight);
      const fullAddress = point.delivery_address || `${point.address}, ${point.city}, Беларусь`;

      return {
        id: point.id,
        tariff_id: `pvz_${point.id}`,
        shipping_company_handle: 'autolight_express',
        price: price,
        currency: pickupPricing?.currency || 'BYN',
        title: `${point.name} ${point.address}`,
        description: `(${point.working_hours})`,
        delivery_interval: pickupPricing?.delivery_days || { min: 1, max: 2 },
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
          { handle: 'shipping_address[full_locality_name]', value: fullAddress, name: 'Полный адрес' },
          { handle: 'shipping_address[address]', value: point.address, name: 'Адрес' },
          { handle: 'pickup_point_id', value: point.id.toString() },
          { handle: 'pickup_point_name', value: point.name },
          { handle: 'city', value: point.city },
          { handle: 'pickup_point_hours', value: point.working_hours }
        ]
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tariffs)
    };

  } catch (error) {
    console.error('Ошибка:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        errors: [error.message]
      })
    };
  }
};

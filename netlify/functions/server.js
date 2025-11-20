// ФИНАЛЬНАЯ ВЕРСИЯ: server_production.js
// Соответствует официальной структуре InSales API
// Решает проблему "Cannot read properties of undefined"
// Обеспечивает передачу адреса ПВЗ в shipping_address.full_locality_name

// Данные о пунктах выдачи (соответствуют официальной структуре)
const pickupPoints = [
  {
    id: 123,
    latitude: 53.9049,
    longitude: 27.5615,
    shipping_company_handle: 'autolight_express',
    price: 0, // Базовая цена, будет рассчитываться по весу
    title: 'ПВЗ Минск - Ленина 15',
    type: 'pvz',
    address: 'Минск, ул. Ленина, 15',
    description: 'ПВЗ в торговом центре "Минск-Сити"',
    phones: ['+375-29-123-45-67'],
    payment_method: ['CASH', 'CARD', 'PREPAID']
  },
  {
    id: 124,
    latitude: 52.0512,
    longitude: 23.9278,
    shipping_company_handle: 'autolight_express',
    price: 0,
    title: 'ПВЗ Брест - Гоголя 25', 
    type: 'pvz',
    address: 'Брест, ул. Гоголя, 25',
    description: 'ПВЗ в торговом центре "Гоголь"',
    phones: ['+375-29-234-56-78'],
    payment_method: ['CASH', 'CARD', 'PREPAID']
  }
];

// Расчет стоимости по весу
function calculatePrice(weight) {
  if (weight <= 1) return 5.00;
  if (weight <= 3) return 7.00;
  if (weight <= 5) return 10.00;
  if (weight <= 10) return 15.00;
  if (weight <= 20) return 25.00;
  return 40.00;
}

// Извлечение города из адреса
function extractCityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0]?.trim() || '';
}

// Извлечение улицы из адреса
function extractStreetFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[1]?.trim() || address;
}

// CORS обработка
function handleCORS() {
  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    }
  };
}

// Основной обработчик Netlify Function
exports.handler = async (event, context) => {
  // Обработка CORS preflight запросов
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      ...handleCORS(),
      body: ''
    };
  }

  try {
    const { httpMethod, path, body } = event;

    // Парсим JSON body если он есть
    let requestBody = {};
    if (body && body.trim()) {
      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        console.log('❌ Error parsing JSON:', e);
        return {
          statusCode: 400,
          ...handleCORS(),
          body: JSON.stringify({ error: 'Invalid JSON' })
        };
      }
    }

    // Health check
    if (path === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          status: 'OK',
          message: '🚀 Автолайт Экспресс API работает!',
          timestamp: new Date().toISOString(),
          environment: 'netlify',
          version: 'production_v1',
          features: {
            pickup_points: true,
            address_transmission: true,
            weight_based_pricing: true
          }
        })
      };
    }

    // --- ОСНОВНОЙ ЭНДПОИНТ: POST /api/delivery/calculate ---
    if (path === '/api/delivery/calculate' && httpMethod === 'POST') {
      console.log('🎯 Processing POST /api/delivery/calculate');
      console.log('📄 Request Body:', requestBody);

      // Извлекаем информацию из запроса от InSales
      const order = requestBody.order || {};
      
      // Безопасное получение города
      const fullLocalityName = order.shipping_address?.full_locality_name || '';
      const locationCity = order.shipping_address?.location?.city || '';
      const shippingCity = order.shipping_address?.city || '';
      
      // Приоритет: full_locality_name > location.city > city
      const city = fullLocalityName || locationCity || shippingCity || '';
      
      // Безопасное получение веса
      const totalWeightStr = order.total_weight || '0';
      const totalWeight = parseFloat(totalWeightStr) || 0;

      console.log('🏙️ City search criteria:');
      console.log('  - full_locality_name:', fullLocalityName);
      console.log('  - location.city:', locationCity);
      console.log('  - city:', shippingCity);
      console.log('  - final city:', city);
      console.log('⚖️ Weight:', totalWeight, 'kg');

      // Фильтрация ПВЗ по городу
      let filteredPoints = pickupPoints;
      if (city && city.trim()) {
        console.log('🔍 Filtering by city:', city);
        
        const cityNameToMatch = city.toLowerCase().trim();
        filteredPoints = pickupPoints.filter(point => {
          const pointCity = extractCityFromAddress(point.address).toLowerCase();
          
          // Гибкое сравнение городов
          const matches = cityNameToMatch.includes(pointCity) || 
                         pointCity.includes(cityNameToMatch) ||
                         cityNameToMatch === pointCity;
          
          console.log(`🔍 ${point.title}: "${pointCity}" matches "${cityNameToMatch}": ${matches}`);
          return matches;
        });
      }

      console.log('📍 Found pickup points:', filteredPoints.length);

      // Формируем результат в соответствии с официальной структурой
      const result = filteredPoints.map(point => {
        const price = calculatePrice(totalWeight);
        const pointCity = extractCityFromAddress(point.address);
        const pointStreet = extractStreetFromAddress(point.address);
        
        console.log('🏠 Processing:', point.title);
        console.log('  - Address:', point.address);
        console.log('  - Full address for shipping_address:', point.address);
        console.log('  - Calculated price:', price);

        return {
          // Обязательные поля согласно официальной структуре
          id: point.id,
          latitude: point.latitude,
          longitude: point.longitude,
          shipping_company_handle: point.shipping_company_handle,
          price: price,
          title: point.title,
          type: point.type,
          address: point.address,
          description: point.description,
          phones: point.phones,
          payment_method: point.payment_method,
          
          // Интервал доставки
          delivery_interval: {
            min_days: 1,
            max_days: 1,
            description: '1 день'
          },
          
          // ДОПОЛНИТЕЛЬНО: shipping_address для InSales
          // ЭТО КЛЮЧЕВОЕ ПОЛЕ для передачи адреса ПВЗ в "Адрес доставки"
          shipping_address: {
            // Это поле InSales использует для заполнения "Адреса доставки"
            full_locality_name: point.address, // "Минск, ул. Ленина, 15"
            address: pointStreet,              // "ул. Ленина, 15"
            city: pointCity,                   // "Минск"
            country: 'Беларусь',
            // Дополнительные поля для лучшей интеграции
            latitude: point.latitude,
            longitude: point.longitude,
            pickup_point_title: point.title,
            pickup_point_description: point.description,
            pickup_point_phones: point.phones
          },
          
          // Дополнительные поля
          fields_values: [
            {
              handle: 'pickup_point_id',
              value: point.id.toString()
            },
            {
              handle: 'pickup_point_address',
              value: point.address
            },
            {
              handle: 'delivery_instructions',
              value: `ПВЗ: ${point.title}. ${point.description}. Тел: ${point.phones?.[0] || 'не указан'}`
            },
            {
              handle: 'calculated_price_byn',
              value: price.toString()
            }
          ]
        };
      });

      console.log('💰 Generated result with', result.length, 'pickup points');

      // Если ПВЗ не найдены
      if (result.length === 0) {
        return {
          statusCode: 200,
          ...handleCORS(),
          body: JSON.stringify([{
            id: 999,
            latitude: 0,
            longitude: 0,
            shipping_company_handle: 'autolight_express',
            price: 0,
            title: 'Доставка недоступна',
            type: 'pvz',
            address: `Город: ${city} - доставка недоступна`,
            description: `К сожалению, пункты выдачи недоступны в городе: ${city}. Обратитесь в службу поддержки.`,
            phones: [],
            payment_method: [],
            delivery_interval: {
              min_days: 0,
              max_days: 0,
              description: 'Доставка недоступна'
            },
            shipping_address: {
              full_locality_name: `Город: ${city} - доставка недоступна`,
              address: 'Доставка недоступна',
              city: city,
              country: 'Беларусь'
            },
            fields_values: [
              {
                handle: 'delivery_unavailable',
                value: 'true'
              },
              {
                handle: 'requested_city',
                value: city
              }
            ]
          }])
        };
      }

      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify(result)
      };
    }

    // Эндпоинт для получения списка ПВЗ
    if (path === '/pickup-points' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          pickup_points: pickupPoints.map(point => ({
            id: point.id,
            latitude: point.latitude,
            longitude: point.longitude,
            shipping_company_handle: point.shipping_company_handle,
            title: point.title,
            type: point.type,
            address: point.address,
            description: point.description,
            phones: point.phones,
            payment_method: point.payment_method
          }))
        })
      };
    }

    // Если маршрут не найден
    return {
      statusCode: 404,
      ...handleCORS(),
      body: JSON.stringify({
        error: 'Endpoint not found',
        path: path,
        method: httpMethod,
        available_endpoints: [
          'GET /health',
          'POST /api/delivery/calculate',
          'GET /pickup-points'
        ]
      })
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    console.error('Stack trace:', error.stack);

    return {
      statusCode: 500,
      ...handleCORS(),
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

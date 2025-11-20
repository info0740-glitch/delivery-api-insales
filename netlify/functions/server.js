// Данные о пунктах выдачи (оставляем как есть)
// Формируем массив точек самовывоза
const pickupPoints = [
  {
    id: 1,
    latitude: 53.9049,
    longitude: 27.5615,
    shipping_company_handle: 'autolight_express',
    title: 'ПВЗ Минск',
    type: 'pvz',
    address: 'Минск, ул. Ленина, 15',
    description: 'ПВЗ в торговом центре "Минск-Сити"',
    phones: ['+375-29-123-45-67'],
    payment_method: ['CASH', 'CARD'],
    
    tariffs: [
      {
        id: 'pvz_1',
        price: 5.00,
        title: 'Доставка до ПВЗ',
        delivery_interval: {
          min_days: 1,
          max_days: 1,
          description: '1 день'
        },
        fields_values: [
          {
            handle: 'pickup_point_id',
            value: '1'
          }
        ]
      }
    ]
  },
  {
    id: 2,
    latitude: 52.0512,
    longitude: 23.9278,
    shipping_company_handle: 'autolight_express',
    title: 'ПВЗ Брест',
    type: 'pvz',
    address: 'Брест, ул. Гоголя, 25',
    description: 'ПВЗ в торговом центре "Гоголь"',
    phones: ['+375-29-234-56-78'],
    payment_method: ['CASH', 'CARD'],
    
    tariffs: [
      {
        id: 'pvz_2',
        price: 5.00,
        title: 'Доставка до ПВЗ',
        delivery_interval: {
          min_days: 1,
          max_days: 1,
          description: '1 день'
        },
        fields_values: [
          {
            handle: 'pickup_point_id',
            value: '2'
          }
        ]
      }
    ]
  }
];

// Расчет стоимости по весу (оставляем как есть)
function calculatePrice(weight) {
  if (weight <= 1) return 5.00;
  if (weight <= 3) return 7.00;
  if (weight <= 5) return 10.00;
  if (weight <= 10) return 15.00;
  if (weight <= 20) return 25.00;
  return 40.00;
}

// Функция для обработки CORS preflight
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

    // Парсим JSON body если он есть (только для POST)
    let requestBody = {};
    if (body && body.trim()) {
      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        console.log('Error parsing JSON:', e);
        return {
          statusCode: 400,
          ...handleCORS(),
          body: JSON.stringify({ error: 'Invalid JSON' })
        };
      }
    }

    // Обработка маршрутов
    if (path === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          status: 'OK',
          message: 'Автолайт Экспресс API работает!',
          timestamp: new Date().toISOString(),
          environment: 'netlify'
        })
      };
    }

    // --- ОБНОВЛЕНИЕ: Обработка POST /api/delivery/calculate для v2 API ---
    if (path === '/api/delivery/calculate' && httpMethod === 'POST') {
      console.log('Handling POST /api/delivery/calculate for v2 API');
      console.log('Request Body:', requestBody);

      // Извлекаем информацию из запроса от InSales
      const order = requestBody.order;
      // Используем более надежный способ получения названия города
      const fullLocalityName = order.shipping_address?.full_locality_name || '';
      const locationCity = order.shipping_address?.location?.city || '';
      // Приоритет: сначала full_locality_name, затем location.city
      const city = fullLocalityName || locationCity;
      // total_weight может быть строкой, конвертируем
      const totalWeightStr = order.total_weight || '0';
      const totalWeight = parseFloat(totalWeightStr) || 0;

      console.log('Full Locality Name:', fullLocalityName);
      console.log('Location City:', locationCity);
      console.log('Parsed City:', city);
      console.log('Total Weight (str):', totalWeightStr);
      console.log('Total Weight (float):', totalWeight);

      // Фильтруем ПВЗ по городу
      let filteredPoints = pickupPoints;
      if (city) {
        // ИСПРАВЛЕНО: Проверяем, содержится ли название ПВЗ в строке города (например, "Минск" в "г Минск")
        const cityNameToMatch = city.toLowerCase();
        filteredPoints = pickupPoints.filter(point => {
          const pointCity = point.city.toLowerCase();
          // Проверяем, является ли точное название города частью строки full_locality_name
          // или просто точное совпадение
          return cityNameToMatch.includes(pointCity) || pointCity.includes(cityNameToMatch);
        });
      }

      console.log('Filtered Points before calculation:', filteredPoints);

      // Формируем массив тарифов для InSales v2 API
      const tariffs = filteredPoints.map(point => {
        const price = calculatePrice(totalWeight); // Рассчитываем стоимость для каждого ПВЗ

        return {
          price: price,
          currency: 'BYN', // Валюта (опционально, InSales может использовать свою)
          delivery_interval: {
            min_days: 1,
            max_days: 1,
            description: `1 день`
          },
          // ВАЖНО: tariff_id должен быть уникальным для каждого тарифа
          tariff_id: `pvz_${point.id}`, // Пример формирования ID
          shipping_company_handle: 'autolight_express', // Идентификатор вашей компании
          // ВАЖНО: title и description будут отображаться покупателю
          title: `${point.name}`, // Название ПВЗ
          description: `${point.address} (${point.working_hours})`, // Адрес и часы
          shipping_address: {
      // Обязательно передаём адрес ПВЗ в поле shipping_address
      full_locality_name: `${point.city}, ${point.address}`,
      address: point.address,
      city: point.city,
      country: 'Беларусь',
      // Дополнительные поля по необходимости
    },
    fields_values: [
      {
        handle: 'pickup_point_id',
        value: point.id.toString()
      }
    ],
          errors: [],
          warnings: []
        };
      });

      console.log('Generated tariffs:', tariffs);

      // Возвращаем массив тарифов
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify(tariffs)
      };
    }

    if (path === '/api/pickup-points' && httpMethod === 'POST') {
      const { city } = requestBody;

      let filteredPoints = pickupPoints;
      if (city && city.trim()) {
        filteredPoints = pickupPoints.filter(point =>
          point.city.toLowerCase().includes(city.toLowerCase())
        );
      }

      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          pickup_points: filteredPoints.map(point => ({
            id: point.id,
            title: point.name,
            address: point.address,
            working_hours: point.working_hours,
            phone: point.phone,
            city: point.city
          }))
        })
      };
    }

    if (path === '/api/pickup-point/calculate' && httpMethod === 'POST') {
      const { order, pickup_point_id } = requestBody;
      const totalWeight = order?.total_weight || 0;

      const price = calculatePrice(totalWeight);

      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          price: price,
          currency: 'BYN',
          delivery_days: 1,
          description: `Доставка до пункта выдачи (${totalWeight} кг)`
        })
      };
    }

    if (path === '/pickup-points' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          pickup_points: pickupPoints.map(point => ({
            id: point.id,
            title: point.name,
            address: point.address,
            working_hours: point.working_hours,
            phone: point.phone,
            city: point.city
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
          'POST /api/delivery/calculate', // <-- Теперь обрабатывает v2 API
          'POST /api/pickup-points',
          'POST /api/pickup-point/calculate',
          'GET /pickup-points'
        ]
      })
    };

  } catch (error) {
    console.error('Function error:', error);

    return {
      statusCode: 500,
      ...handleCORS(),
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

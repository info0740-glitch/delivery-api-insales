// Данные о пунктах выдачи (оставляем как есть)
const pickupPoints = [
  {
    id: 1,
    city: "Минск",
    name: "ПВЗ Минск",
    address: "ул. Ленина, 15",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-123-45-67"
  },
  {
    id: 2,
    city: "Брест",
    name: "ПВЗ Брест",
    address: "ул. Гоголя, 25",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-234-56-78"
  },
  {
    id: 3,
    city: "Витебск",
    name: "ПВЗ Витебск",
    address: "ул. Победы, 10",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-345-67-89"
  },
  {
    id: 4,
    city: "Гомель",
    name: "ПВЗ Гомель",
    address: "ул. Советская, 30",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-456-78-90"
  },
  {
    id: 5,
    city: "Гродно",
    name: "ПВЗ Гродно",
    address: "ул. Ожешко, 12",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-567-89-01"
  },
  {
    id: 6,
    city: "Барановичи",
    name: "ПВЗ Барановичи",
    address: "ул. Брестская, 5",
    working_hours: "Пн-Пт: 9:00-18:00, Сб: 10:00-16:00",
    phone: "+375-29-678-90-12"
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
          shipping_address_adress: {
      // Обязательно передаём адрес ПВЗ в поле shipping_address
      full_locality_name: `${point.city}, ${point.address}`,
      address: point.address,
      city: point.city,
      country: 'Беларусь',
      // Дополнительные поля по необходимости
    },
          fields_values: [
            {
      handle: 'pickup_point_address', // Уникальный идентификатор
      value: point.address // Значение - адрес
    },
    // --- НОВОЕ: Передаем ID ПВЗ как скрытое поле (для дополнительной информации) ---
    {
      handle: 'pickup_point_id',
      value: point.id.toString()
    }

    // ---
            // Сохраняем ID ПВЗ как доп. поле заказа (если нужно)
            // { field_id: 12345, value: point.id.toString() }, // ЗАМЕНИТЕ 12345 НА РЕАЛЬНЫЙ ID ПОЛЯ В INSALES
            // Сохраняем название ПВЗ как доп. поле заказа (если нужно)
            // { field_id: 12346, value: point.name }, // ЗАМЕНИТЕ 12346 НА РЕАЛЬНЫЙ ID ПОЛЯ В INSALES
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

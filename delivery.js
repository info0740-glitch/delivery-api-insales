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

// Функция для обработки CORS preflight (оставляем как есть)
function handleCORS() {
  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json' // Заголовок по умолчанию для JSON
    }
  };
}

// --- НОВАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ JSONP ОТВЕТА ---
function createJSONPResponse(data, callbackName) {
  // Проверяем, является ли callbackName безопасным идентификатором JavaScript
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callbackName)) {
    throw new Error('Invalid callback name');
  }
  // Возвращаем строку в формате callbackName({...});
  return `${callbackName}(${JSON.stringify(data)});`;
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
    const { httpMethod, path, body, queryStringParameters } = event;
    
    // Парсим JSON body если он есть (для POST)
    let requestBody = {};
    if (body && body.trim()) {
      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        console.log('Error parsing JSON:', e);
        requestBody = {};
      }
    }

    // --- ОБНОВЛЁННАЯ ОБРАБОТКА GET-запроса для /api/delivery/calculate (для InSales v1 API) ---
    if (path === '/api/delivery/calculate' && httpMethod === 'GET') {
      console.log('Handling GET /api/delivery/calculate from InSales v1 API');
      console.log('Query parameters:', queryStringParameters);

      // Подготавливаем ответ для InSales v1 API
      const response = {
        price: 0, // или базовая стоимость
        delivery_days: 1,
        description: "Доставка до пункта выдачи (выбор при оформлении)"
      };

      // Проверяем наличие параметра callback (JSONP)
      const callbackName = queryStringParameters?.callback;

      if (callbackName) {
        console.log('Sending JSONP response');
        try {
          // Создаем JSONP-ответ
          const jsonpBody = createJSONPResponse(response, callbackName);
          // Возвращаем с правильным Content-Type для JSONP
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/javascript', // ВАЖНО: application/javascript для JSONP
              // CORS заголовки для JSONP не обязательны, но можно оставить для безопасности
              'Access-Control-Allow-Origin': '*',
            },
            body: jsonpBody // Тело должно быть строкой
          };
        } catch (jsonpError) {
          console.error('Error creating JSONP response:', jsonpError.message);
          // Возвращаем ошибку в формате JSON, так как callback может быть неверным
          return {
            statusCode: 400, // Bad Request
            headers: {
              'Content-Type': 'application/json', // JSON для ошибки
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Invalid callback name' })
          };
        }
      } else {
        // Если callback нет, возвращаем обычный JSON (для других целей, если нужно)
        console.log('Sending JSON response (no callback)');
        return {
          statusCode: 200,
          ...handleCORS(), // Используем функцию handleCORS, но переопределяем Content-Type если нужно
          headers: {
            ...handleCORS().headers, // Берем стандартные CORS заголовки
            'Content-Type': 'application/json', // Убедимся, что Content-Type JSON
          },
          body: JSON.stringify(response)
        };
      }
    }
    
    // --- ОБНОВЛЁННАЯ ОБРАБОТКА POST-запроса для /api/delivery/calculate ---
    if (path === '/api/delivery/calculate' && httpMethod === 'POST') {
      const { order, shipping_address } = requestBody;
      const totalWeight = order?.total_weight || 0;
      
      const price = calculatePrice(totalWeight);
      const deliveryDays = totalWeight <= 5 ? 1 : 2;
      
      const response = {
        price: price,
        currency: 'BYN',
        delivery_days: deliveryDays,
        description: `Доставка курьером (${totalWeight} кг)`
      };

      // Проверяем callback и для POST (маловероятно для InSales v1, но на всякий случай)
      const callbackName = requestBody?.callback || queryStringParameters?.callback;
      if (callbackName) {
          console.log('Sending JSONP response from POST handler');
          try {
            const jsonpBody = createJSONPResponse(response, callbackName);
            return {
              statusCode: 200,
              headers: {
                  'Content-Type': 'application/javascript',
                  'Access-Control-Allow-Origin': '*',
              },
              body: jsonpBody
            };
        } catch (jsonpError) {
            console.error('Error creating JSONP response:', jsonpError.message);
            return {
              statusCode: 400,
              headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify({ error: 'Invalid callback name' })
            };
        }
      } else {
          // Возвращаем обычный JSON для POST
          return {
            statusCode: 200,
            ...handleCORS(),
            headers: {
              ...handleCORS().headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(response)
          };
      }
    }
    
    // --- Остальные обработчики остаются без изменений ---
    
    if (path === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        ...handleCORS(),
        headers: {
            ...handleCORS().headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'OK', 
          message: 'Автолайт Экспресс API работает!',
          timestamp: new Date().toISOString(),
          environment: 'netlify'
        })
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
        headers: {
            ...handleCORS().headers,
            'Content-Type': 'application/json',
        },
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
        headers: {
            ...handleCORS().headers,
            'Content-Type': 'application/json',
        },
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
        headers: {
            ...handleCORS().headers,
            'Content-Type': 'application/json',
        },
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
      headers: {
          ...handleCORS().headers,
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        path: path,
        method: httpMethod,
        available_endpoints: [
          'GET /health',
          'GET /api/delivery/calculate (supports JSONP)',
          'POST /api/delivery/calculate (supports JSONP)',
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
      headers: {
          ...handleCORS().headers,
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

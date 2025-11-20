// Данные о пунктах выдачи
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

// Расчет стоимости по весу
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
    
    // Парсим JSON body если он есть
    let requestBody = {};
    if (body && body.trim()) {
      try {
        requestBody = JSON.parse(body);
      } catch (e) {
        console.log('Error parsing JSON:', e);
        requestBody = {};
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
    
    if (path === '/api/delivery/calculate' && httpMethod === 'POST') {
      const { order, shipping_address } = requestBody;
      const totalWeight = order?.total_weight || 0;
      
      const price = calculatePrice(totalWeight);
      const deliveryDays = totalWeight <= 5 ? 1 : 2;
      
      return {
        statusCode: 200,
        ...handleCORS(),
        body: JSON.stringify({
          price: price,
          currency: 'BYN',
          delivery_days: deliveryDays,
          description: `Доставка курьером (${totalWeight} кг)`
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
          'POST /api/delivery/calculate',
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

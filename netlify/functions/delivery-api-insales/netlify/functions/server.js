const fs = require('fs');
const path = require('path');

// Функция для загрузки пунктов выдачи из JSON файла
function loadPickupPoints() {
  try {
    const filePath = path.join(__dirname, 'pickup-points.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка загрузки пунктов выдачи:', error);
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
}

const pickupPoints = loadPickupPoints();

// Улучшенная функция фильтрации городов
function findBestCityMatch(inputCity, pickupPoints) {
  if (!inputCity || !inputCity.trim()) {
    return pickupPoints;
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

exports.handler = async (event, context) => {
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
    // Обработка специальных запросов
    if (event.body) {
      const requestBody = JSON.parse(event.body);
      
      // Проверка на пинг/информационный запрос
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
      
      // Получаем вес заказа
      const totalWeightStr = order.total_weight || '0';
      const totalWeight = parseFloat(totalWeightStr) || 0;

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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tariffs)
      };
    }

    // Если нет body или не JSON
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Invalid request format',
        errors: ['Request body must be valid JSON'],
        warnings: []
      })
    };

  } catch (error) {
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
        errors: [error.message],
        warnings: []
      })
    };
  }
};

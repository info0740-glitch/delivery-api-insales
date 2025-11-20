const pickupPoints = [
  {
    id: 123,
    title: 'ПВЗ Минск - Ленина 15', 
    address: 'Минск, ул. Ленина, 15',
    price: 7
  }
];

function calculatePrice(weight) {
  if (weight <= 1) return 5.00;
  if (weight <= 3) return 7.00;
  return 10.00;
}

function extractCityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0]?.trim() || '';
}

function extractStreetFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts.slice(1).join(',').trim() || address;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const order = requestData.order || {};
    const totalWeight = parseFloat(order.total_weight) || 0;
    
    // Определяем город
    const cityName = order.shipping_address?.city || '';
    
    // Фильтрация по городу
    let filteredPoints = pickupPoints;
    if (cityName && cityName.trim()) {
      const cityNameToMatch = cityName.toLowerCase().trim();
      filteredPoints = pickupPoints.filter(point => {
        const pointCity = extractCityFromAddress(point.address).toLowerCase();
        return pointCity.includes(cityNameToMatch) || cityNameToMatch === pointCity;
      });
    }
    
    // Формирование результата с принудительной передачей адреса
    const result = filteredPoints.map(point => {
      const price = calculatePrice(totalWeight);
      const pointStreet = extractStreetFromAddress(point.address);
      
      return {
        // Основные данные ПВЗ
        id: point.id,
        price: price,
        title: point.title,
        address: point.address,
        type: 'pvz',
        
        // КЛЮЧЕВОЕ: shipping_address для автозаполнения в InSales
        shipping_address: {
          // Это поле InSales должен использовать для заполнения "Адреса доставки"
          address: pointStreet,  // "ул. Ленина, 15" - только улица и дом
          city: extractCityFromAddress(point.address),
          country: 'Беларусь',
          full_locality_name: point.address  // "Минск, ул. Ленина, 15" - полный адрес
        },
        
        // Дополнительные поля для передачи адреса
        fields_values: [
          {
            // ПРЯМАЯ привязка к HTML полю InSales
            // name="shipping_address[address]" из скриншота
            handle: 'shipping_address[address]',
            value: pointStreet
          },
          {
            handle: 'pickup_point_address',
            value: point.address
          },
          {
            handle: 'calculated_price',
            value: price.toString()
          }
        ]
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

const pickupPoints = [
  {
    id: 1,
    city: "Минск",
    name: "ПВЗ Минск - Центр",
    address: "ул. Немига, 5, ТЦ 'Столица'",
    working_hours: "Пн-Вс: 9:00-22:00",
    phone: "+375-29-123-45-67",
    coordinates: { lat: 53.9045, lng: 27.5615 },
    postal_code: "220030",
    delivery_address: "ул. Немига, 5, ТЦ 'Столица', Минск, Беларусь, 220030"
  },
  {
    id: 2,
    city: "Минск",
    name: "ПВЗ Минск - Парк Челюскинцев",
    address: "пр-т Независимости, 117",
    working_hours: "Пн-Вс: 8:00-23:00",
    phone: "+375-29-234-56-78",
    coordinates: { lat: 53.9195, lng: 27.6524 },
    postal_code: "220125",
    delivery_address: "пр-т Независимости, 117, Минск, Беларусь, 220125"
  },
  {
    id: 3,
    city: "Брест",
    name: "ПВЗ Брест - Центральный",
    address: "ул. Гоголя, 25, ТРК 'Галерея'",
    working_hours: "Пн-Вс: 10:00-22:00",
    phone: "+375-29-345-67-89",
    coordinates: { lat: 52.0976, lng: 23.7341 },
    postal_code: "224005",
    delivery_address: "ул. Гоголя, 25, ТРК 'Галерея', Брест, Беларусь, 224005"
  }
];

function calculatePrice(weight) {
  if (weight <= 1) return 5.00;
  if (weight <= 3) return 7.00;
  if (weight <= 5) return 10.00;
  if (weight <= 10) return 15.00;
  if (weight <= 20) return 25.00;
  return 40.00;
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
    const requestBody = JSON.parse(event.body);
    const { order } = requestBody;

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

    // Фильтруем ПВЗ по городу
    let filteredPoints = pickupPoints;
    if (city && city.trim()) {
      const cityNameToMatch = city.toLowerCase().trim();
      filteredPoints = pickupPoints.filter(point => {
        const pointCity = point.city.toLowerCase();
        return cityNameToMatch.includes(pointCity) || 
               pointCity.includes(cityNameToMatch) ||
               cityNameToMatch === pointCity;
      });
    }

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
        title: `${point.name}`,
        description: `${point.address} (${point.working_hours})`,
        
        // Интервал доставки
        delivery_interval: {
          min_days: 1,
          max_days: 1,
          description: `1 день`
        },
        
        // Координаты (для pickup points)
        latitude: point.coordinates?.lat || 0,
        longitude: point.coordinates?.lng || 0,
        type: 'pvz', // Тип точки выдачи
        
        // КРИТИЧНО: Правильный формат shipping_address по документации
        shipping_address: {
          // Это поле должно заполнить UI InSales
          full_locality_name: fullAddress,
          // Дополнительные поля адреса
          address: point.address,
          city: point.city,
          country: 'Беларусь',
          postal_code: point.postal_code || '',
          
          // Дополнительная информация для pickup point
          pickup_point_name: point.name,
          pickup_point_hours: point.working_hours,
          pickup_point_phone: point.phone
        },
        
        // КРИТИЧНО: fields_values по официальному формату документации
        fields_values: [
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
            // Поле для полного адреса
            handle: 'shipping_address[full_locality_name]',
            value: fullAddress
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
            // Информация о pickup point
            handle: 'pickup_point_info',
            value: `ПВЗ: ${point.name}. ${point.address}. Часы: ${point.working_hours}. Тел: ${point.phone}`
          }
        ],
        
        // Служебные поля
        phones: [point.phone || ''],
        payment_method: ['CASH', 'CARD', 'PREPAID'],
        errors: [],
        warnings: []
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

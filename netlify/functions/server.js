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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { order } = requestBody;

    // Извлекаем город
    const fullLocalityName = order.shipping_address?.full_locality_name || '';
    const locationCity = order.shipping_address?.location?.city || '';
    const shippingCity = order.shipping_address?.city || '';
    const city = fullLocalityName || locationCity || shippingCity;

    // Получаем вес
    const totalWeightStr = order.total_weight || '0';
    const totalWeight = parseFloat(totalWeightStr) || 0;

    // Фильтруем ПВЗ
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
      
      const deliveryAddress = point.delivery_address || 
                             `${point.address}, ${point.city}, Беларусь`;

      return {
        price: price,
        currency: 'BYN',
        delivery_interval: {
          min_days: 1,
          max_days: 1,
          description: `1 день`
        },
        tariff_id: `pvz_${point.id}`,
        shipping_company_handle: 'autolight_express',
        title: `${point.name}`,
        description: `${point.address} (${point.working_hours})`,
        shipping_address: {
          full_locality_name: deliveryAddress,
          address: point.address,  // КЛЮЧЕВОЕ: это поле должно заполнить UI
          city: point.city,
          country: 'Беларусь',
          postal_code: point.postal_code || '',
          phone: point.phone || '',
          latitude: point.coordinates?.lat || 0,
          longitude: point.coordinates?.lng || 0,
          pickup_point_name: point.name,
          pickup_point_hours: point.working_hours,
          pickup_point_phone: point.phone
        },
        fields_values: [
          {
            // Попытка заполнить поле через shipping_address в shipping_address
            name: 'shipping_address[address]',
            value: point.address
          },
          {
            // Поле для заполнения UI адреса
            field_id: 'shipping_address_address',
            handle: 'shipping_address[address]',
            name: 'Адрес доставки',
            value: point.address,
            human_value: point.address
          },
          {
            // Простое поле для автозаполнения
            name: 'address',
            value: point.address
          },
          {
            // Дополнительное поле с полным адресом
            name: 'full_locality_name',
            value: deliveryAddress
          },
          {
            handle: 'pickup_point_id',
            value: point.id.toString()
          },
          {
            handle: 'pickup_point_address',
            value: deliveryAddress
          },
          {
            handle: 'delivery_instructions',
            value: `Пункт выдачи: ${point.name}. Часы работы: ${point.working_hours}. Тел: ${point.phone}`
          }
        ],
        errors: [],
        warnings: []
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

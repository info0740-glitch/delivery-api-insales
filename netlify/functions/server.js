const express = require('express');
const cors = require('cors');
const app = express();

// CORS для работы с InSales
app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Автолайт Экспресс API работает!',
    timestamp: new Date().toISOString()
  });
});

// Расчет курьерской доставки
app.post('/api/delivery/calculate', (req, res) => {
  try {
    const { order, shipping_address } = req.body;
    const totalWeight = order?.total_weight || 0;
    
    const price = calculatePrice(totalWeight);
    const deliveryDays = totalWeight <= 5 ? 1 : 2;
    
    res.json({
      price: price,
      currency: 'BYN',
      delivery_days: deliveryDays,
      description: `Доставка курьером (${totalWeight} кг)`
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка расчета доставки' });
  }
});

// Список пунктов выдачи по городу
app.post('/api/pickup-points', (req, res) => {
  try {
    const { city } = req.body;
    
    let filteredPoints = pickupPoints;
    if (city) {
      filteredPoints = pickupPoints.filter(point => 
        point.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    res.json({
      pickup_points: filteredPoints.map(point => ({
        id: point.id,
        title: point.name,
        address: point.address,
        working_hours: point.working_hours,
        phone: point.phone,
        city: point.city
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения пунктов выдачи' });
  }
});

// Расчет для конкретного пункта выдачи
app.post('/api/pickup-point/calculate', (req, res) => {
  try {
    const { order, pickup_point_id } = req.body;
    const totalWeight = order?.total_weight || 0;
    
    const price = calculatePrice(totalWeight);
    
    res.json({
      price: price,
      currency: 'BYN',
      delivery_days: 1,
      description: `Доставка до пункта выдачи (${totalWeight} кг)`
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка расчета для пункта выдачи' });
  }
});

// Все пункты выдачи
app.get('/pickup-points', (req, res) => {
  res.json({
    pickup_points: pickupPoints.map(point => ({
      id: point.id,
      title: point.name,
      address: point.address,
      working_hours: point.working_hours,
      phone: point.phone,
      city: point.city
    }))
  });
});

exports.handler = async (event, context) => {
  try {
    return app(req, res);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
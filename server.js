const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Конфигурация
const CONFIG = {
    PORT: process.env.PORT || 3000,
    DATABASE_PATH: path.join(__dirname, 'data', 'pickup-points.db'),
    LOG_LEVEL: 'info'
};

// Ценообразование по весу
const WEIGHT_PRICING = {
    base_price: 5.0,          // Базовая стоимость доставки
    weight_steps: [
        { max_weight: 1, price: 5.0 },
        { max_weight: 3, price: 7.0 },
        { max_weight: 5, price: 10.0 },
        { max_weight: 10, price: 15.0 },
        { max_weight: 20, price: 25.0 },
        { max_weight: 50, price: 40.0 }
    ]
};

// Данные о пунктах выдачи (упрощенная версия для демо)
const PICKUP_POINTS_DATA = [
    {
        id: 1,
        city: "Барановичи",
        address: "г.Барановичи, ул.50 лет БССР, д.31",
        title: "СППС №10201",
        working_hours: "Пн-Сб: с 10:00 до 20:00 обед 14:00 до 14:30",
        type: "pvz",
        latitude: 53.1274,
        longitude: 26.0125,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37516312345"
    },
    {
        id: 2,
        city: "Брест",
        address: "г.Брест, ул. Советской Конституции 18",
        title: "СППС №10101",
        working_hours: "Пн-Пт: с 10:00 до 20:00, обед с 14:00 до 14:30; Сб.: с 11:00 до 17:00",
        type: "pvz",
        latitude: 52.0976,
        longitude: 23.7341,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37516212345"
    },
    {
        id: 3,
        city: "Витебск",
        address: "г.Витебск, ул.Ленинградская, 138А, корп. 5",
        title: "СППС №20101",
        working_hours: "Пн-Пт: с 10:00 до 20:00, обед с 14:00 до 14:30; Сб.: с 11:00 до 17:00",
        type: "pvz",
        latitude: 55.1904,
        longitude: 30.2049,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37521212345"
    },
    {
        id: 4,
        city: "Гомель",
        address: "г.Гомель, ул. 2-я Гражданская д.5",
        title: "СППС №30101",
        working_hours: "Пн-Пт: с 10:00 до 20:00, обед с 14:00 до 14:30; Сб.: с 11:00 до 17:00",
        type: "pvz",
        latitude: 52.4345,
        longitude: 30.9754,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37523212345"
    },
    {
        id: 5,
        city: "Гродно",
        address: "г.Гродно, ул. Горького, 91 (заезд со стороны ул.Курчатова)",
        title: "СППС №40101",
        working_hours: "Пн-Пт: с 10:00 до 20:00, обед с 14:00 до 14:30; Сб.: с 11:00 до 17:00",
        type: "pvz",
        latitude: 53.6884,
        longitude: 23.8258,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37515212345"
    },
    {
        id: 6,
        city: "Минск",
        address: "г.Минск, ул.Ленина, 12",
        title: "СППС №00101",
        working_hours: "Пн-Пт: с 09:00 до 20:00, обед с 13:00 до 14:00; Сб.: с 10:00 до 18:00",
        type: "pvz",
        latitude: 53.9006,
        longitude: 27.5590,
        shipping_company_handle: "Автолайт Экспресс",
        phone: "+37517212345"
    }
];

// Функция расчета стоимости доставки по весу
function calculateDeliveryPrice(totalWeight) {
    const weight = totalWeight || 0;
    
    for (let step of WEIGHT_PRICING.weight_steps) {
        if (weight <= step.max_weight) {
            return step.price;
        }
    }
    
    // Для веса больше максимального - фиксированная цена
    return WEIGHT_PRICING.weight_steps[WEIGHT_PRICING.weight_steps.length - 1].price + 
           Math.ceil((weight - WEIGHT_PRICING.weight_steps[WEIGHT_PRICING.weight_steps.length - 1].max_weight) / 5) * 5;
}

// Расчет времени доставки
function calculateDeliveryDays(city) {
    const baseDeliveryDays = 2; // базовое время доставки в днях
    
    // Сокращение времени для крупных городов
    if (['Минск', 'Брест', 'Гомель'].includes(city)) {
        return { min_days: 1, max_days: 2 };
    }
    
    return { min_days: baseDeliveryDays, max_days: baseDeliveryDays + 1 };
}

// POST /api/delivery/calculate - расчет стоимости доставки (для курьерской доставки)
app.post('/api/delivery/calculate', (req, res) => {
    try {
        const { order, address } = req.body;
        
        // Валидация входных данных
        if (!order || !address) {
            return res.status(400).json({
                errors: ['Отсутствуют данные заказа или адреса']
            });
        }

        const totalWeight = order.total_weight || 0;
        const price = calculateDeliveryPrice(totalWeight);
        const deliveryDays = calculateDeliveryDays(address.city || address.full_locality_name);

        const response = [{
            price: price,
            delivery_interval: deliveryDays,
            shipping_company_handle: 'autolight_express',
            title: 'Автолайт Экспресс',
            description: `Доставка в ${address.city || address.full_locality_name}`,
            tariff_id: 'standard_delivery',
            fields_values: [],
            warnings: []
        }];

        res.json(response);
    } catch (error) {
        console.error('Ошибка расчета доставки:', error);
        res.status(500).json({
            errors: ['Ошибка сервера при расчете доставки']
        });
    }
});

// POST /api/pickup-points - получение списка пунктов выдачи
app.post('/api/pickup-points', (req, res) => {
    try {
        const { order, address } = req.body;
        
        // Фильтрация по городам (если указан город в адресе)
        let filteredPoints = PICKUP_POINTS_DATA;
        
        if (address && address.city) {
            filteredPoints = PICKUP_POINTS_DATA.filter(point => 
                point.city.toLowerCase().includes(address.city.toLowerCase()) ||
                address.city.toLowerCase().includes(point.city.toLowerCase())
            );
        }

        // Преобразование в формат InSales
        const response = filteredPoints.map(point => {
            const totalWeight = order?.total_weight || 0;
            const price = calculateDeliveryPrice(totalWeight);
            const deliveryDays = calculateDeliveryDays(point.city);

            return {
                id: point.id,
                latitude: point.latitude,
                longitude: point.longitude,
                shipping_company_handle: point.shipping_company_handle,
                price: price,
                title: point.title,
                type: point.type,
                address: point.address,
                description: `${point.city} - ${point.title}`,
                phones: [point.phone],
                delivery_interval: deliveryDays,
                fields_values: [],
                payment_method: ['CASH', 'CARD', 'PREPAID'],
                tariffs: [{
                    id: 'standard_pickup',
                    price: price,
                    title: 'Стандартная доставка',
                    delivery_interval: deliveryDays,
                    fields_values: []
                }]
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Ошибка получения пунктов выдачи:', error);
        res.status(500).json({
            errors: ['Ошибка сервера при получении пунктов выдачи']
        });
    }
});

// POST /api/pickup-point/calculate - расчет стоимости для выбранного пункта
app.post('/api/pickup-point/calculate', (req, res) => {
    try {
        const { point_id, order } = req.body;
        
        if (!point_id) {
            return res.status(400).json({
                errors: ['Не указан ID пункта выдачи']
            });
        }

        const point = PICKUP_POINTS_DATA.find(p => p.id == point_id);
        
        if (!point) {
            return res.status(404).json({
                errors: ['Пункт выдачи не найден']
            });
        }

        const totalWeight = order?.total_weight || 0;
        const price = calculateDeliveryPrice(totalWeight);
        const deliveryDays = calculateDeliveryDays(point.city);

        const response = {
            price: price,
            delivery_interval: deliveryDays,
            shipping_company_handle: point.shipping_company_handle,
            title: point.title,
            description: `${point.city} - ${point.title}`,
            address: point.address,
            working_hours: point.working_hours,
            fields_values: [],
            tariff_id: 'pickup_delivery',
            payment_method: ['CASH', 'CARD', 'PREPAID']
        };

        res.json(response);
    } catch (error) {
        console.error('Ошибка расчета стоимости пункта выдачи:', error);
        res.status(500).json({
            errors: ['Ошибка сервера при расчете стоимости пункта']
        });
    }
});

// GET /health - проверка состояния сервиса
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Delivery API Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        pickup_points_count: PICKUP_POINTS_DATA.length,
        weight_pricing: WEIGHT_PRICING
    });
});

// GET /pickup-points - тестовый endpoint для получения всех пунктов выдачи
app.get('/pickup-points', (req, res) => {
    res.json({
        points: PICKUP_POINTS_DATA,
        total: PICKUP_POINTS_DATA.length
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.json({
        service: 'External Delivery API Service for InSales',
        version: '1.0.0',
        endpoints: {
            'POST /api/delivery/calculate': 'Расчет стоимости курьерской доставки',
            'POST /api/pickup-points': 'Получение списка пунктов выдачи',
            'POST /api/pickup-point/calculate': 'Расчет стоимости для пункта выдачи',
            'GET /health': 'Проверка состояния сервиса',
            'GET /pickup-points': 'Все пункты выдачи (для тестирования)'
        },
        weight_pricing: WEIGHT_PRICING
    });
});

// Middleware для обработки 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint не найден',
        available_endpoints: [
            'POST /api/delivery/calculate',
            'POST /api/pickup-points',
            'POST /api/pickup-point/calculate',
            'GET /health',
            'GET /pickup-points',
            'GET /'
        ]
    });
});

// Middleware для обработки ошибок
app.use((error, req, res, next) => {
    console.error('Непредвиденная ошибка:', error);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так'
    });
});

// Запуск сервера
app.listen(CONFIG.PORT, () => {
    console.log(`🚀 Delivery API Service запущен на порту ${CONFIG.PORT}`);
    console.log(`📡 Тестовый URL: http://localhost:${CONFIG.PORT}`);
    console.log(`🏥 Health check: http://localhost:${CONFIG.PORT}/health`);
    console.log(`📍 Pickup points: http://localhost:${CONFIG.PORT}/pickup-points`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен SIGTERM, завершаем сервер...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Получен SIGINT, завершаем сервер...');
    process.exit(0);
});
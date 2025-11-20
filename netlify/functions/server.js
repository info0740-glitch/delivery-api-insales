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

// Получение общего веса заказа из order_lines
function getTotalWeight(order) {
if (!order || !order.order_lines || !Array.isArray(order.order_lines)) {
console.log('❌ Не найдены order_lines в заказе');
return 0;
}

let totalWeight = 0;
order.order_lines.forEach(line => {
if (line.weight) {
const weight = parseFloat(line.weight) || 0;
const quantity = line.quantity || 1;
totalWeight += weight * quantity;
console.log(`📦 Товар: ${line.title}, вес: ${weight}кг × количество: ${quantity} = ${weight * quantity}кг`);
}
});

console.log(`🏋️ Общий вес заказа: ${totalWeight}кг`);
return totalWeight;
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

// ГЛАВНЫЙ ENDPOINT - исправленное извлечение веса
if (path === '/api/delivery/calculate' && httpMethod === 'POST') {
console.log('📋 Получен запрос на расчет доставки:', requestBody);

const { order, shipping_address } = requestBody;
const totalWeight = getTotalWeight(order); // ✅ Исправленная функция

if (totalWeight === 0) {
console.log('⚠️ Вес заказа не найден, используем вес по умолчанию: 1кг');
}

const finalWeight = totalWeight || 1; // Минимум 1кг если вес не найден
const price = calculatePrice(finalWeight);
const deliveryDays = finalWeight <= 5 ? 1 : 2;

console.log(`💰 Расчет: ${finalWeight}кг = ${price} BYN, срок: ${deliveryDays} дн.`);

return {
statusCode: 200,
...handleCORS(),
body: JSON.stringify({
success: true,
price: price,
currency: 'BYN',
delivery_days: deliveryDays,
description: `Доставка курьером (${finalWeight} кг)`,
total_weight: finalWeight,
points: pickupPoints.map(point => ({
id: point.id,
name: point.name,
address: point.address,
working_hours: point.working_hours,
phone: point.phone,
city: point.city,
delivery_price: price // ✅ Добавляем стоимость для каждого пункта
}))
})
};
}

// Поддержка старого пути /api/calculate для совместимости
if (path === '/api/calculate' && httpMethod === 'POST') {
console.log('📋 Получен запрос на расчет доставки (старая версия):', requestBody);

const { city, weight } = requestBody;
const finalWeight = weight || 1;
const price = calculatePrice(finalWeight);
const deliveryDays = finalWeight <= 5 ? 1 : 2;

const filteredPoints = city ? 
pickupPoints.filter(point => point.city.toLowerCase().includes(city.toLowerCase())) :
pickupPoints;

return {
statusCode: 200,
...handleCORS(),
body: JSON.stringify({
success: true,
price: price,
currency: 'BYN',
delivery_days: deliveryDays,
description: `Доставка до пункта выдачи (${finalWeight} кг)`,
total_weight: finalWeight,
points: filteredPoints.map(point => ({
id: point.id,
name: point.name,
address: point.address,
working_hours: point.working_hours,
phone: point.phone,
city: point.city,
delivery_price: price // ✅ Добавляем стоимость для каждого пункта
}))
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
success: true,
points: filteredPoints.map(point => ({
id: point.id,
title: point.name,
address: point.address,
working_hours: point.working_hours,
phone: point.phone,
city: point.city,
delivery_price: calculatePrice(1) // Базовая стоимость
}))
})
};
}

if (path === '/api/pickup-point/calculate' && httpMethod === 'POST') {
const { order, pickup_point_id } = requestBody;
const totalWeight = getTotalWeight(order);
const price = calculatePrice(totalWeight || 1);

return {
statusCode: 200,
...handleCORS(),
body: JSON.stringify({
success: true,
price: price,
currency: 'BYN',
delivery_days: 1,
description: `Доставка до пункта выдачи (${totalWeight || 1} кг)`,
total_weight: totalWeight || 1
})
};
}

if (path === '/pickup-points' && httpMethod === 'GET') {
return {
statusCode: 200,
...handleCORS(),
body: JSON.stringify({
success: true,
points: pickupPoints.map(point => ({
id: point.id,
title: point.name,
address: point.address,
working_hours: point.working_hours,
phone: point.phone,
city: point.city,
delivery_price: calculatePrice(1)
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
'POST /api/calculate',
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

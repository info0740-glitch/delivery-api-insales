# Система управления пунктами выдачи и ценами доставки

## Описание

Эта система предназначена для управления:
- **Пунктами выдачи заказов (ПВЗ)** для службы доставки Avtolayt Express
- **Ценами на доставку** (курьерская и в ПВЗ)

Данные хранятся в отдельных JSON файлах, что упрощает обновление и поддержку без изменения кода.

## 📁 Структура файлов

### Основные файлы данных

| Файл | Описание | Формат |
|------|----------|--------|
| `pickup-points.json` | Данные о пунктах выдачи | JSON массив |
| `courier-pricing.json` | Цены курьерской доставки | JSON объект |
| `pickup-pricing.json` | Цены доставки в ПВЗ | JSON объект |

### Системные файлы

| Файл | Описание |
|------|----------|
| `server.js` | Основной серверный файл (Netlify Function) |
| `pickup-points-data.js` | Модуль с данными ПВЗ (embedded) |
| `sync-pickup-points.js` | Синхронизация с HTML файлом |
| `clean-json.js` | Очистка JSON от лишних полей |

### Тестовые файлы (не деплоятся)

| Файл | Описание |
|------|----------|
| `test-local.js` | Базовые тесты |
| `test-extended.js` | Расширенные тесты |
| `run-tests.js` | Запуск всех тестов |
| `prepare-and-test.js` | Подготовка и тестирование |
| `TESTING.md` | Документация по тестированию |

## 💰 Файлы цен

### courier-pricing.json

Цены для **курьерской доставки** (дверь-дверь):

```json
{
  "description": "Цены для курьерской доставки",
  "currency": "BYN",
  "delivery_days": {
    "min": 1,
    "max": 2,
    "description": "1-2 дня"
  },
  "weight_pricing": [
    { "max_weight": 1, "price": 12.90 },
    { "max_weight": 2, "price": 14.70 },
    { "max_weight": 3, "price": 16.40 },
    { "max_weight": 5, "price": 18.20 },
    { "max_weight": 10, "price": 21.60 },
    { "max_weight": 15, "price": 25.40 },
    { "max_weight": 20, "price": 28.90 },
    { "max_weight": 25, "price": 32.10 },
    { "max_weight": 30, "price": 33.80 },
    { "max_weight": 35, "price": 36.10 },
    { "max_weight": 40, "price": 38.50 },
    { "max_weight": 45, "price": 40.60 },
    { "max_weight": 50, "price": 42.80 }
  ],
  "oversized_pricing": {
    "base_price": 42.80,
    "price_per_kg": 0.85
  }
}
```

### pickup-pricing.json

Цены для **доставки в ПВЗ**:

```json
{
  "description": "Цены для доставки в пункты выдачи",
  "currency": "BYN",
  "delivery_days": {
    "min": 1,
    "max": 2,
    "description": "1-2 дня"
  },
  "weight_pricing": [
    { "max_weight": 5, "price": 10.0 },
    { "max_weight": 10, "price": 12.0 },
    { "max_weight": 20, "price": 14.0 },
    { "max_weight": 30, "price": 16.0 },
    { "max_weight": 35, "price": 18.0 },
    { "max_weight": 40, "price": 20.0 },
    { "max_weight": 55, "price": 35.0 },
    { "max_weight": 90, "price": 50.0 },
    { "max_weight": 120, "price": 60.0 },
    { "max_weight": 149, "price": 70.0 },
    { "max_weight": 200, "price": 100.0 },
    { "max_weight": 250, "price": 150.0 }
  ],
  "oversized_pricing": {
    "base_price": 150.0,
    "price_per_kg": 0.50
  }
}
```

## 🔧 Работа с данными

### 1. Обновление цен

**⚡ Обновления применяются немедленно без перезагрузки сервера!**

Просто отредактируйте соответствующий JSON файл:

```bash
# Отредактируйте файл
nano courier-pricing.json

# Измените нужные цены, сохраните
# Изменения применятся при следующем запросе
```

**Как это работает:**
- Цены загружаются из JSON файла **при каждом запросе**
- Нет необходимости в перезагрузке сервера
- Fallback цены используются только если файл недоступен

### 2. Синхронизация ПВЗ с HTML

Если есть обновленный HTML файл с ПВЗ:

```bash
node sync-pickup-points.js
```

Скрипт автоматически:
- Парсит HTML файл
- Сравнивает с текущими данными
- Добавляет новые пункты
- Сортирует по ID

### 3. Добавление ПВЗ вручную

Отредактируйте `pickup-points.json`:

```json
{
  "id": 99999,
  "city": "Новый Город",
  "name": "СППС №99999",
  "address": "г. Новый Город, ул. Примерная, д.1",
  "working_hours": "Пн-Пт: с 10:00 до 18:00",
  "delivery_address": "г. Новый Город, ул. Примерная, д.1, Беларусь"
}
```

## 🔄 Система загрузки данных

### Динамическая загрузка (v2.3.0+)

Все данные загружаются свежими при каждом запросе:

```javascript
// Цены курьерской доставки
const courierPricing = loadCourierPricing();

// Цены ПВЗ
const pickupPricing = loadPickupPricing();

// Пункты выдачи
const pickupPoints = loadPickupPoints();
```

**Преимущества:**
✅ Изменения в JSON применяются немедленно
✅ Нет кеширования в памяти
✅ Автоматический fallback на дефолтные значения
✅ Логирование всех загрузок

### Порядок загрузки данных

1. **Пункты выдачи (pickup-points.json):**
   - Сначала пробует загрузить встроенный модуль `pickup-points-data.js`
   - Если не получится, загружает из JSON файла
   - При ошибке возвращает пустой массив

2. **Цены доставки:**
   - Загружает из JSON файла (courier-pricing.json / pickup-pricing.json)
   - При ошибке использует дефолтные значения из кода
   - Логирует результат в консоль

## 📡 API Endpoints

### Курьерская доставка

```bash
# Расчет стоимости (простой)
POST /courier
Body: { "weight": 2.5 }

# Или с типом доставки
POST /
Body: { "delivery_type": "courier", "weight": 2.5 }
```

Ответ:
```json
{
  "price": 14.70,
  "currency": "BYN",
  "weight": 2.5,
  "delivery_days": { "min": 1, "max": 2, "description": "1-2 дня" },
  "delivery_type": "courier"
}
```

### Доставка в ПВЗ

```bash
# Расчет стоимости (простой)
POST /pickup/calculate
Body: { "weight": 2.5 }

# Список ПВЗ
POST /
Body: {
  "order": { "total_weight": 1.5 },
  "address": { "city": "Минск" }
}
```

### Информация

```bash
# Проверка работы
POST /
Body: { "action": "ping" }

Ответ:
{
  "success": true,
  "version": "2.2.0",
  "features": ["pickup_points", "courier_delivery"],
  "courier": { "weight_grades": 13 },
  "pickup": { "weight_grades": 12 }
}
```

## 🧪 Тестирование

### Перед деплоем на Netlify

```bash
# Запуск всех тестов
node run-tests.js

# Или по отдельности
node test-local.js      # Базовые тесты
node test-extended.js   # Расширенные тесты
```

### Скрипты запуска

```bash
# Windows
run-tests.bat

# Linux/Mac
./run-tests.sh
```

## 🚀 Деплой на Netlify

### Файлы для деплоя (обязательные)

- `server.js` - основной файл API
- `pickup-points.json` - данные ПВЗ
- `courier-pricing.json` - цены курьерской доставки
- `pickup-pricing.json` - цены ПВЗ
- `pickup-points-data.js` - embedded данные (fallback)

### Игнорируемые файлы (.netlifyignore)

```
test-local.js
test-extended.js
run-tests.js
prepare-and-test.js
run-tests.bat
run-tests.sh
TESTING.md
README.md
```

### Настройка netlify.toml

```toml
[build]
  publish = "."
  
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server"
  status = 200
```

## 📝 Формат данных

### Пункт выдачи (pickup-points.json)

```json
{
  "id": 10201,
  "city": "Барановичи",
  "name": "СППС №10201",
  "address": "г.Барановичи, ул.50 лет БССР, д.31",
  "working_hours": "Пн-Сб: с 10:00 до 20:00 обед 14:00 до 14:30",
  "delivery_address": "г.Барановичи, ул.50 лет БССР, д.31, Беларусь"
}
```

Поля:
- `id` - уникальный идентификатор
- `city` - город
- `name` - название пункта
- `address` - адрес для отображения
- `working_hours` - режим работы
- `delivery_address` - полный адрес для доставки

## 🔍 Отладка

### Локальная проверка

```bash
# Проверка загрузки данных
node -e "
const fs = require('fs');
const courier = JSON.parse(fs.readFileSync('courier-pricing.json'));
const pickup = JSON.parse(fs.readFileSync('pickup-pricing.json'));
console.log('Курьер:', courier.weight_pricing.length, 'градаций');
console.log('ПВЗ:', pickup.weight_pricing.length, 'градаций');
"
```

### Проверка функции

```bash
# Установить netlify-cli
npm install -g netlify-cli

# Локальный запуск
netlify dev

# Тестирование
curl http://localhost:8888/api/courier \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"weight": 2.5}'
```

## 🆘 Устранение неполадок

### Проблема: Цены не обновились после изменения JSON

**Решение:**
1. Проверьте JSON валидатором (должен быть корректный JSON)
2. Убедитесь, что файл сохранен (Ctrl+S)
3. Сделайте новый запрос к API
4. Проверьте логи консоли - должно быть ✅ сообщение о загрузке

**Если все еще не работает:**
- Проверьте консоль Netlify на ошибки загрузки
- Убедитесь, что JSON файл не пуст
- Проверьте синтаксис JSON на [jsonlint.com](https://www.jsonlint.com/)

### Проблема: ПВЗ не найдены

**Решение:**
1. Проверьте формат города в запросе
2. Убедитесь, что pickup-points.json загружен
3. Проверьте кодировку файла (должна быть UTF-8)
4. Сделайте ping запрос: `{"action": "ping"}` - должны появиться города

### Проблема: Используются дефолтные цены вместо JSON

**Это может означать:**
- JSON файл недоступен на диске
- JSON файл не валиден (ошибка синтаксиса)
- Файловая система в режиме read-only

**Решение:**
1. Проверьте валидность JSON
2. Убедитесь, что файл существует в функции functions/
3. Проверьте логи Netlify (будет ⚠️ warning сообщение)

### Проблема: Ошибка 500

**Решение:**
1. Проверьте логи Netlify Functions
2. Убедитесь, что все JSON файлы валидны
3. Проверьте структуру входящих запросов
4. Убедитесь, что pickupPoints не null (ping запрос покажет это)

## 📊 История изменений

### v2.3.0 ✨ (текущая версия)
- **Динамическая загрузка данных** - все данные загружаются при каждом запросе
- Изменения в JSON применяются немедленно без перезагрузки сервера
- Улучшено логирование загрузки данных
- Исправлено: дефолтные цены теперь используются только как fallback
- Добавлена проверка пустого массива пунктов выдачи

### v2.2.0
- Добавлен отдельный файл цен для ПВЗ
- Упрощен API (только вес для расчета)
- Встроенный модуль pickup-points-data.js для надежности

### v2.1.0
- Добавлена курьерская доставка
- Цены вынесены в JSON файлы

### v2.0.0
- Netlify Functions версия
- Поддержка InSales API v2

### v1.0.0
- Базовая версия с ПВЗ

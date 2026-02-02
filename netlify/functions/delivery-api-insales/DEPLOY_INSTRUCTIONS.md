# Инструкция по деплою после исправления ошибки

## Внесённые исправления

### Проблема
Ошибка `Cannot read properties of undefined (reading 'shipping_address')` возникала из-за отсутствия проверок на `undefined` при обращении к вложенным свойствам объекта `orderData`.

### Исправленные файлы

1. **netlify/functions/delivery-api-insales/netlify/functions/server.js** (строка 162)
   - Было: `const { order } = requestBody;`
   - Стало: `const order = requestBody?.order || {};`

2. **netlify/functions/delivery-api-insales/delivery.js**
   - Добавлена валидация `orderData` и `orderData.order` (строки 229-238)
   - Добавлен optional chaining для `orderData?.order?.total_weight` (строка 320)
   - Добавлен optional chaining для `orderData?.order?.order_lines` (строка 328)

## Способы деплоя

### Способ 1: GitHub Actions (автоматический)
1. Загрузите изменения в репозиторий GitHub
2. GitHub Actions автоматически запустит деплой

### Способ 2: Netlify CLI (альтернативная версия)
```bash
# Установка конкретной версии Netlify CLI
npm install -g netlify-cli@17.2.2

# Деплой
cd netlify/functions/delivery-api-insales
netlify deploy --prod --dir=.
```

### Способ 3: Ручной деплой через веб-интерфейс
1. Перейдите на https://app.netlify.com
2. Выберите ваш сайт "insales-delivery-api"
3. Перетащите папку `netlify/functions/delivery-api-insales` в область деплоя
4. Нажмите "Deploy site"

### Способ 4: Через Netlify Dashboard
1. Войдите в https://app.netlify.com
2. Выберите сайт "insales-delivery-api"
3. Перейдите в "Deploys"
4. Нажмите "Trigger deploy" → "Deploy site"

## Проверка после деплоя

Выполните тестовый запрос:
```bash
curl -k -X POST https://insales-delivery-api.netlify.app/api/pickup-points \
  -H "Content-Type: application/json" \
  -d '{"order":{"shipping_address":{"city":"Минск"}}}'
```

Ожидаемый ответ: массив тарифов с пунктами выдачи

## Устранение неполадок

Если ошибка всё ещё появляется:
1. Очистите кэш браузера (Ctrl+F5)
2. Проверьте, что депой завершён успешно в Netlify Dashboard
3. Убедитесь, что используете правильный URL: `https://insales-delivery-api.netlify.app`

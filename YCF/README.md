# InSales Delivery API — Yandex Cloud Functions

API доставки для InSales. Рассчитывает стоимость и сроки курьерской доставки до двери и в пункты выдачи заказов (ПВЗ) по Беларуси.

## Архитектура

```
YCF API Gateway → index.js → server.js
                          ↓
                    data-loader.js ← s3-client.js ← Yandex Object Storage
```

- **`index.js`** — обёртка Yandex Cloud Functions. Преобразует YCF-формат событий в Netlify-формат.
- **`server.js`** — вся бизнес-логика: кеширование, расчёт цен, дат, надбавок.
- **`data-loader.js`** — загрузка справочников Автолайта (`autolight-cities.json`, `autolight-postoffices.json`) из Yandex Object Storage.
- **`s3-client.js`** — AWS SDK v3 клиент для чтения из приватного бакета Yandex Object Storage.
- **`checkout.liquid`** — фронтенд-шаблон чекаута InSales (не трогается бэкендом).

## Эндпоинты

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/courier-door` | Курьер до двери |
| POST | `/api/pickup-points` | ПВЗ (виджет товара + чекаут) |

## Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `YCF_DATA_BUCKET` | Имя бакета Yandex Object Storage со справочниками Автолайта (`autolight-cities.json`, `autolight-postoffices.json`). Если не задан — используется `OVERRIDE_BUCKET` | Нет (но должен быть задан один из двух) |
| `OVERRIDE_BUCKET` | Имя бакета Yandex Object Storage для `peak-override.json`; используется как fallback для справочников | Нет |
| `CITIES_JSON_KEY` | Имя файла со справочником городов (по умолчанию `autolight-cities.json`) | Нет |
| `POSTOFFICES_JSON_KEY` | Имя файла со справочником ПВЗ (по умолчанию `autolight-postoffices.json`) | Нет |
| `AWS_ACCESS_KEY_ID` | Static key ID сервисного аккаунта для чтения из приватного бакета | Да (если бакет не публичный) |
| `AWS_SECRET_ACCESS_KEY` | Static key secret сервисного аккаунта для чтения из приватного бакета | Да (если бакет не публичный) |

Бакет остаётся **приватным**. Для чтения справочников и override используется AWS SDK v3 с static credentials сервисного аккаунта.

## Динамическая наценка (peak surcharge)

Для малых заказов применяется наценка в зависимости от времени недели:

| Сумма заказа | Надбавка в пик | Надбавка в спад |
|--------------|----------------|-----------------|
| < 50 BYN | +10 BYN | 0 |
| 50–80 BYN | +5 BYN | 0 |
| ≥ 80 BYN | 0 | 0 |

**Пиковый период:** с 12:00 пятницы до 13:00 вторника.  
   Непиковый день заканчивается в субботу 12:00; после 12:00 субботы начинается пик.  
**Спад:** всё остальное время.

Время определяется по локальному времени клиента (`utc_offset` из тела запроса или geoip-заголовков).

### Ручной override через Object Storage

В бакете Yandex Object Storage хранится файл `peak-override.json`. Оператор может принудительно включить или выключить пик вне зависимости от дня недели.

```json
{
  "force_peak_until": "2026-05-24T23:59:59+03:00",
  "force_off_until": null,
  "reason": "склад перегружен"
}
```

**Приоритет:** `force_off_until` > `force_peak_until` > автоматический расчёт по времени.

### Управление override: скрипт

```bash
# Принудительно включить пик до 30 мая
node scripts/override.js peak "склад перегружен" 2026-05-30

# Принудительно выключить пик до 22 мая (промо)
node scripts/override.js off "промо-неделя" 2026-05-22

# Вернуть автоматический режим
node scripts/override.js auto

# Посмотреть текущий override
node scripts/override.js status
```

**Требования к скрипту:**
- AWS CLI, настроенный для Yandex Cloud (`aws configure`)
- Переменная `OVERRIDE_BUCKET` в окружении

### Альтернатива: ручная загрузка

```bash
aws s3 cp peak-override.json s3://$OVERRIDE_BUCKET/peak-override.json \
  --endpoint-url=https://storage.yandexcloud.net
```

### Задержка применения

После загрузки нового override:
- in-memory кеш в функции: до 30 сек
- response cache: до 60 сек  
**Итого:** до ~90 секунд до полного применения.

## Справочники Автолайт из Object Storage

Стоимость/сроки доставки и список ПВЗ теперь строятся на основе актуальных данных из приватного бакета:

- **`autolight-cities.json`** — справочник населённых пунктов.
  - `inMainList: true` — пункт в основной сети Автолайта.
    - Если `day6` (суббота) `true` — доставка работает Пн–Сб (`saturday`).
    - Иначе — основная сеть Пн–Пт (`district`).
  - `inMainList: false` (и нет рабочих дней) — пункт вне основной сети, применяется деревенская логика (надбавка + сроки Пн–Пт).
  - Деревни/агрогородки в основной сети **не** получают сельскую надбавку, даже если в адресе есть префикс `д.` / `аг.` / `пос.`.

- **`autolight-postoffices.json`** — справочник ПВЗ с актуальными адресами, режимом работы и лимитом веса.
  - Почтоматы с адресами вида `CityPostXXX` исключаются из выдачи покупателю.

Загрузчик (`data-loader.js`) кеширует справочники в памяти на 5 минут и использует single-flight, чтобы не ходить в Object Storage по нескольку раз на запрос. При недоступности бакета автоматически используются встроенные fallback-справочники (`zones-data.js`, `pickup-piont-data.js`).

## Оптимизации расчёта ПВЗ

Чтобы избежать роста latency при большом количестве пунктов выдачи в городе:

- **Группировка по `weight_limit`** — ПВЗ с одинаковым лимитом веса (например, все 30 кг в Минске) используют один расчёт `calculateAdditionalFees` вместо N вызовов.
- **`resolvePeakStatus` вне цикла** — статус пика определяется 1 раз на запрос, а не для каждой точки.
- **Single-flight для `loadPeakOverride`** — при промахе in-memory кеша все параллельные вызовы ждут один и тот же Promise с S3-запросом. Исключает «шторм» из N одновременных запросов.

## Кеширование

In-memory кеш ответов в `server.js`:
- **TTL:** 60 секунд
- **Размер:** не более 200 записей
- Ключ включает маршрут, город, вес, цену, адрес **и** пиковый статус (`peak`/`off`)

## Тесты

```bash
npm test
# или по отдельности:
node test-peak-surcharge.js
node test-data-loader.js
node test-handler.js
```

Покрывает:
- автоматический расчёт по дню/времени,
- override `force_peak` / `force_off`,
- приоритет `force_off` над `force_peak`,
- истёкшие override,
- различие кеш-ключей для пик/спад,
- single-flight `loadPeakOverride` (1 S3 call при 10 параллельных вызовах),
- передача готового `peakStatus` в `calculateAdditionalFees`,
- группировка ПВЗ по `weight_limit` (2 группы → 2 расчёта),
- зонирование по справочнику Автолайт (`saturday` / `district` / `village`),
- деревни с обслуживанием без сельской надбавки,
- маппинг ПВЗ из `autolight-postoffices.json` в текущий формат,
- исключение почтоматов `CityPostXXX` из выдачи,
- fallback при недоступности бакета,
- интеграционные проверки эндпоинтов `/api/courier-door` и `/api/pickup-points`.

## Настройка Yandex Object Storage (один раз)

1. Создать бакет в [консоли YC](https://console.cloud.yandex.ru/).
2. **Бакет остаётся приватным.** Создать сервисный аккаунт и выдать ему роли:
   - `storage.viewer` — чтение справочников
   - `storage.editor` — если нужна запись override/zip в бакет
3. Создать static credentials для сервисного аккаунта:
   ```bash
   yc iam access-key create --service-account-id <service-account-id>
   ```
4. Загрузить начальный `peak-override.json`:
   ```bash
   echo '{"force_peak_until":null,"force_off_until":null,"reason":""}' > peak-override.json
   aws s3 cp peak-override.json s3://$OVERRIDE_BUCKET/peak-override.json \
     --endpoint-url=https://storage.yandexcloud.net
   ```
5. Установить переменные окружения YCF:
   - `YCF_DATA_BUCKET`
   - `OVERRIDE_BUCKET`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## Деплой

1. Убедиться, что в бакете `YCF_DATA_BUCKET` лежат файлы `autolight-cities.json` и `autolight-postoffices.json`.
2. Собрать архив (без `node_modules`):
   ```bash
   # Windows PowerShell
   Compress-Archive -Path 'index.js','server.js','data-loader.js','s3-client.js','courier-pricing-data.js','pickup-piont-data.js','zones-data.js','package.json' -DestinationPath 'ycf-deploy.zip' -Force
   ```
3. Загрузить архив в бакет:
   ```bash
   aws s3 cp ycf-deploy.zip s3://$YCF_DATA_BUCKET/ycf-deploy.zip \
     --endpoint-url=https://storage.yandexcloud.net
   ```
4. Создать версию функции в Yandex Cloud Functions:
   ```bash
   yc serverless function version create \
     --function-id d4ebnep9pn0plurv8g97 \
     --runtime nodejs22 \
     --entrypoint index.handler \
     --memory 256m \
     --execution-timeout 6s \
     --package-bucket-name delivery-api-backet \
     --package-object-name ycf-deploy.zip \
     --service-account-id <service-account-id> \
     --environment YCF_DATA_BUCKET=delivery-api-backet,CITIES_JSON_KEY=autolight-cities.json,POSTOFFICES_JSON_KEY=autolight-postoffices.json,OVERRIDE_BUCKET=delivery-api-backet,AWS_ACCESS_KEY_ID=<key-id>,AWS_SECRET_ACCESS_KEY=<secret>
   ```
5. Подключить API Gateway (спецификация в `api_gateway.yaml`).
6. Убедиться, что `checkout.liquid` в InSales указывает на URL API Gateway.

После обновления справочников в бакете изменения применятся в течение 5 минут (in-memory кеш в функции).

## Разделение посылок для труб ПЭ 25/32 мм

Некоторые товары (трубы ПЭ 25 мм и ПЭ 32 мм) по логистическим правилам перевозятся отдельным грузовым местом — их нельзя смешивать с мелким фитингом в одной коробке.

### Как это работает

В `server.js` заданы `product_id` труб:
- `351459011` — Труба ПЭ 32х2мм
- `354622017` — Труба ПЭ 25 х 2 мм

При расчёте доставки (курьер и ПВЗ) бэкенд:
1. Читает `order_lines` из запроса InSales.
2. Вычисляет суммарный вес труб (`quantity × weight`) и вес остальных товаров.
3. Рассчитывает стоимость доставки труб и остального **как отдельные посылки**.
4. Складывает цены и количество посылок.

**Пример:** заказ 0.2 кг трубы + 0.5 кг фитингов  
Раньше: 1 посылка 0.7 кг = 14.80 BYN  
Теперь: 2 посылки (0.2 + 0.5) = 14.80 + 14.80 = **29.60 BYN**

Если в заказе **только трубы** — они идут одной посылкой, без лишнего начисления.

### Что видит покупатель

- В строке способа доставки появляется пометка `— трубы отдельно`.
- В описании добавляется: `• Трубы ПЭ 25/32 мм доставляются отдельным грузовым местом`.
- В `fields_values` передаются служебные поля `pipe_parcels_note` и `pipe_parcels_count`.

### Инфоблок в корзине чекаута

В `checkout.liquid` добавлен скрипт, который проверяет `window.Cart.order.order_lines`. Если в корзине есть трубы — под списком товаров появляется желтый инфоблок с пояснением.

### Как добавить другие «отдельные» товары

1. В `server.js` добавить `product_id` в `PIPE_PRODUCT_IDS`.
2. Перезадеплоить функцию в YCF.
3. (Опционально) Обновить текст в `checkout.liquid`, если нужно изменить wording.

## Логи и отладка

В логах YCF ищите префиксы:
- `[FEES] peak=...` — результат расчёта наценки
- `[OVERRIDE] ...` — загрузка/ошибка override (должен появляться ~1 раз на 30 сек при постоянном трафике; дублирование — признак race condition)
- `[CACHE] ...` — работа кеша
- `[DATE] ...` — расчёт даты доставки
- `[GEOIP] ...` — определение часового пояса клиента
- `[COURIER] ...` / `[API] ...` — расчёт курьера / ПВЗ, включая разделение на посылки
- `[CITIES] ...` — загрузка справочника городов из бакета
- `[PVZ] ...` — загрузка справочника ПВЗ из бакета
- `[ZONE] ...` — определение зоны доставки по справочнику

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Подменяем S3-клиент до загрузки data-loader / server
const s3Client = require('./s3-client');
let _mockResponses = new Map();
s3Client.getObjectJson = async (bucket, key) => {
  const data = _mockResponses.get(key);
  if (data === undefined) throw new Error(`Unexpected S3 key: ${key}`);
  return data;
};

// После подмены загружаем модули
const { handler } = require('./server.js');
const { resetCache } = require('./data-loader');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'));
}

function setMock(key, data) {
  _mockResponses.set(key, data);
}

function clearMocks() {
  _mockResponses.clear();
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      resetCache();
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
      failed++;
    }
  }

  process.env.YCF_DATA_BUCKET = 'test-bucket';
  process.env.CITIES_JSON_KEY = 'autolight-cities.json';
  process.env.POSTOFFICES_JSON_KEY = 'autolight-postoffices.json';

  const cities = loadJson('autolight-cities (1).json');
  const postoffices = loadJson('autolight-postoffices.json');

  setMock('autolight-cities.json', cities);
  setMock('autolight-postoffices.json', postoffices);

  // ─── /api/courier-door ───
  await test('courier-door: Минск → saturday, есть тариф', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/courier-door',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Минск', address: 'ул. Ленина 1' },
          total_weight: 1.5,
          total_price: 100,
          order_lines: []
        }
      })
    };
    const res = await handler(event, {});
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body) && body.length > 0, 'Должен быть массив тарифов');
    assert.ok(body[0].tariff_id.includes('saturday'), `Ожидали saturday, получили ${body[0].tariff_id}`);
    assert.ok(body[0].fields_values.some(fv => fv.handle === 'delivery_zone' && fv.value === 'saturday'));
  });

  await test('courier-door: Береза → district', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/courier-door',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Береза', address: 'ул. Ленина 1' },
          total_weight: 1.5,
          total_price: 100,
          order_lines: []
        }
      })
    };
    const res = await handler(event, {});
    const body = JSON.parse(res.body);
    assert.ok(body[0].tariff_id.includes('district'), `Ожидали district, получили ${body[0].tariff_id}`);
  });

  await test('courier-door: деревня без обслуживания → village + rural_surcharge', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/courier-door',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Абакумы', address: 'ул. Лесная 1' },
          total_weight: 1.5,
          total_price: 100,
          order_lines: []
        }
      })
    };
    const res = await handler(event, {});
    const body = JSON.parse(res.body);
    assert.ok(body[0].tariff_id.includes('village'), `Ожидали village, получили ${body[0].tariff_id}`);
    const rural = body[0].fields_values.find(fv => fv.handle === 'rural_surcharge');
    assert.ok(rural && parseFloat(rural.value) > 0, 'Должна быть сельская надбавка');
  });

  // ─── /api/pickup-points (InSales формат) ───
  await test('pickup-points InSales: Минск → массив ПВЗ с правильными полями', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/pickup-points',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Минск' },
          total_weight: 1.5,
          total_price: 100,
          order_lines: []
        }
      })
    };
    const res = await handler(event, {});
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body) && body.length > 0, 'Должен быть массив ПВЗ');
    const first = body[0];
    assert.ok(first.tariff_id, 'tariff_id обязателен');
    assert.ok(first.shipping_address, 'shipping_address обязателен');
    assert.ok(first.fields_values, 'fields_values обязательны');
    assert.ok(first.fields_values.some(fv => fv.handle === 'pickup_point_id'));
    assert.ok(first.fields_values.some(fv => fv.handle === 'pickup_point_hours'));
  });

  // ─── /api/pickup-points (виджет товара) ───
  await test('pickup-points виджет: Минск → массив ПВЗ', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/api/pickup-points',
      headers: {},
      body: JSON.stringify({
        address: { city: 'Минск' },
        weight: 1.5
      })
    };
    const res = await handler(event, {});
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(Array.isArray(body), 'Должен быть массив');
    assert.ok(body.length > 0, 'ПВЗ в Минске должны быть');
  });

  // ─── Edge case: единичный тяжёлый товар (мотопомпа) ───
  await test('InSales ПВЗ: единичный товар 32 кг — скрываются ПВЗ с лимитом 30 кг', async () => {
    clearMocks();
    setMock('autolight-cities.json', cities);
    setMock('autolight-postoffices.json', {
      result: [
        { code: 97001, postofficeNumber: '97001', cityName: 'Минск г.', address: 'г.Минск, ул.Л.Беды 46', maxWeight: 30, workTime: 'пн-вс 07:00-23:00', deliveryAvailable: true, closed: false },
        { code: 97002, postofficeNumber: '97002', cityName: 'Минск г.', address: 'г.Минск, пр.Независимости 100', maxWeight: 50, workTime: 'пн-вс 07:00-23:00', deliveryAvailable: true, closed: false }
      ]
    });

    const event = {
      httpMethod: 'POST',
      path: '/api/pickup-points',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Минск' },
          total_weight: 32,
          total_price: 100,
          order_lines: [{ product_id: 999, quantity: 1, weight: 32 }]
        }
      })
    };
    const res = await handler(event, {});
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.length, 1, 'Должен остаться только ПВЗ с лимитом 50 кг');
    const parcelsCount = body[0].fields_values.find(fv => fv.handle === 'parcels_count');
    assert.ok(parcelsCount && parcelsCount.value === '1', 'Оставшийся ПВЗ должен вместить товар одной посылкой');
  });

  await test('InSales ПВЗ: 3 товара по 25 кг — разбиваются, ПВЗ с лимитом 30 кг остаются', async () => {
    clearMocks();
    setMock('autolight-cities.json', cities);
    setMock('autolight-postoffices.json', {
      result: [
        { code: 97001, postofficeNumber: '97001', cityName: 'Минск г.', address: 'г.Минск, ул.Л.Беды 46', maxWeight: 30, workTime: 'пн-вс 07:00-23:00', deliveryAvailable: true, closed: false },
        { code: 97002, postofficeNumber: '97002', cityName: 'Минск г.', address: 'г.Минск, пр.Независимости 100', maxWeight: 50, workTime: 'пн-вс 07:00-23:00', deliveryAvailable: true, closed: false }
      ]
    });

    const event = {
      httpMethod: 'POST',
      path: '/api/pickup-points',
      headers: {},
      body: JSON.stringify({
        order: {
          shipping_address: { city: 'Минск' },
          total_weight: 75,
          total_price: 100,
          order_lines: [{ product_id: 999, quantity: 3, weight: 25 }]
        }
      })
    };
    const res = await handler(event, {});
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.length, 2, 'Оба ПВЗ должны остаться — товары можно разделить');
    const limit30Tariff = body.find(t => {
      const breakdown = t.fields_values.find(fv => fv.handle === 'parcels_breakdown');
      return breakdown && breakdown.value.includes('30 кг + 30 кг + 15 кг');
    });
    assert.ok(limit30Tariff, 'ПВЗ с лимитом 30 кг (3 посылки) должен присутствовать');
  });

  console.log(`\n📊 Результат: ${passed} пройдено, ${failed} не пройдено`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

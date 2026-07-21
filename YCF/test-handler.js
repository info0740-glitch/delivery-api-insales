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

  console.log(`\n📊 Результат: ${passed} пройдено, ${failed} не пройдено`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

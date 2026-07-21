const assert = require('assert');
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
const { loadCities, loadPostOffices, resetCache } = require('./data-loader');
const { classifySettlement } = require('./server.js');

function resetDataLoaderCache() {
  resetCache();
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

  // ─── classifySettlement по данным из бакета ───
  await test('Город с субботним обслуживанием → saturday', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Минск', T: 'г.', inMainList: true, day1: true, day2: true, day3: true, day4: true, day5: true, day6: true, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('Минск'), 'saturday');
  });

  await test('Город в основной сети без субботы → district', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Береза', T: 'г.', inMainList: true, day1: true, day2: true, day3: true, day4: true, day5: true, day6: false, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('Береза'), 'district');
  });

  await test('Деревня в основной сети → district, не village', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Аксаковщина', T: 'д.', inMainList: true, day1: true, day2: true, day3: true, day4: true, day5: true, day6: false, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('Аксаковщина'), 'district');
  });

  await test('Деревня вне основной сети → village', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Абакумы', T: 'д.', inMainList: false, day1: false, day2: false, day3: false, day4: false, day5: false, day6: false, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('Абакумы'), 'village');
  });

  await test('Сельский префикс, но пункт в основной сети → district', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Аксаковщина', T: 'д.', inMainList: true, day1: true, day2: true, day3: true, day4: true, day5: true, day6: false, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('д. Аксаковщина'), 'district');
  });

  await test('Сельский префикс, пункт не в основной сети → village', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Абакумы', T: 'д.', inMainList: false, day1: false, day2: false, day3: false, day4: false, day5: false, day6: false, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('д. Абакумы'), 'village');
  });

  await test('Колодищи аг. с префиксом → saturday (как в реальном справочнике)', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', {
      result: [
        { N: 'Колодищи', T: 'аг.', inMainList: true, day1: true, day2: true, day3: true, day4: true, day5: true, day6: true, day7: false }
      ]
    });
    await loadCities();
    assert.strictEqual(classifySettlement('аг. Колодищи'), 'saturday');
  });

  // ─── Загрузка ПВЗ из бакета ───
  await test('ПВЗ маппится в текущий формат', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', { result: [] });
    setMock('autolight-postoffices.json', {
      result: [
        {
          code: 97,
          postofficeNumber: '001',
          cityName: 'Минск г.',
          address: 'г.Минск, ул.Л.Беды 46',
          maxWeight: 25,
          workTime: 'пн-вс 07:00-23:00',
          deliveryAvailable: true,
          closed: false
        }
      ]
    });
    const pvz = await loadPostOffices();
    assert.strictEqual(pvz.list.length, 1);
    const point = pvz.list[0];
    assert.strictEqual(point.id, 97);
    assert.strictEqual(point.city, 'минск');
    assert.strictEqual(point.weight_limit, 25);
    assert.strictEqual(point.name, 'СППС №001');
    assert.ok(point.address.includes('Л.Беды'));
  });

  await test('Почтоматы CityPost не попадают в ПВЗ', async () => {
    resetDataLoaderCache();
    clearMocks();
    setMock('autolight-cities.json', { result: [] });
    setMock('autolight-postoffices.json', {
      result: [
        {
          code: 97,
          postofficeNumber: '001',
          cityName: 'Минск г.',
          address: 'CityPost01, г.Минск, ул.Л.Беды 46',
          maxWeight: 25,
          workTime: 'пн-вс 07:00-23:00',
          deliveryAvailable: true,
          closed: false
        },
        {
          code: 98,
          postofficeNumber: '002',
          cityName: 'Минск г.',
          address: 'г.Минск, ул.Немига 5',
          maxWeight: 25,
          workTime: 'пн-пт 09:00-21:00',
          deliveryAvailable: true,
          closed: false
        }
      ]
    });
    const pvz = await loadPostOffices();
    assert.strictEqual(pvz.list.length, 1);
    assert.strictEqual(pvz.list[0].id, 98);
  });

  // ─── Fallback при ошибке бакета ───
  await test('При ошибке бакета ПВЗ fallback на pickup-piont-data.js', async () => {
    resetDataLoaderCache();
    clearMocks();
    s3Client.getObjectJson = async () => { throw new Error('s3 error'); };
    const { loadPostOffices } = require('./data-loader');
    const pvz = await loadPostOffices();
    assert.ok(pvz.list.length > 0, 'Fallback ПВЗ не пуст');
    // восстанавливаем мок для остальных тестов
    s3Client.getObjectJson = async (bucket, key) => {
      const data = _mockResponses.get(key);
      if (data === undefined) throw new Error(`Unexpected S3 key: ${key}`);
      return data;
    };
  });

  console.log(`\n📊 Результат: ${passed} пройдено, ${failed} не пройдено`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

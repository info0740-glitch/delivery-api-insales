const assert = require('assert');
const {
  getPeakStatus,
  resolvePeakStatus,
  calculateAdditionalFees,
  loadPeakOverride,
  buildPickupFeeGroups,
  getCacheKey,
  resetOverrideCache
} = require('./server.js');

const s3Client = require('./s3-client');

const RealDate = global.Date;

function mockDate(iso) {
  const fixed = new RealDate(iso);
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) return fixed;
      return new RealDate(...args);
    }
  };
  global.Date.now = () => fixed.getTime();
}

function restoreDate() {
  global.Date = RealDate;
}

let _mockResponse = null;
let _s3CallCount = 0;
s3Client.getObjectJson = async () => {
  _s3CallCount++;
  if (_mockResponse === null) throw new Error('S3 mock not configured');
  return _mockResponse;
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      resetOverrideCache();
      restoreDate();
      delete process.env.OVERRIDE_BUCKET;
      _mockResponse = null;
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
      failed++;
    }
  }

  // ─── Тест 1: пиковый день (Пн), малый заказ — наценка 10 BYN ───
  await test('Без override, корзина 40 BYN, понедельник → наценка 10 BYN', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
    assert.strictEqual(fees.peakStatus.source, 'day-of-week');
  });

  // ─── Тест 2: спокойный день (Ср), малый заказ — наценки нет ───
  await test('Без override, корзина 40 BYN, среда → наценка 0 BYN', async () => {
    mockDate('2026-05-20T10:00:00+03:00'); // Ср
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
    assert.strictEqual(fees.peakStatus.source, 'day-of-week');
  });

  // ─── Тест 3: пиковый день, но заказ >= 80 — наценки нет ───
  await test('Без override, корзина 100 BYN, понедельник → наценка 0 BYN', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    const fees = await calculateAdditionalFees(10, 100, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
  });

  // ─── Тест 4: force_off_until в будущем, пиковый день — наценки нет ───
  await test('С force_off_until в будущем, понедельник 40 BYN → наценка 0', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    process.env.OVERRIDE_BUCKET = 'test-bucket';
    _mockResponse = {
      force_off_until: '2026-05-25T23:59:59+03:00',
      force_peak_until: null,
      reason: 'склад перегружен'
    };
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
    assert.strictEqual(fees.peakStatus.source, 'override-off');
    assert.strictEqual(fees.peakStatus.reason, 'склад перегружен');
  });

  // ─── Тест 5: force_peak_until в будущем, спокойный день — наценка есть ───
  await test('С force_peak_until в будущем, среда 40 BYN → наценка 10 BYN', async () => {
    mockDate('2026-05-20T10:00:00+03:00'); // Ср
    process.env.OVERRIDE_BUCKET = 'test-bucket';
    _mockResponse = {
      force_off_until: null,
      force_peak_until: '2026-05-25T23:59:59+03:00',
      reason: 'промо'
    };
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
    assert.strictEqual(fees.peakStatus.source, 'override-peak');
  });

  // ─── Тест 6: оба флага активны — force_off_until приоритетнее ───
  await test('Одновременно force_off и force_peak → побеждает force_off', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    process.env.OVERRIDE_BUCKET = 'test-bucket';
    _mockResponse = {
      force_off_until: '2026-05-25T23:59:59+03:00',
      force_peak_until: '2026-05-25T23:59:59+03:00',
      reason: 'both'
    };
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
    assert.strictEqual(fees.peakStatus.source, 'override-off');
  });

  // ─── Тест 7: истёкший force_peak_until — fallback на день недели ───
  await test('Истёкший force_peak_until → fallback на день недели', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    process.env.OVERRIDE_BUCKET = 'test-bucket';
    _mockResponse = {
      force_off_until: null,
      force_peak_until: '2026-05-10T23:59:59+03:00',
      reason: 'expired'
    };
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
    assert.strictEqual(fees.peakStatus.source, 'day-of-week');
  });

  // ─── Тест 8: кеш-ключ различается для пикового и спокойного дня ───
  await test('Кеш-ключ для пн отличается от ключа для ср', async () => {
    const body = {
      utc_offset: -180,
      order: {
        shipping_address: { city: 'Минск' },
        total_weight: 1.5,
        total_price: 40
      }
    };
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    const keyMon = getCacheKey('courier', body);
    mockDate('2026-05-20T10:00:00+03:00'); // Ср
    const keyWed = getCacheKey('courier', body);
    assert.notStrictEqual(keyMon, keyWed);
    assert.ok(keyMon.endsWith('|peak'), `Ожидали peak, получили: ${keyMon}`);
    assert.ok(keyWed.endsWith('|off'), `Ожидали off, получили: ${keyWed}`);
  });

  // ─── Граничные случаи новой логики ───
  await test('Пятница 11:00 → спад (до 12:00)', async () => {
    mockDate('2026-05-22T11:00:00+03:00'); // Пт 11:00
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
  });

  await test('Суббота 12:00 → пик (начало пика)', async () => {
    mockDate('2026-05-23T12:00:00+03:00'); // Сб 12:00
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
  });

  await test('Вторник 12:59 → пик (конец пика)', async () => {
    mockDate('2026-05-19T12:59:00+03:00'); // Вт 12:59
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
  });

  await test('Вторник 13:00 → спад (пик закончился)', async () => {
    mockDate('2026-05-19T13:00:00+03:00'); // Вт 13:00
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
  });

  // ─── Скрытая надбавка 2 BYN в спад для заказа < 60 ───
  await test('Спад, заказ 40 BYN — скрытая надбавка 2 BYN (smallOrderSurcharge=0)', async () => {
    mockDate('2026-05-20T10:00:00+03:00'); // Ср (спад)
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
    const visibleSum = fees.basePrice + fees.declaredValueFee + fees.codFee + fees.ruralSurcharge + fees.smallOrderSurcharge;
    assert.strictEqual(fees.totalPrice - visibleSum, 2);
  });

  await test('Спад, заказ 100 BYN — скрытой надбавки нет', async () => {
    mockDate('2026-05-20T10:00:00+03:00'); // Ср (спад)
    const fees = await calculateAdditionalFees(10, 100, false, 1, -180);
    assert.strictEqual(fees.smallOrderSurcharge, 0);
    const visibleSum = fees.basePrice + fees.declaredValueFee + fees.codFee + fees.ruralSurcharge + fees.smallOrderSurcharge;
    assert.strictEqual(fees.totalPrice - visibleSum, 0);
  });

  // ─── Single-flight: 10 параллельных вызовов loadPeakOverride → 1 S3 call ───
  await test('loadPeakOverride при 10 параллельных вызовах делает ровно 1 S3 call', async () => {
    mockDate('2026-05-18T10:00:00+03:00');
    process.env.OVERRIDE_BUCKET = 'test-bucket';
    _s3CallCount = 0;
    _mockResponse = {
      force_off_until: '2026-05-25T23:59:59+03:00',
      force_peak_until: null,
      reason: 'test'
    };
    // Сбрасываем кеш, чтобы гарантировать промах
    resetOverrideCache();

    const promises = Array.from({ length: 10 }, () => loadPeakOverride());
    const results = await Promise.all(promises);

    assert.strictEqual(_s3CallCount, 1, `Ожидали 1 S3 call, получили ${_s3CallCount}`);
    assert.ok(results.every(r => r && r.reason === 'test'), 'Все вызовы вернули одинаковый результат');
  });

  // ─── calculateAdditionalFees с готовым peakStatus не ходит в сеть ───
  await test('calculateAdditionalFees с переданным peakStatus не вызывает resolvePeakStatus', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    const peakStatus = { isPeak: true, source: 'test-peak' };
    const fees = await calculateAdditionalFees(10, 40, false, 1, -180, peakStatus);
    assert.strictEqual(fees.smallOrderSurcharge, 10);
    assert.strictEqual(fees.peakStatus.source, 'test-peak');
  });

  // ─── Группировка по weight_limit ───
  await test('Группировка по weight_limit: 3 точки с 30 кг и 2 с 50 кг → 2 расчёта', async () => {
    mockDate('2026-05-18T10:00:00+03:00'); // Пн
    const points = [
      { id: 1, weight_limit: 30 }, { id: 2, weight_limit: 30 }, { id: 3, weight_limit: 30 },
      { id: 4, weight_limit: 50 }, { id: 5, weight_limit: 50 }
    ];
    const limitGroups = await buildPickupFeeGroups(points, 10, 40, false, -180);
    assert.strictEqual(limitGroups.size, 2, `Ожидали 2 группы, получили ${limitGroups.size}`);
    const group30 = limitGroups.get(30);
    const group50 = limitGroups.get(50);
    assert.ok(group30, 'Группа 30 кг должна существовать');
    assert.ok(group50, 'Группа 50 кг должна существовать');
    assert.strictEqual(group30.fees.smallOrderSurcharge, 10);
    assert.strictEqual(group50.fees.smallOrderSurcharge, 10);
  });

  console.log(`\n📊 Результат: ${passed} пройдено, ${failed} не пройдено`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

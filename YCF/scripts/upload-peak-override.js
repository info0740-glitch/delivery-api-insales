#!/usr/bin/env node
/**
 * Загружает peak-override.json в Yandex Object Storage.
 * Использует AWS SDK v3 (уже есть в зависимостях YCF).
 *
 * Использование:
 *   OVERRIDE_BUCKET=delivery-api-backet node scripts/upload-peak-override.js
 *
 * Требования:
 *   - переменная OVERRIDE_BUCKET
 *   - настроен доступ к Yandex Object Storage (сервисный аккаунт YCF
 *     получает его автоматически; локально — aws configure или env AWS_*)
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.OVERRIDE_BUCKET;
const KEY = 'peak-override.json';
const FILE = path.join(__dirname, '..', KEY);
const ENDPOINT = process.env.YC_S3_ENDPOINT || 'https://storage.yandexcloud.net';
const REGION = process.env.YC_REGION || 'ru-central1';

async function main() {
  if (!BUCKET) {
    console.error('❌ Переменная OVERRIDE_BUCKET не задана');
    console.error('   Пример: OVERRIDE_BUCKET=delivery-api-backet node scripts/upload-peak-override.js');
    process.exit(1);
  }

  if (!fs.existsSync(FILE)) {
    console.error(`❌ Файл не найден: ${FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(FILE, 'utf8');

  // Проверяем, что JSON валиден, прежде чем заливать в бакет
  try {
    JSON.parse(raw);
  } catch (e) {
    console.error('❌ Файл peak-override.json содержит невалидный JSON:', e.message);
    process.exit(1);
  }

  const s3 = new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: raw,
    ContentType: 'application/json',
  });

  await s3.send(command);
  console.log(`✅ ${KEY} загружен в s3://${BUCKET}/${KEY}`);
  console.log('   Изменения вступят в силу через ~30 сек (кеш override в YCF).');
}

main().catch((e) => {
  console.error('❌ Ошибка загрузки:', e.message);
  process.exit(1);
});

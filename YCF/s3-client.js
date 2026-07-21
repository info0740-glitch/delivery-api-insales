// ──────────────────────────────────────────────────────────────────────────
// Yandex Object Storage client (AWS SDK v3)
// ──────────────────────────────────────────────────────────────────────────
// Используется для чтения справочников Автолайта и override-конфига из
// приватного бакета с помощью сервисного аккаунта Yandex Cloud Function.
// Credentials подхватываются автоматически из IAM/metadata сервиса.
// ──────────────────────────────────────────────────────────────────────────

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ENDPOINT = process.env.YC_S3_ENDPOINT || 'https://storage.yandexcloud.net';
const REGION = process.env.YC_REGION || 'ru-central1';

const s3Client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: true,
});

async function getObjectJson(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const resp = await s3Client.send(command);
  const body = await resp.Body.transformToString('utf-8');
  return JSON.parse(body);
}

module.exports = { s3Client, getObjectJson };

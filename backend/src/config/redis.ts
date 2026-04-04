import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string) {
  const v = process.env[name];
  return (v === undefined || v === '') && fallback !== undefined ? fallback : v;
}

export function getRedisConnectionOptions() {
  const url = getEnv('REDIS_URL');
  if (url) {
    return { url };
  }

  const host = getEnv('REDIS_HOST', 'localhost') as string;
  const port = Number(getEnv('REDIS_PORT', '6379'));
  const password = getEnv('REDIS_PASSWORD');

  const opts: { host: string; port: number; password?: string } = { host, port };
  if (password) opts.password = password;

  return opts;
}

export function getBullMQConnection() {
  const base = getRedisConnectionOptions();
  return { connection: base };
}


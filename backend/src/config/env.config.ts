export interface AppEnv {
  port: number;
  nodeEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
  redisUrl: string;
  corsOrigins: string[];
}

export function loadEnv(): AppEnv {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8081')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

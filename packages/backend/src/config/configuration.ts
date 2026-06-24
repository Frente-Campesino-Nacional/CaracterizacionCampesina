export default () => ({
  port: parseInt(process.env.PORT || '3008', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'censo_campesino_responses',
    optionalEnabled: process.env.MONGODB_OPTIONAL_ENABLED === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
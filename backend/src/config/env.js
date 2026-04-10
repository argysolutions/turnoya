import dotenv from 'dotenv'
dotenv.config()

export const ENV = {
  PORT: process.env.PORT || 3000,
  DB: process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
  JWT_SECRET: process.env.JWT_SECRET,
  GREEN_API: {
    INSTANCE_ID: process.env.GREEN_API_INSTANCE_ID,
    TOKEN: process.env.GREEN_API_TOKEN,
  },
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/admin/auth/google/callback',
  }
}
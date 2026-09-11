import app from '../src/app';
import { connectDB } from '../src/config/database';

export default async function handler(req: any, res: any) {
  try {
    await connectDB();
  } catch (err: any) {
    console.error('Database connection error in Vercel handler:', err);
  }
  return app(req, res);
}

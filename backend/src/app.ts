import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('API running with TypeScript 🚀');
});

app.use('/api/auth', authRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
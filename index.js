import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDb } from './config/db.js';


dotenv.config();


connectDB();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {

        const db = getDb();
        await db.command({ ping: 1 });
        dbStatus = 'connected';
    } catch (err) {
        dbStatus = 'error';
    }

    res.status(200).json({
        status: 'healthy',
        database: dbStatus,
        driver: 'native-mongodb-node-driver',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});


app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});


app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📡 Listening on connection port: ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=================================`);
});
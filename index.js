import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Essential Global Middleware
app.use(cors());
app.use(express.json());

// API Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Fallback for unmatched API endpoints
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Start listening for inbound traffic
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📡 Listening on connection port: ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=================================`);
});
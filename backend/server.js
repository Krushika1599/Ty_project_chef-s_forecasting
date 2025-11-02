
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-leftover-ml';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// API Routes
// 🛑 THIS IS THE CORRECTED PATH TO YOUR ROUTER FILES 🛑
app.use('/api/fooddata', require('./routes/foodDataRoutes'));
app.use('/api/prediction', require('./routes/predictionRoutes'));

// Root API route
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Hotel Leftover Prediction API with Supervised ML',
        version: '1.0.0',
        endpoints: {
            fooddata: '/api/fooddata',
            prediction: '/api/prediction'
        }
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
});

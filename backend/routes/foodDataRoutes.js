

const express = require('express');
const router = express.Router();
// IMPORTANT: Ensure this path correctly points to your Mongoose Model file
const FoodData = require('../models/FoodData');
const mlModel = require('../ml/linearRegressionModel');

// Add new food data and retrain model
router.post('/', async (req, res) => {
    try {
        const foodData = new FoodData(req.body);
        await foodData.save();

        // Retrain model with all data
        const allData = await FoodData.find();
        // Assuming mlModel.train is correctly implemented
        const trainResult = mlModel.train(allData);

        res.status(201).json({
            message: 'Food data added successfully',
            data: foodData,
            modelStatus: trainResult
        });
    } catch (error) {
        // Handle Mongoose validation errors or other issues
        res.status(400).json({ message: 'Error adding food data: ' + error.message });
    }
});

// Bulk insert data
router.post('/bulk', async (req, res) => {
    try {
        const foodDataArray = req.body;
        // Check if the body is an array before attempting insertMany
        if (!Array.isArray(foodDataArray)) {
            return res.status(400).json({ message: 'Request body must be an array for bulk insert.' });
        }
        
        const inserted = await FoodData.insertMany(foodDataArray);

        // Retrain model
        const allData = await FoodData.find();
        // Assuming mlModel.train is correctly implemented
        const trainResult = mlModel.train(allData);

        res.status(201).json({
            message: `${inserted.length} records added successfully`,
            modelStatus: trainResult
        });
    } catch (error) {
        res.status(400).json({ message: 'Error performing bulk insert: ' + error.message });
    }
});

// Get all food data
router.get('/', async (req, res) => {
    try {
        // Default values for query parameters
        const limit = parseInt(req.query.limit || 100);
        const skip = parseInt(req.query.skip || 0);
        const { dish_name, meal_type } = req.query;
        
        const filter = {};
        if (dish_name) filter.dish_name = dish_name;
        if (meal_type) filter.meal_type = meal_type;

        const foodData = await FoodData.find(filter)
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        
        const total = await FoodData.countDocuments(filter);

        res.json({
            data: foodData,
            total,
            limit: limit,
            skip: skip
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching food data: ' + error.message });
    }
});

// Get statistics
router.get('/stats', async (req, res) => {
    try {
        const total = await FoodData.countDocuments();
        const data = await FoodData.find(); // Note: Fetching all data can be slow on large datasets

        if (total === 0) {
            return res.json({
                total_records: 0,
                message: 'No data available to calculate statistics.'
            });
        }

        const totalWaste = data.reduce((sum, d) => sum + (d.actual_waste_kg || 0), 0);
        const totalPrepared = data.reduce((sum, d) => sum + (d.actual_prepared_kg || 0), 0);
        
        const avgWastePercent = totalPrepared > 0 ? (totalWaste / totalPrepared) * 100 : 0;

        // Group by dish for stats
        const dishStats = {};
        data.forEach(d => {
            if (!dishStats[d.dish_name]) {
                dishStats[d.dish_name] = {
                    count: 0,
                    totalWaste: 0,
                    totalPrepared: 0
                };
            }
            dishStats[d.dish_name].count++;
            dishStats[d.dish_name].totalWaste += (d.actual_waste_kg || 0);
            dishStats[d.dish_name].totalPrepared += (d.actual_prepared_kg || 0);
        });

        const topWasteDishes = Object.entries(dishStats)
            .map(([name, stats]) => ({
                dish_name: name,
                // Calculate percentage carefully to avoid NaN if totalPrepared is 0
                avg_waste_percent: stats.totalPrepared > 0 ? (stats.totalWaste / stats.totalPrepared) * 100 : 0,
                total_waste: Math.round(stats.totalWaste * 100) / 100,
                count: stats.count
            }))
            .sort((a, b) => b.avg_waste_percent - a.avg_waste_percent)
            .slice(0, 10);

        res.json({
            total_records: total,
            total_waste_kg: Math.round(totalWaste * 100) / 100,
            total_prepared_kg: Math.round(totalPrepared * 100) / 100,
            avg_waste_percent: Math.round(avgWastePercent * 100) / 100,
            top_waste_dishes: topWasteDishes,
            model_info: mlModel.getModelInfo ? mlModel.getModelInfo() : { message: 'ML model info not available' }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics: ' + error.message });
    }
});

// Get unique dish names
router.get('/dishes', async (req, res) => {
    try {
        const dishes = await FoodData.distinct('dish_name');
        res.json(dishes.sort());
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unique dishes: ' + error.message });
    }
});

// Train model manually
router.post('/train', async (req, res) => {
    try {
        const allData = await FoodData.find();
        // Assuming mlModel.train is correctly implemented
        const trainResult = mlModel.train(allData);
        res.json(trainResult);
    } catch (error) {
        res.status(500).json({ message: 'Error training model: ' + error.message });
    }
});

// Delete all data (for testing)
router.delete('/all', async (req, res) => {
    try {
        await FoodData.deleteMany({});
        res.json({ message: 'All food data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting data: ' + error.message });
    }
});

module.exports = router;

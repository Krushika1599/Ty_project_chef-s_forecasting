
const express = require('express');
const router = express.Router();
// IMPORTANT: Ensure these paths correctly point to your Mongoose Model files
const Prediction = require('../models/Prediction');
const FoodData = require('../models/FoodData'); 
const mlModel = require('../ml/linearRegression');

// Make prediction
router.post('/', async (req, res) => {
    try {
        const inputData = req.body;

        // Ensure model is trained
        if (!mlModel.trained) {
            const allData = await FoodData.find();
            if (allData.length === 0) {
                return res.status(400).json({
                    message: 'No training data available. Please add historical data first.'
                });
            }
            // Train the model
            const trainResult = mlModel.train(allData);
            if (!trainResult.success) {
                return res.status(400).json({ 
                    message: 'Model training failed during prediction attempt.',
                    details: trainResult 
                });
            }
        }

        // Make prediction
        const predictionResult = mlModel.predict(inputData);

        // Save prediction to database
        const prediction = new Prediction({
            ...inputData,
            predicted_waste_kg: predictionResult.predicted_waste_kg,
            confidence_score: predictionResult.confidence_score,
            model_accuracy: predictionResult.model_accuracy
        });
        await prediction.save();

        res.json({
            ...predictionResult,
            prediction_id: prediction._id,
            input_data: inputData
        });
    } catch (error) {
        res.status(500).json({ message: 'Error making prediction: ' + error.message });
    }
});

// Get prediction history
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || 50);
        const predictions = await Prediction.find()
            .sort({ created_at: -1 })
            .limit(limit);
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching prediction history: ' + error.message });
    }
});

// Update prediction with actual results
router.put('/:id', async (req, res) => {
    try {
        const { actual_waste_kg } = req.body;
        const prediction = await Prediction.findById(req.params.id);
        
        if (!prediction) {
            return res.status(404).json({ message: 'Prediction record not found' });
        }
        
        const actualWaste = parseFloat(actual_waste_kg);
        if (isNaN(actualWaste)) {
             return res.status(400).json({ message: 'actual_waste_kg must be a valid number.' });
        }

        prediction.actual_waste_kg = actualWaste;
        prediction.prediction_error = Math.abs(actualWaste - prediction.predicted_waste_kg);
        await prediction.save();

        res.json({ message: 'Prediction updated with actual results.', data: prediction });
    } catch (error) {
        res.status(500).json({ message: 'Error updating prediction: ' + error.message });
    }
});

// Batch prediction for multiple items
router.post('/batch', async (req, res) => {
    try {
        const items = req.body.items;
        
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'The request body must contain an array of items under the "items" key.' });
        }

        // Ensure model is trained for batch prediction
        if (!mlModel.trained) {
            const allData = await FoodData.find();
            if (allData.length > 0) {
                 mlModel.train(allData);
            } else {
                 return res.status(400).json({ message: 'Model is not trained and no data is available to train it for batch prediction.' });
            }
        }
        
        const predictions = [];
        for (const item of items) {
            const result = mlModel.predict(item);
            predictions.push({
                dish_name: item.dish_name,
                planned_batch_kg: item.planned_batch_kg,
                ...result
            });
        }

        res.json({predictions});
    } catch (error) {
        res.status(500).json({ message: 'Error making batch prediction: ' + error.message });
    }
});

module.exports = router;

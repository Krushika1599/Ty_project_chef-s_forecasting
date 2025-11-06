
// const express = require('express');
// const router = express.Router();
// // IMPORTANT: Ensure these paths correctly point to your Mongoose Model files
// const Prediction = require('../models/Prediction');
// const FoodData = require('../models/FoodData'); 
// const mlModel = require('../ml/linearRegression');

// // Make prediction
// router.post('/', async (req, res) => {
//     try {
//         const inputData = req.body;

//         // Ensure model is trained
//         if (!mlModel.trained) {
//             const allData = await FoodData.find();
//             if (allData.length === 0) {
//                 return res.status(400).json({
//                     message: 'No training data available. Please add historical data first.'
//                 });
//             }
//             // Train the model
//             const trainResult = mlModel.train(allData);
//             if (!trainResult.success) {
//                 return res.status(400).json({ 
//                     message: 'Model training failed during prediction attempt.',
//                     details: trainResult 
//                 });
//             }
//         }

//         // Make prediction
//         const predictionResult = mlModel.predict(inputData);

//         // Save prediction to database
//         const prediction = new Prediction({
//             ...inputData,
//             predicted_waste_kg: predictionResult.predicted_waste_kg,
//             confidence_score: predictionResult.confidence_score,
//             model_accuracy: predictionResult.model_accuracy
//         });
//         await prediction.save();

//         res.json({
//             ...predictionResult,
//             prediction_id: prediction._id,
//             input_data: inputData
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Error making prediction: ' + error.message });
//     }
// });

// // Get prediction history
// router.get('/', async (req, res) => {
//     try {
//         const limit = parseInt(req.query.limit || 50);
//         const predictions = await Prediction.find()
//             .sort({ created_at: -1 })
//             .limit(limit);
//         res.json(predictions);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching prediction history: ' + error.message });
//     }
// });

// // Update prediction with actual results
// router.put('/:id', async (req, res) => {
//     try {
//         const { actual_waste_kg } = req.body;
//         const prediction = await Prediction.findById(req.params.id);
        
//         if (!prediction) {
//             return res.status(404).json({ message: 'Prediction record not found' });
//         }
        
//         const actualWaste = parseFloat(actual_waste_kg);
//         if (isNaN(actualWaste)) {
//              return res.status(400).json({ message: 'actual_waste_kg must be a valid number.' });
//         }

//         prediction.actual_waste_kg = actualWaste;
//         prediction.prediction_error = Math.abs(actualWaste - prediction.predicted_waste_kg);
//         await prediction.save();

//         res.json({ message: 'Prediction updated with actual results.', data: prediction });
//     } catch (error) {
//         res.status(500).json({ message: 'Error updating prediction: ' + error.message });
//     }
// });

// // Batch prediction for multiple items
// router.post('/batch', async (req, res) => {
//     try {
//         const items = req.body.items;
        
//         if (!Array.isArray(items)) {
//             return res.status(400).json({ message: 'The request body must contain an array of items under the "items" key.' });
//         }

//         // Ensure model is trained for batch prediction
//         if (!mlModel.trained) {
//             const allData = await FoodData.find();
//             if (allData.length > 0) {
//                  mlModel.train(allData);
//             } else {
//                  return res.status(400).json({ message: 'Model is not trained and no data is available to train it for batch prediction.' });
//             }
//         }
        
//         const predictions = [];
//         for (const item of items) {
//             const result = mlModel.predict(item);
//             predictions.push({
//                 dish_name: item.dish_name,
//                 planned_batch_kg: item.planned_batch_kg,
//                 ...result
//             });
//         }

//         res.json({predictions});
//     } catch (error) {
//         res.status(500).json({ message: 'Error making batch prediction: ' + error.message });
//     }
// });

// module.exports = router;






const express = require('express');
const router = express.Router();
// IMPORTANT: Ensure these paths correctly point to your Mongoose Model files
const Prediction = require('../models/Prediction');
const FoodData = require('../models/FoodData'); 

// 👇 CHANGE: Import the ModelManager instead of a single model instance
const modelManager = require('../ml/modelManager'); 


// Helper function to ensure all models are trained
async function ensureModelsTrained(res) {
    // Check if the primary model is trained. If not, retrain all.
    const linearRegressionInfo = modelManager.getModelInfo('linear-regression');
    
    if (!linearRegressionInfo.trained) {
        const allData = await FoodData.find();
        
        if (allData.length === 0) {
            return res.status(400).json({
                message: 'No training data available. Please add historical data first.'
            });
        }
        
        // Retrain all available models
        const trainResults = modelManager.retrainAll(allData);
        
        if (!trainResults['linear-regression'].success) {
            return res.status(400).json({ 
                message: 'Initial model training failed.',
                details: trainResults 
            });
        }
    }
    return null; // Return null if training is successful or unnecessary
}


// Make prediction (Now calculates and returns ALL model results)
router.post('/', async (req, res) => {
    try {
        const inputData = req.body;
        
        const trainingErrorResponse = await ensureModelsTrained(res);
        if (trainingErrorResponse) return trainingErrorResponse;

        // 1. Get list of models (assuming modelManager provides this)
        // If modelManager.getAvailableModels() exists, use it. Otherwise, hardcode based on plan.
        const modelNames = ['linear-regression', 'knn-regressor']; 
        
        const allModelPredictions = {};
        
        // 2. Loop through all models and get predictions
        for (const modelName of modelNames) {
            try {
                const result = modelManager.predict(modelName, inputData);
                allModelPredictions[modelName] = result;
            } catch (err) {
                // Store error if a specific model fails (e.g., if KNN is not fully implemented yet)
                allModelPredictions[modelName] = { 
                    error: true, 
                    message: `Prediction failed for ${modelName}: ${err.message}` 
                };
            }
        }

        // 3. Select Linear Regression result as the primary data for backward compatibility in DB saving
        const primaryResult = allModelPredictions['linear-regression'] || {};
        
        // Save prediction to database (using the primary model result)
        const prediction = new Prediction({
            ...inputData,
            predicted_waste_kg: primaryResult.predicted_waste_kg || 0,
            confidence_score: primaryResult.confidence_score || 0,
            model_accuracy: primaryResult.model_accuracy || 0,
            model_used: 'linear-regression',
            
            // NOTE: To store ALL results (for comparison), your Prediction Mongoose schema 
            // needs a new field, e.g., 'all_model_results', defined as type Object.
            // Assuming for now, we only save the primary result and return all.
        });
        await prediction.save();

        // 4. Return all results to the client
        res.json({
            message: 'Predictions generated by all available models.',
            prediction_id: prediction._id,
            input_data: inputData,
            results: allModelPredictions // All results returned here
        });
    } catch (error) {
        res.status(500).json({ message: 'Error making prediction: ' + error.message });
    }
});

// Get prediction history (No change needed)
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

// Update prediction with actual results (No change needed)
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

// Batch prediction for multiple items (Unchanged - still uses single model, but can be updated similarly)
router.post('/batch', async (req, res) => {
    try {
        const items = req.body.items;
        
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'The request body must contain an array of items under the "items" key.' });
        }

        // Batch prediction remains single-model based on request query/default for simplicity.
        const modelName = req.query.model || 'linear-regression';

        const trainingErrorResponse = await ensureModelsTrained(res);
        if (trainingErrorResponse) return trainingErrorResponse;

        const predictions = [];
        for (const item of items) {
            // Use the manager to predict
            const result = modelManager.predict(modelName, item);
            predictions.push({
                dish_name: item.dish_name,
                planned_batch_kg: item.planned_batch_kg,
                model_used: modelName,
                ...result
            });
        }

        res.json({predictions});
    } catch (error) {
        res.status(500).json({ message: 'Error making batch prediction: ' + error.message });
    }
});

// NEW: Endpoint to manually trigger full retraining of all models
router.post('/retrain', async (req, res) => {
    try {
        const allData = await FoodData.find();
        if (allData.length === 0) {
            return res.status(400).json({ message: 'No data available to retrain models.' });
        }
        
        const results = modelManager.retrainAll(allData);
        res.json({ success: true, message: 'All models retrained successfully.', results });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrain models: ' + error.message });
    }
});

module.exports = router;

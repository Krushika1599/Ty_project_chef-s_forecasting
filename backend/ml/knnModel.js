const preprocessor = require('./preprocessor');

class KNNRegressor {
    // Reverting k to 5 to focus on the robust L-O-O CV implementation, 
    // but the user can easily change it back to 7 or 9 for optimization.
    constructor(k = 5) { 
        this.k = k;
        this.trainingData = []; 
        this.stats = null;
        this.trained = false;
        this.rSquared = 0;
    }

    // Helper: Calculates Euclidean distance between two feature vectors
    distance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            // Note: This assumes all features (including encoded categories) are normalized.
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
    
    // Helper: Calculates the mean of an array
    mean(arr) {
        // Handle empty arrays gracefully
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    /**
     * Core prediction logic for a single feature vector (uses Weighted KNN).
     * @param {Array<number>} newFeatures - The features to predict.
     * @param {Array<Object>} [dataToUse=this.trainingData] - Optional: allows predicting on a subset (for CV).
     */
    predictWithFeatures(newFeatures, dataToUse = this.trainingData) {
        if (dataToUse.length === 0) return 0;

        // 1. Calculate distances to all specified data points
        const neighbors = dataToUse.map(trainRecord => ({
            distance: this.distance(newFeatures, trainRecord.features),
            target: trainRecord.target
        }));

        // 2. Sort by distance and take the top K neighbors
        neighbors.sort((a, b) => a.distance - b.distance);
        // Ensure we don't try to slice more neighbors than available (important for k > N)
        const kNearest = neighbors.slice(0, Math.min(this.k, neighbors.length));

        let weightedSum = 0;
        let totalWeight = 0;

        // 3. Calculate Weighted Average (WKNN)
        kNearest.forEach(neighbor => {
            // Use a small constant (1e-6) to avoid division by zero if distance is 0
            // The weight is 1 / distance (inverse distance weighting)
            const weight = 1 / (neighbor.distance + 1e-6); 
            weightedSum += neighbor.target * weight;
            totalWeight += weight;
        });

        // Fallback to simple average if totalWeight is zero (should only happen if all targets are zero distance)
        const prediction = totalWeight > 0 ? weightedSum / totalWeight : this.mean(kNearest.map(n => n.target));
        
        // Waste cannot be negative
        return Math.max(0, prediction);
    }

    getRecommendation(wastePercentage) {
        if (wastePercentage < 5) {
            return 'Excellent! Very low waste predicted.';
        } else if (wastePercentage < 10) {
            return 'Good. Waste is within acceptable range.';
        } else if (wastePercentage < 20) {
            return 'Moderate waste. Consider reducing batch size.';
        } else {
            return 'High waste predicted! Strongly recommend reducing quantity.';
        }
    }

    train(trainingData) {
        if (trainingData.length < this.k) {
             return { success: false, message: `Need at least ${this.k} samples for KNN` };
        }
        
        // 1. Calculate and store stats for normalization during prediction
        this.stats = preprocessor.calculateStats(trainingData);

        const y_true = [];
        this.trainingData = trainingData.map(record => {
            const features = preprocessor.prepareFeatures(record, this.stats);
            const target = preprocessor.prepareTarget(record);
            y_true.push(target);
            return { features, target };
        });
        
        // --- CRITICAL FIX: CROSS-VALIDATED R-SQUARED CALCULATION ---
        
        const y_pred_cv = [];
        
        // Leave-One-Out Cross-Validation (L-O-O CV): Ensures unbiased R²
        for (let i = 0; i < this.trainingData.length; i++) {
            const validation_sample = this.trainingData[i];
            
            // Create a temporary training set by removing the current sample
            const temp_training_data = [
                ...this.trainingData.slice(0, i),
                ...this.trainingData.slice(i + 1)
            ];
            
            // Predict the value for the removed sample using the remaining data
            const prediction = this.predictWithFeatures(validation_sample.features, temp_training_data);
            y_pred_cv.push(prediction);
        }

        // 3. Calculate R-squared using the cross-validated predictions (y_pred_cv)
        const yMean = this.mean(y_true);
        const ssTotal = y_true.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
        const ssResidual = y_true.reduce((sum, val, idx) => sum + Math.pow(val - y_pred_cv[idx], 2), 0);

        if (ssTotal < 1e-10) {
            this.rSquared = 1; // Trivial case: all target values are identical
        } else {
            // R² = 1 - (Unexplained Variance / Total Variance)
            this.rSquared = 1 - (ssResidual / ssTotal);
        }
        
        this.trained = true;
        
        return { 
            success: true, 
            message: `KNN model trained successfully with ${trainingData.length} samples (Cross-Validated R²)`,
            rSquared: this.rSquared,
        };
    }

    // Main prediction endpoint method
    predict(inputData) {
        if (!this.trained) {
            throw new Error('KNN Model not trained yet');
        }

        const newFeatures = preprocessor.prepareFeatures(inputData, this.stats);
        
        // Use the default predictWithFeatures which uses the full training set
        const prediction = this.predictWithFeatures(newFeatures);
        
        const plannedBatch = inputData.planned_batch_kg || 1; // Avoid division by zero
        const wastePercentage = (prediction / plannedBatch) * 100;
        
        // Confidence is derived from the global R-squared
        // Clamp confidence between 0% and 100%
        const confidence = Math.min(100, Math.max(0, this.rSquared * 100));


        return {
            predicted_waste_kg: Math.round(prediction * 100) / 100,
            waste_percentage: Math.round(wastePercentage * 100) / 100,
            
            confidence_score: Math.round(confidence * 100) / 100,
            // Only show up to 4 decimal places for accuracy
            model_accuracy: Math.round(this.rSquared * 10000) / 10000, 
            
            recommendation: this.getRecommendation(wastePercentage) 
        };
    }

    getModelInfo() {
        return {
            trained: this.trained,
            k: this.k,
            sampleCount: this.trainingData.length,
            rSquared: this.rSquared
        };
    }
}

module.exports = new KNNRegressor();

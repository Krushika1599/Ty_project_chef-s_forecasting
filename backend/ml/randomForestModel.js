// // randomForestModel.js
// // 🚨 Dependency: Make sure you have installed this package: npm install ml-random-forest
// const { RandomForestRegressor } = require('ml-random-forest'); 
// const preprocessor = require('./preprocessor');

// class RandomForestModel {
//   constructor() {
//     this.model = null; // Stores the trained RandomForestRegressor instance
//     this.stats = null; // Stores normalization statistics from preprocessor
//     this.trained = false;
//     this.rSquared = 0;
//     this.featureCount = 0;
//   }

//   // Calculate mean
//   mean(arr) {
//     return arr.reduce((sum, val) => sum + val, 0) / arr.length;
//   }

//   /**
//    * Trains the Random Forest Regressor using preprocessed data.
//    * @param {Array<Object>} trainingData - The raw training data records.
//    */
//   train(trainingData) {
//     if (trainingData.length < 50) { // Random Forest often needs more data than Linear Regression
//       return {
//         success: false,
//         message: 'Random Forest needs at least 50 training samples for reliable results'
//       };
//     }

//     try {
//       // 1. Calculate and store stats for normalization/preprocessing
//       this.stats = preprocessor.calculateStats(trainingData);

//       const X = []; // Feature matrix
//       const y = []; // Target vector

//       // 2. Prepare features and target
//       trainingData.forEach(record => {
//         const features = preprocessor.prepareFeatures(record, this.stats);
//         X.push(features);
//         y.push(preprocessor.prepareTarget(record));
//       });

//       this.featureCount = X[0].length;
//       const m = X.length;

//       // 3. Configure and train the model
//       const options = {
//         nEstimators: 100, // Number of decision trees
//         maxFeatures: 'auto', // Use square root of features for split selection
//         seed: 42 // For reproducibility
//       };

//       this.model = new RandomForestRegressor(options); 
//       this.model.train(X, y);
      
//       // 4. Calculate R-squared (using predictions on the training set)
//       const predictions = X.map((features) => this.predictWithFeatures(features));
//       const yMean = this.mean(y);
//       const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
//       const ssResidual = y.reduce((sum, val, idx) => sum + Math.pow(val - predictions[idx], 2), 0);
      
//       // Avoid division by zero
//       this.rSquared = (ssTotal > 1e-6) ? (1 - (ssResidual / ssTotal)) : 0; 

//       this.trained = true;

//       return {
//         success: true,
//         message: `Random Forest trained successfully with ${m} samples and ${this.featureCount} features.`,
//         rSquared: Math.round(this.rSquared * 10000) / 10000,
//         featureCount: this.featureCount
//       };
//     } catch (error) {
//       console.error('Random Forest Training error:', error);
//       return {
//         success: false,
//         message: 'Random Forest Training failed: ' + error.message
//       };
//     }
//   }

//   /**
//    * Predicts the target variable (waste) for prepared features.
//    * @param {Array<number>} features - The normalized and encoded feature vector.
//    * @returns {number} Predicted waste in kg (non-negative).
//    */
//   predictWithFeatures(features) {
//     if (!this.trained || !this.model) {
//       throw new Error('Random Forest Model not trained yet');
//     }

//     // Predict method for ml-random-forest expects an array of features
//     const prediction = this.model.predict([features])[0]; 

//     return Math.max(0, prediction); // Waste can't be negative
//   }
  
//   /**
//    * Predicts waste for new raw data.
//    * @param {Object} inputData - The raw input data record.
//    * @returns {Object} Prediction result object following the required format.
//    */
//   predict(inputData) {
//     if (!this.trained || !this.stats) {
//       throw new Error('Random Forest Model not trained yet or missing stats.');
//     }
//     if (!inputData.planned_batch_kg) {
//          throw new Error('Input data must include planned_batch_kg to calculate waste percentage.');
//     }

//     const features = preprocessor.prepareFeatures(inputData, this.stats);
//     const prediction = this.predictWithFeatures(features);

//     // Calculate confidence and waste percentage
//     const confidence = Math.min(100, Math.max(0, this.rSquared * 100));
//     const wastePercentage = (prediction / inputData.planned_batch_kg) * 100;

//     return {
//       predicted_waste_kg: Math.round(prediction * 100) / 100,
//       waste_percentage: Math.round(wastePercentage * 100) / 100,
//       confidence_score: Math.round(confidence * 100) / 100,
//       model_accuracy: Math.round(this.rSquared * 10000) / 10000,
//       recommendation: this.getRecommendation(wastePercentage)
//     };
//   }

//   getRecommendation(wastePercentage) {
//     if (wastePercentage < 5) {
//       return 'Excellent! Very low waste predicted.';
//     } else if (wastePercentage < 10) {
//       return 'Good. Waste is within acceptable range.';
//     } else if (wastePercentage < 20) {
//       return 'Moderate waste. Consider reducing batch size.';
//     } else {
//       return 'High waste predicted! Strongly recommend reducing quantity.';
//     }
//   }
  
//   // Get model info
//   getModelInfo() {
//     return {
//       trained: this.trained,
//       rSquared: this.rSquared,
//       featureCount: this.featureCount,
//       type: 'RandomForestRegressor'
//     };
//   }
// }
const RF = require('ml-random-forest'); // ✅ Correct import
const preprocessor = require('./preprocessor');

class RandomForestModel {
    constructor() {
        this.model = null;
        this.stats = null;
        this.trained = false;
        this.rSquared = 0;
        this.featureCount = 0;
        this.MAX_SAMPLES = 500; // limit to prevent library overload
    }

    mean(arr) {
        if (!arr.length) return 0;
        return arr.reduce((sum, v) => sum + v, 0) / arr.length;
    }

    /**
     * Train the Random Forest Regression model
     */
    train(trainingData) {
        this.trained = false;
        this.rSquared = 0;

        console.log(`[RF Debug] Received ${trainingData?.length || 0} records for training`);

        if (!trainingData || trainingData.length < 10) {
            return {
                success: false,
                message: `Random Forest requires at least 10 samples (got ${trainingData?.length || 0}).`
            };
        }

        // --- Sampling to prevent memory overload ---
        let subsetData = trainingData;
        if (trainingData.length > this.MAX_SAMPLES) {
            console.warn(`[RF Sampling]: Dataset size ${trainingData.length} > ${this.MAX_SAMPLES}. Sampling down.`);
            subsetData = trainingData.sort(() => 0.5 - Math.random()).slice(0, this.MAX_SAMPLES);
        }

        try {
            this.stats = preprocessor.calculateStats(subsetData);
            const X = [], y = [];
            let featureLength = 0;

            subsetData.forEach((record, index) => {
                const features = preprocessor.prepareFeatures(record, this.stats);
                const target = preprocessor.prepareTarget(record);

                if (features.some(f => !Number.isFinite(f))) {
                    console.error(`[RF Data Validation]: Invalid features at index ${index}`, features);
                    return; // skip invalid record
                }
                if (!Number.isFinite(target)) {
                    console.error(`[RF Data Validation]: Invalid target at index ${index}`, target);
                    return;
                }

                if (index === 0) featureLength = features.length;
                else if (features.length !== featureLength) {
                    console.error(`[RF Validation]: Inconsistent feature vector length at index ${index}.`);
                    return;
                }

                X.push(features);
                y.push(target);
            });

            if (X.length < 10) {
                return {
                    success: false,
                    message: `Filtered data insufficient for training (${X.length} valid records).`
                };
            }

            this.featureCount = featureLength;

            const options = {
                nEstimators: 100,
                maxFeatures: Math.floor(Math.sqrt(this.featureCount)) || 1,
                seed: 42
            };

            // ✅ Correct constructor
            this.model = new RF.RandomForestRegression(options);
            this.model.train(X, y);
            this.trained = true;

            // --- Calculate R² ---
            const predictions = X.map(f => this.predictWithFeatures(f));
            const yMean = this.mean(y);
            const ssTotal = y.reduce((s, v) => s + Math.pow(v - yMean, 2), 0);
            const ssResidual = y.reduce((s, v, i) => s + Math.pow(v - predictions[i], 2), 0);
            this.rSquared = ssTotal ? 1 - ssResidual / ssTotal : 0;

            console.log(`✅ Random Forest trained successfully with ${X.length} samples. R² = ${this.rSquared.toFixed(4)}`);

            return {
                success: true,
                message: `Random Forest trained successfully with ${X.length} samples (sampled from ${trainingData.length}).`,
                rSquared: Math.round(this.rSquared * 10000) / 10000,
                featureCount: this.featureCount
            };

        } catch (err) {
            console.error('Random Forest Training CRITICAL Failure:', err.message);
            this.trained = false;
            return {
                success: false,
                message: `Training failed: ${err.message}`
            };
        }
    }

    /**
     * Internal prediction using feature array
     */
    predictWithFeatures(features) {
        if (!this.trained || !this.model) {
            throw new Error('Random Forest Model not trained yet');
        }

        return Math.max(0, this.model.predict([features])[0]);
    }

    /**
     * Public prediction method using raw data input
     */
    predict(inputData) {
        if (!this.trained || !this.stats) {
            throw new Error('Random Forest Model not trained yet or missing stats.');
        }

        if (!inputData.planned_batch_kg || inputData.planned_batch_kg <= 0) {
            throw new Error('Planned batch quantity is required and must be positive.');
        }

        const features = preprocessor.prepareFeatures(inputData, this.stats);
        const prediction = this.predictWithFeatures(features);

        const confidence = Math.min(100, Math.max(0, this.rSquared * 100));
        const wastePercentage = (prediction / inputData.planned_batch_kg) * 100;

        return {
            predicted_waste_kg: Math.round(prediction * 100) / 100,
            waste_percentage: Math.round(wastePercentage * 100) / 100,
            confidence_score: Math.round(confidence * 100) / 100,
            model_accuracy: Math.round(this.rSquared * 10000) / 10000,
            recommendation: this.getRecommendation(wastePercentage)
        };
    }

    /**
     * Recommendation message based on waste %
     */
    getRecommendation(wastePercentage) {
        if (wastePercentage < 5) return 'Excellent! Very low waste predicted.';
        if (wastePercentage < 10) return 'Good. Waste is within acceptable range.';
        if (wastePercentage < 20) return 'Moderate waste. Consider reducing batch size.';
        return 'High waste predicted! Strongly recommend reducing quantity.';
    }

    /**
     * Returns model metadata
     */
    getModelInfo() {
        return {
            trained: this.trained,
            rSquared: this.rSquared,
            featureCount: this.featureCount,
            type: 'RandomForestRegression'
        };
    }
}

module.exports = new RandomForestModel();

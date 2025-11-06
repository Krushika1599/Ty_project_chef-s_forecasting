// // modelManager.js
// const LinearRegressionModel = require('./linearRegressionModel'); // Rename your existing file
// const KNNModel = require('./knnModel'); // The new KNN model

// class ModelManager {
//     constructor() {
//         this.models = {
//             'linear-regression': LinearRegressionModel,
//             'knn-regressor': KNNModel
//         };
//         this.activeModel = 'linear-regression'; // Default active model
//     }

//     /**
//      * Retrains all models using the latest food data.
//      * @param {Array} trainingData - Array of raw food data records.
//      * @returns {Object} Results of the training for all models.
//      */
//     retrainAll(trainingData) {
//         const results = {};
//         for (const [name, model] of Object.entries(this.models)) {
//             results[name] = model.train(trainingData);
//         }
//         return results;
//     }

//     /**
//      * Predicts using the specified model.
//      * @param {string} modelName - 'linear-regression' or 'knn-regressor'.
//      * @param {Object} inputData - The new data record to predict.
//      * @returns {Object} Prediction result.
//      */
//     predict(modelName, inputData) {
//         const model = this.models[modelName];
//         if (!model) {
//             throw new Error(`Model ${modelName} not found.`);
//         }
//         if (!model.getModelInfo().trained) {
//              throw new Error(`Model ${modelName} is not trained.`);
//         }
//         return model.predict(inputData);
//     }
    
//     getAvailableModels() {
//         return Object.keys(this.models);
//     }

//     getModelInfo(modelName) {
//         const model = this.models[modelName];
//         return model ? model.getModelInfo() : { trained: false };
//     }
// }

// module.exports = new ModelManager();


const LinearRegressionModel = require('./linearRegressionModel'); 
const KNNModel = require('./knnModel'); 
const RandomForestModel = require('./randomForestModel'); 

class ModelManager {
    constructor() {
        this.models = {
            // Core ML Models
            'linear-regression': LinearRegressionModel,
            'knn-regressor': KNNModel,
            'random-forest': RandomForestModel
        };
        this.activeModel = 'linear-regression'; 
    }

    /**
     * Retrains all models using the latest food data.
     * It iterates through all registered models and calls their 'train' method.
     * @param {Array} trainingData - Array of raw food data records.
     * @returns {Object} Results of the training for all models (success status and message).
     */
    retrainAll(trainingData) {
        const results = {};
        for (const [name, model] of Object.entries(this.models)) {
            // Check if the model instance exists and has a train method before attempting to train
            if (model && typeof model.train === 'function') {
                results[name] = model.train(trainingData);
            } else {
                results[name] = { success: false, message: `Model ${name} is invalid or missing 'train' method.` };
            }
        }
        return results;
    }

    /**
     * Predicts using the specified model.
     * @param {string} modelName - The name of the model ('linear-regression', 'knn-regressor', etc.).
     * @param {Object} inputData - The new data record to predict.
     * @returns {Object} Prediction result.
     */
    predict(modelName, inputData) {
        const model = this.models[modelName];
        if (!model) {
            throw new Error(`Model ${modelName} not found.`);
        }
        // Ensure model is trained before running prediction
        if (!model.getModelInfo().trained) {
             throw new Error(`Model ${modelName} is not trained.`);
        }
        return model.predict(inputData);
    }
    
    /**
     * Returns a list of all model identifiers registered in the manager.
     * @returns {Array<string>} List of model names.
     */
    getAvailableModels() {
        return Object.keys(this.models);
    }

    /**
     * Returns the training metadata (R-squared, trained status, etc.) for a specific model.
     * @param {string} modelName - The name of the model.
     * @returns {Object} Model info.
     */
    getModelInfo(modelName) {
        const model = this.models[modelName];
        // Safely check if the model exists and has the getModelInfo method
        return model ? (model.getModelInfo ? model.getModelInfo() : { trained: false, message: 'Model info method missing' }) : { trained: false, message: 'Model not found' };
    }
}

module.exports = new ModelManager();
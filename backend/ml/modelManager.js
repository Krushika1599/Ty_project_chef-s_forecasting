// modelManager.js
const LinearRegressionModel = require('./linearRegressionModel'); // Rename your existing file
const KNNModel = require('./knnModel'); // The new KNN model

class ModelManager {
    constructor() {
        this.models = {
            'linear-regression': LinearRegressionModel,
            'knn-regressor': KNNModel
        };
        this.activeModel = 'linear-regression'; // Default active model
    }

    /**
     * Retrains all models using the latest food data.
     * @param {Array} trainingData - Array of raw food data records.
     * @returns {Object} Results of the training for all models.
     */
    retrainAll(trainingData) {
        const results = {};
        for (const [name, model] of Object.entries(this.models)) {
            results[name] = model.train(trainingData);
        }
        return results;
    }

    /**
     * Predicts using the specified model.
     * @param {string} modelName - 'linear-regression' or 'knn-regressor'.
     * @param {Object} inputData - The new data record to predict.
     * @returns {Object} Prediction result.
     */
    predict(modelName, inputData) {
        const model = this.models[modelName];
        if (!model) {
            throw new Error(`Model ${modelName} not found.`);
        }
        if (!model.getModelInfo().trained) {
             throw new Error(`Model ${modelName} is not trained.`);
        }
        return model.predict(inputData);
    }
    
    getAvailableModels() {
        return Object.keys(this.models);
    }

    getModelInfo(modelName) {
        const model = this.models[modelName];
        return model ? model.getModelInfo() : { trained: false };
    }
}

module.exports = new ModelManager();
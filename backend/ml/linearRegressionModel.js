// const preprocessor = require('./preprocessor');

// class LinearRegressionModel {
//   constructor() {
//     this.weights = null;
//     this.bias = null;
//     this.stats = null;
//     this.trained = false;
//     this.rSquared = 0;
//     this.featureCount = 0;
//   }

//   // Matrix operations
//   matrixMultiply(A, B) {
//     const rowsA = A.length;
//     const colsA = A[0].length;
//     const colsB = B[0].length;
//     const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));

//     for (let i = 0; i < rowsA; i++) {
//       for (let j = 0; j < colsB; j++) {
//         for (let k = 0; k < colsA; k++) {
//           result[i][j] += A[i][k] * B[k][j];
//         }
//       }
//     }
//     return result;
//   }

//   transpose(matrix) {
//     return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
//   }

//   // Calculate mean
//   mean(arr) {
//     return arr.reduce((sum, val) => sum + val, 0) / arr.length;
//   }

//   // Train model using Normal Equation: θ = (X^T * X)^-1 * X^T * y
//   train(trainingData) {
//     if (trainingData.length < 10) {
//       return {
//         success: false,
//         message: 'Need at least 10 training samples for reliable predictions'
//       };
//     }

//     try {
//       // Calculate statistics for normalization
//       this.stats = preprocessor.calculateStats(trainingData);

//       // Prepare feature matrix X and target vector y
//       const X = [];
//       const y = [];

//       trainingData.forEach(record => {
//         const features = preprocessor.prepareFeatures(record, this.stats);
//         X.push(features);
//         y.push(preprocessor.prepareTarget(record));
//       });

//       this.featureCount = X[0].length;
//       const m = X.length; // number of samples

//       // Add bias term (column of ones) to X
//       const X_with_bias = X.map(row => [1, ...row]);

//       // Calculate X^T
//       const X_T = this.transpose(X_with_bias);

//       // Calculate X^T * X
//       const XTX = this.matrixMultiply(X_T, X_with_bias);

//       // Calculate inverse of X^T * X using Gaussian elimination
//       const XTX_inv = this.matrixInverse(XTX);

//       if (!XTX_inv) {
//         // Fallback to gradient descent if matrix is singular
//         return this.trainWithGradientDescent(X, y);
//       }

//       // Calculate X^T * y
//       const XTy = X_T.map(row => 
//         row.reduce((sum, val, idx) => sum + val * y[idx], 0)
//       );

//       // Calculate theta = (X^T * X)^-1 * X^T * y
//       const theta = this.matrixMultiply(XTX_inv, XTy.map(val => [val])).map(row => row[0]);

//       this.bias = theta[0];
//       this.weights = theta.slice(1);

//       // Calculate R-squared
//       const predictions = X.map((features) => this.predictWithFeatures(features));
//       const yMean = this.mean(y);
//       const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
//       const ssResidual = y.reduce((sum, val, idx) => sum + Math.pow(val - predictions[idx], 2), 0);
//       this.rSquared = 1 - (ssResidual / ssTotal);

//       this.trained = true;

//       return {
//         success: true,
//         message: `Model trained successfully with ${m} samples`,
//         rSquared: this.rSquared,
//         featureCount: this.featureCount
//       };
//     } catch (error) {
//       console.error('Training error:', error);
//       return {
//         success: false,
//         message: 'Training failed: ' + error.message
//       };
//     }
//   }

//   // Gradient Descent as fallback
//   trainWithGradientDescent(X, y, learningRate = 0.01, iterations = 1000) {
//     const m = X.length;
//     const n = X[0].length;

//     // Initialize weights and bias
//     this.weights = Array(n).fill(0);
//     this.bias = 0;

//     // Helper function to make predictions without checking trained status
//     const makePrediction = (features) => {
//       let prediction = this.bias;
//       for (let i = 0; i < features.length; i++) {
//         prediction += this.weights[i] * features[i];
//       }
//       return Math.max(0, prediction);
//     };

//     // Training loop
//     for (let iter = 0; iter < iterations; iter++) {
//       let predictions = X.map(features => makePrediction(features));
      
//       // Calculate gradients
//       let biasGradient = 0;
//       let weightGradients = Array(n).fill(0);

//       for (let i = 0; i < m; i++) {
//         const error = predictions[i] - y[i];
//         biasGradient += error;
        
//         for (let j = 0; j < n; j++) {
//           weightGradients[j] += error * X[i][j];
//         }
//       }

//       // Update parameters
//       this.bias -= (learningRate / m) * biasGradient;
//       for (let j = 0; j < n; j++) {
//         this.weights[j] -= (learningRate / m) * weightGradients[j];
//       }
//     }

//     // Calculate R-squared
//     const predictions = X.map(features => makePrediction(features));
//     const yMean = this.mean(y);
//     const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
//     const ssResidual = y.reduce((sum, val, idx) => sum + Math.pow(val - predictions[idx], 2), 0);
//     this.rSquared = 1 - (ssResidual / ssTotal);

//     this.trained = true;

//     return {
//       success: true,
//       message: `Model trained with Gradient Descent (${iterations} iterations)`,
//       rSquared: this.rSquared,
//       featureCount: n
//     };
//   }

//   // Matrix inverse using Gauss-Jordan elimination
//   matrixInverse(matrix) {
//     const n = matrix.length;
//     const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

//     // Forward elimination
//     for (let i = 0; i < n; i++) {
//       // Find pivot
//       let maxRow = i;
//       for (let k = i + 1; k < n; k++) {
//         if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
//           maxRow = k;
//         }
//       }

//       // Swap rows
//       [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

//       // Check for singular matrix
//       if (Math.abs(augmented[i][i]) < 1e-10) {
//         return null;
//       }

//       // Scale pivot row
//       const pivot = augmented[i][i];
//       for (let j = 0; j < 2 * n; j++) {
//         augmented[i][j] /= pivot;
//       }

//       // Eliminate column
//       for (let k = 0; k < n; k++) {
//         if (k !== i) {
//           const factor = augmented[k][i];
//           for (let j = 0; j < 2 * n; j++) {
//             augmented[k][j] -= factor * augmented[i][j];
//           }
//         }
//       }
//     }

//     // Extract inverse matrix
//     return augmented.map(row => row.slice(n));
//   }

//   // Predict with prepared features
//   predictWithFeatures(features) {
//     if (!this.trained || !this.weights) {
//       throw new Error('Model not trained yet');
//     }

//     let prediction = this.bias;
//     for (let i = 0; i < features.length; i++) {
//       prediction += this.weights[i] * features[i];
//     }

//     return Math.max(0, prediction); // Waste can't be negative
//   }

//   // Predict waste for new data
//   predict(inputData) {
//     if (!this.trained) {
//       throw new Error('Model not trained yet');
//     }

//     const features = preprocessor.prepareFeatures(inputData, this.stats);
//     const prediction = this.predictWithFeatures(features);

//     // Calculate confidence based on R-squared and bounds
//     const confidence = Math.min(100, Math.max(0, this.rSquared * 100));

//     // Calculate waste percentage
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
//       hasWeights: this.weights !== null
//     };
//   }
// }

// module.exports = new LinearRegressionModel();





const preprocessor = require('./preprocessor');

class LinearRegressionModel {
  constructor() {
    this.weights = null;
    this.bias = null;
    this.stats = null;
    this.trained = false;
    this.rSquared = 0;
    this.featureCount = 0;
  }

  // Matrix operations
  matrixMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));

    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  transpose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  // Calculate mean
  mean(arr) {
    // Handle empty array gracefully
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  // Train model using Normal Equation: θ = (X^T * X)^-1 * X^T * y
  train(trainingData) {
    // Reset state in case of retraining attempt
    this.trained = false;
    this.weights = null;
    this.bias = null;
    this.rSquared = 0;

    if (trainingData.length < 10) {
      return {
        success: false,
        message: 'Need at least 10 training samples for reliable predictions'
      };
    }

    try {
      // Calculate statistics for normalization
      this.stats = preprocessor.calculateStats(trainingData);

      // Prepare feature matrix X and target vector y
      const X = [];
      const y = [];

      trainingData.forEach(record => {
        const features = preprocessor.prepareFeatures(record, this.stats);
        X.push(features);
        y.push(preprocessor.prepareTarget(record));
      });

      this.featureCount = X[0].length;
      const m = X.length; // number of samples

      // Add bias term (column of ones) to X
      const X_with_bias = X.map(row => [1, ...row]);

      // Calculate X^T
      const X_T = this.transpose(X_with_bias);

      // Calculate X^T * X
      const XTX = this.matrixMultiply(X_T, X_with_bias);

      // Calculate inverse of X^T * X using Gaussian elimination
      const XTX_inv = this.matrixInverse(XTX);

      if (!XTX_inv) {
        // Fallback to gradient descent if matrix is singular
        return this.trainWithGradientDescent(X, y);
      }

      // Calculate X^T * y
      const XTy = X_T.map(row => 
        row.reduce((sum, val, idx) => sum + val * y[idx], 0)
      );

      // Calculate theta = (X^T * X)^-1 * X^T * y
      const theta = this.matrixMultiply(XTX_inv, XTy.map(val => [val])).map(row => row[0]);

      // --- FIX START: Assign weights/bias BEFORE calculating R-squared ---
      this.bias = theta[0];
      this.weights = theta.slice(1);
      this.trained = true;
      // --- FIX END ---
      
      // Calculate R-squared (Now safe to call predictWithFeatures)
      const predictions = X.map((features) => this.predictWithFeatures(features));
      const yMean = this.mean(y);
      const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
      
      // Check for zero total variance
      if (ssTotal < 1e-6) {
          this.rSquared = 0;
      } else {
          const ssResidual = y.reduce((sum, val, idx) => sum + Math.pow(val - predictions[idx], 2), 0);
          this.rSquared = 1 - (ssResidual / ssTotal);
      }

      return {
        success: true,
        message: `Model trained successfully with ${m} samples (Normal Equation)`,
        rSquared: this.rSquared,
        featureCount: this.featureCount
      };
    } catch (error) {
      console.error('Training error:', error);
      return {
        success: false,
        message: 'Training failed: ' + error.message
      };
    }
  }

  // Gradient Descent as fallback
  trainWithGradientDescent(X, y, learningRate = 0.01, iterations = 1000) {
    const m = X.length;
    const n = X[0].length;

    // Initialize weights and bias
    this.weights = Array(n).fill(0);
    this.bias = 0;
    // Set trained temporarily true so internal prediction functions work during training loop
    // But we will reset it if the final R-squared calculation fails the prediction check.
    this.trained = true; 

    // Helper function to make predictions (can reuse predictWithFeatures if we handle the state correctly)
    const makePrediction = (features) => {
      let prediction = this.bias;
      for (let i = 0; i < features.length; i++) {
        prediction += this.weights[i] * features[i];
      }
      return Math.max(0, prediction);
    };

    // Training loop
    for (let iter = 0; iter < iterations; iter++) {
      let predictions = X.map(features => makePrediction(features));
      
      // Calculate gradients
      let biasGradient = 0;
      let weightGradients = Array(n).fill(0);

      for (let i = 0; i < m; i++) {
        const error = predictions[i] - y[i];
        biasGradient += error;
        
        for (let j = 0; j < n; j++) {
          weightGradients[j] += error * X[i][j];
        }
      }

      // Update parameters
      this.bias -= (learningRate / m) * biasGradient;
      for (let j = 0; j < n; j++) {
        this.weights[j] -= (learningRate / m) * weightGradients[j];
      }
    }

    // Calculate R-squared
    const predictions = X.map(features => makePrediction(features));
    const yMean = this.mean(y);
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    
    if (ssTotal < 1e-6) {
        this.rSquared = 0;
    } else {
        const ssResidual = y.reduce((sum, val, idx) => sum + Math.pow(val - predictions[idx], 2), 0);
        this.rSquared = 1 - (ssResidual / ssTotal);
    }
    
    this.trained = true; // Ensure trained flag is set after weights are final

    return {
      success: true,
      message: `Model trained with Gradient Descent (${iterations} iterations)`,
      rSquared: this.rSquared,
      featureCount: n
    };
  }

  // Matrix inverse using Gauss-Jordan elimination
  matrixInverse(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        return null; // Matrix is singular, cannot invert
      }

      // Scale pivot row
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse matrix
    return augmented.map(row => row.slice(n));
  }

  // Predict with prepared features
  predictWithFeatures(features) {
    // The check remains here to prevent prediction before successful training
    if (!this.trained || !this.weights) {
      throw new Error('Model not trained yet');
    }

    let prediction = this.bias;
    for (let i = 0; i < features.length; i++) {
      prediction += this.weights[i] * features[i];
    }

    return Math.max(0, prediction); // Waste can't be negative
  }

  // Predict waste for new data
  predict(inputData) {
    if (!this.trained) {
      throw new Error('Model not trained yet');
    }
    // Check for stats availability too, although training should set it.
    if (!this.stats) {
        throw new Error('Model trained, but missing preprocessing statistics.');
    }
    if (!inputData.planned_batch_kg || inputData.planned_batch_kg <= 0) {
        throw new Error('Planned batch quantity is required and must be positive for prediction.');
    }


    const features = preprocessor.prepareFeatures(inputData, this.stats);
    const prediction = this.predictWithFeatures(features);

    // Calculate confidence based on R-squared and bounds
    const confidence = Math.min(100, Math.max(0, this.rSquared * 100));

    // Calculate waste percentage
    const wastePercentage = (prediction / inputData.planned_batch_kg) * 100;

    return {
      predicted_waste_kg: Math.round(prediction * 100) / 100,
      waste_percentage: Math.round(wastePercentage * 100) / 100,
      confidence_score: Math.round(confidence * 100) / 100,
      model_accuracy: Math.round(this.rSquared * 10000) / 10000,
      recommendation: this.getRecommendation(wastePercentage)
    };
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

  // Get model info
  getModelInfo() {
    return {
      trained: this.trained,
      rSquared: this.rSquared,
      featureCount: this.featureCount,
      type: 'LinearRegression'
    };
  }
}

module.exports = new LinearRegressionModel();
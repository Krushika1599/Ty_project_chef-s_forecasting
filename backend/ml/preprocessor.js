
// class DataPreprocessor {
//     constructor() {
//         // Encoders and scalers properties are initialized but primarily managed implicitly via stats object
//         this.encoders = {};
//         this.scalers = {};
//     }

//     // --- Encoding Functions (Ordinal/Label Encoding) ---

//     // Encode day of week (0-6)
//     encodeDay(day) {
//         const dayMap = {
//             'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
//             'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
//         };
//         // Use lookup, default to a neutral value (Monday/0) if missing
//         return dayMap[day] !== undefined ? dayMap[day] : 0; 
//     }

//     // Encode holiday event (0 for None, 1 for other)
//     encodeHoliday(holiday) {
//         return holiday === 'None' ? 0 : 1;
//     }

//     // Encode meal type (0-3)
//     encodeMealType(mealType) {
//         const type = mealType ? mealType.toLowerCase() : '';
//         const mealMap = {
//             'breakfast': 0,
//             'lunch': 1,
//             'dinner': 2,
//             'snacks': 3
//         };
//         // Default to 1 (lunch) if missing
//         return mealMap[type] !== undefined ? mealMap[type] : 1;
//     }

//     // Encode food classification (0-3)
//     encodeFoodClassification(classification) {
//         const cls = classification ? classification.toLowerCase() : '';
//         const classMap = {
//             'veg': 0,
//             'non-veg': 1,
//             'vegan': 2,
//             'eggetarian': 3
//         };
//         // Default to 0 (veg) if missing
//         return classMap[cls] !== undefined ? classMap[cls] : 0;
//     }

//     // Extract time-based features (Month, Day of Month, isWeekend)
//     extractDateFeatures(date) {
//         // Use try-catch or safe date parsing as input.date may be a string or Date object
//         let d;
//         try {
//             d = new Date(date);
//             if (isNaN(d.getTime())) d = new Date(); // Fallback to current date if invalid
//         } catch (e) {
//             d = new Date();
//         }

//         return {
//             month: d.getMonth() + 1, // 1-12
//             dayOfMonth: d.getDate(), // 1-31
//             isWeekend: d.getDay() === 0 || d.getDay() === 6 ? 1 : 0
//         };
//     }

//     // --- Scaling/Normalization Functions (Min-Max Scaling) ---

//     // Min-Max Scaling formula
//     normalizeFeature(value, min, max) {
//         if (max === min) return 0;
//         return (value - min) / (max - min);
//     }

//     /**
//      * Calculates Min and Max for required numerical features from the training dataset.
//      */
//     calculateStats(data) {
//         // The names here must match the keys used in prepareFeatures and the Mongoose schema
//         const featuresToScale = [
//             'avg_temperature', 'occupancy_rate', 'menu_position_score',
//             'planned_batch_kg', 'original_price', 'actual_prepared_kg' // Include prepared kg for flexibility
//         ];
        
//         const stats = {};
//         featuresToScale.forEach(feature => {
//             stats[feature] = { min: Infinity, max: -Infinity };
//         });

//         data.forEach(record => {
//             featuresToScale.forEach(feature => {
//                 const value = record[feature] || 0;
//                 stats[feature].min = Math.min(stats[feature].min, value);
//                 stats[feature].max = Math.max(stats[feature].max, value);
//             });
//         });

//         // Add temperature, occupancy, menuScore, plannedBatch, and price for backward compatibility with linearRegression.js
//         // NOTE: The linearRegression.js model refers to these by the shorter names (e.g., stats.temperature.min)
//         stats.temperature = stats.avg_temperature;
//         stats.occupancy = stats.occupancy_rate;
//         stats.menuScore = stats.menu_position_score;
//         stats.plannedBatch = stats.planned_batch_kg;
//         stats.price = stats.original_price;

//         return stats;
//     }

//     // --- Main Preparation Functions ---

//     /**
//      * Converts a single record into a numerical feature vector.
//      * @param {Object} record - The raw data record.
//      * @param {Object} stats - The statistics object (min/max) calculated from training data.
//      * @returns {Array<number>} A flat array of numerical features.
//      */
//     prepareFeatures(record, stats) {
//         const dateFeatures = this.extractDateFeatures(record.date);
        
//         // Ensure stats object is correctly mapped to the shorter names used in the original code structure
//         const tempStats = {
//             temperature: stats.avg_temperature,
//             occupancy: stats.occupancy_rate,
//             menuScore: stats.menu_position_score,
//             plannedBatch: stats.planned_batch_kg,
//             price: stats.original_price
//         };

//         const features = [
//             // --- TIME & CATEGORICAL FEATURES (Encoded) ---
//             this.encodeDay(record.day),
//             this.encodeHoliday(record.holiday_event),
//             this.encodeMealType(record.meal_type),
//             this.encodeFoodClassification(record.food_classification),
//             dateFeatures.month,
//             dateFeatures.dayOfMonth,
//             dateFeatures.isWeekend,
            
//             // --- NUMERICAL FEATURES (Normalized using Min-Max Scaling) ---
//             this.normalizeFeature(record.avg_temperature, tempStats.temperature.min, tempStats.temperature.max),
//             this.normalizeFeature(record.occupancy_rate, tempStats.occupancy.min, tempStats.occupancy.max),
//             this.normalizeFeature(record.menu_position_score, tempStats.menuScore.min, tempStats.menuScore.max),
//             this.normalizeFeature(record.planned_batch_kg, tempStats.plannedBatch.min, tempStats.plannedBatch.max),
//             this.normalizeFeature(record.original_price, tempStats.price.min, tempStats.price.max),
            
//             // --- RAW/BINARY FEATURES ---
//             // Discount percentage is normalized to 0-1 range
//             (record.discount_percent || 0) / 100,
//             record.was_salvageable ? 1 : 0
//         ];

//         return features;
//     }

//     /**
//      * Prepares the target variable (y).
//      * @param {Object} record - The raw data record.
//      * @returns {number} The target value (actual_waste_kg).
//      */
//     prepareTarget(record) {
//         return record.actual_waste_kg || 0;
//     }
// }

// module.exports = new DataPreprocessor();






class DataPreprocessor {
    constructor() {
        this.encoders = {};
        this.scalers = {};
    }

    // --- Encoding Functions ---
    encodeDay(day) {
        const dayMap = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
            'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
        };
        return dayMap[day] !== undefined ? dayMap[day] : 0;
    }

    encodeHoliday(holiday) {
        return holiday === 'None' ? 0 : 1;
    }

    encodeMealType(mealType) {
        const type = mealType ? mealType.toLowerCase() : '';
        const mealMap = { 'breakfast': 0, 'lunch': 1, 'dinner': 2, 'snacks': 3 };
        return mealMap[type] !== undefined ? mealMap[type] : 1;
    }

    encodeFoodClassification(classification) {
        const cls = classification ? classification.toLowerCase() : '';
        const classMap = { 'veg': 0, 'non-veg': 1, 'vegan': 2, 'eggetarian': 3 };
        return classMap[cls] !== undefined ? classMap[cls] : 0;
    }

    extractDateFeatures(date) {
        let d;
        try {
            d = new Date(date);
            if (isNaN(d.getTime())) d = new Date();
        } catch (e) {
            d = new Date();
        }

        return {
            month: d.getMonth() + 1,
            dayOfMonth: d.getDate(),
            isWeekend: d.getDay() === 0 || d.getDay() === 6 ? 1 : 0
        };
    }

    // --- Scaling Functions ---
    normalizeFeature(value, min, max) {
        if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    /**
     * Calculate min/max stats for numerical features.
     */
    calculateStats(data) {
        const featuresToScale = [
            'avg_temperature', 'occupancy_rate', 'menu_position_score',
            'planned_batch_kg', 'original_price', 'actual_prepared_kg'
        ];

        const stats = {};
        featuresToScale.forEach(feature => {
            stats[feature] = { min: Infinity, max: -Infinity };
        });

        data.forEach(record => {
            featuresToScale.forEach(feature => {
                const val = Number(record[feature]);
                if (Number.isFinite(val)) {
                    stats[feature].min = Math.min(stats[feature].min, val);
                    stats[feature].max = Math.max(stats[feature].max, val);
                }
            });
        });

        // Prevent Infinity/NaN stats
        for (const [key, { min, max }] of Object.entries(stats)) {
            if (!Number.isFinite(min) || !Number.isFinite(max)) {
                stats[key].min = 0;
                stats[key].max = 1;
                console.warn(`[Preprocessor Warning]: Feature "${key}" has invalid range. Reset to (0,1).`);
            }
        }

        // Backward compatibility for other models
        stats.temperature = stats.avg_temperature;
        stats.occupancy = stats.occupancy_rate;
        stats.menuScore = stats.menu_position_score;
        stats.plannedBatch = stats.planned_batch_kg;
        stats.price = stats.original_price;

        return stats;
    }

    /**
     * Converts record to numeric feature array.
     */
    prepareFeatures(record, stats) {
        const dateFeatures = this.extractDateFeatures(record.date);

        const tempStats = {
            temperature: stats.avg_temperature,
            occupancy: stats.occupancy_rate,
            menuScore: stats.menu_position_score,
            plannedBatch: stats.planned_batch_kg,
            price: stats.original_price
        };

        const features = [
            this.encodeDay(record.day),
            this.encodeHoliday(record.holiday_event),
            this.encodeMealType(record.meal_type),
            this.encodeFoodClassification(record.food_classification),
            dateFeatures.month,
            dateFeatures.dayOfMonth,
            dateFeatures.isWeekend,
            this.normalizeFeature(record.avg_temperature, tempStats.temperature.min, tempStats.temperature.max),
            this.normalizeFeature(record.occupancy_rate, tempStats.occupancy.min, tempStats.occupancy.max),
            this.normalizeFeature(record.menu_position_score, tempStats.menuScore.min, tempStats.menuScore.max),
            this.normalizeFeature(record.planned_batch_kg, tempStats.plannedBatch.min, tempStats.plannedBatch.max),
            this.normalizeFeature(record.original_price, tempStats.price.min, tempStats.price.max),
            (record.discount_percent || 0) / 100,
            record.was_salvageable ? 1 : 0
        ];

        // Validation
        if (features.some(f => !Number.isFinite(f))) {
            console.error("⚠️ Non-finite features found for record:", record);
        }

        return features;
    }

    /**
     * Target variable (y)
     */
    prepareTarget(record) {
        return Number(record.actual_waste_kg) || 0;
    }
}

module.exports = new DataPreprocessor();

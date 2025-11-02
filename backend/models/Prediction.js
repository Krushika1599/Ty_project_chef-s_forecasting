

const mongoose = require('mongoose');

// ----------------------------------------------------
// 🛑 FIX: Defining predictionSchema here to resolve ReferenceError
// ----------------------------------------------------
const predictionSchema = new mongoose.Schema({
    // Input Features
    date: { type: Date, required: true },
    day: { type: String, required: true },
    holiday_event: { type: String, default: 'None' },
    avg_temperature: { type: Number, required: true },
    occupancy_rate: { type: Number, required: true },
    meal_type: { type: String, required: true },
    dish_name: { type: String, required: true },
    food_classification: { type: String, required: true },
    menu_position_score: { type: Number, required: true },
    planned_batch_kg: { type: Number, required: true },
    
    // Prediction Output
    predicted_waste_kg: { type: Number, required: true },
    confidence_score: { type: Number }, // 0-100
    model_accuracy: { type: Number }, // R-squared value
    
    // Actual Results (filled in later)
    actual_waste_kg: { type: Number },
    prediction_error: { type: Number },
    
    // Metadata
    created_at: { type: Date, default: Date.now }
});
// ----------------------------------------------------

// FIX: This line prevents the OverwriteModelError for the Prediction model itself.
module.exports = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);

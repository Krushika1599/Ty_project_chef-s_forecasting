
const mongoose = require('mongoose');

const foodDataSchema = new mongoose.Schema({
    // Date and Time Features
    date: { type: Date, required: true },
    day: { type: String, required: true }, // Monday, Tuesday, etc.
    holiday_event: { type: String, default: 'None' }, // Holiday name or "None"
    
    // Environmental Features
    avg_temperature: { type: Number, required: true }, // in Celsius
    
    // Hotel Features
    occupancy_rate: { type: Number, required: true }, // percentage (0-100)
    
    // Meal Features
    meal_type: { 
        type: String, 
        required: true,
        enum: ['breakfast', 'lunch', 'dinner', 'snacks']
    },
    
    // Dish Features
    dish_name: { type: String, required: true },
    food_classification: { 
        type: String, 
        required: true,
        enum: ['veg', 'non-veg', 'vegan', 'eggetarian']
    },
    menu_position_score: { 
        type: Number, 
        required: true,
        min: 1,
        max: 10 
    }, // 1-10, popularity score
    
    // Quantity Features
    planned_batch_kg: { type: Number, required: true }, // Planned quantity
    actual_prepared_kg: { type: Number, required: true }, // Actually prepared
    actual_waste_kg: { type: Number, required: true }, // Actual leftover/waste
    
    // Sales Features
    pickup_time_window: { type: String }, // e.g., "12:00-14:00"
    datetime_listed: { type: Date },
    was_salvageable: { type: Boolean, default: false },
    
    // Pricing Features
    original_price: { type: Number, required: true },
    discount_percent: { type: Number, default: 0 },
    quantity_for_sale: { type: Number, default: 0 },
    discounted_price: { type: Number, default: 0 },
    
    // Metadata
    created_at: { type: Date, default: Date.now }
});

// Create indexes for better query performance
foodDataSchema.index({ dish_name: 1, date: -1 });
foodDataSchema.index({ meal_type: 1 });
foodDataSchema.index({ date: -1 });

// This ensures Mongoose doesn't try to define the model if it already exists.
module.exports = mongoose.models.FoodData || mongoose.model('FoodData', foodDataSchema);

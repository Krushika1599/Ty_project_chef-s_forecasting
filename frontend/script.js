const API_URL = 'http://localhost:5000/api';

// Tab switching
function switchTab(tabName, event) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Use the passed event object if available, otherwise manually query the element
    const targetElement = event ? event.target : document.querySelector(`.tab[onclick*="switchTab('${tabName}')"]`);
    if (targetElement) {
        targetElement.classList.add('active');
    }
    
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'history') loadHistory();
    if (tabName === 'prediction') loadDishes();
}

// Load dashboard stats
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/fooddata/stats`);
        const data = await response.json();

        document.getElementById('totalRecords').textContent = data.total_records || 0;
        document.getElementById('totalWaste').textContent = data.total_waste_kg || 0;
        document.getElementById('avgWaste').textContent = (data.avg_waste_percent || 0).toFixed(2) + '%';
        
        const modelInfo = data.model_info;
        if (modelInfo && modelInfo.trained) {
            document.getElementById('modelAccuracy').textContent = 
                (modelInfo.rSquared * 100).toFixed(2) + '%';
            document.getElementById('modelStatusText').innerHTML = 
                `✅ Model trained with <strong>${data.total_records}</strong> records. R² Score: <strong>${modelInfo.rSquared.toFixed(4)}</strong>`;
        } else {
            document.getElementById('modelAccuracy').textContent = 'N/A';
            document.getElementById('modelStatusText').textContent = 
                '⚠️ Model not trained. Please add at least 10 records.';
        }

        // Update top waste table
        const tbody = document.getElementById('topWasteBody');
        if (data.top_waste_dishes && data.top_waste_dishes.length > 0) {
            tbody.innerHTML = data.top_waste_dishes.map(dish => `
                <tr>
                    <td>${dish.dish_name}</td>
                    <td>${dish.total_waste.toFixed(2)}</td>
                    <td>
                        <span class="badge ${dish.avg_waste_percent > 20 ? 'badge-danger' : dish.avg_waste_percent > 10 ? 'badge-warning' : 'badge-success'}">
                            ${dish.avg_waste_percent.toFixed(2)}%
                        </span>
                    </td>
                    <td>${dish.count}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6c757d;">No data available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Submit food data
async function submitFoodData(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        if (key === 'date' || key === 'datetime_listed') {
            data[key] = value;
        } else if (['avg_temperature', 'occupancy_rate', 'menu_position_score', 
                    'planned_batch_kg', 'actual_prepared_kg', 'actual_waste_kg',
                    'original_price', 'discount_percent', 'quantity_for_sale', 
                    'discounted_price'].includes(key)) {
            data[key] = parseFloat(value) || 0;
        } else if (key === 'was_salvageable') {
            data[key] = value === 'true';
        } else {
            data[key] = value;
        }
    });

    try {
        const response = await fetch(`${API_URL}/fooddata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        const resultDiv = document.getElementById('dataEntryResult');
        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <strong>✅ Success!</strong> Data added successfully.<br>
                    <strong>Model Status:</strong> ${result.modelStatus.message}
                    ${result.modelStatus.rSquared ? `<br><strong>Model R² Score:</strong> ${result.modelStatus.rSquared.toFixed(4)}` : ''}
                </div>
            `;
            form.reset();
            loadDashboard();
        } else {
            resultDiv.innerHTML = `<div class="alert alert-warning"><strong>⚠️ Error:</strong> ${result.message}</div>`;
        }
    } catch (error) {
        document.getElementById('dataEntryResult').innerHTML = 
            `<div class="alert alert-warning"><strong>❌ Error:</strong> ${error.message}</div>`;
    }
}

// --- HELPER FUNCTION TO RENDER SINGLE MODEL CARD ---
function renderPredictionCard(modelName, data, inputData) {
    const wasteClass = data.waste_percentage > 20 ? 'badge-danger' : 
                       data.waste_percentage > 10 ? 'badge-warning' : 'badge-success';
    
    const modelClass = modelName.replace(/ /g, '-').toLowerCase();

    // Set specific colors for model titles and border
    let titleColor = '#667eea'; // Linear Regression (Default)
    let borderColor = '#667eea';
    if (modelClass.includes('knn')) { titleColor = '#28a745'; borderColor = '#28a745'; }
    if (modelClass.includes('random-forest')) { titleColor = '#ff7f00'; borderColor = '#ff7f00'; }

    return `
        <div class="model-result-card ${modelClass}" style="border-left: 5px solid ${borderColor};">
            <h3 style="color: ${titleColor};">${modelName} Prediction</h3>
            
            <div class="prediction-detail">
                <span>Dish Name:</span>
                <span>${inputData.dish_name}</span>
            </div>
            <div class="prediction-detail">
                <span>Planned Batch:</span>
                <span>${inputData.planned_batch_kg} kg</span>
            </div>
            
            <div class="prediction-detail">
                <span>Predicted Waste Leftover:</span>
                <span class="waste-value">${data.predicted_waste_kg.toFixed(2)} kg</span>
            </div>
            
            <div class="prediction-detail">
                <span>Waste Percentage:</span>
                <span class="badge ${wasteClass}">${data.waste_percentage.toFixed(2)}%</span>
            </div>
            
            <div class="prediction-detail">
                <span>Confidence Score:</span>
                <span>${data.confidence_score !== undefined && data.confidence_score !== null ? data.confidence_score.toFixed(2) + '%' : 'N/A'}</span>
            </div>
            
            <div class="prediction-detail">
                <span>Model Accuracy (R²):</span>
                <span>${data.model_accuracy !== undefined && data.model_accuracy !== null ? data.model_accuracy.toFixed(4) : 'N/A'}</span>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: #e9f5ff; border-radius: 5px;">
                <strong>💡 Recommendation:</strong> ${data.recommendation}
            </div>
            
            <div style="margin-top: 10px;">
                <strong>Confidence Level:</strong>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${data.confidence_score || 0}%"></div>
                </div>
            </div>
        </div>
    `;
}

// Make prediction (Updated to handle multiple models)
async function makePrediction(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const inputData = {};

    formData.forEach((value, key) => {
        if (key === 'date') {
            inputData[key] = value;
        } else if (['avg_temperature', 'occupancy_rate', 'menu_position_score', 
                    'planned_batch_kg', 'original_price', 'discount_percent'].includes(key)) {
            inputData[key] = parseFloat(value) || 0;
        } else if (key === 'was_salvageable') {
            inputData[key] = value === 'true';
        } else {
            inputData[key] = value;
        }
    });

    const comparisonGrid = document.getElementById('resultsComparisonGrid');
    const loading = document.getElementById('predictionLoading');
    
    // --- FIX START: Clear previous content before showing loading spinner ---
    comparisonGrid.innerHTML = '';
    // --- FIX END ---
    
    loading.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/prediction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputData)
        });

        const result = await response.json();
        
        loading.style.display = 'none';

        if (response.ok && result.results) {
            
            // Collect all generated HTML strings
            let resultsHtml = '';
            const modelKeys = Object.keys(result.results);
            
            modelKeys.forEach(key => {
                const modelResult = result.results[key];
                // Convert internal keys (e.g., 'random-forest') to display names (e.g., 'Random Forest')
                let displayName = key.replace(/-/g, ' '); 
                displayName = displayName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                // Check for specific error status from the backend
                if (modelResult.error) {
                     resultsHtml += `<div class="model-result-card" style="border-left: 5px solid #ffc107;">
                         <h3>${displayName} Prediction</h3>
                         <div class="alert alert-warning"><strong>⚠️ Error:</strong> ${modelResult.message}</div>
                      </div>`;
                } else {
                     resultsHtml += renderPredictionCard(displayName, modelResult, inputData);
                }
            });

            // Append all results at once (already cleared above)
            comparisonGrid.innerHTML = resultsHtml;

            // Update history after successful prediction
            loadHistory();
            
        } else {
            comparisonGrid.innerHTML = `<div class="alert alert-warning"><strong>⚠️ Error:</strong> ${result.message || 'Prediction failed.'}</div>`;
        }
    } catch (error) {
        loading.style.display = 'none';
        comparisonGrid.innerHTML = 
            `<div class="alert alert-warning"><strong>❌ Error:</strong> ${error.message}</div>`;
    }
}

// Load prediction history
async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/prediction`);
        const predictions = await response.json();

        const tbody = document.getElementById('historyBody');
        if (predictions.length > 0) {
            tbody.innerHTML = predictions.map(pred => {
                // Use prediction_waste_kg and planned_batch_kg from the saved record
                const wastePercent = (pred.predicted_waste_kg / pred.planned_batch_kg * 100).toFixed(2);
                const badgeClass = wastePercent > 20 ? 'badge-danger' : 
                                       wastePercent > 10 ? 'badge-warning' : 'badge-success';
                
                return `
                    <tr>
                        <td>${new Date(pred.date).toLocaleDateString()}</td>
                        <td>${pred.dish_name}</td>
                        <td>${pred.planned_batch_kg}</td>
                        <td>${pred.predicted_waste_kg}</td>
                        <td><span class="badge ${badgeClass}">${wastePercent}%</span></td>
                        <td>${pred.confidence_score ? pred.confidence_score.toFixed(2) + '%' : 'N/A'}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6c757d;">No predictions yet</td></tr>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Load available dishes for datalist
async function loadDishes() {
    try {
        const response = await fetch(`${API_URL}/fooddata/dishes`);
        const dishes = await response.json();
        
        const datalist = document.getElementById('dishList');
        datalist.innerHTML = dishes.map(dish => `<option value="${dish}">`).join('');
    } catch (error) {
        console.error('Error loading dishes:', error);
    }
}

// Load sample data
async function loadSampleData() {
    // Note: The use of `confirm()` and `alert()` is generally discouraged in production environments running in iframes.
    if (!confirm('This will add 20 sample records. Continue?')) return; 

    const sampleData = [
        {
            date: '2025-01-15', day: 'Monday', holiday_event: 'None', avg_temperature: 22,
            occupancy_rate: 75, meal_type: 'lunch', dish_name: 'Chicken Biryani',
            food_classification: 'non-veg', menu_position_score: 9, planned_batch_kg: 50,
            actual_prepared_kg: 48, actual_waste_kg: 5, original_price: 350,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-15', day: 'Monday', holiday_event: 'None', avg_temperature: 22,
            occupancy_rate: 75, meal_type: 'lunch', dish_name: 'Paneer Butter Masala',
            food_classification: 'veg', menu_position_score: 8, planned_batch_kg: 40,
            actual_prepared_kg: 38, actual_waste_kg: 3, original_price: 280,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-16', day: 'Tuesday', holiday_event: 'None', avg_temperature: 24,
            occupancy_rate: 80, meal_type: 'dinner', dish_name: 'Butter Chicken',
            food_classification: 'non-veg', menu_position_score: 10, planned_batch_kg: 60,
            actual_prepared_kg: 58, actual_waste_kg: 7, original_price: 400,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-17', day: 'Wednesday', holiday_event: 'None', avg_temperature: 23,
            occupancy_rate: 70, meal_type: 'lunch', dish_name: 'Fish Curry',
            food_classification: 'non-veg', menu_position_score: 7, planned_batch_kg: 35,
            actual_prepared_kg: 33, actual_waste_kg: 4, original_price: 380,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-18', day: 'Thursday', holiday_event: 'None', avg_temperature: 25,
            occupancy_rate: 85, meal_type: 'dinner', dish_name: 'Mutton Rogan Josh',
            food_classification: 'non-veg', menu_position_score: 8, planned_batch_kg: 45,
            actual_prepared_kg: 44, actual_waste_kg: 6, original_price: 450,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-19', day: 'Friday', holiday_event: 'None', avg_temperature: 26,
            occupancy_rate: 90, meal_type: 'lunch', dish_name: 'Chicken Biryani',
            food_classification: 'non-veg', menu_position_score: 9, planned_batch_kg: 70,
            actual_prepared_kg: 68, actual_waste_kg: 8, original_price: 350,
            discount_percent: 10, quantity_for_sale: 5, discounted_price: 315,
            was_salvageable: true
        },
        {
            date: '2025-01-20', day: 'Saturday', holiday_event: 'None', avg_temperature: 27,
            occupancy_rate: 95, meal_type: 'dinner', dish_name: 'Paneer Tikka',
            food_classification: 'veg', menu_position_score: 9, planned_batch_kg: 55,
            actual_prepared_kg: 54, actual_waste_kg: 4, original_price: 320,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-21', day: 'Sunday', holiday_event: 'None', avg_temperature: 26,
            occupancy_rate: 88, meal_type: 'lunch', dish_name: 'Dal Makhani',
            food_classification: 'veg', menu_position_score: 7, planned_batch_kg: 30,
            actual_prepared_kg: 28, actual_waste_kg: 2, original_price: 200,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-22', day: 'Monday', holiday_event: 'Republic Day', avg_temperature: 20,
            occupancy_rate: 100, meal_type: 'lunch', dish_name: 'Butter Chicken',
            food_classification: 'non-veg', menu_position_score: 10, planned_batch_kg: 80,
            actual_prepared_kg: 78, actual_waste_kg: 3, original_price: 400,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-23', day: 'Tuesday', holiday_event: 'None', avg_temperature: 22,
            occupancy_rate: 65, meal_type: 'dinner', dish_name: 'Chicken Biryani',
            food_classification: 'non-veg', menu_position_score: 9, planned_batch_kg: 45,
            actual_prepared_kg: 43, actual_waste_kg: 6, original_price: 350,
            discount_percent: 15, quantity_for_sale: 4, discounted_price: 297.5,
            was_salvageable: true
        },
        {
            date: '2025-01-24', day: 'Wednesday', holiday_event: 'None', avg_temperature: 24,
            occupancy_rate: 72, meal_type: 'lunch', dish_name: 'Veg Pulao',
            food_classification: 'veg', menu_position_score: 6, planned_batch_kg: 35,
            actual_prepared_kg: 34, actual_waste_kg: 5, original_price: 180,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-25', day: 'Thursday', holiday_event: 'None', avg_temperature: 23,
            occupancy_rate: 78, meal_type: 'dinner', dish_name: 'Fish Curry',
            food_classification: 'non-veg', menu_position_score: 7, planned_batch_kg: 40,
            actual_prepared_kg: 38, actual_waste_kg: 5, original_price: 380,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-26', day: 'Friday', holiday_event: 'None', avg_temperature: 25,
            occupancy_rate: 82, meal_type: 'lunch', dish_name: 'Paneer Butter Masala',
            food_classification: 'veg', menu_position_score: 8, planned_batch_kg: 48,
            actual_prepared_kg: 46, actual_waste_kg: 4, original_price: 280,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-27', day: 'Saturday', holiday_event: 'None', avg_temperature: 26,
            occupancy_rate: 92, meal_type: 'dinner', dish_name: 'Butter Chicken',
            food_classification: 'non-veg', menu_position_score: 10, planned_batch_kg: 65,
            actual_prepared_kg: 63, actual_waste_kg: 7, original_price: 400,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-28', day: 'Sunday', holiday_event: 'None', avg_temperature: 27,
            occupancy_rate: 87, meal_type: 'lunch', dish_name: 'Chicken Biryani',
            food_classification: 'non-veg', menu_position_score: 9, planned_batch_kg: 55,
            actual_prepared_kg: 53, actual_waste_kg: 6, original_price: 350,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-29', day: 'Monday', holiday_event: 'None', avg_temperature: 24,
            occupancy_rate: 68, meal_type: 'dinner', dish_name: 'Mutton Rogan Josh',
            food_classification: 'non-veg', menu_position_score: 8, planned_batch_kg: 42,
            actual_prepared_kg: 40, actual_waste_kg: 7, original_price: 450,
            discount_percent: 20, quantity_for_sale: 6, discounted_price: 360,
            was_salvageable: true
        },
        {
            date: '2025-01-30', day: 'Tuesday', holiday_event: 'None', avg_temperature: 23,
            occupancy_rate: 74, meal_type: 'lunch', dish_name: 'Paneer Tikka',
            food_classification: 'veg', menu_position_score: 9, planned_batch_kg: 50,
            actual_prepared_kg: 48, actual_waste_kg: 3, original_price: 320,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-01-31', day: 'Wednesday', holiday_event: 'None', avg_temperature: 22,
            occupancy_rate: 71, meal_type: 'dinner', dish_name: 'Dal Makhani',
            food_classification: 'veg', menu_position_score: 7, planned_batch_kg: 32,
            actual_prepared_kg: 30, actual_waste_kg: 3, original_price: 200,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-02-01', day: 'Thursday', holiday_event: 'None', avg_temperature: 25,
            occupancy_rate: 79, meal_type: 'lunch', dish_name: 'Fish Curry',
            food_classification: 'non-veg', menu_position_score: 7, planned_batch_kg: 38,
            actual_prepared_kg: 36, actual_waste_kg: 4, original_price: 380,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        },
        {
            date: '2025-02-02', day: 'Friday', holiday_event: 'None', avg_temperature: 26,
            occupancy_rate: 86, meal_type: 'dinner', dish_name: 'Butter Chicken',
            food_classification: 'non-veg', menu_position_score: 10, planned_batch_kg: 62,
            actual_prepared_kg: 60, actual_waste_kg: 6, original_price: 400,
            discount_percent: 0, quantity_for_sale: 0, discounted_price: 0,
            was_salvageable: false
        }
    ];

    try {
        const response = await fetch(`${API_URL}/fooddata/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sampleData)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert(`✅ Successfully added ${sampleData.length} sample records!\n\nModel Status: ${result.modelStatus.message}`);
            loadDashboard();
        } else {
            alert('⚠️ Error adding sample data: ' + result.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// Initialize dashboard on load
window.onload = () => {
    loadDashboard();
    loadDishes();
};
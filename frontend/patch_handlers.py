import re

with open('/root/bioarc-backend/mqtt/handlers.go', 'r') as f:
    content = f.read()

cache_vars = """
var (
	lastTcsR            int
	lastTcsG            int
	lastTcsB            int
	lastTcsC            int
	lastWaterTemp       float64
	lastPhotoperiod     bool
	lastAirPump         bool
	lastPredictedPh     float64
	lastPredictedDo     float64
	hasCachedPrediction bool
)
"""

if 'lastTcsR' not in content:
    content = content.replace('func handleTelemetry', cache_vars + '\nfunc handleTelemetry')

new_handle_telemetry = """
	// Check if caching applies
	cacheHit := hasCachedPrediction &&
		payload.TCS34725_R == lastTcsR &&
		payload.TCS34725_G == lastTcsG &&
		payload.TCS34725_B == lastTcsB &&
		payload.TCS34725_C == lastTcsC &&
		payload.WaterTemp == lastWaterTemp &&
		payload.Relays.Light == lastPhotoperiod &&
		payload.Relays.Air == lastAirPump

	var predictedPh, predictedDo float64
	if cacheHit {
		predictedPh = lastPredictedPh
		predictedDo = lastPredictedDo
	} else {
		predictedPh, predictedDo = fetchMLPredictions(payload)
		
		// Update Cache
		lastTcsR = payload.TCS34725_R
		lastTcsG = payload.TCS34725_G
		lastTcsB = payload.TCS34725_B
		lastTcsC = payload.TCS34725_C
		lastWaterTemp = payload.WaterTemp
		lastPhotoperiod = payload.Relays.Light
		lastAirPump = payload.Relays.Air
		lastPredictedPh = predictedPh
		lastPredictedDo = predictedDo
		hasCachedPrediction = true
	}
	
	if cacheHit {
		// log.Printf("[ML Service] Cache HIT: ph=%.2f, do=%.2f", predictedPh, predictedDo)
	} else {
		log.Printf("[ML Service] Cache MISS: Prediction response: ph=%.2f, do=%.2f", predictedPh, predictedDo)
	}
"""

old_prediction_logic = """
	// Fetch ML predictions
	predictedPh, predictedDo := fetchMLPredictions(payload)
	log.Printf("[ML Service] Prediction response: ph=%.2f, do=%.2f", predictedPh, predictedDo)
"""

content = content.replace(old_prediction_logic.strip(), new_handle_telemetry.strip())

with open('/root/bioarc-backend/mqtt/handlers.go', 'w') as f:
    f.write(content)

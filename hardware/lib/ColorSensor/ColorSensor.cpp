#include "ColorSensor.h"
#include <TelnetStream.h>
#include <math.h>

ColorSensor::ColorSensor() {
    // We use a relatively quick integration time, since we only call it on demand
    _tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_4X);
    _initialized = false;
    _lastR = 0;
    _lastG = 0;
    _lastB = 0;
    _lastC = 0;
    // Default baseline: clean water under red+blue grow lights
    // Grow lights make R and B slightly higher than G in clear water
    _baseR = 1500;
    _baseG = 1350;
    _baseB = 1450;
    _baseC = 4300;
    _hasBaseline = true;
}

void ColorSensor::begin(uint8_t i2cAddress) {
    if (_tcs.begin(i2cAddress)) {
        Serial.println("[SYSTEM] TCS34725 Color Sensor Initialized.");
        TelnetStream.println("[SYSTEM] TCS34725 Color Sensor Initialized.");
        _initialized = true;
    } else {
        Serial.println("[ERROR] TCS34725 not found! Check wiring.");
        TelnetStream.println("[ERROR] TCS34725 not found! Check wiring.");
        _initialized = false;
    }
}

void ColorSensor::takeReading(SemaphoreHandle_t i2cMutex) {
    if (!_initialized) return;
    
    if (i2cMutex) xSemaphoreTake(i2cMutex, portMAX_DELAY);
    _tcs.getRawData(&_lastR, &_lastG, &_lastB, &_lastC);
    if (i2cMutex) xSemaphoreGive(i2cMutex);
    
    Serial.printf("[SENSOR] Color Read - R:%d G:%d B:%d C:%d\n", _lastR, _lastG, _lastB, _lastC);
    TelnetStream.printf("[SENSOR] Color Read - R:%d G:%d B:%d C:%d\n", _lastR, _lastG, _lastB, _lastC);
}

void ColorSensor::takeAveragedReading(uint8_t samples, SemaphoreHandle_t i2cMutex) {
    if (!_initialized || samples == 0) return;
    
    uint32_t sumR = 0, sumG = 0, sumB = 0, sumC = 0;
    uint16_t r, g, b, c;
    
    for (uint8_t i = 0; i < samples; i++) {
        if (i2cMutex) xSemaphoreTake(i2cMutex, portMAX_DELAY);
        _tcs.getRawData(&r, &g, &b, &c);
        if (i2cMutex) xSemaphoreGive(i2cMutex);

        sumR += r;
        sumG += g;
        sumB += b;
        sumC += c;
        vTaskDelay(pdMS_TO_TICKS(15)); // Small FreeRTOS yield between reads
    }
    
    _lastR = sumR / samples;
    _lastG = sumG / samples;
    _lastB = sumB / samples;
    _lastC = sumC / samples;
    
    Serial.printf("[SENSOR] Averaged Color Read (%d samples) - R:%d G:%d B:%d C:%d\n", samples, _lastR, _lastG, _lastB, _lastC);
    TelnetStream.printf("[SENSOR] Averaged Color Read (%d samples) - R:%d G:%d B:%d C:%d\n", samples, _lastR, _lastG, _lastB, _lastC);
}

void ColorSensor::setBaseline() {
    _baseR = _lastR;
    _baseG = _lastG;
    _baseB = _lastB;
    _baseC = _lastC;
    _hasBaseline = (_baseC > 0);
    Serial.printf("[SENSOR] Baseline Captured - R:%d G:%d B:%d C:%d\n", _baseR, _baseG, _baseB, _baseC);
    TelnetStream.printf("[SENSOR] Baseline Captured - R:%d G:%d B:%d C:%d\n", _baseR, _baseG, _baseB, _baseC);
}

void ColorSensor::loadBaseline(uint16_t r0, uint16_t g0, uint16_t b0, uint16_t c0) {
    if (c0 == 0) {
        // Fallback: clean water under red+blue grow lights
        r0 = 1500; g0 = 1350; b0 = 1450; c0 = 4300;
    }
    _baseR = r0;
    _baseG = g0;
    _baseB = b0;
    _baseC = c0;
    _hasBaseline = true;
    Serial.printf("[SENSOR] Baseline Loaded from NVS - R:%d G:%d B:%d C:%d\n", _baseR, _baseG, _baseB, _baseC);
    TelnetStream.printf("[SENSOR] Baseline Loaded from NVS - R:%d G:%d B:%d C:%d\n", _baseR, _baseG, _baseB, _baseC);
}

bool ColorSensor::hasBaseline() const {
    return _hasBaseline;
}

uint16_t ColorSensor::getRed() const { return _lastR; }
uint16_t ColorSensor::getGreen() const { return _lastG; }
uint16_t ColorSensor::getBlue() const { return _lastB; }
uint16_t ColorSensor::getClear() const { return _lastC; }

float ColorSensor::getGreenRatio() const {
    uint32_t total = (uint32_t)_lastR + _lastG + _lastB;
    if (total == 0) return 0.0f;
    return (float)_lastG / (float)total;
}

float ColorSensor::getGRRatio() const {
    if (_lastR == 0) return 0.0f;
    return (float)_lastG / (float)_lastR;
}

// =============================================================================
// GREEN EXCESS INDEX (GEI) — Grow-Light-Aware Biomass Detection
// =============================================================================
// Under red+blue grow lights, as algae density increases:
//   - Green channel ALWAYS rises (chlorophyll reflects green → monotonic)
//   - Red & Blue rise unpredictably from scattering (breaks ratio approaches)
//
// Therefore: use ABSOLUTE Green excess over clean-water baseline.
//
//   Pseudo-OD = (currentG - baselineG) / baselineG
//
// Verified with real sensor data:
//   Clean water:  G ≈ 1350  → OD = 0.00
//   30% density:  G = 1676  → OD = 0.24  ✓
//   45% density:  G = 1772  → OD = 0.31  ✓
//   Harvest:      G ≈ 2700  → OD = 1.00  (projected)
// =============================================================================

float ColorSensor::getPseudoOD() const {
    if (!_hasBaseline || _baseG == 0) return 0.0f;
    
    // Green Excess: how much greener is the water vs clean baseline
    float od = ((float)_lastG - (float)_baseG) / (float)_baseG;
    
    return (od < 0.0f) ? 0.0f : od;
}

float ColorSensor::getVegetationIndex() const {
    if (_lastC == 0) return 0.0f;
    return (float)(2 * (int32_t)_lastG - (int32_t)_lastR - (int32_t)_lastB) / (float)_lastC;
}

float ColorSensor::getEstimatedChlA(float calibK) const {
    return calibK * getPseudoOD();
}



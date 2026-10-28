#ifndef COLOR_SENSOR_H
#define COLOR_SENSOR_H

#include <Arduino.h>
#include <Adafruit_TCS34725.h>

class ColorSensor {
public:
    ColorSensor();
    
    // Initializes the sensor
    void begin(uint8_t i2cAddress = 0x29);
    
    // Performs a read of the sensor. Optional mutex parameter for FreeRTOS bus sharing.
    void takeReading(SemaphoreHandle_t i2cMutex = NULL);
    
    // Performs N consecutive reads (default 5), averages them, and updates internal RGB/C state.
    // Interleaves mutex release between samples to allow other I2C peripherals to run.
    void takeAveragedReading(uint8_t samples = 5, SemaphoreHandle_t i2cMutex = NULL);
    
    // Baseline management for clean-water reference
    void setBaseline(); // Captures current _lastR/G/B/C as baseline
    void loadBaseline(uint16_t r0, uint16_t g0, uint16_t b0, uint16_t c0);
    bool hasBaseline() const;
    
    // Raw getters
    uint16_t getRed() const;
    uint16_t getGreen() const;
    uint16_t getBlue() const;
    uint16_t getClear() const;

    // Computed optical & biomass metrics
    float getGreenRatio() const;      // G / (R + G + B)
    float getGRRatio() const;         // G / R
    float getPseudoOD() const;        // -log10(C / C_baseline)
    float getVegetationIndex() const; // (2*G - R - B) / C
    float getEstimatedChlA(float calibK) const; // calibK * pseudoOD -> µg/L

private:
    Adafruit_TCS34725 _tcs;
    bool _initialized;
    uint16_t _lastR, _lastG, _lastB, _lastC;
    uint16_t _baseR, _baseG, _baseB, _baseC;
    bool _hasBaseline;
};

#endif

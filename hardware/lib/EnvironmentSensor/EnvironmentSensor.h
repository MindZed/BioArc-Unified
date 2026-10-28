#ifndef ENVIRONMENT_SENSOR_H
#define ENVIRONMENT_SENSOR_H

#include <Arduino.h>
#include <Adafruit_BME280.h>

class EnvironmentSensor {
public:
    EnvironmentSensor();
    
    void begin(uint8_t i2cAddress = 0x76);
    void update(); // Handles the non-blocking read timer
    
    float getAirTemp();
    float getHumidity();
    float getPressure();

private:
    Adafruit_BME280 _bme;
    float _lastTemp;
    float _lastHum;
    float _lastPress;
    unsigned long _lastReadTime;
    const unsigned long READ_INTERVAL = 10000; // 10 seconds
};

#endif

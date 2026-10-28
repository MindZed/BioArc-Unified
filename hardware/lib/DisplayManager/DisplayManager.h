#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <LiquidCrystal_I2C.h>

class DisplayManager {
public:
    DisplayManager(uint8_t lcd1_addr, uint8_t lcd2_addr);
    void begin();
    void setBacklight(bool state);
    
    // Updates internal state buffers
    void setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk);
    void setTelemetryData(float wTemp, float aTemp, float hum, int level, String timeStr);
    
    // Renders the alternating pages
    void update();

private:
    LiquidCrystal_I2C _lcdStatus;   // LCD 1 (System & Network)
    LiquidCrystal_I2C _lcdTelemetry;// LCD 2 (Environment)
    
    unsigned long _lastUpdate;
    unsigned long _lastPageFlip;
    const unsigned long REFRESH_RATE = 1000; 
    const unsigned long PAGE_DURATION = 3000; // Flip pages every 3 seconds
    
    bool _pageA;
    
    // Stored Data
    const char* _state;
    String _ip;
    bool _wifiStatus, _mqttStatus;
    
    float _waterTemp, _ambTemp, _humidity;
    int _waterLevel;
    String _timeStr;
    
    // Helpers
    void printPadded(LiquidCrystal_I2C& lcd, const char* text, int row);
};

#endif

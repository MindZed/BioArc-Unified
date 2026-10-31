#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// 1 for SH1106 (standard 1.3" I2C OLED), 0 for SSD1306 (standard 0.96" or alternate 1.3")
#ifndef OLED_IS_SH1106
#define OLED_IS_SH1106 1
#endif

class DisplayManager {
public:
    // Retain two-argument constructor signature for backwards compatibility with main.cpp
    DisplayManager(uint8_t oled_addr = 0x3C, uint8_t unused = 0);
    
    void begin();
    
    // Updates internal state buffers
    void setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk);
    void setTelemetryData(float wTemp, float aTemp, float hum, int level, String timeStr);
    void setDevData(bool devMode, int rawDistCm, bool fanOn = false);
    void setActuatorStates(bool light, bool air, bool intake, bool outtake, bool agitator, bool fan);
    
    // Renders the 128x64 display
    void update();

private:
#if OLED_IS_SH1106
    U8G2_SH1106_128X64_NONAME_F_HW_I2C _u8g2;
#else
    U8G2_SSD1306_128X64_NONAME_F_HW_I2C _u8g2;
#endif

    uint8_t _i2cAddress;
    unsigned long _lastUpdate;
    unsigned long _lastPageFlip;
    const unsigned long REFRESH_RATE = 500;   // Refresh every 500ms
    const unsigned long PAGE_DURATION = 4000; // Flip views every 4s

    bool _pageA;
    bool _devMode;
    int _rawDistCm;
    bool _fanOn;

    // Actuator states
    bool _lightOn, _airOn, _intakeOn, _outtakeOn, _agitatorOn;

    // Stored Data
    const char* _state;
    String _ip;
    bool _wifiStatus, _mqttStatus;
    
    float _waterTemp, _ambTemp, _humidity;
    int _waterLevel;
    String _timeStr;

    // Drawing helpers
    void drawStatusBar();
    void drawTelemetryView();
    void drawDevView();
    void drawHazardView();
};

#endif

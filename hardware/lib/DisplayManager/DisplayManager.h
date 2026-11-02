#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

#ifndef OLED_IS_SH1106
#define OLED_IS_SH1106 1
#endif

// Consolidated 3-Screen Architecture
enum DisplayPage {
    PAGE_TELEMETRY = 0, // Hero Bioreactor Vessel & Vitals
    PAGE_ACTUATORS = 1, // Interactive Actuator Bench
    PAGE_GEOMETRY  = 2  // System, Calibration & Network Diagnostics
};

enum ActuatorFocus {
    FOCUS_LIGHT    = 0,
    FOCUS_AIR      = 1,
    FOCUS_INLET    = 2,
    FOCUS_OUTLET   = 3,
    FOCUS_AGITATOR = 4,
    FOCUS_FAN      = 5,
    FOCUS_KILL_ALL = 6
};

class DisplayManager {
public:
    DisplayManager(uint8_t oled_addr = 0x3C, uint8_t unused = 0);
    
    void begin();
    
    // Updates internal state buffers
    void setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk, int wifiRssi = 0, uint32_t freeHeap = 0);
    void setTelemetryData(float wTemp, float aTemp, float hum, int level, String timeStr);
    void setDevData(bool devMode, int rawDistCm, bool fanOn = false);
    void setActuatorStates(bool light, bool air, bool intake, bool outtake, bool agitator, bool fan);
    void setCalibrationData(int distEmpty, int distFull);
    void setJogData(uint8_t intakeSec, uint8_t outtakeSec);
    
    // Page & Actuator Navigation
    void nextPage();
    void prevPage();
    void setPage(uint8_t page);
    uint8_t getCurrentPage() const { return _currentPage; }
    
    void stepActuatorSelection();
    uint8_t getSelectedActuator() const { return _selectedActuator; }
    void setSelectedActuator(uint8_t act) { _selectedActuator = act % 7; }

    void toggleAutoCycle();
    bool isAutoCycle() const { return _autoCycle; }
    void showToast(const char* msg, uint16_t durationMs = 1500);

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
    unsigned long _manualHoldUntil;
    const unsigned long REFRESH_RATE = 100;      // 10Hz smooth refresh
    const unsigned long AUTO_FLIP_TIME = 6000;   // 6s per page during auto-cycle

    uint8_t _currentPage;
    uint8_t _selectedActuator;
    bool _autoCycle;
    bool _devMode;
    int _rawDistCm;
    bool _fanOn;

    // Jog countdowns
    uint8_t _intakeJogSec;
    uint8_t _outtakeJogSec;

    // Toast popup
    char _toastMsg[22];
    unsigned long _toastUntil;

    // Actuator states
    bool _lightOn, _airOn, _intakeOn, _outtakeOn, _agitatorOn;

    // Calibration points
    int _distEmpty;
    int _distFull;

    // System & Network Data
    const char* _state;
    String _ip;
    bool _wifiStatus, _mqttStatus;
    int _wifiRssi;
    uint32_t _freeHeap;
    
    float _waterTemp, _ambTemp, _humidity;
    int _waterLevel;
    String _timeStr;

    // Animation frames
    uint8_t _wavePhase;
    uint8_t _bubblePhase;

    // Screen Renderers
    void drawHeader(const char* title = nullptr);
    void drawPaginationDots(uint8_t current, uint8_t total);
    void drawHeroVesselView();
    void drawActuatorsView();
    void drawGeometryView();
    void drawHazardView();
    void drawToastOverlay();
};

#endif

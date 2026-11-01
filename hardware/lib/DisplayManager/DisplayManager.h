#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// 1 for SH1106 (standard 1.3" I2C OLED), 0 for SSD1306 (standard 0.96" or alternate 1.3")
#ifndef OLED_IS_SH1106
#define OLED_IS_SH1106 1
#endif

enum DisplayPage {
    PAGE_TELEMETRY = 0,
    PAGE_ACTUATORS = 1,
    PAGE_GEOMETRY  = 2,
    PAGE_NETWORK   = 3,
    PAGE_DEV_BENCH = 4
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
    
    // Button navigation controls
    void nextPage();
    void prevPage();
    void setPage(uint8_t page);
    uint8_t getCurrentPage() const { return _currentPage; }
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
    const unsigned long REFRESH_RATE = 200;      // Refresh display at 5Hz
    const unsigned long AUTO_FLIP_TIME = 5000;   // 5s per page during auto-cycle

    uint8_t _currentPage;
    bool _autoCycle;
    bool _devMode;
    int _rawDistCm;
    bool _fanOn;

    // Toast popup
    char _toastMsg[20];
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

    // Drawing Views
    void drawHeader(const char* title);
    void drawPaginationDots(uint8_t current, uint8_t total);
    void drawTelemetryView();
    void drawActuatorsView();
    void drawGeometryView();
    void drawNetworkDiagView();
    void drawDevView();
    void drawHazardView();
    void drawToastOverlay();
};

#endif

#include "DisplayManager.h"

DisplayManager::DisplayManager(uint8_t oled_addr, uint8_t unused) 
    : _u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE) {
    _i2cAddress = (oled_addr == 0x27 || oled_addr == 0x25) ? 0x3C : oled_addr;
    _lastUpdate = 0;
    _lastPageFlip = 0;
    _manualHoldUntil = 0;
    _currentPage = PAGE_TELEMETRY;
    _autoCycle = true;
    _devMode = false;
    _rawDistCm = 0;
    _fanOn = false;
    _toastMsg[0] = '\0';
    _toastUntil = 0;

    _distEmpty = 33;
    _distFull = 8;

    _state = "BOOT";
    _ip = "0.0.0.0";
    _wifiStatus = false;
    _mqttStatus = false;
    _wifiRssi = -100;
    _freeHeap = 0;

    _waterTemp = 0.0f;
    _ambTemp = 0.0f;
    _humidity = 0.0f;
    _waterLevel = 0;
    _timeStr = "00:00";

    _lightOn = false;
    _airOn = false;
    _intakeOn = false;
    _outtakeOn = false;
    _agitatorOn = false;
}

void DisplayManager::begin() {
    _u8g2.setI2CAddress(_i2cAddress * 2);
    _u8g2.begin();
    
    // Boot Splash
    _u8g2.clearBuffer();
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(14, 20, "BioArc Ecosystem");
    _u8g2.drawHLine(14, 24, 100);
    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(18, 40, "FreeRTOS Kernel");
    _u8g2.drawStr(24, 54, "1.3\" OLED Ready");
    _u8g2.sendBuffer();

    Serial.printf("[SYSTEM] 1.3\" OLED Display Initialized (Addr: 0x%02X).\n", _i2cAddress);
}

void DisplayManager::setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk, int wifiRssi, uint32_t freeHeap) {
    _state = state;
    String shortIp = ip;
    if (shortIp.startsWith("192.168.")) {
        shortIp = shortIp.substring(8); // e.g. "1.112"
    } else if (shortIp.startsWith("AP: 192.168.")) {
        shortIp = "AP:" + shortIp.substring(12);
    }
    _ip = shortIp;
    _wifiStatus = wifiOk;
    _mqttStatus = mqttOk;
    _wifiRssi = wifiRssi;
    _freeHeap = freeHeap;
}

void DisplayManager::setTelemetryData(float wTemp, float aTemp, float hum, int level, String timeStr) {
    _waterTemp = wTemp;
    _ambTemp = aTemp;
    _humidity = hum;
    _waterLevel = level;
    _timeStr = timeStr;
}

void DisplayManager::setDevData(bool devMode, int rawDistCm, bool fanOn) {
    _devMode = devMode;
    _rawDistCm = rawDistCm;
    _fanOn = fanOn;
}

void DisplayManager::setActuatorStates(bool light, bool air, bool intake, bool outtake, bool agitator, bool fan) {
    _lightOn = light;
    _airOn = air;
    _intakeOn = intake;
    _outtakeOn = outtake;
    _agitatorOn = agitator;
    _fanOn = fan;
}

void DisplayManager::setCalibrationData(int distEmpty, int distFull) {
    _distEmpty = distEmpty;
    _distFull = distFull;
}

void DisplayManager::nextPage() {
    uint8_t maxPages = _devMode ? 5 : 4;
    _currentPage = (_currentPage + 1) % maxPages;
    _manualHoldUntil = millis() + 15000; // Hold manual view for 15s before auto-flipping
    
    char toast[16];
    snprintf(toast, sizeof(toast), "PAGE %d/%d", _currentPage + 1, maxPages);
    showToast(toast, 1200);
}

void DisplayManager::prevPage() {
    uint8_t maxPages = _devMode ? 5 : 4;
    _currentPage = (_currentPage + maxPages - 1) % maxPages;
    _manualHoldUntil = millis() + 15000;
}

void DisplayManager::setPage(uint8_t page) {
    uint8_t maxPages = _devMode ? 5 : 4;
    _currentPage = page % maxPages;
    _manualHoldUntil = millis() + 15000;
}

void DisplayManager::toggleAutoCycle() {
    _autoCycle = !_autoCycle;
    showToast(_autoCycle ? "AUTO-CYCLE ON" : "CYCLE PAUSED", 1500);
}

void DisplayManager::showToast(const char* msg, uint16_t durationMs) {
    strncpy(_toastMsg, msg, sizeof(_toastMsg) - 1);
    _toastMsg[sizeof(_toastMsg) - 1] = '\0';
    _toastUntil = millis() + durationMs;
}

void DisplayManager::drawHeader(const char* title) {
    _u8g2.drawHLine(0, 11, 128);

    // Left state badge (e.g. IDLE, AWAIT, DEV, HAZ)
    _u8g2.setFont(u8g2_font_5x7_tf);
    char stateTag[8];
    if (_devMode) {
        snprintf(stateTag, sizeof(stateTag), "DEV");
    } else {
        snprintf(stateTag, sizeof(stateTag), "%.5s", _state);
    }
    
    int tagWidth = _u8g2.getStrWidth(stateTag) + 4;
    _u8g2.drawBox(1, 1, tagWidth, 9);
    _u8g2.setDrawColor(0);
    _u8g2.drawStr(3, 8, stateTag);
    _u8g2.setDrawColor(1);

    // Title / Clock in middle
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(tagWidth + 6, 8, title ? title : _timeStr.c_str());

    // Right: WiFi / MQTT Status
    int netX = 96;
    _u8g2.drawStr(netX, 8, _wifiStatus ? "W+" : "W-");
    _u8g2.drawStr(netX + 16, 8, _mqttStatus ? "M+" : "M-");
}

void DisplayManager::drawPaginationDots(uint8_t current, uint8_t total) {
    int startX = 64 - ((total - 1) * 7) / 2;
    int y = 62;
    for (uint8_t i = 0; i < total; i++) {
        if (i == current) {
            _u8g2.drawDisc(startX + i * 7, y, 2);
        } else {
            _u8g2.drawCircle(startX + i * 7, y, 1);
        }
    }
}

// Page 0: Main Telemetry View
void DisplayManager::drawTelemetryView() {
    char buf[32];

    drawHeader(_timeStr.c_str());

    // Line 1: Water Temp & Air Temp
    _u8g2.setFont(u8g2_font_6x10_tf);
    if (_waterTemp > -50.0f && _waterTemp < 100.0f) {
        snprintf(buf, sizeof(buf), "W:%.1fC", _waterTemp);
    } else {
        snprintf(buf, sizeof(buf), "W:ERR");
    }
    _u8g2.drawStr(2, 23, buf);

    if (_ambTemp > -50.0f && _ambTemp < 100.0f) {
        snprintf(buf, sizeof(buf), "A:%.1fC", _ambTemp);
    } else {
        snprintf(buf, sizeof(buf), "A:--");
    }
    _u8g2.drawStr(70, 23, buf);

    // Line 2: Water Level & Progress Bar
    snprintf(buf, sizeof(buf), "Lvl:%d%%", _waterLevel);
    _u8g2.drawStr(2, 35, buf);

    _u8g2.drawFrame(52, 27, 74, 8);
    int fillWidth = constrain((_waterLevel * 70) / 100, 0, 70);
    if (fillWidth > 0) {
        _u8g2.drawBox(54, 29, fillWidth, 4);
    }

    // Line 3: Relay Status Summary [L][A][P][F]
    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "LGT:%s AIR:%s PMP:%s",
        _lightOn ? "ON" : "--",
        _airOn ? "ON" : "--",
        (_intakeOn || _outtakeOn) ? "ON" : "--"
    );
    _u8g2.drawStr(2, 47, buf);

    // Line 4: Fan & IP
    snprintf(buf, sizeof(buf), "FAN:%s IP:%s",
        _fanOn ? "ON" : "--",
        _ip.c_str()
    );
    _u8g2.drawStr(2, 56, buf);

    drawPaginationDots(_currentPage, _devMode ? 5 : 4);
}

// Page 1: Actuator Matrix View
void DisplayManager::drawActuatorsView() {
    char buf[32];
    drawHeader("ACTUATORS");

    _u8g2.setFont(u8g2_font_6x10_tf);
    
    // Row 1: Intake & Outtake Pumps
    snprintf(buf, sizeof(buf), "Inlet : %s", _intakeOn ? "RUN" : "OFF");
    _u8g2.drawStr(2, 23, buf);
    snprintf(buf, sizeof(buf), "Outlet: %s", _outtakeOn ? "RUN" : "OFF");
    _u8g2.drawStr(66, 23, buf);

    // Row 2: Air Compressor & Grow Lights
    snprintf(buf, sizeof(buf), "Air   : %s", _airOn ? "RUN" : "OFF");
    _u8g2.drawStr(2, 35, buf);
    snprintf(buf, sizeof(buf), "Lights: %s", _lightOn ? "RUN" : "OFF");
    _u8g2.drawStr(66, 35, buf);

    // Row 3: Agitator & Exhaust Fan
    snprintf(buf, sizeof(buf), "Agit  : %s", _agitatorOn ? "RUN" : "OFF");
    _u8g2.drawStr(2, 47, buf);
    snprintf(buf, sizeof(buf), "ExhFan: %s", _fanOn ? "RUN" : "OFF");
    _u8g2.drawStr(66, 47, buf);

    drawPaginationDots(_currentPage, _devMode ? 5 : 4);
}

// Page 2: Tank Geometry & Ultrasonic View
void DisplayManager::drawGeometryView() {
    char buf[32];
    drawHeader("GEOMETRY");

    _u8g2.setFont(u8g2_font_6x10_tf);
    
    snprintf(buf, sizeof(buf), "Air Gap : %d cm", _rawDistCm);
    _u8g2.drawStr(2, 24, buf);

    float volumeL = (_waterLevel / 100.0f) * 7.0f;
    snprintf(buf, sizeof(buf), "Level   : %d%% (%.1fL)", _waterLevel, volumeL);
    _u8g2.drawStr(2, 36, buf);

    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "NVS Empty: %d cm", _distEmpty);
    _u8g2.drawStr(2, 48, buf);
    snprintf(buf, sizeof(buf), "NVS Full : %d cm", _distFull);
    _u8g2.drawStr(66, 48, buf);

    drawPaginationDots(_currentPage, _devMode ? 5 : 4);
}

// Page 3: Network & System Diagnostics View
void DisplayManager::drawNetworkDiagView() {
    char buf[32];
    drawHeader("SYSTEM");

    _u8g2.setFont(u8g2_font_5x7_tf);
    
    if (_wifiStatus) {
        snprintf(buf, sizeof(buf), "WiFi: OK (RSSI %d dBm)", _wifiRssi);
    } else {
        snprintf(buf, sizeof(buf), "WiFi: DISCONNECTED");
    }
    _u8g2.drawStr(2, 23, buf);

    snprintf(buf, sizeof(buf), "IP  : %s", _ip.c_str());
    _u8g2.drawStr(2, 33, buf);

    snprintf(buf, sizeof(buf), "MQTT: %s", _mqttStatus ? "CONNECTED" : "OFFLINE");
    _u8g2.drawStr(2, 43, buf);

    snprintf(buf, sizeof(buf), "Heap: %u KB Free", _freeHeap > 0 ? _freeHeap / 1024 : ESP.getFreeHeap() / 1024);
    _u8g2.drawStr(2, 53, buf);

    drawPaginationDots(_currentPage, _devMode ? 5 : 4);
}

// Page 4: Dev Bench View
void DisplayManager::drawDevView() {
    char buf[32];
    drawHeader("DEV BENCH");

    _u8g2.setFont(u8g2_font_6x10_tf);
    snprintf(buf, sizeof(buf), "Raw Dist: %d cm", _rawDistCm);
    _u8g2.drawStr(2, 24, buf);

    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "Relays: In:%d Out:%d Air:%d", 
        _intakeOn ? 1 : 0, _outtakeOn ? 1 : 0, _airOn ? 1 : 0);
    _u8g2.drawStr(2, 36, buf);

    snprintf(buf, sizeof(buf), "Fan:%d Lgt:%d Agt:%d",
        _fanOn ? 1 : 0, _lightOn ? 1 : 0, _agitatorOn ? 1 : 0);
    _u8g2.drawStr(2, 46, buf);

    _u8g2.drawStr(2, 56, "Hold BTN2: Exit Dev");

    drawPaginationDots(_currentPage, 5);
}

void DisplayManager::drawHazardView() {
    _u8g2.drawBox(0, 0, 128, 14);
    _u8g2.setDrawColor(0);
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(12, 11, "! SYSTEM HAZARD !");
    _u8g2.setDrawColor(1);

    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(4, 30, "PUMPS HARD LOCKED");
    
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(4, 44, "Ultrasonic / Sensor fault");
    _u8g2.drawStr(4, 56, "Hold BTN2 to Clear");
}

void DisplayManager::drawToastOverlay() {
    if (millis() < _toastUntil && _toastMsg[0] != '\0') {
        _u8g2.setFont(u8g2_font_6x10_tf);
        int w = _u8g2.getStrWidth(_toastMsg) + 8;
        int x = (128 - w) / 2;
        int y = 22;
        
        _u8g2.drawBox(x - 1, y - 10, w + 2, 14);
        _u8g2.setDrawColor(0);
        _u8g2.drawStr(x + 3, y, _toastMsg);
        _u8g2.setDrawColor(1);
    }
}

void DisplayManager::update() {
    unsigned long currentMillis = millis();

    // Auto-cycle pages if enabled and manual hold has expired
    if (_autoCycle && currentMillis >= _manualHoldUntil) {
        if (currentMillis - _lastPageFlip >= AUTO_FLIP_TIME) {
            _lastPageFlip = currentMillis;
            uint8_t maxPages = _devMode ? 5 : 4;
            _currentPage = (_currentPage + 1) % maxPages;
        }
    }

    if (currentMillis - _lastUpdate < REFRESH_RATE) {
        return;
    }
    _lastUpdate = currentMillis;

    _u8g2.clearBuffer();

    // 1. Hazard State Override
    if (strcmp(_state, "HAZARD") == 0 || strcmp(_state, "!!! HAZARD !!!") == 0) {
        drawHazardView();
        drawToastOverlay();
        _u8g2.sendBuffer();
        return;
    }

    // 2. Render Current Page
    switch (_currentPage) {
        case PAGE_TELEMETRY:
            drawTelemetryView();
            break;
        case PAGE_ACTUATORS:
            drawActuatorsView();
            break;
        case PAGE_GEOMETRY:
            drawGeometryView();
            break;
        case PAGE_NETWORK:
            drawNetworkDiagView();
            break;
        case PAGE_DEV_BENCH:
            drawDevView();
            break;
        default:
            drawTelemetryView();
            break;
    }

    // 3. Render Active Toast Notification
    drawToastOverlay();

    _u8g2.sendBuffer();
}

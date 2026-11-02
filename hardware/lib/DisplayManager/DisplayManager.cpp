#include "DisplayManager.h"

DisplayManager::DisplayManager(uint8_t oled_addr, uint8_t unused) 
    : _u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE) {
    _i2cAddress = (oled_addr == 0x27 || oled_addr == 0x25) ? 0x3C : oled_addr;
    _lastUpdate = 0;
    _lastPageFlip = 0;
    _manualHoldUntil = 0;
    _currentPage = PAGE_TELEMETRY;
    _selectedActuator = FOCUS_LIGHT;
    _autoCycle = false; // Manual browsing by default for precise control
    _devMode = true;
    _rawDistCm = 0;
    _fanOn = false;
    _intakeJogSec = 0;
    _outtakeJogSec = 0;
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

    _waterTemp = -127.0f;
    _ambTemp = 0.0f;
    _humidity = 0.0f;
    _waterLevel = 0;
    _timeStr = "00:00";

    _lightOn = false;
    _airOn = false;
    _intakeOn = false;
    _outtakeOn = false;
    _agitatorOn = false;

    _wavePhase = 0;
    _bubblePhase = 0;
}

void DisplayManager::begin() {
    _u8g2.setI2CAddress(_i2cAddress * 2);
    _u8g2.begin();
    
    // Sleek High-Precision Boot Splash
    _u8g2.clearBuffer();
    _u8g2.drawRFrame(4, 4, 120, 56, 3);
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(22, 22, "BIOARC KERNEL");
    _u8g2.drawHLine(22, 26, 84);
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(22, 38, "Dual-Core FreeRTOS");
    _u8g2.drawStr(22, 49, "Tactile OLED Online");
    _u8g2.sendBuffer();

    Serial.printf("[SYSTEM] 1.3\" SH1106 OLED Display Initialized (Addr: 0x%02X).\n", _i2cAddress);
}

void DisplayManager::setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk, int wifiRssi, uint32_t freeHeap) {
    _state = state;
    String shortIp = ip;
    if (shortIp.startsWith("192.168.")) {
        shortIp = shortIp.substring(8); // e.g. "0.114"
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

void DisplayManager::setJogData(uint8_t intakeSec, uint8_t outtakeSec) {
    _intakeJogSec = intakeSec;
    _outtakeJogSec = outtakeSec;
}

void DisplayManager::nextPage() {
    _currentPage = (_currentPage + 1) % 3;
    _manualHoldUntil = millis() + 20000;
    
    char toast[16];
    snprintf(toast, sizeof(toast), "VIEW %d/3", _currentPage + 1);
    showToast(toast, 900);
}

void DisplayManager::prevPage() {
    _currentPage = (_currentPage + 2) % 3;
    _manualHoldUntil = millis() + 20000;
    
    char toast[16];
    snprintf(toast, sizeof(toast), "VIEW %d/3", _currentPage + 1);
    showToast(toast, 900);
}

void DisplayManager::setPage(uint8_t page) {
    _currentPage = page % 3;
    _manualHoldUntil = millis() + 20000;
}

void DisplayManager::stepActuatorSelection() {
    _selectedActuator = (_selectedActuator + 1) % 7;
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

// Top Status Bar (y: 0 to 10)
void DisplayManager::drawHeader(const char* title) {
    _u8g2.drawHLine(0, 10, 128);

    // Left state badge (e.g. DEV, IDLE, AWA, HAZ)
    _u8g2.setFont(u8g2_font_5x7_tf);
    char stateTag[8];
    if (_devMode) {
        snprintf(stateTag, sizeof(stateTag), "DEV");
    } else {
        snprintf(stateTag, sizeof(stateTag), "%.4s", _state);
    }
    
    int tagWidth = _u8g2.getStrWidth(stateTag) + 4;
    _u8g2.drawRBox(0, 0, tagWidth, 9, 1);
    _u8g2.setDrawColor(0);
    _u8g2.drawStr(2, 7, stateTag);
    _u8g2.setDrawColor(1);

    // Center Title or Real-Time Clock
    const char* centerTxt = title ? title : _timeStr.c_str();
    int tw = _u8g2.getStrWidth(centerTxt);
    _u8g2.drawStr((128 - tw) / 2, 7, centerTxt);

    // Right: WiFi Signal Bars & MQTT Dot
    if (_wifiStatus) {
        _u8g2.drawVLine(108, 6, 2);
        _u8g2.drawVLine(110, 4, 4);
        _u8g2.drawVLine(112, 2, 6);
    } else {
        _u8g2.drawStr(104, 7, "W:X");
    }

    _u8g2.drawStr(116, 7, "M");
    if (_mqttStatus) {
        _u8g2.drawDisc(124, 4, 2);
    } else {
        _u8g2.drawCircle(124, 4, 2);
    }
}

void DisplayManager::drawPaginationDots(uint8_t current, uint8_t total) {
    int startX = 64 - ((total - 1) * 8) / 2;
    int y = 62;
    for (uint8_t i = 0; i < total; i++) {
        if (i == current) {
            _u8g2.drawDisc(startX + i * 8, y, 2);
        } else {
            _u8g2.drawCircle(startX + i * 8, y, 1);
        }
    }
}

// Page 0: Hero Bioreactor Simulation + Vitals
void DisplayManager::drawHeroVesselView() {
    char buf[32];
    drawHeader(nullptr); // Shows RTC clock in header

    // ----------------------------------------------------
    // Left: Graphical Bioreactor Chamber (x: 4 to 34, y: 13 to 48)
    // ----------------------------------------------------
    _u8g2.drawHLine(8, 13, 22);       // Mouth
    _u8g2.drawVLine(5, 15, 31);       // Left wall
    _u8g2.drawVLine(32, 15, 31);      // Right wall
    _u8g2.drawHLine(8, 48, 22);       // Base
    
    // Rounded corners
    _u8g2.drawPixel(6, 14); _u8g2.drawPixel(7, 13);
    _u8g2.drawPixel(31, 14); _u8g2.drawPixel(30, 13);
    _u8g2.drawPixel(6, 47); _u8g2.drawPixel(7, 48);
    _u8g2.drawPixel(31, 47); _u8g2.drawPixel(30, 48);

    // Volume tick marks on right side of vessel
    _u8g2.drawHLine(34, 18, 3); // Full (100%)
    _u8g2.drawHLine(34, 32, 2); // 50%
    _u8g2.drawHLine(34, 46, 3); // Empty (0%)

    bool sonarOk = (_rawDistCm > 0 && _rawDistCm < 250);

    if (sonarOk) {
        int fillH = constrain((_waterLevel * 28) / 100, 0, 28);
        int yTop = 46 - fillH;

        if (fillH > 0) {
            if (fillH > 2) {
                _u8g2.drawBox(7, yTop + 2, 24, fillH - 2);
            }
            // Dynamic liquid surface wave
            for (int wx = 0; wx < 24; wx++) {
                int wy = yTop + (((wx + _wavePhase) % 4 < 2) ? 0 : 1);
                _u8g2.drawPixel(7 + wx, wy);
            }

            // Animated bubble sparging when Air or Agitator active
            if ((_airOn || _agitatorOn) && fillH > 6) {
                _u8g2.drawPixel(11, 46 - ((_bubblePhase * 2) % (fillH - 2)));
                _u8g2.drawPixel(18, 46 - ((_bubblePhase * 3 + 5) % (fillH - 2)));
                _u8g2.drawPixel(25, 46 - ((_bubblePhase * 2 + 11) % (fillH - 2)));
            }
        }

        // Intake cascade stream
        if (_intakeOn) {
            _u8g2.drawVLine(18, 14, (fillH > 0 ? yTop - 14 : 32));
        }
    } else {
        // Sonar fault cross-hatch inside vessel
        _u8g2.setFont(u8g2_font_4x6_tf);
        _u8g2.drawStr(9, 32, "NO ECHO");
    }

    // ----------------------------------------------------
    // Right: High-Precision Vitals (x: 42 to 126)
    // ----------------------------------------------------
    // Row 1: Water Temperature
    _u8g2.setFont(u8g2_font_6x12_tf);
    bool wTempOk = (_waterTemp > -40.0f && _waterTemp < 85.0f && _waterTemp != -127.0f);
    if (wTempOk) {
        snprintf(buf, sizeof(buf), "WT: %.1f C", _waterTemp);
    } else {
        snprintf(buf, sizeof(buf), "WT: Er");
    }
    _u8g2.drawStr(42, 23, buf);

    // Row 2: Ambient Air Temp & Humidity
    _u8g2.setFont(u8g2_font_5x7_tf);
    bool envOk = (_ambTemp > -40.0f && _ambTemp < 80.0f && (_ambTemp != 0.0f || _humidity != 0.0f));
    if (envOk) {
        snprintf(buf, sizeof(buf), "AT:%.1fC H:%.0f%%", _ambTemp, _humidity);
    } else {
        snprintf(buf, sizeof(buf), "AT:Er  H:Er");
    }
    _u8g2.drawStr(42, 33, buf);

    // Row 3: Water Level & Raw Distance
    if (sonarOk) {
        snprintf(buf, sizeof(buf), "Lvl:%d%% (%dcm)", _waterLevel, _rawDistCm);
    } else {
        snprintf(buf, sizeof(buf), "Lvl:Er (%dcm)", _rawDistCm);
    }
    _u8g2.drawStr(42, 43, buf);

    // ----------------------------------------------------
    // Bottom: 6-Actuator Status Badges (x: 5 to 123, y: 53 to 62)
    // ----------------------------------------------------
    const char* labels[6] = {"L", "A", "IN", "OUT", "M", "F"};
    bool states[6] = {_lightOn, _airOn, _intakeOn, _outtakeOn, _agitatorOn, _fanOn};

    for (int i = 0; i < 6; i++) {
        int bx = 5 + i * 20;
        _u8g2.setFont(u8g2_font_4x6_tf);
        int lw = _u8g2.getStrWidth(labels[i]);
        int tx = bx + (18 - lw) / 2;

        if (states[i]) {
            _u8g2.drawRBox(bx, 53, 18, 9, 1);
            _u8g2.setDrawColor(0);
            _u8g2.drawStr(tx, 60, labels[i]);
            _u8g2.setDrawColor(1);
        } else {
            _u8g2.drawRFrame(bx, 53, 18, 9, 1);
            _u8g2.drawStr(tx, 60, labels[i]);
        }
    }
}

// Page 1: Interactive Actuator Bench (Dev Mode Control)
void DisplayManager::drawActuatorsView() {
    drawHeader("ACTUATOR BENCH");

    // 6 Actuators arranged in 2 columns x 3 rows
    struct Tile {
        const char* name;
        bool state;
        uint8_t jogSec;
    } tiles[6] = {
        {"LIGHTS", _lightOn, 0},
        {"AIR PUMP", _airOn, 0},
        {"INLET", _intakeOn, _intakeJogSec},
        {"OUTLET", _outtakeOn, _outtakeJogSec},
        {"AGITATOR", _agitatorOn, 0},
        {"EXH FAN", _fanOn, 0}
    };

    int colX[2] = {2, 65};
    int tw = 61;
    int th = 11;

    for (int i = 0; i < 6; i++) {
        int col = i % 2;
        int row = i / 2;
        int tx = colX[col];
        int ty = 12 + row * 12;

        bool isSelected = (_devMode && _selectedActuator == i);

        if (isSelected) {
            _u8g2.drawRBox(tx, ty, tw, th, 1);
            _u8g2.setDrawColor(0);
        } else {
            _u8g2.drawRFrame(tx, ty, tw, th, 1);
        }

        _u8g2.setFont(u8g2_font_5x7_tf);
        _u8g2.drawStr(tx + 3, ty + 8, tiles[i].name);

        // Status text
        char stat[8];
        if (tiles[i].jogSec > 0) {
            snprintf(stat, sizeof(stat), "J%ds", tiles[i].jogSec);
        } else {
            snprintf(stat, sizeof(stat), tiles[i].state ? "ON" : "--");
        }

        int sw = _u8g2.getStrWidth(stat);
        _u8g2.drawStr(tx + tw - sw - 3, ty + 8, stat);

        _u8g2.setDrawColor(1);
    }

    // Emergency Kill Option / Instructions on Footer
    if (_devMode && _selectedActuator == FOCUS_KILL_ALL) {
        _u8g2.drawRBox(2, 49, 124, 12, 1);
        _u8g2.setDrawColor(0);
        _u8g2.setFont(u8g2_font_5x7_tf);
        _u8g2.drawStr(12, 58, ">> STOP ALL RELAYS <<");
        _u8g2.setDrawColor(1);
    } else {
        _u8g2.setFont(u8g2_font_4x6_tf);
        if (_devMode) {
            _u8g2.drawStr(4, 58, "B1:Select | B2:Toggle/Jog");
        } else {
            _u8g2.drawStr(4, 58, "READ-ONLY | Hold B2:DevMode");
        }
    }
}

// Page 2: System, Geometry & 2-Point Calibration
void DisplayManager::drawGeometryView() {
    char buf[32];
    drawHeader("SYSTEM & CALIB");

    _u8g2.drawVLine(63, 11, 40); // Divider

    // ----------------------------------------------------
    // Left: Ultrasonic Calibration (x: 2 to 61)
    // ----------------------------------------------------
    _u8g2.setFont(u8g2_font_5x7_tf);
    if (_rawDistCm > 0 && _rawDistCm < 250) {
        snprintf(buf, sizeof(buf), "Dist: %dcm", _rawDistCm);
    } else {
        snprintf(buf, sizeof(buf), "Dist: Er");
    }
    _u8g2.drawStr(3, 21, buf);

    snprintf(buf, sizeof(buf), "Empty:%dcm", _distEmpty);
    _u8g2.drawStr(3, 31, buf);

    snprintf(buf, sizeof(buf), "Full :%dcm", _distFull);
    _u8g2.drawStr(3, 41, buf);

    _u8g2.setFont(u8g2_font_4x6_tf);
    if (_devMode) {
        _u8g2.drawStr(2, 50, "B1:Set0%  B2:Set100%");
    } else {
        _u8g2.drawStr(2, 50, "Calib: Dev Only");
    }

    // ----------------------------------------------------
    // Right: System & Network Health (x: 66 to 126)
    // ----------------------------------------------------
    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "IP: %s", _ip.c_str());
    _u8g2.drawStr(66, 21, buf);

    if (_wifiStatus) {
        snprintf(buf, sizeof(buf), "WiFi:%ddBm", _wifiRssi);
    } else {
        snprintf(buf, sizeof(buf), "WiFi:Er");
    }
    _u8g2.drawStr(66, 31, buf);

    snprintf(buf, sizeof(buf), "MQTT: %s", _mqttStatus ? "OK" : "Er");
    _u8g2.drawStr(66, 41, buf);

    snprintf(buf, sizeof(buf), "RAM : %uKB", _freeHeap > 0 ? _freeHeap / 1024 : ESP.getFreeHeap() / 1024);
    _u8g2.drawStr(66, 50, buf);

    drawPaginationDots(_currentPage, 3);
}

// System Hazard Alert
void DisplayManager::drawHazardView() {
    _u8g2.drawRBox(0, 0, 128, 14, 2);
    _u8g2.setDrawColor(0);
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(12, 11, "! SYSTEM HAZARD !");
    _u8g2.setDrawColor(1);

    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(6, 28, "ALL RELAYS LOCKED OFF");
    
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(6, 40, "Check Sensors / Overflow");
    
    _u8g2.drawRBox(6, 48, 116, 12, 2);
    _u8g2.setDrawColor(0);
    _u8g2.drawStr(14, 57, "CLICK BTN2 TO CLEAR");
    _u8g2.setDrawColor(1);
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

    // Fluid animations
    _wavePhase = (_wavePhase + 1) % 4;
    _bubblePhase = (_bubblePhase + 1) % 32;

    // Auto-cycle pages if enabled
    if (_autoCycle && currentMillis >= _manualHoldUntil) {
        if (currentMillis - _lastPageFlip >= AUTO_FLIP_TIME) {
            _lastPageFlip = currentMillis;
            _currentPage = (_currentPage + 1) % 3;
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
            drawHeroVesselView();
            break;
        case PAGE_ACTUATORS:
            drawActuatorsView();
            break;
        case PAGE_GEOMETRY:
            drawGeometryView();
            break;
        default:
            drawHeroVesselView();
            break;
    }

    // 3. Render Active Toast Notification
    drawToastOverlay();

    _u8g2.sendBuffer();
}

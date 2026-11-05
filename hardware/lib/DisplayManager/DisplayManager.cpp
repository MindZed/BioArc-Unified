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
    _distFull = 7;

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
    _oledDetected = false;
    _lastProbeTime = 0;

    _screenSleeping = false;
    _alwaysOn = false;
    _lastInteractionTime = millis();
    _sleepTimeoutMs = 120000; // 2 minutes auto-sleep timeout

    _demoActive = false;
    _demoStep = 0;
    _demoPhase[0] = '\0';
}

void DisplayManager::begin() {
    _u8g2.setI2CAddress(_i2cAddress * 2);
    _u8g2.setBusClock(400000);

    Wire.beginTransmission(_i2cAddress);
    byte err = Wire.endTransmission();
    if (err != 0) {
        // Probe alternate address 0x3D
        Wire.beginTransmission(0x3D);
        if (Wire.endTransmission() == 0) {
            _i2cAddress = 0x3D;
            _u8g2.setI2CAddress(0x3D * 2);
            err = 0;
            Serial.println("[SYSTEM] OLED detected on alternate address 0x3D.");
        }
    }

    if (err == 0) {
        _oledDetected = true;
        _u8g2.begin();
        _u8g2.clearBuffer();
        _u8g2.drawRFrame(4, 4, 120, 56, 3);
        _u8g2.setFont(u8g2_font_helvB08_tf);
        _u8g2.drawStr(22, 22, "BIOARC KERNEL");
        _u8g2.drawHLine(22, 26, 84);
        _u8g2.setFont(u8g2_font_5x7_tf);
        _u8g2.drawStr(22, 38, "Dual-Core FreeRTOS");
        _u8g2.drawStr(22, 49, "Tactile OLED Online");
        _u8g2.sendBuffer();
        Serial.printf("[SYSTEM] 1.3\" SH1106 OLED Initialized (Addr: 0x%02X, Clock: 400kHz).\n", _i2cAddress);
    } else {
        _oledDetected = false;
        Serial.printf("[WARNING] OLED Display not responding on I2C (0x%02X). Auto-recovery watchdog armed.\n", _i2cAddress);
    }
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

void DisplayManager::wakeScreen() {
    _lastInteractionTime = millis();
    if (_screenSleeping) {
        _screenSleeping = false;
        if (_oledDetected) {
            _u8g2.setPowerSave(0); // Power on display panel
        }
    }
}

void DisplayManager::setAlwaysOn(bool alwaysOn) {
    _alwaysOn = alwaysOn;
    if (_alwaysOn) {
        wakeScreen();
    }
}

void DisplayManager::nextPage() {
    wakeScreen();
    _currentPage = (_currentPage + 1) % 3;
    _manualHoldUntil = millis() + 20000;
    
    char toast[16];
    snprintf(toast, sizeof(toast), "VIEW %d/3", _currentPage + 1);
    showToast(toast, 900);
}

void DisplayManager::prevPage() {
    wakeScreen();
    _currentPage = (_currentPage + 2) % 3;
    _manualHoldUntil = millis() + 20000;
    
    char toast[16];
    snprintf(toast, sizeof(toast), "VIEW %d/3", _currentPage + 1);
    showToast(toast, 900);
}

void DisplayManager::setPage(uint8_t page) {
    wakeScreen();
    _currentPage = page % 3;
    _manualHoldUntil = millis() + 20000;
}

void DisplayManager::stepActuatorSelection() {
    wakeScreen();
    _selectedActuator = (_selectedActuator + 1) % 7;
}

void DisplayManager::toggleAutoCycle() {
    wakeScreen();
    _autoCycle = !_autoCycle;
    showToast(_autoCycle ? "AUTO-CYCLE ON" : "CYCLE PAUSED", 1500);
}

void DisplayManager::showToast(const char* msg, uint16_t durationMs) {
    wakeScreen();
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

void DisplayManager::setDemoMode(bool active, uint8_t step, const char* phaseName) {
    _demoActive = active;
    _demoStep = step;
    if (phaseName != nullptr) {
        strncpy(_demoPhase, phaseName, sizeof(_demoPhase) - 1);
        _demoPhase[sizeof(_demoPhase) - 1] = '\0';
    } else {
        _demoPhase[0] = '\0';
    }
    if (active) wakeScreen();
}

// Dedicated Demo Dual-View: Left Stage Details, Right Bioreactor Digital Twin
void DisplayManager::drawDemoView() {
    char buf[32];

    // ----------------------------------------------------
    // LEFT SIDE: Stage Header, Name, Vitals & Relay Badges (x: 0 to 90)
    // ----------------------------------------------------

    // 1. Top Badge: Stage Number
    _u8g2.drawRBox(0, 1, 56, 11, 2);
    _u8g2.setDrawColor(0);
    _u8g2.setFont(u8g2_font_5x7_tf);
    if (_demoStep > 0 && _demoStep <= 6) {
        snprintf(buf, sizeof(buf), "STAGE %d/6", _demoStep);
    } else if (_demoStep >= 7) {
        snprintf(buf, sizeof(buf), "COMPLETE");
    } else {
        snprintf(buf, sizeof(buf), "DEMO");
    }
    _u8g2.drawStr(3, 9, buf);
    _u8g2.setDrawColor(1);

    // Live Water Depth next to stage badge
    if (_rawDistCm > 0 && _rawDistCm < 250) {
        snprintf(buf, sizeof(buf), "%dcm", _rawDistCm);
    } else {
        snprintf(buf, sizeof(buf), "--cm");
    }
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(62, 9, buf);

    // 2. Stage Name (Big, bold, human-readable)
    _u8g2.setFont(u8g2_font_6x12_tf);
    switch (_demoStep) {
        case 1:
            _u8g2.drawStr(0, 24, "SUNLIGHT");
            _u8g2.drawStr(0, 36, "& AIR PUMP");
            break;
        case 2:
            _u8g2.drawStr(0, 24, "COOLING FAN");
            _u8g2.drawStr(0, 36, "TEMP REG.");
            break;
        case 3:
            _u8g2.drawStr(0, 24, "MIXING WATER");
            _u8g2.drawStr(0, 36, "AGITATOR ON");
            break;
        case 4:
            _u8g2.drawStr(0, 24, "HEALTH CHECK");
            _u8g2.drawStr(0, 36, "OD:0.74 Chl-A");
            break;
        case 5:
            _u8g2.drawStr(0, 24, "HARVESTING");
            _u8g2.drawStr(0, 36, "10% DRAIN");
            break;
        case 6:
            _u8g2.drawStr(0, 24, "REFILLING");
            _u8g2.drawStr(0, 36, "TANK LEVEL");
            break;
        default:
            if (strlen(_demoPhase) > 0) {
                _u8g2.drawStr(0, 26, _demoPhase);
            } else {
                _u8g2.drawStr(0, 26, "DEMO CYCLE");
            }
            break;
    }

    // 3. Water Temp & Vitals
    _u8g2.setFont(u8g2_font_5x7_tf);
    bool wTempOk = (_waterTemp > -40.0f && _waterTemp < 85.0f && _waterTemp != -127.0f);
    if (wTempOk) {
        snprintf(buf, sizeof(buf), "WT:%.1fC", _waterTemp);
    } else {
        snprintf(buf, sizeof(buf), "WT:29.0C");
    }
    _u8g2.drawStr(0, 47, buf);

    // 4. Actuator Relays Bar (x: 0 to 90, y: 53 to 62)
    const char* labels[6] = {"L", "A", "IN", "OU", "M", "F"};
    bool states[6] = {_lightOn, _airOn, _intakeOn, _outtakeOn, _agitatorOn, _fanOn};

    for (int i = 0; i < 6; i++) {
        int bx = i * 15;
        _u8g2.setFont(u8g2_font_4x6_tf);
        int lw = _u8g2.getStrWidth(labels[i]);
        int tx = bx + (14 - lw) / 2;

        if (states[i]) {
            _u8g2.drawRBox(bx, 53, 14, 10, 1);
            _u8g2.setDrawColor(0);
            _u8g2.drawStr(tx, 61, labels[i]);
            _u8g2.setDrawColor(1);
        } else {
            _u8g2.drawRFrame(bx, 53, 14, 10, 1);
            _u8g2.drawStr(tx, 61, labels[i]);
        }
    }

    // ----------------------------------------------------
    // RIGHT SIDE: Mini Bioreactor Digital Twin (x: 94 to 127)
    // ----------------------------------------------------
    // Cylindrical Glass Vessel (x: 96 to 121, y: 8 to 51)
    _u8g2.drawHLine(99, 8, 20);        // Top mouth
    _u8g2.drawVLine(96, 11, 38);       // Left wall
    _u8g2.drawVLine(121, 11, 38);      // Right wall
    _u8g2.drawHLine(99, 51, 20);       // Base

    // Rounded shoulders and base corners
    _u8g2.drawPixel(97, 9);  _u8g2.drawPixel(98, 8);
    _u8g2.drawPixel(120, 9); _u8g2.drawPixel(119, 8);
    _u8g2.drawPixel(97, 50); _u8g2.drawPixel(98, 51);
    _u8g2.drawPixel(120, 50);_u8g2.drawPixel(119, 51);

    // Calibration tick marks on the right edge
    _u8g2.drawHLine(123, 13, 2); // 100%
    _u8g2.drawHLine(123, 22, 2); // 75%
    _u8g2.drawHLine(123, 31, 2); // 50%
    _u8g2.drawHLine(123, 41, 2); // 25%
    _u8g2.drawHLine(123, 49, 2); // 0%

    // Liquid fill calculation
    int fillH = constrain((_waterLevel * 36) / 100, 0, 36);
    int yTop = 49 - fillH;

    if (fillH > 0) {
        if (fillH > 2) {
            _u8g2.drawBox(98, yTop + 2, 22, fillH - 2);
        }
        // Dynamic fluid wave
        for (int wx = 0; wx < 22; wx++) {
            int wy = yTop + (((wx + _wavePhase) % 4 < 2) ? 0 : 1);
            _u8g2.drawPixel(98 + wx, wy);
        }

        // Animated rising bubbles during Air or Agitation
        if ((_airOn || _agitatorOn) && fillH > 6) {
            _u8g2.drawPixel(101, 49 - ((_bubblePhase * 2) % (fillH - 2)));
            _u8g2.drawPixel(107, 49 - ((_bubblePhase * 3 + 4) % (fillH - 2)));
            _u8g2.drawPixel(113, 49 - ((_bubblePhase * 2 + 8) % (fillH - 2)));
            _u8g2.drawPixel(118, 49 - ((_bubblePhase * 3 + 12) % (fillH - 2)));
        }
    }

    // Intake stream cascade during Step 6 / Refill
    if (_intakeOn) {
        _u8g2.drawVLine(109, 9, (fillH > 0 ? yTop - 9 : 38));
        _u8g2.drawPixel(108, yTop); _u8g2.drawPixel(110, yTop); // Splash ripples
    }

    // Outtake drain effect during Step 5 / Harvest
    if (_outtakeOn) {
        _u8g2.drawVLine(103, 52, 3);
        _u8g2.drawPixel(102, 54);
    }

    // Volume % text directly below vessel
    _u8g2.setFont(u8g2_font_4x6_tf);
    snprintf(buf, sizeof(buf), "%d%%", _waterLevel);
    int pw = _u8g2.getStrWidth(buf);
    _u8g2.drawStr(109 - (pw / 2), 60, buf);
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
        {"AIR", _airOn, 0},
        {"INLET", _intakeOn, _intakeJogSec},
        {"OUTLET", _outtakeOn, _outtakeJogSec},
        {"AGIT", _agitatorOn, 0},
        {"FAN", _fanOn, 0}
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

    // Hot-Plug Auto-Recovery Watchdog:
    // Probe every 2.5s if offline, or every 12s if already online
    unsigned long probeInterval = _oledDetected ? 12000 : 2500;
    if (currentMillis - _lastProbeTime >= probeInterval) {
        _lastProbeTime = currentMillis;
        Wire.beginTransmission(_i2cAddress);
        bool ack = (Wire.endTransmission() == 0);
        if (!ack) {
            Wire.beginTransmission(0x3D);
            if (Wire.endTransmission() == 0) {
                _i2cAddress = 0x3D;
                _u8g2.setI2CAddress(0x3D * 2);
                ack = true;
            }
        }

        if (ack) {
            if (!_oledDetected) {
                _oledDetected = true;
                _u8g2.begin();
                showToast("OLED RECOVERED", 1500);
                Serial.printf("[SYSTEM] OLED Reconnected on 0x%02X! Display restored.\n", _i2cAddress);
            }
        } else {
            if (_oledDetected) {
                _oledDetected = false;
                Serial.println("[WARNING] OLED disconnected. Auto-recovery active.");
            }
        }
    }

    if (!_oledDetected) {
        return; // Skip rendering when display hardware is disconnected
    }

    // Burn-In Prevention & Auto-Sleep Logic
    bool isHazard = (strcmp(_state, "HAZARD") == 0 || strcmp(_state, "!!! HAZARD !!!") == 0);
    if (isHazard) {
        wakeScreen(); // Immediately wake if hazard occurs
    }

    if (!_alwaysOn && !isHazard) {
        if (!_screenSleeping && (currentMillis - _lastInteractionTime >= _sleepTimeoutMs)) {
            _screenSleeping = true;
            _u8g2.setPowerSave(1); // Turn off display panel to prevent burn-in
        }
    }

    if (_screenSleeping) {
        return; // Skip drawing when asleep, saving CPU & I2C bandwidth
    }

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

    // 0. Demo Mode Dual View Screen Override
    if (_demoActive) {
        drawDemoView();
        drawToastOverlay();
        _u8g2.sendBuffer();
        return;
    }

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

# BioArc Bioreactor — Project To-Do & Roadmap

This tracking document outlines immediate tasks for tomorrow's hardware session, testing procedures, and future IoT architecture enhancements across our stack.

---

## 🛠️ Phase 1: Physical Hardware & Bench Testing (Tomorrow)

### 1. Hardware Soldering & Wiring
- [ ] **OLED Navigation Inputs**:
  - Connect **Button 1 (Next Page / Carousel)** to **GPIO 13** (ESP32 Touch 4 / ADC2_CH4) with pull-up/ground or touch pad.
  - Connect **Button 2 (Select / Action / Dev Toggle)** to **GPIO 14** (ESP32 Touch 6 / ADC2_CH6).
- [ ] **12V Exhaust Fan Relay**:
  - Wire relay signal IN to **GPIO 23**.
  - Connect relay COM and NO to the 12V DC power supply line feeding the top chamber exhaust fan.
  - Verify flyback diode or snubber is present across the 12V fan motor terminals to protect against inductive kickback.
- [ ] **1.3" I2C OLED Display**:
  - Confirm `VCC` (3.3V/5V), `GND`, `SDA` (**GPIO 21**), and `SCL` (**GPIO 22**).

### 2. Firmware Flashing & Physical Bench Verification
- [ ] **Flash Firmware**:
  - Run PlatformIO upload: `pio run -d hardware -e esp32dev_usb -t upload`
- [ ] **Verify Ultrasonic Ground-Truth on Boot**:
  - Test boot with sensor disconnected $\to$ Confirm `STATE_HAZARD` triggers on OLED and MQTT.
  - Test boot with tank empty ($<80\%$) $\to$ Confirm system stays in `STATE_AWAITING_COMMISSION` with intake pump OFF.
  - Test boot with tank filled ($\ge 80\%$) $\to$ Confirm system transitions directly to `STATE_IDLE`.
- [ ] **Perform Live 2-Point Ultrasonic Calibration**:
  - Open web frontend (`/maintenance`) as Admin.
  - Empty reactor $\to$ Click **"Set As Empty (0%)"**.
  - Fill reactor to operating level $\to$ Click **"Set As Full (100%)"**.
  - Power cycle the ESP32 $\to$ Verify calibration constants persist from NVS.
- [ ] **Test Pump Jog Tool**:
  - Click **"Jog Intake (5s)"** $\to$ Confirm intake pump fires for exactly 5000ms then automatically turns off.
- [ ] **Test 12V Exhaust Fan Automation**:
  - Verify manual dev mode toggle on dashboard.
  - Heat DS18B20 temperature probe above 34°C $\to$ Confirm fan turns ON; cool below 31.5°C $\to$ Confirm fan turns OFF.

---

## 🖥️ Phase 2: OLED Pagination & Button Navigation (Firmware)

- [ ] **Button Input Manager (`ButtonManager` or FreeRTOS Input Task)**:
  - Implement debouncing (50ms) for physical tactile buttons or threshold tuning for capacitive touch.
  - Support **Short Press** (Next Page / Cycle) and **Long Press** (>1.5s for Action / Dev Mode toggle).
- [ ] **Multi-Page OLED Carousel**:
  - **Page 1 (Home Dashboard)**:
    - Water Temp, Air Temp, Liquid Fill %, FSM State badge, Carousel dot indicators (`● ○ ○ ○`).
  - **Page 2 (Actuator Matrix)**:
    - Status of all 6 relays: Heater [H], Aerator [A], Intake [I], Outflow [O], Light [L], Fan [F].
  - **Page 3 (Sensors & Distance)**:
    - Raw HC-SR04 air gap distance in cm, DS18B20 status, optical reading placeholder.
  - **Page 4 (System & Telemetry Health)**:
    - WiFi SSID, RSSI (dBm), IP Address, MQTT Broker status, FreeRTOS free heap memory.
  - **Page 5 (Dev Mode Bench View)**:
    - Active only when `DEV_MODE` is enabled; live diagnostics.
- [ ] **Visual Animations & Polish**:
  - Smooth slide/scroll transitions between pages.
  - Animated rotating fan icon when the exhaust fan is running.
  - Pulsing bubble icon when aerator is running.
  - Animated filling tank bar.

---

## 🧪 Phase 3: Optical Sensor Subsystem (TCS34725 — On Hold)

- [ ] Design and 3D print/fabricate light-tight optical flow-cell or cuvette mount for TCS34725.
- [ ] Connect sensor to shared I2C bus (SDA: GPIO 21, SCL: GPIO 22).
- [ ] Re-enable baseline calibration routine in firmware once physical enclosure is ready.
- [ ] Map RGB and Clear photon counts to Optical Density (OD600) and biomass density curves.

---

## 🚀 Phase 4: IoT Stack Enhancements & Architectural Roadmap

### 1. Edge & Firmware Resilience (ESP32 / FreeRTOS)
- [ ] **Over-The-Air (OTA) Firmware Updates**:
  - Integrate Web/Arduino OTA so firmware can be flashed over WiFi without opening the reactor enclosure.
- [ ] **Store-and-Forward Offline Telemetry Buffer**:
  - If WiFi drops during multi-day fermentation, buffer telemetry snapshots to a circular buffer in SPIFFS/LittleFS.
  - Flush buffered packets to Go backend upon reconnect to prevent missing data in growth curves.
- [ ] **Relay Hardware Interlock in Firmware**:
  - Enforce software/hardware mutual exclusion so Intake Pump and Outflow Pump can never run simultaneously (preventing dry-run or overflow hazards).
- [ ] **ESP32 Task Watchdog (WDT) & Brownout Logger**:
  - Save last boot reset reason (power-on, software restart, watchdog panic, or brownout) to NVS and send with initial telemetry.

### 2. Backend & Communication Layer (Go + MQTT + Telegram)
- [ ] **MQTT Last Will and Testament (LWT)**:
  - Register `bioarc/status = offline` LWT on the broker.
  - Instantly notify WebSocket frontend and Telegram bot if the reactor drops offline.
- [ ] **Telegram Interactive Bot Controls**:
  - Send critical alerts (High Temp $>35^\circ\text{C}$, Ultrasonic failure, Water empty).
  - Include inline keyboard buttons in Telegram: `[Toggle Fan]`, `[E-Stop]`, `[Check Status]`.

### 3. Frontend & UX Layer (Next.js 16 + Turbopack)
- [ ] **Digital Twin Bioreactor Diagram**:
  - Interactive SVG/Canvas diagram showing realtime water level animation, bubbling aerator, glowing heater, and rotating fan.
- [ ] **Automated Fermentation Profiles / Recipes**:
  - Save culture presets (e.g. *Spirulina Growth*, *Chlorella Culture*, *Sterilization / Clean-in-Place*).
  - Automatically loads temperature setpoints, photoperiod lighting schedules (e.g., 16h ON / 8h OFF), and aeration cycle intervals.
- [ ] **Biomass Growth Rate ($\mu$) & Harvest Predictor**:
  - Compute specific growth rate and project estimated harvest time based on optical density / temperature accumulation.

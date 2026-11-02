# BioArc Bioreactor — Project To-Do & Roadmap

This tracking document outlines completed hardware implementations, active testing procedures, and future IoT architecture enhancements across our stack.

---

## 🛠️ Phase 1: Physical Hardware & Bench Testing

### 1. Hardware Soldering & Wiring
- [x] **OLED Navigation Inputs**:
  - Connected **Button 1 (Nav / Select)** to **GPIO 13** with internal `INPUT_PULLUP`.
  - Connected **Button 2 (Action / Toggle / Dev)** to **GPIO 14** with internal `INPUT_PULLUP`.
  - Implemented 20ms hardware debounce and Enhanced Model B interaction state machine.
- [x] **12V Exhaust Fan Relay**:
  - Wired relay signal IN to **GPIO 23**.
  - Programmed automated thermal cooling ($T_{water} \ge 34^\circ\text{C}$ or $T_{air} \ge 33^\circ\text{C}$) and photoperiod venting.
- [x] **1.3" I2C OLED Display (SH1106)**:
  - Connected `VCC` (5V with onboard regulator), `GND`, `SDA` (**GPIO 21**), and `SCL` (**GPIO 22**).
  - Resolved I2C bus lockup and verified clean detection at address `0x3C`.
- [x] **Pinout Optimization & Hardware Pin Shifts (Nov 2, 2026)**:
  - Shifted **Harvest Drain Pump** from Pin 26 to **GPIO 32** (Active-LOW).
  - Shifted **Grow Lights Array** from Pin 32 to **GPIO 27** (Active-HIGH single-channel module).
  - Shifted **Agitator Motor** from Pin 27 to **GPIO 26** (Active-LOW).
  - Maintained **Inlet Solenoid/Pump** on **GPIO 33** and **Air Sparger Pump** on **GPIO 25**.

### 2. Firmware Flashing & Physical Bench Verification
- [x] **OTA Firmware Flashing**:
  - Integrated ArduinoOTA and verified wireless flashing over WiFi targeting `192.168.0.114`.
- [x] **Verify Ultrasonic Ground-Truth on Boot**:
  - Implemented fault detection: if ultrasonic sensor disconnects $\to$ trips `STATE_HAZARD` with relay interlock.
  - Low-level standby: if tank $<80\%$, holds in `STATE_AWAITING_COMMISSION` awaiting user commissioning fill.
  - Optimal-level auto-bypass: if tank $\ge 80\%$ on boot, bypasses directly to `STATE_IDLE`.
- [x] **Live 2-Point Ultrasonic Calibration**:
  - Implemented NVS persistence for Empty Distance (0%) and Full Distance (100%).
  - Supported calibration via Web REST API and via physical button long-press in Dev Mode.
- [x] **Test Pump Jog Tool**:
  - 5-second timed jog pulse with visual countdown (`[J5s]`, `[J4s]`, ...) implemented for both Inlet (GPIO 33) and Outlet (GPIO 32) in Dev Mode.
- [x] **12V Exhaust Fan Automation**:
  - Verified manual toggle and automated biophysical trigger logic.

---

## 🖥️ Phase 2: OLED UI Overhaul & Button Navigation (Firmware)

- [x] **Button Input Engine (Enhanced Model B)**:
  - FreeRTOS dedicated input task on Core 0 (Priority 2) with 20ms debounce.
  - Normal Mode: BTN 1 = `< PREV`, BTN 2 = `NEXT >`.
  - Dev Mode (Actuator Bench): BTN 1 = Select Actuator, BTN 2 = Toggle Relay / 5s Pump Jog.
  - Anywhere: BTN 2 Long Press (>2.0s) = Toggle `DEV_MODE` ON/OFF.
- [x] **Pixel-Perfect 128x64 3-Screen Architecture**:
  - **Screen 1 (Bioreactor Hero Vessel & Vitals)**:
    - Animated liquid tank with dynamic surface wave and rising bubble sparging when Air/Agitator runs.
    - Honest sensor fault handling: explicitly displays `WT: Er`, `AT:Er  H:Er`, `Lvl:Er` if probes disconnect.
    - Active bottom badge strip (`[L] [A] [IN] [OUT] [M] [F]`).
  - **Screen 2 (Interactive Actuator Bench)**:
    - 2x3 matrix of all 6 hardware loads with inverted selection cursor.
    - Dedicated `>> STOP ALL RELAYS <<` emergency tile.
  - **Screen 3 (System, Geometry & Calibration)**:
    - Live ultrasonic distance, empty/full limits, WiFi RSSI, IP address, MQTT status, and free heap RAM.
- [x] **Screen & Icon Polish**:
  - Header with inverted state badge (`[ DEV ]` / `[ IDLE ]`), RTC time, WiFi bars, and MQTT dot indicator.
  - Screen transitions with toast overlays (`DEV MODE: ON`, `VIEW 1/3`, `ALL RELAYS OFF`).

---

## 🌐 Phase 3: Networking & Broker Infrastructure

- [x] **Resolve MQTT Disconnect on Port 8883**:
  - Identified root cause: `mqtt.mindzed.tech:8883` is running Plain TCP (non-TLS) while firmware was attempting TLS handshake via `WiFiClientSecure`.
  - Updated `MqttManager` to standard `WiFiClient` for instant connection (`rc = 0`) and verified telemetry publish/subscribe.
- [ ] **MQTT Broker TLS/SSL Hardening (`mqtt.mindzed.tech`)** *(Pending Broker Admin)*:
  - Admin to bind SSL/TLS certificates (e.g. Let's Encrypt / Certbot) on port 8883.
  - Restrict port 1883 to localhost/internal Docker network.
  - Once TLS is enabled on broker, re-enable `WiFiClientSecure` on ESP32 for production encrypted transport.

---

## 🧪 Phase 4: Optical Sensor Subsystem (TCS34725 — On Hold)

- [ ] Design and 3D print/fabricate light-tight optical flow-cell or cuvette mount for TCS34725.
- [ ] Connect sensor to shared I2C bus (SDA: GPIO 21, SCL: GPIO 22).
- [ ] Re-enable baseline calibration routine in firmware once physical enclosure is ready.
- [ ] Map RGB and Clear photon counts to Optical Density (OD600) and biomass density curves.

---

## 🚀 Phase 5: Cloud, Backend & Digital Twin Stack

### 1. Digital Twin Bento Grid (Frontend)
- [x] **Dev Mode Dashboard Access & Bench Control (Nov 2, 2026)**:
  - Added **"Enter Development Mode"** bypass button to `CommissioningModal` with `X` dismiss action to eliminate dry bench testing lockout.
  - Added live header **`DEV MODE: ACTIVE`** / **`DEV MODE`** 1-click toggle pill in `page.tsx` for immediate state switching anywhere on dashboard.
  - Enhanced **`ActuatorMatrixCard`** with **`Inlet 5s`**, **`Outlet 5s`** jog pulses, **`Halt All`** emergency cutoff, and direct interactive toggles for all 6 relays.
  - Enhanced **`ControlPanelModal`** with dual 5s jog tools, pre-flight diagnostics, and relay safety controls.
- [x] **Central Bioreactor Simulation Card (`ReactorTwinCard.tsx`)**:
  - Fully animated Next.js SVG simulation with fluid wave surface, bubble sparging, rotating magnetic impellers, spinning 12V exhaust fan, photosynthetic lights, and cascade inlet.
- [x] **Bento Grid Dashboard Architecture**:
  - Built 8 modular Bento cards (Vital Temps, Algae Growth, Actuator Matrix, Hardware Vitals, Biomass Chart, System Logs, Commissioning Modal, Control Panel Modal).
  - Turbopack verified and pushed to production repo.

### 2. Edge Resilience Roadmap
- [ ] **Store-and-Forward Offline Telemetry Buffer**:
  - Buffer telemetry snapshots to LittleFS flash buffer during multi-day fermentation if Wi-Fi drops.
- [ ] **Telegram Bot Interactive Notifications**:
  - Push critical alerts (High Temp $>35^\circ\text{C}$, Ultrasonic failure, Water empty) with inline action buttons (`[E-Stop]`, `[Toggle Fan]`).

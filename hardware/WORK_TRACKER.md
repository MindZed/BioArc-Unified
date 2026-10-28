# 📋 BioArc Hardware: Master Work & Architecture Tracker

> **Maintainer Log for Autonomous Agents & Developers**  
> **Repository:** BioArc Hardware (ESP32 Autonomous Bioreactor OS)  
> **Current Date/Time:** October 2026  
> **Status:** Active RTOS Upgrade & System Revival

---

## 🧭 Project Context & System Overview

BioArc is an autonomous biophysical operating system for photobioreactors, cultivating microalgae at high density. It automates environmental monitoring, actuation (intake, outtake, lighting, aeration, stirring), optical biomass estimation using an Adafruit TCS34725 sensor and the **Green Excess Index (GEI)** model, and streams telemetry via MQTT.

### Physical Rig Specifications
* **MCU:** Espressif ESP32 Dev Module (Dual-Core Xtensa LX6 @ 240MHz, 320KB SRAM, 4MB Flash).
* **Actuators & Relays:**
  - 2x 2-Channel Relay Modules (Active-LOW):
    - `GPIO 33`: Nutrient Media Intake Solenoid Valve (`RELAY_INTAKE`)
    - `GPIO 26`: Algae Harvest Outtake Valve (`RELAY_OUTTAKE`)
    - `GPIO 27`: Mechanical Agitator Motor / Brush (`RELAY_AGITATOR`)
  - 1x Solid State Relay (Active-LOW):
    - `GPIO 25`: Aeration Sparger Pump (`SSR1_AIR_PUMP`)
  - 1x Single-Channel Relay Module (Active-HIGH):
    - `GPIO 32`: High-Intensity Grow Light Array (`RELAY_LIGHT`) - *replacement module with active-high trigger logic*.
* **Sensors:**
  - `DS18B20` Submersible Water Temperature on `GPIO 4` (OneWire with $4.7\text{k}\Omega$ pull-up).
  - `JSN-SR04T` Non-contact Ultrasonic Liquid Level on `GPIO 18` (TRIG) / `GPIO 19` (ECHO).
  - Shared Hardware I2C Bus (`GPIO 21` SDA, `GPIO 22` SCL):
    - `0x27`: System Status LCD 1602
    - `0x25`: Biophysical Telemetry LCD 1602
    - `0x29`: Adafruit TCS34725 RGB & Clear Colorimetric Sensor
    - `0x76` (or `0x77`): Adafruit BME280 Ambient Sensor (Air Temp, Humidity, Pressure)
    - `0x68`: DS3231 Real-Time Clock with battery backup
* **Tank Geometry:**
  - `DIST_EMPTY = 33 cm` (minimum drain line)
  - `DIST_FULL = 8 cm` (100% capacity)
  - `DIST_REFILL_TRIG = 4 cm` (evaporation top-off trigger)
  - `OVERFLOW RISK <= 1 cm` (triggers emergency `STATE_HAZARD`)

---

## 🏗️ Architecture Transition: FreeRTOS Upgrade

### Why the upgrade was required:
1. **CPU Freezing during Color Reads:** In the legacy code, `ColorSensor::takeAveragedReading(5)` took 5 sequential 154ms integration cycles plus delays, freezing the entire MCU for ~800ms. Level sensing, network keep-alives, and safety checks stopped during this window.
2. **I2C Bus Contention:** Five distinct devices share GPIO 21 & 22. Without hardware mutex arbitration, multi-tasking would cause bus collisions.
3. **Dual-Core Hardware Utilization:** Standard Arduino runs `loop()` exclusively on Core 1. Core 0 sat idle.
4. **Hardcoded Credentials:** Wi-Fi and MQTT credentials were hardcoded strings requiring manual re-flashing whenever network or broker IP changed.

### FreeRTOS Dual-Core Design:
```
           [ ESP32 DUAL CORE PROCESSOR ]
    CORE 0 (Networking, Web & UI)      CORE 1 (Real-Time Control & Sensing)
   ┌───────────────────────────────┐  ┌────────────────────────────────┐
   │ Task_Network_Telemetry (Prio 2)│  │ Task_FSM_Control (Prio 4-Crit) │
   │ - WiFi / Auto-reconnect       │  │ - 100ms deterministic FSM loop │
   │ - MQTT loop & Telemetry push  │  │ - Hard safety interlocks       │
   │ - ArduinoOTA & TelnetStream   │  │   (temp >35C, overflow <=1cm)  │
   ├───────────────────────────────┤  ├────────────────────────────────┤
   │ Task_Captive_Portal (Prio 1)  │  │ Task_Sensors (Prio 3)          │
   │ - DNS Server & SoftAP         │  │ - 50ms ultrasonic level ping   │
   │ - Web Dashboard (Port 80)     │  │ - DS18B20 async temp conversion│
   │ - Dynamic WiFi/MQTT /config   │  │ - BME280 read under I2C Mutex  │
   ├───────────────────────────────┤  ├────────────────────────────────┤
   │ Task_Dual_Display (Prio 1)    │  │ Task_Optical_Sampling (Prio 2) │
   │ - Dual 16x2 LCD refresh under │  │ - Event-driven 5-sample GEI    │
   │   xI2CMutex every 500ms       │  │   with FreeRTOS vTaskDelay     │
   └───────────────────────────────┘  └────────────────────────────────┘
                 ▲                                   ▲
                 │                                   │
                 └─────── [ Inter-Task IPC ] ────────┘
                  - xI2CMutex: Hardware I2C bus lock
                  - xStateMutex: Guarding system telemetry
                  - xCommandQueue: Thread-safe actions
                  - xOpticalEventGroup: Coordination
```

---

## ☁️ Backend & Cloud Setup

* **PostgreSQL & MQTT Broker:** Handled on a separate existing server/system by the operator (not run from the local Docker).
* **Next.js 15 Frontend:** Hosted on **Vercel** with optimistic UI hydration, Gemini Live copilot streaming, and WebSocket telemetry visualization.
* **Go Backend API & Python ML Service:** Source code located at `C:\Users\Seven\Work\Hexafall\Next`. These two microservices will be deployed on an **Oracle Cloud A1 Ampere (ARM64)** VPS to process MQTT telemetry, store metrics, and query the Random Forest model (`bioreactor_rf_model.pkl`) for predictive dissolved oxygen & pH estimation.

---

## 📝 Step-by-Step Execution Log

| Step # | Date | Action Taken | Status | Notes |
| :---: | :---: | :--- | :---: | :--- |
| **01** | 2026-10-27 | Repository analysis & architecture mapping | ✅ Complete | Modular architecture in `src/` and `lib/` thoroughly reviewed. |
| **02** | 2026-10-27 | Baseline PlatformIO compilation test | ✅ Complete | PlatformIO 6.1.19 confirmed builds clean (`esp32dev_usb` and `esp32dev_ota`). |
| **03** | 2026-10-27 | Master Hardware Pinout Reference creation | ✅ Complete | Documented all pins, voltages, pull-ups, and I2C addresses in `HARDWARE_PINOUT_AND_WIRING.md`. |
| **04** | 2026-10-27 | Cleanup redundant legacy files | ✅ Complete | Removed monolithic Arduino sketch directory `BioArc_Monolithic/`. |
| **05** | 2026-10-27 | Relay polarity alignment | ✅ Complete | Confirmed pin 32 Active-HIGH (replacement module) and pins 33, 26, 27, 25 Active-LOW. |
| **06** | 2026-10-27 | Library Enhancements (`lib/`) | ✅ Complete | Updated `RelayManager` (per-pin configurable polarity), `ColorSensor` (thread-safe RTOS mutex yielding between samples), `CaptivePortal` (dynamic `/config` web page for Wi-Fi & MQTT). |
| **07** | 2026-10-27 | `src/main.cpp` FreeRTOS dual-core migration | ✅ Complete | Implemented 6 tasks across Core 0 & Core 1, `xI2CMutex`, `xStateMutex`, `xCommandQueue`, `xControlEvents`, Pre-Flight Self-Test, and NVS network storage. |
| **08** | 2026-10-27 | Compilation & Static Verification | ✅ Complete | PlatformIO build successful for both `esp32dev_usb` and `esp32dev_ota` (RAM: 15.7%, Flash: 71.8%). |
| **09** | 2026-10-27 | Oracle A1 Ampere Deployment Guide | ✅ Complete | Wrote `BACKEND_DEPLOYMENT_ORACLE_A1.md` for Go backend & Python ML service integration with external Postgres, MQTT broker, and Vercel. |
| **10** | 2026-10-28 | USB Flash & Boot-Up Diagnostics | ✅ Complete | Flashed FreeRTOS firmware to ESP32 on COM13. Boot diagnostics confirmed task spawning, NVS configuration, and driver initialization. |
| **11** | 2026-10-28 | Network Connection & Wireless OTA Flash | ✅ Complete | Configured fallback credentials (`seVen_Office`), established Wi-Fi link at `192.168.0.113`, verified HTTP `/api/data` & `/config`, and confirmed wireless ArduinoOTA flashing using password `bioarc2026`. |

---

## 📌 Instructions for Subsequent Agents

If you are continuing work on this project:
1. Refer to [`HARDWARE_PINOUT_AND_WIRING.md`](file:///c:/Users/Seven/Work/BioArc/BioArc%20Hardware/HARDWARE_PINOUT_AND_WIRING.md) for all physical pin definitions and electrical requirements.
2. Maintain the FreeRTOS dual-core task boundaries: Never execute blocking networking on Core 1; always guard I2C transactions with `xI2CMutex`.
3. To build the project, invoke PlatformIO via:
   `& "C:\Users\iamab\.platformio\penv\Scripts\pio.exe" run`
4. Update this `WORK_TRACKER.md` log table with any subsequent modifications.

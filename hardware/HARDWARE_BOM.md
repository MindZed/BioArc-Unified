# 📋 BioArc Hardware: Master Bill of Materials (BOM)

> **Document Status:** Official Production & Prototyping Reference  
> **Presentation PDF:** 📄 [**BioArc_Hardware_BOM.pdf**](file:///c:/Users/Seven/Work/BioArc-Unified/hardware/BioArc_Hardware_BOM.pdf)  
> **System:** BioArc Autonomous Bioreactor & Photobiological Microalgae OS  
> **Target Controller:** Espressif ESP32 Dev Module (ESP-WROOM-32)  
> **Firmware Reference:** [`hardware/src/main.cpp`](file:///c:/Users/Seven/Work/BioArc-Unified/hardware/src/main.cpp), [`hardware/HARDWARE_PINOUT_AND_WIRING.md`](file:///c:/Users/Seven/Work/BioArc-Unified/hardware/HARDWARE_PINOUT_AND_WIRING.md)  
> **Revision:** 1.0.0  

---

## 🧭 Executive Summary

This Bill of Materials (BOM) details every electrical, electromechanical, sensory, fluidic, and mechanical component required to assemble a fully functional **BioArc Autonomous Bioreactor Controller** and physical cultivation vessel.

The architecture is partitioned into 7 modular subsystems:
1. **Compute & Core Controller**
2. **Biophysical Sensor Suite**
3. **Displays & Human Machine Interface (HMI)**
4. **Actuation, Switching & Relay Drivers**
5. **Power Distribution & Voltage Regulation**
6. **Passive Circuit Protection & Wiring Interconnects**
7. **Bioreactor Vessel, Fluidics & Enclosure Mechanics**

---

## 1. Complete Categorized Bill of Materials

### 1.1 Compute & Core Processing

| Ref Des | Component Description | Recommended Model / MPN | Interface / Protocol | Operating Voltage | Qty | Key Notes & Purpose |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **U1** | **ESP32 Dev Module** (Dual-Core Xtensa LX6 @ 240MHz, 320KB SRAM, 4MB Flash) | NodeMCU ESP-32S / ESP-WROOM-32 (30-pin or 38-pin) | Wi-Fi 802.11 b/g/n, BLE, I2C, SPI, UART | 5V DC (MicroUSB / Vin pin), 3.3V Logic | 1 | Master embedded MCU running FreeRTOS dual-core tasks, FSM, and MQTT/Captive Portal. |
| **BRK1** | **ESP32 Screw Terminal Expansion Breakout Board** | 30-Pin / 38-Pin Terminal Adapter Board | Screw Terminals | 5V / 3.3V / GND | 1 | Provides robust screw terminals for all GPIOs, eliminating loose Dupont jumpers in harsh environments. |

---

### 1.2 Biophysical Sensory Array

| Ref Des | Sensor Subsystem | Recommended Model / MPN | Interface / Protocol | Operating Voltage | Qty | Key Electrical / Hardware Requirements |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **S1** | **Precision RGB & Clear Light Colorimeter** | Adafruit TCS34725 Breakout Board | I2C (Addr: `0x29`) via GPIO 21 (SDA), GPIO 22 (SCL) | 3.3V / 5V (On-board LDO) | 1 | Integrated IR blocking filter & white LED. Used for **Green Excess Index (GEI)** & optical density (OD) biomass calculation. Must be housed in an ambient light-tight optical sleeve. |
| **S2** | **Ambient Environmental Sensor (Temp, Humidity, Pressure)** | Bosch BME280 Breakout (GY-BME280) | I2C (Addr: `0x76` or `0x77`) via GPIO 21 / 22 | 3.3V (or 5V if module has 3.3V LDO) | 1 | Measures headspace ambient temperature, relative humidity, and barometric pressure for vapor pressure/evaporation modeling. |
| **S3** | **Submersible Culture Water Temperature Probe** | Dallas / Maxim DS18B20 (Waterproof Stainless Steel Probe Tube) | 1-Wire Digital Bus via **GPIO 4** | 3.3V – 5.0V | 1 | **Requires a $4.7\text{ k}\Omega$ pull-up resistor** between GPIO 4 and the 3.3V power rail. Hermetically sealed probe placed directly in the liquid culture. |
| **S4** | **Waterproof Non-Contact Ultrasonic Distance Sensor** | JSN-SR04T 2.0 / 3.0 Transceiver + Driver Board | Digital Pulse: `TRIG` = **GPIO 18**, `ECHO` = **GPIO 19** | 5V DC (Driver board) | 1 | Measures tank liquid surface distance ($33\text{ cm}$ empty to $7\text{ cm}$ full). **Requires a resistor divider on the ECHO pin** ($1\text{ k}\Omega / 2\text{ k}\Omega$) to step down 5V echo pulses to 3.3V safe logic for ESP32. |
| **S5** | **Precision Real-Time Clock (RTC)** | Maxim DS3231 High-Precision RTC Module with TCXO | I2C (Addr: `0x68`) via GPIO 21 / 22 | 3.3V | 1 | Maintains synchronized time across power cycles for 24-hour photoperiod and scheduled aeration/sampling cycles. Includes CR2032 coin cell holder. |

---

### 1.3 Displays & Human-Machine Interface (HMI)

| Ref Des | Component Description | Recommended Model / MPN | Interface / Bus | Operating Voltage | Qty | Key Notes & Purpose |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DISP1** | **1.3" / 0.96" Monochrome Graphic OLED Display** | SH1106 or SSD1306 (128x64 resolution, I2C) | I2C (Addr: `0x3C`) via GPIO 21 / 22 | 3.3V – 5V | 1 | Primary live HMI displaying state, hero biometrics, animated water level, actuator status, and calibration screens via U8g2. Features 2-minute auto-sleep burn-in protection. |
| **DISP2a/b** *(Alt/Legacy)* | **Dual 16x2 Character LCDs with I2C Backpacks** | 1602 LCD + PCF8574 I2C Adapter | I2C (Addr: `0x27` Status, `0x25` Telemetry) | 5V DC | 2 | Optional legacy dual display setup for status and telemetry readout. |
| **SW1** | **OLED Navigation Button (NAV / NEXT)** | 12x12mm Tactile Push Button / Panel-mount Momentary Switch | GPIO 13 to GND | 3.3V (Internal `INPUT_PULLUP`) | 1 | Short press cycles display pages (Telemetry $\rightarrow$ Actuators $\rightarrow$ Diagnostics); long press triggers cycle toggles. |
| **SW2** | **OLED Action Button (ACTION / SELECT)** | 12x12mm Tactile Push Button / Panel-mount Momentary Switch | GPIO 14 to GND | 3.3V (Internal `INPUT_PULLUP`) | 1 | Short press steps selected actuator; long press triggers manual jog or Dev Mode toggle. |

---

### 1.4 Actuators, Relays & Switching Hardware

| Ref Des | Actuator Subsystem | Recommended Model / MPN | Control Pin & Logic | Operating Voltage & Load Rating | Qty | Key Functional Requirements |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **RLY1** | **Multi-Channel Optocoupled Relay Board** | 4-Channel 5V Relay Board (Songle SRD-05VDC-SL-C) | Active-LOW Trigger (5V VCC, JD-VCC jumpered) | 5V Coil; Contacts 10A 250VAC / 30VDC | 1 | Houses switching for Intake Valve (**GPIO 33**), Agitator Motor (**GPIO 26**), and Grow Light Array (**GPIO 27**). Optically isolated. |
| **RLY2** | **Single-Channel Relay Module** | 1-Channel 5V Relay Module (Songle SRD-05VDC-SL-C) | **GPIO 32** (Active-HIGH Trigger) | 5V Coil; Contacts 10A 250VAC / 30VDC | 1 | Controls the Harvest Drain Outtake Pump. Separate module configured with active-HIGH trigger logic. |
| **SSR1** | **Solid State Relay (SSR)** | Fotek SSR-25 DA / Crydom or Low-Power 5V DC SSR Module | **GPIO 25** (Active-LOW Trigger) | 3–32V DC Input; 24–380V AC (or DC-DC variant for 12V pump) | 1 | Silent, solid-state switching for the continuous Aeration Sparger Pump. Eliminates mechanical relay wear over 5m ON / 25m OFF cycles. |
| **ACT1** | **Fresh Nutrient Media Intake Valve / Pump** | 12V DC Normally Closed Solenoid Valve (1/2" or 3/8" Barb) or 12V Peristaltic Dosing Pump | Driven via RLY1 (GPIO 33) | 12V DC, 0.4A – 1.0A | 1 | Doses sterile media/nutrients or refill water into the cultivation vessel to maintain target volume. |
| **ACT2** | **Algae Harvest Drain Valve / Outtake Pump** | 12V DC Self-Priming Diaphragm Water Pump (or Solenoid Valve) | Driven via RLY2 (GPIO 32) | 12V DC, 1.0A – 2.0A | 1 | Pumps harvested algae biomass out of the bottom drain into the collection container. |
| **ACT3** | **Aeration Air Sparger Pump** | 12V DC Diaphragm Air Pump (3–5 L/min) or 110V/220V AC Aquarium Diaphragm Pump | Driven via SSR1 (GPIO 25) | 12V DC / 110-230V AC, 5W – 15W | 1 | Injects air and $CO_2$ through bottom diffuser to supply dissolved carbon and prevent anoxic conditions. |
| **ACT4** | **Mechanical Agitator Motor / Brush** | 12V DC Low-RPM Geared Motor (30–60 RPM) or Magnetic Stirrer Motor | Driven via RLY1 (GPIO 26) | 12V DC, 0.5A – 1.2A | 1 | Drives internal wiper/stirring rod every 4 hours to eliminate biofouling on the acrylic wall and prevent cell settling. |
| **ACT5** | **Photoperiod Grow Light Array** | Full Spectrum LED Grow Strip (Red 660nm + Blue 450nm + 6500K White) | Driven via RLY1 (GPIO 27) | 12V DC, 2A – 3A (24W – 36W) | 1 | Surrounds the bioreactor cylinder. Provides PAR (Photosynthetically Active Radiation) for photosynthesis. |
| **ACT6** | **Chamber Exhaust Cooling Fan** | 12V DC Brushless Axial Fan ($60\times60\text{ mm}$ or $80\times80\text{ mm}$) | Driven via RLY1 (GPIO 23) | 12V DC, 0.15A – 0.25A | 1 | Evacuates heat build-up from LED grow lights when vessel temperature exceeds $34^\circ\text{C}$. |

---

### 1.5 Power Supply & Voltage Regulation

| Ref Des | Subsystem / Part | Recommended Model / MPN | Input Specs | Output Specs | Qty | Key Functional Purpose |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **PSU1** | **Main System AC-DC Power Supply** | Mean Well LRS-100-12 (or 12V 10A 120W Enclosed SMPS / Adapter) | 100–240V AC, 50/60Hz | 12V DC @ 8.5A – 10A | 1 | Provides unified primary power for all high-current loads: pumps, valves, LEDs, fan, and buck regulator. |
| **VR1** | **DC-DC Step-Down Buck Converter** | LM2596S / MP1584EN Step-Down Module | 7V – 28V DC (from 12V rail) | 5.0V DC regulated @ 3A max | 1 | Steps down 12V DC to clean 5.0V DC to power ESP32 Vin rail, relay coils, and ultrasonic driver. |
| **F1** | **DC Inline Fuse Holder & Fuse** | 5x20mm Glass Tube or Mini Blade Automotive Fuse Holder | Up to 32V DC | 10A fast-acting fuse | 1 | Overcurrent and short-circuit protection for main 12V bus. |
| **F2** | **5V Logic Rail Fuse** | Resettable PTC Fuse (PolySwitch) or 5x20mm Fuse | Up to 16V DC | 2.5A fast-acting fuse | 1 | Prevents logic board damage in case of wiring shorts. |
| **J1** | **DC Power Input Jack / Terminal** | 5.5mm x 2.1mm DC Barrel Jack or 2-Pin Screw Terminal Barrier Strip | Rated up to 10A | 12V Input Terminal | 1 | Solid connection point from external power adapter to internal chassis. |

---

### 1.6 Passive Circuit Protection, Interconnects & Prototyping

| Ref Des | Component Description | Technical Specification | Package / Mounting | Qty | Function & Critical Placement |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **D1–D4** | **Flyback / Snubber Diodes** | 1N4007 (1000V 1A) or 1N5819 Schottky | DO-41 Through-hole | 4 | **Mandatory:** Place antiparallel across inductive DC coils (Intake solenoid, Harvest pump, Agitator motor, Fan) to suppress back-EMF voltage spikes and prevent ESP32 resets. |
| **R1** | **OneWire Pull-Up Resistor** | $4.7\text{ k}\Omega \pm 1\%$, 1/4W Metal Film | Axial Through-Hole | 1 | Installed between DS18B20 data line (GPIO 4) and 3.3V rail. |
| **R2** | **Ultrasonic Echo Divider Resistor 1** | $1.0\text{ k}\Omega \pm 1\%$, 1/4W Metal Film | Axial Through-Hole | 1 | Series resistor between JSN-SR04T ECHO output and ESP32 GPIO 19. |
| **R3** | **Ultrasonic Echo Divider Resistor 2** | $2.0\text{ k}\Omega \pm 1\%$, 1/4W Metal Film | Axial Through-Hole | 1 | Pull-down resistor from GPIO 19 to GND (forms $5\text{V} \times \frac{2}{3} \approx 3.3\text{V}$ safe voltage divider). |
| **R4, R5** | **I2C Bus Pull-Up Resistors** *(Optional)* | $4.7\text{ k}\Omega \pm 1\%$, 1/4W Metal Film | Axial Through-Hole | 2 | Added on SDA (GPIO 21) and SCL (GPIO 22) if long wiring cables are used. |
| **TB1** | **Power Distribution Busbar / Terminal Block** | 6-Position or 8-Position Dual-Row Screw Terminal Block | 15A 600V rated | 2 | Clean distribution of common 12V (+), 5V (+), and GND rails. |
| **W1** | **Hookup Wire Assortment** | 18 AWG (Power/Load) & 24 AWG (Signal/Logic) | Stranded copper, silicone insulated | 1 spool ea. | High-current wiring for 12V rails; flexible signal wiring for sensors and buttons. |
| **CBL1** | **Dupont Ribbon Jumper Cables** | 20cm Female-to-Female, Male-to-Female | 28 AWG | 40-pin strip | Interconnecting sensor breakout boards and expansion shield. |

---

### 1.7 Bioreactor Vessel, Fluidics & Enclosure Mechanics

| Ref Des | Item Description | Specification / Material | Dimensions / Sizing | Qty | Key Application & Role |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TNK1** | **Cultivation Reactor Vessel (Column/Tank)** | Food-grade Clear Cast Acrylic or Borosilicate Glass Cylinder | OD 150mm – 200mm, Height 400mm – 500mm (5L – 10L capacity) | 1 | Main cultivation tank. Depth corresponds to calibrated parameters: $33\text{ cm}$ empty line, $7\text{ cm}$ full line. |
| **LID1** | **Airtight Vessel Top Cover / Lid** | CNC Acrylic, Delrin, or 3D Printed PETG/ABS with Silicone O-Ring Seal | Matching tank diameter with mounting ports | 1 | Houses ports for JSN-SR04T transducer, DS18B20 cable gland, media fill inlet tube, air vent filter, and agitator shaft. |
| **OPT1** | **Optical Light-Tight Shroud & Cuvette Window** | 3D Printed Black PLA/PETG or Matte Anodized Aluminum | Snug fit around TCS34725 sensor board against vessel | 1 | Isolates TCS34725 from ambient room light and stray grow LED glare to ensure accurate GEI / OD readings. |
| **DIF1** | **Air Sparger Diffuser Stone** | Sintered Stainless Steel 316 or Ceramic Micro-Pore Air Stone | $10\mu\text{m} - 50\mu\text{m}$ pore size, 4mm barb | 1 | Produces uniform fine micro-bubbles for high gas-liquid mass transfer of $CO_2$ and $O_2$. |
| **TUB1** | **Fluidic & Gas Tubing** | Food-Grade Silicone Tubing | 4mm ID / 6mm OD & 8mm ID / 10mm OD | 5 meters | Non-reactive, autoclavable fluid lines for media fill, harvest draining, and aeration sparging. |
| **VLV1** | **One-Way Check Valve** | Kynar / PVDF Inline Check Valve | 4mm / 6mm barbed | 2 | Prevents liquid backflow into the air pump when aeration is turned off. |
| **FILT1** | **Sterile Air Vent Filter** | $0.22\mu\text{m}$ PTFE Hydrophobic Air Filter Disc | 25mm – 50mm diameter | 2 | Installed on air intake and tank headspace exhaust vent to prevent airborne contamination. |
| **ENC1** | **Electronics Enclosure / IP65 Project Box** | ABS Waterproof Junction Box with Clear Lid | Approx. $200\times150\times75\text{ mm}$ | 1 | Houses ESP32 breakout board, relay modules, buck converter, and wiring busbars away from liquid splashes. |
| **GLN1** | **Waterproof Cable Glands** | PG7 / PG9 Nylon Cable Glands | Fits 3mm – 8mm cable diameters | 6 | Waterproof pass-throughs for sensor cables and DC power entering the electronics enclosure. |

---

## 2. Cost Breakdown & Billed Hardware Budget

### Actual Billed Cost Summary (Hardware Rig)

| Ref # | Subsystem / Category | Included Components & Modules | Actual Billed Cost (INR) |
| :---: | :--- | :--- | :---: |
| **1** | **Compute & Controller** | ESP32-WROOM-32 Dev Board (₹300) + Terminal Expansion Board (₹120) | **₹420** |
| **2** | **Biophysical Sensors** | TCS34725 Colorimeter, BME280, DS18B20 Water Temp, JSN-SR04T Sonar, DS3231 RTC | **₹300** |
| **3** | **Displays & HMI** | 1.3" I2C OLED Display (SH1106/SSD1306) + Tactile Push Buttons (NAV / ACTION) | **₹300** |
| **4** | **Relays, SSR & Switching** | 4-Ch Relay Board (Songle), 1-Ch Relay Board, Solid State Relay (SSR) | **₹400** |
| **5** | **Actuators & Fluidics** | 12V Intake Solenoid Valve, Outtake Pump, Aeration Pump, Agitator, Grow LEDs, Fan | **₹300** |
| **6** | **Power Supply & Regulation** | 12V DC Power Supply Adapter / SMPS + LM2596 DC-DC Step-Down Buck Converter | **₹300** |
| **7** | **Passives & Interconnects** | 1N4007 Flyback Diodes, Pull-up & Divider Resistors, Terminal Blocks, Jumper Wires | **₹100** |
| **8** | **Vessel, Optics & Enclosure** | Cultivation Column Tank, Optical Light Shroud, Silicone Tubing, Diffuser, IP65 Box | **₹800** |
| | **TOTAL BILLED HARDWARE COST** | **All 8 Subsystems (Full Operational Rig)** | **₹2,920** |

---

## 3. Critical Hardware Implementation Guidelines

1. **Galvanic & Noise Isolation**:
   - Keep 12V high-current motor/solenoid grounds separated from ESP32 analog/sensor GND until the single star-ground point at the power distribution block.
   - Never power the 12V pumps or LED array directly through the ESP32 5V pin.
2. **Inductive Spike Protection**:
   - Always install a **1N4007 flyback diode** across the terminals of DC inductive loads (solenoid valve, harvest pump, agitator motor). Failure to do so will cause voltage spikes to crash the ESP32 or trigger random resets.
3. **Logic Level Integrity**:
   - The JSN-SR04T ultrasonic module outputs a 5V logic pulse on its `ECHO` pin. Connect through a voltage divider ($1\text{ k}\Omega$ and $2\text{ k}\Omega$) before reaching ESP32 GPIO 19.
   - The DS18B20 requires a $4.7\text{ k}\Omega$ pull-up to the 3.3V rail.
4. **Optical Biomass Enclosure**:
   - The TCS34725 RGB sensor must be mounted flush against the transparent vessel wall inside a 3D-printed black opaque shroud. Ambient room light variation will alter the Green Excess Index (GEI) baseline.
5. **Fluidic Anti-Siphon Protection**:
   - Ensure the nutrient media intake line and drain outtake line incorporate anti-siphon loops or normally-closed valves located above maximum liquid head to prevent accidental gravity draining.

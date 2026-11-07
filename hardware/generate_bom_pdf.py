import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        width, height = A4

        # Header Accent Bar (Page 2 onwards)
        if self._pageNumber > 1:
            self.setFillColor(colors.HexColor('#0F172A'))
            self.rect(20 * mm, height - 14 * mm, width - 40 * mm, 0.75 * mm, fill=True, stroke=False)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748B'))
            self.drawString(20 * mm, height - 12 * mm, "BIOARC HARDWARE BILL OF MATERIALS  |  TECHNICAL REFERENCE")
            self.drawRightString(width - 20 * mm, height - 12 * mm, "ESP32 AUTONOMOUS BIOREACTOR")

        # Footer
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.5)
        self.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawString(20 * mm, 10 * mm, "BioArc Systems © 2026 • Hardware Engineering & Prototyping Review")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(width - 20 * mm, 10 * mm, page_str)
        self.restoreState()


def generate_bom_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom color palette
    c_primary = colors.HexColor('#0F172A')     # Slate 900
    c_emerald = colors.HexColor('#059669')     # Emerald 600
    c_emerald_dark = colors.HexColor('#047857')# Emerald 700
    c_emerald_bg = colors.HexColor('#ECFDF5')  # Emerald 50
    c_slate_dark = colors.HexColor('#1E293B')  # Slate 800
    c_slate_muted = colors.HexColor('#475569') # Slate 600
    c_light_bg = colors.HexColor('#F8FAFC')    # Slate 50
    c_border = colors.HexColor('#CBD5E1')      # Slate 300

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=2 * mm
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_slate_muted,
        spaceAfter=4 * mm
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=3 * mm,
        spaceAfter=2 * mm
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=c_emerald_dark,
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=c_primary
    )

    cell_normal = ParagraphStyle(
        'CellNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_slate_dark
    )

    cell_center = ParagraphStyle(
        'CellCenter',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=1,
        textColor=c_primary
    )

    cell_price = ParagraphStyle(
        'CellPrice',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=c_primary
    )

    story = []

    # 1. Header Banner & Branding
    brand_table_data = [
        [
            Paragraph("<b>BIOARC</b> | Autonomous Bioreactor Controller", badge_style),
            Paragraph("Hardware Revision: <b>v1.0-RTOS</b>", ParagraphStyle('RBadge', parent=badge_style, alignment=2))
        ]
    ]
    brand_table = Table(brand_table_data, colWidths=[110 * mm, 64 * mm])
    brand_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_emerald_bg),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#A7F3D0')),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(brand_table)
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph("Hardware Bill of Materials (BOM) & Billed Budget", title_style))
    story.append(Paragraph("Production physical component pricing, GPIO hardware mappings, and subsystem budget roll-up.", subtitle_style))

    # 2. Executive KPI Cards (4 metrics across)
    kpi_card_data = [
        [
            Paragraph("<b>TOTAL BILLED COST</b><br/><font size='13' color='#059669'><b>₹ 2,920</b></font><br/><font size='6.5' color='#64748B'>Full Functional Rig</font>", ParagraphStyle('KPI', alignment=1)),
            Paragraph("<b>CORE MCU</b><br/><font size='10' color='#0F172A'><b>ESP32 Dual-Core</b></font><br/><font size='6.5' color='#64748B'>240MHz / 4MB Flash</font>", ParagraphStyle('KPI', alignment=1)),
            Paragraph("<b>SUBSYSTEMS</b><br/><font size='10' color='#0F172A'><b>8 Subsystems</b></font><br/><font size='6.5' color='#64748B'>Sensors, Power, Fluidics</font>", ParagraphStyle('KPI', alignment=1)),
            Paragraph("<b>RIG STATUS</b><br/><font size='10' color='#0F172A'><b>Verified & Billed</b></font><br/><font size='6.5' color='#64748B'>Active Cultivation Ready</font>", ParagraphStyle('KPI', alignment=1))
        ]
    ]
    kpi_table = Table(kpi_card_data, colWidths=[43.5 * mm, 43.5 * mm, 43.5 * mm, 43.5 * mm])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
        ('BOX', (0,0), (-1,-1), 0.75, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 5 * mm))

    # 3. Master Billed Cost Table
    story.append(Paragraph("1. Actual Billed Hardware Cost Breakdown", section_heading))

    cost_headers = [
        Paragraph("<b>#</b>", cell_center),
        Paragraph("<b>Subsystem / Category</b>", cell_bold),
        Paragraph("<b>Included Components & Modules</b>", cell_bold),
        Paragraph("<b>Billed Cost (INR)</b>", ParagraphStyle('HPrice', parent=cell_bold, alignment=2))
    ]

    cost_rows = [
        cost_headers,
        [
            Paragraph("1", cell_center),
            Paragraph("<b>Compute & Controller</b>", cell_bold),
            Paragraph("ESP32-WROOM-32 Dev Board (₹300) + Terminal Expansion Board (₹120)", cell_normal),
            Paragraph("₹ 420", cell_price)
        ],
        [
            Paragraph("2", cell_center),
            Paragraph("<b>Biophysical Sensors</b>", cell_bold),
            Paragraph("TCS34725 RGB Colorimeter, BME280 Ambient, DS18B20 Temp, JSN-SR04T Sonar, DS3231 RTC", cell_normal),
            Paragraph("₹ 300", cell_price)
        ],
        [
            Paragraph("3", cell_center),
            Paragraph("<b>Displays & HMI</b>", cell_bold),
            Paragraph("1.3\" I2C OLED Display (SH1106/SSD1306) + Tactile Push Buttons (NAV / ACTION)", cell_normal),
            Paragraph("₹ 300", cell_price)
        ],
        [
            Paragraph("4", cell_center),
            Paragraph("<b>Relays, SSR & Switching</b>", cell_bold),
            Paragraph("4-Ch Relay Board (Songle), 1-Ch Relay Board, Solid State Relay (SSR for aeration)", cell_normal),
            Paragraph("₹ 400", cell_price)
        ],
        [
            Paragraph("5", cell_center),
            Paragraph("<b>Actuators & Fluidics</b>", cell_bold),
            Paragraph("12V Intake Solenoid Valve, Outtake Drain Pump, Aeration Sparger Pump, Agitator Motor, Grow LEDs, Cooling Fan", cell_normal),
            Paragraph("₹ 300", cell_price)
        ],
        [
            Paragraph("6", cell_center),
            Paragraph("<b>Power Supply & Regulation</b>", cell_bold),
            Paragraph("12V DC SMPS / Power Supply Adapter + LM2596 DC-DC Step-Down Buck Converter (5V 3A)", cell_normal),
            Paragraph("₹ 300", cell_price)
        ],
        [
            Paragraph("7", cell_center),
            Paragraph("<b>Passives & Interconnects</b>", cell_bold),
            Paragraph("1N4007 Flyback Diodes, Pull-up Resistors (4.7kΩ), Voltage Divider, Terminal Blocks, Jumper Wires", cell_normal),
            Paragraph("₹ 100", cell_price)
        ],
        [
            Paragraph("8", cell_center),
            Paragraph("<b>Vessel, Optics & Enclosure</b>", cell_bold),
            Paragraph("Cultivation Column Tank (33cm depth), Optical Light-Tight Shroud, Silicone Tubing, Micro Diffuser, IP65 Project Box", cell_normal),
            Paragraph("₹ 800", cell_price)
        ],
        [
            Paragraph("", cell_center),
            Paragraph("<b>TOTAL BILLED HARDWARE BUDGET</b>", ParagraphStyle('TB', parent=cell_bold, fontSize=9.5, textColor=c_emerald_dark)),
            Paragraph("<b>Complete 8-Subsystem Physical Bioreactor Rig</b>", ParagraphStyle('TN', parent=cell_normal, fontName='Helvetica-Bold', textColor=c_emerald_dark)),
            Paragraph("<font size='10' color='#047857'><b>₹ 2,920</b></font>", ParagraphStyle('TP', parent=cell_price, fontSize=10, textColor=c_emerald_dark))
        ]
    ]

    cost_table = Table(cost_rows, colWidths=[10 * mm, 46 * mm, 92 * mm, 26 * mm])
    cost_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.75, c_border),
        ('INNERGRID', (0,0), (-1,-2), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        # Highlight total row
        ('BACKGROUND', (0,-1), (-1,-1), c_emerald_bg),
        ('LINEABOVE', (0,-1), (-1,-1), 1.2, colors.HexColor('#10B981')),
    ]))
    story.append(cost_table)
    story.append(Spacer(1, 4 * mm))

    # Notes snippet on page 1
    p1_note = Paragraph(
        "<b>Cost Optimization Highlight:</b> By consolidating multiple laboratory instruments (spectrophotometer, timer relays, PID chiller loops) into an integrated ESP32 FreeRTOS controller with low-cost solid-state and optical components, total rig BOM cost is optimized to <b>₹2,920</b> while retaining full cloud IoT telemetry and autonomous safety interlocks.",
        ParagraphStyle('Note1', parent=cell_normal, textColor=c_slate_muted, fontSize=7.5, leading=10.5)
    )
    p1_box = Table([[p1_note]], colWidths=[174 * mm])
    p1_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(p1_box)

    # PAGE 2: Detailed Technical Pinout & Implementation Requirements
    story.append(PageBreak())

    story.append(Paragraph("2. Controller GPIO & Peripheral Matrix", section_heading))

    pin_headers = [
        Paragraph("<b>GPIO Pin</b>", cell_bold),
        Paragraph("<b>Peripheral / Subsystem</b>", cell_bold),
        Paragraph("<b>Interface</b>", cell_bold),
        Paragraph("<b>Operating Volts</b>", cell_bold),
        Paragraph("<b>Hardware Logic / State</b>", cell_bold),
        Paragraph("<b>Circuit Protection / Notes</b>", cell_bold)
    ]

    pin_data = [
        pin_headers,
        [
            Paragraph("<b>GPIO 21</b>", cell_bold),
            Paragraph("I2C Data (`SDA`)", cell_normal),
            Paragraph("I2C Shared", cell_normal),
            Paragraph("3.3V", cell_normal),
            Paragraph("Open-drain", cell_normal),
            Paragraph("Shared bus: TCS34725, BME280, RTC, OLED", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 22</b>", cell_bold),
            Paragraph("I2C Clock (`SCL`)", cell_normal),
            Paragraph("I2C Shared", cell_normal),
            Paragraph("3.3V", cell_normal),
            Paragraph("Open-drain", cell_normal),
            Paragraph("Hardware pull-up on bus", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 4</b>", cell_bold),
            Paragraph("Submersible Water Temp (DS18B20)", cell_normal),
            Paragraph("1-Wire", cell_normal),
            Paragraph("3.3V / 5V", cell_normal),
            Paragraph("Open-drain", cell_normal),
            Paragraph("<b>4.7kΩ pull-up resistor</b> to 3.3V required", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 18</b>", cell_bold),
            Paragraph("Ultrasonic Level `TRIG`", cell_normal),
            Paragraph("Digital Out", cell_normal),
            Paragraph("3.3V / 5V", cell_normal),
            Paragraph("Active-HIGH", cell_normal),
            Paragraph("10µs pulse to JSN-SR04T driver", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 19</b>", cell_bold),
            Paragraph("Ultrasonic Level `ECHO`", cell_normal),
            Paragraph("Digital In", cell_normal),
            Paragraph("3.3V Safe", cell_normal),
            Paragraph("Active-HIGH", cell_normal),
            Paragraph("<b>Resistor divider</b> (1kΩ / 2kΩ) to protect ESP32", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 33</b>", cell_bold),
            Paragraph("Media Intake Solenoid Valve", cell_normal),
            Paragraph("Relay 1", cell_normal),
            Paragraph("12V Load", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Flyback diode 1N4007 across coil", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 32</b>", cell_bold),
            Paragraph("Harvest Outtake Drain Pump", cell_normal),
            Paragraph("Relay 3", cell_normal),
            Paragraph("12V Load", cell_normal),
            Paragraph("Active-HIGH", cell_normal),
            Paragraph("Single-channel relay module; flyback diode", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 25</b>", cell_bold),
            Paragraph("Aeration Air Sparger Pump", cell_normal),
            Paragraph("SSR 1", cell_normal),
            Paragraph("12V / 230V", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Solid state relay for silent 5m/25m cycling", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 26</b>", cell_bold),
            Paragraph("Mechanical Agitator Motor", cell_normal),
            Paragraph("Relay 4", cell_normal),
            Paragraph("12V Load", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Drives wall-wiper every 4h; flyback diode", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 27</b>", cell_bold),
            Paragraph("Photoperiod Grow Light Array", cell_normal),
            Paragraph("Relay 2", cell_normal),
            Paragraph("12V Load", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Full-spectrum LED illumination (8:00–20:00)", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 23</b>", cell_bold),
            Paragraph("Chamber Exhaust Cooling Fan", cell_normal),
            Paragraph("Relay 5", cell_normal),
            Paragraph("12V Load", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Automatic heat evacuation (>34°C)", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 13</b>", cell_bold),
            Paragraph("OLED Navigation Button (NAV)", cell_normal),
            Paragraph("Digital In", cell_normal),
            Paragraph("3.3V", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Internal INPUT_PULLUP; cycles display pages", cell_normal)
        ],
        [
            Paragraph("<b>GPIO 14</b>", cell_bold),
            Paragraph("OLED Action Button (ACTION)", cell_normal),
            Paragraph("Digital In", cell_normal),
            Paragraph("3.3V", cell_normal),
            Paragraph("Active-LOW", cell_normal),
            Paragraph("Internal INPUT_PULLUP; jog/dev mode toggle", cell_normal)
        ]
    ]

    pin_table = Table(pin_data, colWidths=[20 * mm, 38 * mm, 20 * mm, 20 * mm, 25 * mm, 51 * mm])
    pin_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.75, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(pin_table)
    story.append(Spacer(1, 4 * mm))

    # 4. Critical Engineering & Safety Rules
    story.append(Paragraph("3. Critical Assembly & Safety Guidelines", section_heading))

    guideline_items = [
        [
            Paragraph("<b>1. Inductive Flyback Suppression:</b> Install 1N4007 diodes across solenoid valve and DC motor terminals (cathode to +12V, anode to GND) to eliminate reverse-EMF transients that cause ESP32 watchdog reboots.", cell_normal)
        ],
        [
            Paragraph("<b>2. 5V Ultrasonic Echo Clamping:</b> The JSN-SR04T receiver outputs a 5V pulse on ECHO. The 1kΩ / 2kΩ resistive divider ensures the ESP32 GPIO 19 never sees voltages exceeding 3.33V.", cell_normal)
        ],
        [
            Paragraph("<b>3. Optical Biomass Isolation:</b> The TCS34725 color sensor must be seated flush against the vessel in an opaque 3D-printed shroud to ensure repeatable Green Excess Index (GEI) calculations unaffected by room lighting.", cell_normal)
        ],
        [
            Paragraph("<b>4. Galvanic Separation:</b> Ensure high-current 12V pump/LED grounds and sensitive 3.3V sensor grounds meet only at a single star-ground point on the power terminal bus to prevent ground loops.", cell_normal)
        ]
    ]

    rules_table = Table(guideline_items, colWidths=[174 * mm])
    rules_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(rules_table)

    # Build the PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == '__main__':
    out = os.path.abspath("hardware/BioArc_Hardware_BOM.pdf")
    generate_bom_pdf(out)

package models

import "time"

// Database Models

// Telemetry maps to the "Telemetry" table in PostgreSQL
type Telemetry struct {
	ID            string    `gorm:"column:id;primaryKey" json:"id"`
	Timestamp     time.Time `gorm:"column:timestamp;not null" json:"timestamp"`
	State         string    `gorm:"column:state;not null" json:"state"`
	WaterTemp     float64   `gorm:"column:waterTemp;not null" json:"waterTemp"`
	AirTemp       float64   `gorm:"column:airTemp;not null" json:"airTemp"`
	Humidity      float64   `gorm:"column:humidity;not null" json:"humidity"`
	Pressure      float64   `gorm:"column:pressure;not null" json:"pressure"`
	LevelCm       int       `gorm:"column:levelCm;not null" json:"levelCm"`
	PredictedPh   float64   `gorm:"column:predictedPh" json:"predictedPh"`
	PredictedDo   float64   `gorm:"column:predictedDo" json:"predictedDo"`
	TcsR          int       `gorm:"column:tcsR" json:"tcsR"`
	TcsG          int       `gorm:"column:tcsG" json:"tcsG"`
	TcsB          int       `gorm:"column:tcsB" json:"tcsB"`
	TcsC          int       `gorm:"column:tcsC" json:"tcsC"`
	GreenRatio    float64   `gorm:"column:greenRatio" json:"greenRatio"`
	GrRatio       float64   `gorm:"column:grRatio" json:"grRatio"`
	PseudoOd      float64   `gorm:"column:pseudoOd" json:"pseudoOd"`
	VegIndex      float64   `gorm:"column:vegIndex" json:"vegIndex"`
	ChlAUgl       float64   `gorm:"column:chlAUgl" json:"chlAUgl"`
	GrowthRateU   float64   `gorm:"column:growthRateU" json:"growthRateU"`
	HasBaseline   bool      `gorm:"column:hasBaseline" json:"hasBaseline"`
	RelayIntake   bool      `gorm:"column:relayIntake;not null" json:"relayIntake"`
	RelayOuttake  bool      `gorm:"column:relayOuttake;not null" json:"relayOuttake"`
	RelayAir      bool      `gorm:"column:relayAir;not null" json:"relayAir"`
	RelayLight    bool      `gorm:"column:relayLight;not null" json:"relayLight"`
	RelayAgitator bool      `gorm:"column:relayAgitator;not null" json:"relayAgitator"`
}

func (Telemetry) TableName() string {
	return "Telemetry"
}

// SystemLog maps to the "SystemLog" table
type SystemLog struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	Timestamp time.Time `gorm:"column:timestamp;not null" json:"timestamp"`
	Level     string    `gorm:"column:level;not null" json:"level"`
	Message   string    `gorm:"column:message;not null" json:"message"`
}

func (SystemLog) TableName() string {
	return "SystemLog"
}

// DeviceConfig maps to the "DeviceConfig" table
type DeviceConfig struct {
	ID             string    `gorm:"column:id;primaryKey" json:"id"`
	UpdatedAt      time.Time `gorm:"column:updatedAt;not null" json:"updatedAt"`
	LightOnHr      int       `gorm:"column:lightOnHr;not null" json:"lightOnHr"`
	LightOffHr     int       `gorm:"column:lightOffHr;not null" json:"lightOffHr"`
	EnableLights   bool      `gorm:"column:enableLights;not null" json:"enableLights"`
	EnableAir      bool      `gorm:"column:enableAir;not null" json:"enableAir"`
	EnableAgitator bool      `gorm:"column:enableAgitator;not null" json:"enableAgitator"`
	EnableRefill   bool      `gorm:"column:enableRefill;not null" json:"enableRefill"`
}

func (DeviceConfig) TableName() string {
	return "DeviceConfig"
}

// MQTT Payload Models

type MQTTTelemetryPayload struct {
	State     string  `json:"state"`
	WaterTemp float64 `json:"water_temp"`
	AirTemp   float64 `json:"air_temp"`
	Humidity  float64 `json:"humidity"`
	Pressure  float64 `json:"pressure"`
	LevelCm   int     `json:"level_cm"`
	Relays    struct {
		Intake   bool `json:"intake"`
		Outtake  bool `json:"outtake"`
		Air      bool `json:"air"`
		Light    bool `json:"light"`
		Agitator bool `json:"agitator"`
	} `json:"relays"`
	// Support both legacy lowercase tags and new ESP32 uppercase tags
	Water_Temp_C       float64 `json:"Water_Temp_C,omitempty"`
	TCS34725_R         int     `json:"TCS34725_R,omitempty"`
	TCS34725_G         int     `json:"TCS34725_G,omitempty"`
	TCS34725_B         int     `json:"TCS34725_B,omitempty"`
	TCS34725_C         int     `json:"TCS34725_C,omitempty"`
	TcsR_low           int     `json:"tcs_r,omitempty"`
	TcsG_low           int     `json:"tcs_g,omitempty"`
	TcsB_low           int     `json:"tcs_b,omitempty"`
	TcsC_low           int     `json:"tcs_c,omitempty"`
	Photoperiod_Active int     `json:"Photoperiod_Active,omitempty"`
	Actuator_AirPump   int     `json:"Actuator_AirPump,omitempty"`
	Hour_of_Day        int     `json:"Hour_of_Day,omitempty"`

	// Algae Growth & Biomass Metrics from ESP32
	GreenRatio  float64 `json:"green_ratio,omitempty"`
	GrRatio     float64 `json:"gr_ratio,omitempty"`
	PseudoOd    float64 `json:"pseudo_od,omitempty"`
	VegIndex    float64 `json:"veg_index,omitempty"`
	ChlAUgl     float64 `json:"chl_a_ugl,omitempty"`
	GrowthRateU float64 `json:"growth_rate_u,omitempty"`
	HasBaseline bool    `json:"has_baseline,omitempty"`

	StoreThis bool `json:"store_this"`
}

func (m MQTTTelemetryPayload) GetTcsR() int {
	if m.TCS34725_R != 0 {
		return m.TCS34725_R
	}
	return m.TcsR_low
}

func (m MQTTTelemetryPayload) GetTcsG() int {
	if m.TCS34725_G != 0 {
		return m.TCS34725_G
	}
	return m.TcsG_low
}

func (m MQTTTelemetryPayload) GetTcsB() int {
	if m.TCS34725_B != 0 {
		return m.TCS34725_B
	}
	return m.TcsB_low
}

func (m MQTTTelemetryPayload) GetTcsC() int {
	if m.TCS34725_C != 0 {
		return m.TCS34725_C
	}
	return m.TcsC_low
}

func (m MQTTTelemetryPayload) GetWaterTemp() float64 {
	if m.Water_Temp_C != 0 {
		return m.Water_Temp_C
	}
	return m.WaterTemp
}

type MQTTLogPayload struct {
	Level string `json:"level"`
	Msg   string `json:"msg"`
}

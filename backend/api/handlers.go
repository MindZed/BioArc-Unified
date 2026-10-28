package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"bioarc-backend/db"
	"bioarc-backend/models"
	"bioarc-backend/mqtt"
	"github.com/gin-gonic/gin"
)

func GetTelemetryHistory(c *gin.Context) {
	hoursStr := c.DefaultQuery("hours", "24")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hours parameter"})
		return
	}

	var telemetry []models.Telemetry
	timeAgo := time.Now().Add(time.Duration(-hours) * time.Hour)

	if err := db.DB.Where("timestamp >= ?", timeAgo).Order("timestamp desc").Find(&telemetry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, telemetry)
}

func GetLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter"})
		return
	}

	var logs []models.SystemLog
	if err := db.DB.Order("timestamp desc").Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func GetConfig(c *gin.Context) {
	var config models.DeviceConfig
	if err := db.DB.First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Config not found"})
		return
	}

	c.JSON(http.StatusOK, config)
}

type ConfigUpdateRequest struct {
	LightOnHr      int  `json:"light_on"`
	LightOffHr     int  `json:"light_off"`
	EnableLights   bool `json:"en_lights"`
	EnableAir      bool `json:"en_air"`
	EnableAgitator bool `json:"en_agitator"`
	EnableRefill   bool `json:"en_refill"`
	FillPct        int  `json:"fill_pct"`
	ColorMode      int  `json:"color_mode"`
}

func UpdateConfig(c *gin.Context) {
	var req ConfigUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var config models.DeviceConfig
	if err := db.DB.First(&config).Error; err == nil {
		// Update DB with known fields
		config.LightOnHr = req.LightOnHr
		config.LightOffHr = req.LightOffHr
		config.EnableLights = req.EnableLights
		config.EnableAir = req.EnableAir
		config.EnableAgitator = req.EnableAgitator
		config.EnableRefill = req.EnableRefill
		config.UpdatedAt = time.Now()
		db.DB.Save(&config)
	}

	// Publish ALL fields to MQTT
	payloadBytes, _ := json.Marshal(map[string]interface{}{
		"light_on":    req.LightOnHr,
		"light_off":   req.LightOffHr,
		"en_lights":   req.EnableLights,
		"en_air":      req.EnableAir,
		"en_agitator": req.EnableAgitator,
		"en_refill":   req.EnableRefill,
		"fill_pct":    req.FillPct,
		"color_mode":  req.ColorMode,
	})

	if err := mqtt.PublishConfig(string(payloadBytes)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish config to MQTT"})
		return
	}

	c.JSON(http.StatusOK, req)
}

type CommandRequest struct {
	Action string `json:"action" binding:"required"`
}

func SendCommand(c *gin.Context) {
	var req CommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := mqtt.PublishCommand(req.Action); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send command"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Command sent successfully"})
}

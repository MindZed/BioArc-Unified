package api

import (
	"bioarc-backend/ws"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Enable simple CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// WebSocket route
	r.GET("/ws", ws.WsHandler)

	apiGroup := r.Group("/api")
	{
		apiGroup.GET("/telemetry/history", GetTelemetryHistory)
		apiGroup.GET("/logs", GetLogs)
		apiGroup.GET("/config", GetConfig)
		apiGroup.PUT("/config", UpdateConfig)
		apiGroup.POST("/command", SendCommand)
	}

	return r
}

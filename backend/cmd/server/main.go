package main

import (
	"log"

	"bioarc-backend/api"
	"bioarc-backend/config"
	"bioarc-backend/db"
	"bioarc-backend/mqtt"
)

func main() {
	log.Println("Starting BioArc Go Backend Connector...")

	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Initialize Database
	db.Init(cfg)

	// 3. Initialize MQTT Client
	mqtt.Init(cfg)

	// 4. Setup API Router
	router := api.SetupRouter()

	// 5. Start HTTP server
	log.Printf("Starting API server on port %s...", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

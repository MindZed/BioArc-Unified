package db

import (
	"log"

	"bioarc-backend/config"
	"bioarc-backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init(cfg *config.Config) {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to PostgreSQL database successfully.")

	// Auto-migrate database tables
	if err := DB.AutoMigrate(&models.Telemetry{}, &models.SystemLog{}, &models.DeviceConfig{}); err != nil {
		log.Printf("Warning: AutoMigrate failed: %v", err)
	} else {
		log.Println("AutoMigrate completed successfully.")
	}
}

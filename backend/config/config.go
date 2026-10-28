package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	MQTTBroker   string
	MQTTClientID string
	MQTTUser     string
	MQTTPassword string
	Port         string
	MLServiceURL string
}

func LoadConfig() *Config {
	// Load .env file if it exists, but don't crash if it doesn't (useful for docker/prod)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found or error reading it, relying on system environment variables")
	}

	return &Config{
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/bioarc?sslmode=disable"),
		MQTTBroker:   getEnv("MQTT_BROKER", "tcp://localhost:1883"),
		MQTTClientID: getEnv("MQTT_CLIENT_ID", "bioarc-go-backend"),
		MQTTUser:     getEnv("MQTT_USER", ""),
		MQTTPassword: getEnv("MQTT_PASSWORD", ""),
		Port:         getEnv("PORT", "8080"),
		MLServiceURL: getEnv("ML_SERVICE_URL", "http://bioarc-reactor-bioarcmlservice-fde9eh:5000/predict"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

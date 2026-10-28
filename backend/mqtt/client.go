package mqtt

import (
	"crypto/tls"
	"fmt"
	"log"
	"strings"
	"time"

	"bioarc-backend/config"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var (
	Client       mqtt.Client
	MLServiceURL string
)

func Init(cfg *config.Config) {
	MLServiceURL = cfg.MLServiceURL
	opts := mqtt.NewClientOptions()
	opts.AddBroker(cfg.MQTTBroker)
	
	clientID := cfg.MQTTClientID
	if clientID == "" {
		clientID = "bioarc-go-backend"
	}
	clientID = fmt.Sprintf("%s-%d", clientID, time.Now().UnixNano()%100000)
	opts.SetClientID(clientID)

	if strings.HasPrefix(cfg.MQTTBroker, "tcps://") || strings.HasPrefix(cfg.MQTTBroker, "ssl://") || strings.HasPrefix(cfg.MQTTBroker, "tls://") {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
		}
		opts.SetTLSConfig(tlsConfig)
	}

	if cfg.MQTTUser != "" {
		opts.SetUsername(cfg.MQTTUser)
	}
	if cfg.MQTTPassword != "" {
		opts.SetPassword(cfg.MQTTPassword)
	}

	opts.SetAutoReconnect(true)
	opts.SetMaxReconnectInterval(10 * time.Second)

	opts.OnConnect = func(c mqtt.Client) {
		log.Println("Connected to MQTT Broker!")
		subscribeToTopics(c)
	}

	opts.OnConnectionLost = func(c mqtt.Client, err error) {
		log.Printf("MQTT connection lost: %v\n", err)
	}

	Client = mqtt.NewClient(opts)
	if token := Client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to MQTT broker: %v", token.Error())
	}
}

func subscribeToTopics(c mqtt.Client) {
	topics := map[string]mqtt.MessageHandler{
		"bioarc/device_01/telemetry": handleTelemetry,
		"bioarc/device_01/log":       handleLog,
		"bioarc/device_01/status":    handleStatus,
	}

	for topic, handler := range topics {
		if token := c.Subscribe(topic, 1, handler); token.Wait() && token.Error() != nil {
			log.Printf("Failed to subscribe to %s: %v\n", topic, token.Error())
		} else {
			log.Printf("Subscribed to MQTT topic: %s\n", topic)
		}
	}
}

func PublishCommand(action string) error {
	payload := `{"action":"` + action + `"}`
	token := Client.Publish("bioarc/device_01/command", 1, false, payload)
	token.Wait()
	return token.Error()
}

func PublishConfig(payload string) error {
	token := Client.Publish("bioarc/device_01/config", 1, false, payload)
	token.Wait()
	return token.Error()
}

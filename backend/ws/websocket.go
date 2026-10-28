package ws

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

var (
	clients       = make(map[*websocket.Conn]bool)
	clientsMu     sync.Mutex
	lastTelemetry interface{}
	lastState     interface{}
	lastCacheMu   sync.RWMutex
)

// WsHandler upgrades the HTTP connection and adds the client to the registry
func WsHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	log.Println("New WebSocket client connected.")

	// Instantly send the last known state to prevent dashboard waiting
	lastCacheMu.RLock()
	if lastTelemetry != nil {
		conn.WriteJSON(map[string]interface{}{
			"type":    "telemetry",
			"payload": lastTelemetry,
		})
	}
	if lastState != nil {
		conn.WriteJSON(map[string]interface{}{
			"type":    "status",
			"payload": lastState,
		})
	}
	lastCacheMu.RUnlock()

	// Keep connection alive and handle disconnects
	go func() {
		defer func() {
			clientsMu.Lock()
			delete(clients, conn)
			clientsMu.Unlock()
			conn.Close()
			log.Println("WebSocket client disconnected.")
		}()
		for {
			// Read messages just to catch client disconnections
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

// BroadcastMessage sends a JSON message to all connected WebSocket clients
func BroadcastMessage(msgType string, payload interface{}) {
	message := map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	}

	// Cache the latest telemetry and status for new connections
	if msgType == "telemetry" {
		lastCacheMu.Lock()
		lastTelemetry = payload
		lastCacheMu.Unlock()
	} else if msgType == "status" {
		lastCacheMu.Lock()
		lastState = payload
		lastCacheMu.Unlock()
	}

	clientsMu.Lock()
	defer clientsMu.Unlock()

	for client := range clients {
		err := client.WriteJSON(message)
		if err != nil {
			log.Println("WebSocket error writing to client:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

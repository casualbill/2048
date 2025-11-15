package main

import (
	"log"
	"net/http"
	"os"

	"2048-game/backend/config"
	"2048-game/backend/database"
	"2048-game/backend/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.NewPostgreSQLDB(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis
	redisClient, err := database.NewRedisClient(cfg.Redis)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Set up Gin router
	router := gin.Default()

	// Enable CORS
	router.Use(cors.Default())

	// Initialize handlers
	handler := handlers.NewHandler(db, redisClient)

	// API routes
	api := router.Group("/api/v1")
	{
		game := api.Group("/game")
		{
			game.POST("/record", handler.SubmitGameRecord)
			game.GET("/leaderboard/score", handler.GetScoreLeaderboard)
			game.GET("/leaderboard/time", handler.GetTimeLeaderboard)
			game.GET("/player/:player_name", handler.GetPlayerRecords)
		}
	}

	// Run server
	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.Server.Port
	}

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
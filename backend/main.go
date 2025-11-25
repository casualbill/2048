package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Connect to PostgreSQL
	db, err := connectDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Create game records table if not exists
	err = createTable(db)
	if err != nil {
		log.Fatal(err)
	}

	// Set up CORS middleware
	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleRequests(w, r, db)
	}))

	log.Println("Server starting on :3000")
log.Fatal(http.ListenAndServe(":3000", handler))
}

func connectDB() (*sql.DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Check connection
	err = db.Ping()
	if err != nil {
		return nil, err
	}

	return db, nil
}

func createTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS game_records (
			id SERIAL PRIMARY KEY,
			session_id VARCHAR(255) NOT NULL,
			score INTEGER NOT NULL,
			time_taken FLOAT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	return err
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleRequests(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")

	switch r.URL.Path {
	case "/api/game", "/game":
		handleGameRecord(w, r, db)
	case "/api/leaderboard", "/leaderboard":
		handleLeaderboard(w, r, db)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

func handleGameRecord(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "POST":
		// Parse the game record
		var record GameRecord
		err := json.NewDecoder(r.Body).Decode(&record)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Save record to database
		_, err = db.Exec(`
			INSERT INTO game_records (session_id, score, time_taken)
			VALUES ($1, $2, $3)
		`, record.SessionId, record.Score, record.TimeTaken)
		if err != nil {
			log.Printf("Error saving game record: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Log the record
		log.Printf("Received game record: %+v", record)

		// Return a success response
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleLeaderboard(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		// Query top 100 records from database
		rows, err := db.Query(`
			SELECT session_id, score, time_taken
			FROM game_records
			ORDER BY score DESC, time_taken ASC
			LIMIT 100
		`)
		if err != nil {
			log.Printf("Error querying leaderboard: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// Parse rows into leaderboard entries
		leaderboard := []LeaderboardEntry{}
		for rows.Next() {
			var entry LeaderboardEntry
			err := rows.Scan(&entry.SessionId, &entry.Score, &entry.TimeTaken)
			if err != nil {
				log.Printf("Error parsing leaderboard entry: %v", err)
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			leaderboard = append(leaderboard, entry)
		}

		// Check for errors from iterating over rows
		err = rows.Err()
		if err != nil {
			log.Printf("Error iterating over leaderboard rows: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(leaderboard)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GameRecord represents a game record

type GameRecord struct {
	SessionId  string          `json:"sessionId"`
	Score      int             `json:"score"`
	TimeTaken  float64         `json:"timeTaken"`
	Operations []GameOperation `json:"operations"`
}

// GameOperation represents a single operation in the game

type GameOperation struct {
	Direction  int64  `json:"direction"`
	Timestamp  int64  `json:"timestamp"`
	ScoreChange int64 `json:"scoreChange"`
}

// LeaderboardEntry represents an entry in the leaderboard

type LeaderboardEntry struct {
	SessionId string  `json:"sessionId"`
	Score     int     `json:"score"`
	TimeTaken float64 `json:"timeTaken"`
}
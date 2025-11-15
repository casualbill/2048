package models

import (
	"time"
)

// GameRecord represents a complete game record
 type GameRecord struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	SessionID        string    `gorm:"size:36;uniqueIndex" json:"session_id"`
	PlayerName       string    `gorm:"size:100" json:"player_name"`
	Score            int       `gorm:"index" json:"score"`
	GameTime         int64     `gorm:"index" json:"game_time"` // in milliseconds
	GridSize         int       `json:"grid_size"`
	Won              bool      `json:"won"`
	Over             bool      `json:"over"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	Operations       []Operation `gorm:"foreignKey:GameRecordID" json:"operations"`
}

// Operation represents a single move operation
 type Operation struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	GameRecordID     uint      `gorm:"index" json:"game_record_id"`
	Direction        int       `json:"direction"` // 0: up, 1: right, 2: down, 3: left
	Timestamp        int64     `json:"timestamp"`
	Score            int       `json:"score"`
	ScoreChange      int       `json:"score_change"`
	GameTimeElapsed  int64     `json:"game_time_elapsed"` // in milliseconds
}

// LeaderboardEntry represents a leaderboard entry
 type LeaderboardEntry struct {
	PlayerName string `json:"player_name"`
	Score      int    `json:"score"`
	GameTime   int64  `json:"game_time"`
	CreatedAt  time.Time `json:"created_at"`
	Rank       int    `json:"rank"`
}
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"

	"2048-game/backend/database"
	"2048-game/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Handler handles API requests
type Handler struct {
	db         *database.PostgreSQLDB
	redisClient *database.RedisClient
}

// NewHandler creates a new Handler
func NewHandler(db *database.PostgreSQLDB, redisClient *database.RedisClient) *Handler {
	return &Handler{db: db, redisClient: redisClient}
}

// SubmitGameRecord handles game record submission
func (h *Handler) SubmitGameRecord(c *gin.Context) {
	var request struct {
		PlayerName string             `json:"player_name"`
		Score      int                `json:"score"`
		GameTime   int64              `json:"game_time"`
		Operations []models.Operation `json:"operations"`
		Size       int                `json:"size"`
		Won        bool               `json:"won"`
		Over       bool               `json:"over"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate session ID
	sessionID := generateSessionID()

	// Create game record
	gameRecord := models.GameRecord{
		SessionID:  sessionID,
		PlayerName: request.PlayerName,
		Score:      request.Score,
		GameTime:   request.GameTime,
		GridSize:   request.Size,
		Won:        request.Won,
		Over:       request.Over,
	}

	// Create operations with foreign key
	for i := range request.Operations {
		request.Operations[i].GameRecordID = gameRecord.ID
	}
	gameRecord.Operations = request.Operations

	// Save to database
	if err := h.db.DB.Create(&gameRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save game record"})
		return
	}

	// Clear leaderboard cache
	h.redisClient.Client.Del(h.redisClient.ctx, "leaderboard:score", "leaderboard:time")

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"session_id": sessionID,
		"message":   "Game record saved successfully",
	})
}

// GetScoreLeaderboard handles score leaderboard request
func (h *Handler) GetScoreLeaderboard(c *gin.Context) {
	// Try to get from cache first
	// cacheKey := "leaderboard:score"
	// if cacheData, err := h.redisClient.GetLeaderboardFromCache(cacheKey); err == nil {
	//  var leaderboard []models.LeaderboardEntry
	//  if err := json.Unmarshal(cacheData, &leaderboard); err == nil {
	//      c.JSON(http.StatusOK, leaderboard)
	//      return
	//  }
	// }

	// Get from database
	var gameRecords []models.GameRecord
	if err := h.db.DB.Order("score DESC, created_at ASC").Limit(100).Find(&gameRecords).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get leaderboard"})
		return
	}

	// Convert to leaderboard entries
	leaderboard := make([]models.LeaderboardEntry, len(gameRecords))
	for i, record := range gameRecords {
		leaderboard[i] = models.LeaderboardEntry{
			PlayerName: record.PlayerName,
			Score:      record.Score,
			GameTime:   record.GameTime,
			CreatedAt:  record.CreatedAt,
			Rank:       i + 1,
		}
	}

	// Cache the result
	// if cacheData, err := json.Marshal(leaderboard); err == nil {
	//  h.redisClient.SetLeaderboardToCache(cacheKey, cacheData, 300) // Cache for 5 minutes
	// }

	c.JSON(http.StatusOK, leaderboard)
}

// GetTimeLeaderboard handles time leaderboard request
func (h *Handler) GetTimeLeaderboard(c *gin.Context) {
	// Try to get from cache first
	// cacheKey := "leaderboard:time"
	// if cacheData, err := h.redisClient.GetLeaderboardFromCache(cacheKey); err == nil {
	//  var leaderboard []models.LeaderboardEntry
	//  if err := json.Unmarshal(cacheData, &leaderboard); err == nil {
	//      c.JSON(http.StatusOK, leaderboard)
	//      return
	//  }
	// }

	// Get from database - only won games
	var gameRecords []models.GameRecord
	if err := h.db.DB.Where("won = ?", true).Order("game_time ASC, created_at ASC").Limit(100).Find(&gameRecords).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get leaderboard"})
		return
	}

	// Convert to leaderboard entries
	leaderboard := make([]models.LeaderboardEntry, len(gameRecords))
	for i, record := range gameRecords {
		leaderboard[i] = models.LeaderboardEntry{
			PlayerName: record.PlayerName,
			Score:      record.Score,
			GameTime:   record.GameTime,
			CreatedAt:  record.CreatedAt,
			Rank:       i + 1,
		}
	}

	// Cache the result
	// if cacheData, err := json.Marshal(leaderboard); err == nil {
	//  h.redisClient.SetLeaderboardToCache(cacheKey, cacheData, 300) // Cache for 5 minutes
	// }

	c.JSON(http.StatusOK, leaderboard)
}

// GetPlayerRecords handles player records request
func (h *Handler) GetPlayerRecords(c *gin.Context) {
	playerName := c.Param("player_name")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	var gameRecords []models.GameRecord
	offset := (page - 1) * pageSize
	if err := h.db.DB.Where("player_name = ?", playerName).Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&gameRecords).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get player records"})
		return
	}

	// Get total count
	var total int64
	h.db.DB.Model(&models.GameRecord{}).Where("player_name = ?", playerName).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"records":    gameRecords,
		"page":       page,
		"page_size":  pageSize,
		"total":      total,
		"total_pages": (int(total) + pageSize - 1) / pageSize,
	})
}

// generateSessionID generates a random session ID
func generateSessionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return hex.EncodeToString(bytes)
}
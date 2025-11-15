package database

import (
	"context"
	"fmt"

	"2048-game/backend/config"

	"github.com/redis/go-redis/v9"
)

// RedisClient is a wrapper for redis.Client
 type RedisClient struct {
	*redis.Client
	ctx context.Context
}

// NewRedisClient creates a new Redis connection
 func NewRedisClient(cfg config.Redis) (*RedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx := context.Background()
	// Test connection
	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, err
	}

	return &RedisClient{Client: client, ctx: ctx}, nil
}

// Close closes the Redis connection
 func (rc *RedisClient) Close() error {
	return rc.Client.Close()
}

// GetLeaderboardFromCache gets leaderboard from Redis cache
 func (rc *RedisClient) GetLeaderboardFromCache(key string) ([]byte, error) {
	return rc.Client.Get(rc.ctx, key).Bytes()
}

// SetLeaderboardToCache sets leaderboard to Redis cache
 func (rc *RedisClient) SetLeaderboardToCache(key string, value []byte, expiration int) error {
	return rc.Client.Set(rc.ctx, key, value, 0).Err()
}
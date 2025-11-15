package database

import (
	"fmt"

	"2048-game/backend/config"
	"2048-game/backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// PostgreSQLDB is a wrapper for gorm.DB
 type PostgreSQLDB struct {
	*gorm.DB
}

// NewPostgreSQLDB creates a new PostgreSQL connection
 func NewPostgreSQLDB(cfg config.Database) (*PostgreSQLDB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
		cfg.Host,
		cfg.User,
		cfg.Password,
		cfg.DBName,
		cfg.Port,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Info),
	})
	if err != nil {
		return nil, err
	}

	// Auto-migrate tables
	if err := db.AutoMigrate(&models.GameRecord{}, &models.Operation{}); err != nil {
		return nil, err
	}

	return &PostgreSQLDB{DB: db}, nil
}

// Close closes the database connection
 func (db *PostgreSQLDB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
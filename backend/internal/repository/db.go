package repository

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/pressly/goose/v3"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/barbershop/backend/migrations"
)

var DB *gorm.DB

// InitDB opens a PostgreSQL connection and runs goose migrations.
func InitDB() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/barbershop?sslmode=disable"
	}

	var db *gorm.DB
	var err error

	// Retry loop for container startup race
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			break
		}
		log.Printf("DB not ready, retrying (%d/10)...", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	runMigrations(sqlDB)

	DB = db
	log.Println("Database connected and migrated")
	return db
}

func runMigrations(sqlDB *sql.DB) {
	goose.SetBaseFS(migrations.FS)

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("goose set dialect: %v", err)
	}
	if err := goose.Up(sqlDB, "."); err != nil {
		log.Fatalf("goose up: %v", err)
	}
}

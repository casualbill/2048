package main

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

func main() {
	// Test that the pq driver is registered
	drivers := sql.Drivers()
	fmt.Println("Available drivers:")
	for _, driver := range drivers {
		fmt.Println("- ", driver)
	}
}

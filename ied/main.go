package main

import (
	"log"
	"os"
	"path/filepath"
)

func main() {
	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	registry := NewRegistry("https://registry.npmjs.com")
	local := NewLocal()
	resolvers := []Resolver{local, registry}
	dir := filepath.Join(wd, "node_modules")
	store := NewStore(dir, resolvers)

	if err := store.Init(); err != nil {
		log.Fatalf("failed to init store: %v", err)
	}

	for _, name := range os.Args[1:] {
		if err := store.Install(nil, name, "*"); err != nil {
			log.Println("failed to install %v: %v", name, err)
		}
	}
}

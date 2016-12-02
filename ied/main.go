package main

import (
	"os"
	"path/filepath"
	log "github.com/Sirupsen/logrus"
)

func initConfig () *Config {
	filename, err := configFilename()
	if err != nil {
		log.Warnf("failed getting config filename: %v", err)
	}

	config, err := LoadConfig(filename)
	if err != nil {
		log.Warnf("failed loading config: %v", err)
	}

	if err := config.Validate(); err != nil {
		log.Fatalf("failed loading config: %v", err)
	}

	return config
}

func main() {
	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	initConfig()

	registry := NewRegistry("https://registry.npmjs.com")
	local := NewLocal()
	resolver := NewMultiResolver(local, registry)
	dir := filepath.Join(wd, "node_modules")
	store := NewStore(dir, resolver)

	if err := store.Init(); err != nil {
		log.Fatalf("failed to init store: %v", err)
	}

	for _, name := range os.Args[1:] {
		if err := store.Install(nil, name, "*"); err != nil {
			log.Printf("failed to install %v: %v", name, err)
		}
	}
}

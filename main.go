package main

import (
	log "github.com/Sirupsen/logrus"
	"os"
	"path/filepath"
)

func initConfig() *Config {
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

func setLogLevel(config *Config) {
	level, err := log.ParseLevel(config.LogLevel)
	if err != nil {
		log.Warnf("failed to parse log level: %v", err)
	} else {
		log.SetLevel(level)
	}
}

func initResolver() Resolver {
	registry := NewRegistry("http://registry.npmjs.com")
	local := NewLocal()
	return NewMultiResolver(local, registry)
}

func initStore(wd string, resolver Resolver) *Store {
	dir := filepath.Join(wd, "node_modules")
	store := NewStore(dir, resolver)
	if err := store.Init(); err != nil {
		log.Fatalf("failed to init store: %v", err)
	}
	return store
}

func main() {
	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	config := initConfig()
	setLogLevel(config)

	resolver := initResolver()
	store := initStore(wd, resolver)

	for _, name := range os.Args[1:] {
		if err := store.Install(nil, name, "*"); err != nil {
			log.Printf("failed to install %v: %v", name, err)
		}
	}
}

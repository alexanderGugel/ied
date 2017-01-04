package main

import (
	log "github.com/Sirupsen/logrus"
	"os"
)

func readConfig() *Config {
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

func getWd() string {
	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}
	return wd
}

func main() {
	config := readConfig()
	setLogLevel(config)
	wd := getWd()

	switch os.Args[1] {
	case "i":
		fallthrough
	case "install":
		installCmd(wd, config, os.Args[2:])
	}
}

package main

import (
	"github.com/Sirupsen/logrus"
	"os"
)

func readConfig() *Config {
	filename, err := configFilename()
	if err != nil {
		logrus.Warnf("failed getting config filename: %v", err)
	}

	config, err := LoadConfig(filename)
	if err != nil {
		logrus.Warnf("failed loading config: %v", err)
	}

	if err := config.Validate(); err != nil {
		logrus.Fatalf("failed loading config: %v", err)
	}

	return config
}

func setLogLevel(config *Config) {
	level, err := logrus.ParseLevel(config.LogLevel)
	if err != nil {
		logrus.Warnf("failed to parse log level: %v", err)
	} else {
		logrus.SetLevel(level)
	}
}

func getWd() string {
	wd, err := os.Getwd()
	if err != nil {
		logrus.Fatalf("failed to get working directory: %v", err)
	}
	return wd
}

func main() {
	config := readConfig()
	setLogLevel(config)
	wd := getWd()

	if len(os.Args) < 2 {
		helpCmd()
		return
	}

	switch os.Args[1] {
	case "i":
		fallthrough
	case "install":
		installCmd(wd, config, os.Args[2:])
	default:
		helpCmd()
	}
}

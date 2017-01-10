package main

import (
	"github.com/Sirupsen/logrus"
)

func pingCmd(config *Config) {
	registry := NewRegistry(config.Registry)
	logrus.Infof("📡  pinging %q…", config.Registry)
	err := registry.Ping()
	if err != nil {
		logrus.Fatalf("👎  registry down: %v", err)
	}
	logrus.Info("👍  registry up")
}

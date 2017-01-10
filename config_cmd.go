package main

import (
	"github.com/Sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

func configCmd(c *Config) {
	str, err := yaml.Marshal(c)
	if err != nil {
		logrus.Fatalf("failed to serialize cofnig: %v", err)
	}
	logrus.Println(string(str))
}

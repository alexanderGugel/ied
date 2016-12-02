package main

import (
	"errors"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"net/url"
	"os/user"
	"path/filepath"
)

type Config struct {
	Registry  string `yaml:"Registry"`
	LogLevel  string `yaml:"Log Level"`
	LogFormat string `yaml:"Log Format"`
}

func NewDefaultConfig() *Config {
	return &Config{
		Registry:  "https://registry.npmjs.com",
		LogLevel:  "info",
		LogFormat: "json",
	}
}

func configFilename() (string, error) {
	usr, err := user.Current()
	if err != nil {
		return "", err
	}
	return filepath.Join(usr.HomeDir, ".ied.yaml"), nil
}

func LoadConfig(filename string) (*Config, error) {
	config := NewDefaultConfig()
	raw, err := ioutil.ReadFile(filename)
	if err != nil {
		return config, err
	}

	if err := yaml.Unmarshal(raw, config); err != nil {
		return config, err
	}
	return config, nil
}

func (c *Config) Validate() error {
	if c.Registry == "" {
		return errors.New("missing registry")
	}
	if _, err := url.Parse(c.Registry); err != nil {
		return errors.New("invalid registry url")
	}
	if c.LogLevel != "debug" &&
		c.LogLevel != "info" &&
		c.LogLevel != "warn" &&
		c.LogLevel != "error" {
		return errors.New("invalid log level")
	}
	if c.LogFormat != "json" &&
		c.LogFormat != "text" {
		return errors.New("invalid log format")
	}
	return nil
}

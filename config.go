package main

import (
	"errors"
	log "github.com/Sirupsen/logrus"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"net/url"
	"os/user"
	"path/filepath"
)

// Config encapsulates global configuration options.
type Config struct {
	Registry  string `yaml:"Registry"`
	LogLevel  string `yaml:"Log Level"`
	LogFormat string `yaml:"Log Format"`
}

// NewDefaultConfig creates a new configuration, populated with sensible
// defaults.
func NewDefaultConfig() *Config {
	return &Config{
		Registry:  "https://registry.npmjs.com",
		LogLevel:  "info",
		LogFormat: "json",
	}
}

// configFilename returns the path from which the default ied config should be
// read. By default this is the .ied.yaml file in the user's home directory.
func configFilename() (string, error) {
	usr, err := user.Current()
	if err != nil {
		return "", err
	}
	return filepath.Join(usr.HomeDir, ".ied.yaml"), nil
}

// LoadConfig reads the user's config from the provided filename. This function
// always returns a config. User-defined configuration records override
// predefined config defaults.
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

// Validate checks it the provided config is valid. It ensures that the provided
// registry URL is syntactically valid and the log level exists.
func (c *Config) Validate() error {
	if c.Registry == "" {
		return errors.New("missing registry")
	}
	if _, err := url.Parse(c.Registry); err != nil {
		return errors.New("invalid registry url")
	}
	if _, err := log.ParseLevel(c.LogLevel); err != nil {
		return errors.New("invalid log level")
	}
	if c.LogFormat != "json" &&
		c.LogFormat != "text" {
		return errors.New("invalid log format")
	}
	return nil
}

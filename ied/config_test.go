package main

import (
	"github.com/stretchr/testify/assert"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"
)

func TestNewDefaultConfig(t *testing.T) {
	config := NewDefaultConfig()
	assert.Equal(t, config.Registry, "https://registry.npmjs.com")
	assert.Equal(t, config.LogLevel, "info")
	assert.Equal(t, config.LogFormat, "json")
}

func TestLoadConfig(t *testing.T) {
	dir, err := ioutil.TempDir("", "TestLoadConfig")
	assert.NoError(t, err)

	defer os.RemoveAll(dir)

	filename := filepath.Join(dir, "config.yaml")
	raw := []byte(`Registry: https://registry.npmjs.com
Log Level: warn`)
	err = ioutil.WriteFile(filename, raw, os.ModePerm)
	assert.NoError(t, err)

	config, err := LoadConfig(filename)
	assert.NoError(t, err)
	assert.Equal(t, *config, Config{
		Registry:  "https://registry.npmjs.com",
		LogLevel:  "warn",
		LogFormat: "json",
	})
}

package main

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestNewDefaultConfig(t *testing.T) {
	config := NewDefaultConfig()
	assert.Equal(t, config.Registry, "https://registry.npmjs.com")
	assert.Equal(t, config.LogLevel, "info")
	assert.Equal(t, config.LogFormat, "json")
}

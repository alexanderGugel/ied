package main

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestRegistryPkgDeps(t *testing.T) {
	pkg := &RegistryPkg{
		Dependencies: map[string]string{
			"browserify": "1.2.3",
			"tape":       "~1.0.0",
		},
	}
	deps := pkg.Deps()
	assert.Equal(t, deps, pkg.Dependencies)
}

func TestRegistryPkgID(t *testing.T) {
	pkg := &RegistryPkg{
		Dist: struct {
			Tarball string `json:"tarball"`
			Shasum  string `json:"shasum"`
		}{
			Tarball: "",
			Shasum:  "shasum",
		},
	}
	id := pkg.ID()
	assert.Equal(t, id, pkg.Dist.Shasum, "should use shasum as unique id")
}

func TestNewRegistry(t *testing.T) {
	rootURL := "http://registry.npmjs.com/"
	registry := NewRegistry(rootURL)
	assert.Equal(t, registry.RootURL, rootURL)
}

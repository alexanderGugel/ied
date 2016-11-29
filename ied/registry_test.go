package main

import (
	"reflect"
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
	if !reflect.DeepEqual(deps, pkg.Dependencies) {
		t.Fatalf("expected %v to deep equal %v", deps, pkg.Dependencies)
	}
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
	if id != pkg.Dist.Shasum {
		t.Fatalf("expected %v to equal %v", id, pkg.Dist.Shasum)
	}
}

func TestNewRegistry(t *testing.T) {
	rootURL := "http://registry.npmjs.com/"
	registry := NewRegistry(rootURL)
	if registry.RootURL != rootURL {
		t.Fatalf("expected %v to equal %v", registry.RootURL, rootURL)
	}
}

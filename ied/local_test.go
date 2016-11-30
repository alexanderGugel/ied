package main

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestLocalPkgDeps(t *testing.T) {
	pkg := &LocalPkg{
		Dependencies: map[string]string{
			"tape":       "1.2.3",
			"browserify": "1.2.3",
		},
	}

	deps := pkg.Deps()
	if !reflect.DeepEqual(deps, pkg.Dependencies) {
		t.Fatalf("expected %v to deep equal %v", deps, pkg.Dependencies)
	}
}

func TestLocalPkgID(t *testing.T) {
	pkg := &LocalPkg{
		Shasum: "123",
	}

	id := pkg.ID()
	if id != pkg.Shasum {
		t.Fatalf("expected %v to equal %v", id, pkg.Shasum)
	}
}

func TestLocalPkgDownloadInto(t *testing.T) {
	pkg := &LocalPkg{}
	err := pkg.DownloadInto("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestLocalResolve(t *testing.T) {
	dir, err := ioutil.TempDir("", "TestLocalResolve")
	if err != nil {
		t.Fatalf("failed to create tmp dir: %v", err)
	}

	defer os.RemoveAll(dir)

	if err := os.MkdirAll(filepath.Join(dir, "node_modules", "shasum", "package"), os.ModePerm); err != nil {
		t.Fatalf("failed to create package dir structure: %v", err)
	}

	if err := os.Symlink(
		filepath.Join(dir, "node_modules", "shasum", "package"),
		filepath.Join(dir, "node_modules", "some-package"),
	); err != nil {
		t.Fatalf("failed to create package symlink: %v", err)
	}

	pkgFile := filepath.Join(dir, "node_modules", "shasum", "package", "package.json")
	raw := []byte("{\"name\": \"some-package\"}\n")
	if err := ioutil.WriteFile(pkgFile, raw, os.ModePerm); err != nil {
		t.Fatalf("failed to write package.json: %v", err)
	}

	local := NewLocal()
	pkg, err := local.Resolve(
		filepath.Join(dir, "node_modules", "some-package"),
		"",
		"",
	)
	if err != nil {
		t.Fatalf("failed to resolve dependency: %v", err)
	}

	if pkg.ID() != "shasum" {
		t.Fatalf("expected %v to equal %v", pkg.ID(), "shasum")
	}
}

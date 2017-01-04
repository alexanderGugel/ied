package main

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLocalPkgDeps(t *testing.T) {
	pkg := &LocalPkg{
		Dependencies: map[string]string{
			"tape":       "1.2.3",
			"browserify": "1.2.3",
		},
	}

	deps := pkg.Deps()
	assert.Equal(t, deps, pkg.Dependencies)
}

func TestLocalPkgID(t *testing.T) {
	pkg := &LocalPkg{Shasum: "123"}
	id := pkg.ID()
	assert.Equal(t, id, pkg.Shasum)
}

func TestLocalPkgDownloadInto(t *testing.T) {
	pkg := &LocalPkg{}
	err := pkg.DownloadInto("")
	assert.NoError(t, err)
}

func TestLocalResolve(t *testing.T) {
	dir, err := ioutil.TempDir("", "TestLocalResolve")
	assert.NoError(t, err)

	defer os.RemoveAll(dir)

	err = os.MkdirAll(filepath.Join(dir, "node_modules", "shasum", "package"), os.ModePerm)
	assert.NoError(t, err, "failed to create package dir structure")

	err = os.Symlink(
		filepath.Join(dir, "node_modules", "shasum", "package"),
		filepath.Join(dir, "node_modules", "some-package"),
	)
	assert.NoError(t, err, "failed to create package symlink")

	pkgFile := filepath.Join(dir, "node_modules", "shasum", "package", "package.json")
	raw := []byte("{\"name\": \"some-package\"}\n")
	err = ioutil.WriteFile(pkgFile, raw, os.ModePerm)
	assert.NoError(t, err, "failed to write package.json")

	local := NewLocal()
	pkg, err := local.Resolve(filepath.Join(dir, "node_modules", "some-package"), "", "")
	assert.NoError(t, err, "failed to resolve dependency")

	assert.Equal(t, pkg.ID(), "shasum")
}

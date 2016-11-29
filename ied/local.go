package main

import (
	"encoding/json"
	"io/ioutil"
	// "log"
	"os"
	"path/filepath"
)

// LocalPkg represents a package that has already been installed in the specific
// project. It considers a package to be installed if a corresponding
// package.json file is present.
type LocalPkg struct {
	Shasum       string
	Dependencies map[string]string `json:"dependencies"`
}

// Deps returns a map of sub-dependencies.
func (l *LocalPkg) Deps() map[string]string {
	return l.Dependencies
}

// ID returns the implied shasum of the package, which can be retrieved from
// the symbolic link's target path.
func (l *LocalPkg) ID() string {
	return l.Shasum
}

// DownloadInto does nothing, since the package - by definition - has already
// been downloaded.
func (l *LocalPkg) DownloadInto(string) error {
	return nil
}

// Local is a resolver strategy used for handling already installed packages.
type Local struct{}

// NewLocal creates a new local installation strategy.
func NewLocal() *Local {
	return &Local{}
}

// Resolve resolves an already installed (= local) dependency to a corresponding
// package.
func (l *Local) Resolve(dir, name, version string) (Pkg, error) {
	link, err := os.Readlink(dir)
	if err != nil {
		return nil, nil
	}

	raw, err := ioutil.ReadFile(filepath.Join(link, "package.json"))
	if err != nil {
		// Symlink exists, but package hasn't been downloaded. Implicitly
		// delegate to registry resolver, which will install the package.
		return nil, nil
	}

	pkg := new(LocalPkg)
	json.Unmarshal(raw, &pkg)
	pkg.Shasum = filepath.Base(filepath.Dir(link))

	return pkg, nil
}

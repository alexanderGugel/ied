package main

import (
	"fmt"
	"github.com/hashicorp/go-multierror"
	"os"
	"path/filepath"
	"sync"
	log "github.com/Sirupsen/logrus"
)

// UnresolvedError records an error from a failed package installation.
type UnresolvedError struct {
	Pkg     Pkg
	name    string
	version string
}

func (e UnresolvedError) Error() string {
	return fmt.Sprintf("failed to resolve %s@%s", e.name, e.version)
}

// Store keeps track of the currently installed dependencies.
type Store struct {
	Pkgs     map[string]Pkg
	Resolver Resolver
	Dir      string
	mutex    sync.Mutex
}

// NewStore creates a new store.
func NewStore(dir string, resolver Resolver) *Store {
	return &Store{
		Pkgs:     make(map[string]Pkg),
		Dir:      dir,
		Resolver: resolver,
	}
}

// Init creates the store's base directory if it doesn't already exist.
func (s *Store) Init() error {
	return os.MkdirAll(s.Dir, os.ModePerm)
}

// Register adds a package to the store. Returns true if the package has been
// added.
func (s *Store) Register(pkg Pkg) (bool, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	id := pkg.ID()
	if s.Pkgs[id] != nil {
		return false, nil
	}

	dir := filepath.Join(s.Dir, id, "node_modules")
	err := os.MkdirAll(dir, os.ModePerm)
	s.Pkgs[id] = pkg
	return true, err
}

func getTargetPath(dir string, to Pkg) string {
	// This directory might not exist yet, but it doesn't have to, since it's
	// where the symbolic link *points* to.
	return filepath.Join(dir, to.ID(), "package")
}

func getLinkPath(dir string, from Pkg, name string) string {
	if from == nil {
		return filepath.Join(dir, name)
	}
	prefix := filepath.Join(from.ID(), "node_modules")
	return filepath.Join(dir, prefix, name)
}

// Install recursively installs a package into the store.
func (s *Store) Install(from Pkg, name string, version string) error {
	log.Infof("installing %s@%s", name, version)

	linkPath := getLinkPath(s.Dir, from, name)
	pkg, err := s.Resolver.Resolve(linkPath, name, version)
	if err != nil {
		return err
	}
	if pkg == nil {
		return UnresolvedError{pkg, name, version}
	}

	targetPath := getTargetPath(s.Dir, pkg)

	if err := os.Symlink(targetPath, linkPath); err != nil {
		// TODO Handle error (might already exist).
	}

	if ok, err := s.Register(pkg); !ok || err != nil {
		// Package is already being installed.
		return err
	}

	errs := make(chan error)
	defer close(errs)

	deps := pkg.Deps()

	install := func(name, version string) {
		errs <- s.Install(pkg, name, version)
	}

	// Install sub-dependency.
	for name, version := range deps {
		go install(name, version)
	}

	// Download dependency.
	go func() { errs <- pkg.DownloadInto(s.Dir) }()

	var result *multierror.Error
	for i := 0; i < len(deps)+1; i++ {
		if err := <-errs; err != nil {
			result = multierror.Append(result, err)
		}
	}

	return result.ErrorOrNil()
}

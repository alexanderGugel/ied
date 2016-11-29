package main

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"path/filepath"
)

// RegistryPkg represents a package.json document resolved from a specific
// registry.
type RegistryPkg struct {
	Name             string            `json:"name"`
	Version          string            `json:"version"`
	Dependencies     map[string]string `json:"dependencies"`
	DevDependencies  map[string]string `json:"devDependencies"`
	PeerDependencies map[string]string `json:"peerDependencies"`
	Dist             struct {
		Tarball string `json:"tarball"`
		Shasum  string `json:"shasum"`
	} `json:"dist"`
}

// Deps returns a map of sub-dependencies.
func (p *RegistryPkg) Deps() map[string]string {
	return p.Dependencies
}

// ID returns the shasum of the tarball of the package.
func (p *RegistryPkg) ID() string {
	return p.Dist.Shasum
}

// DownloadInto fetches the package from the registry and unpacks it.
func (p *RegistryPkg) DownloadInto(dir string) error {
	r, err := http.Get(p.Dist.Tarball)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	reader, err := gzip.NewReader(r.Body)
	if err != nil {
		return err
	}
	defer reader.Close()

	return Untar(
		filepath.Join(dir, p.ID()),
		tar.NewReader(reader),
	)
}

// Registry represents a CommonJS complaint registry server.
type Registry struct {
	RootURL string
}

// NewRegistry creates a new registry.
func NewRegistry(rootURL string) *Registry {
	return &Registry{rootURL}
}

// Resolve fetches the package version document of a specified dependency.
func (r *Registry) Resolve(dir, name, version string) (Pkg, error) {
	url := r.RootURL + "/" + name + "/" + version
	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	pkg := new(RegistryPkg)
	err = json.NewDecoder(res.Body).Decode(pkg)
	if err != nil {
		return nil, err
	}

	return pkg, nil
}

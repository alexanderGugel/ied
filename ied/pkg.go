package main

// Pkg represents a package.
type Pkg interface {
	// Deps returns a map of sub-dependencies.
	Deps() map[string]string

	// ID returns an unique identifier of this package.
	ID() string

	// DownloadInto fetches and unpacks the package.
	DownloadInto(dir string) error
}

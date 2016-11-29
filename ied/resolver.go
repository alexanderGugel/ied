package main

// Resolver needs to implement a strategy for resolving dependencies.
type Resolver interface {
	// Resolve resolves a specific dependency (typically retrieved from the
	// dependencies field or explicitly specified by user) to a package that can
	// be downloaded and linked.
	Resolve(dir, name, version string) (Pkg, error)
}

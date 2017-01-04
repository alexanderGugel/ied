package main

// Resolver needs to implement a strategy for resolving dependencies.
type Resolver interface {
	// Resolve resolves a specific dependency (typically retrieved from the
	// dependencies field or explicitly specified by user) to a package that can
	// be downloaded and linked.
	Resolve(dir, name, version string) (Pkg, error)
}

// MultiResolver wraps multiple different resolvers, but is itself a resolver.
type MultiResolver struct {
	resolvers []Resolver
}

// NewMultiResolver wraps multiple resolvers and creates a new MultiResolver.
func NewMultiResolver(resolvers ...Resolver) MultiResolver {
	return MultiResolver{
		resolvers: resolvers,
	}
}

// Resolve resolves the specified dependency using all available resolvers. If
// the dependency couldn't be resolved, nil will be returned as a package.
func (r MultiResolver) Resolve(dir, name, version string) (Pkg, error) {
	var pkg Pkg
	for _, resolver := range r.resolvers {
		var err error
		pkg, err = resolver.Resolve(dir, name, version)
		if err != nil {
			return nil, err
		}
		if pkg != nil {
			break
		}
	}
	return pkg, nil
}

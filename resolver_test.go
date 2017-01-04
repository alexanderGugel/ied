package main

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

type MockResolver struct {
	Name    string
	Version string
	Dir     string
	Pkg     Pkg
	Err     error
}

func (r MockResolver) Resolve(dir, name, version string) (Pkg, error) {
	if dir == r.Dir && name == r.Name && version == r.Version {
		return r.Pkg, r.Err
	}
	return nil, nil
}

type StubPkg struct {
	Name string
}

func (s StubPkg) Deps() map[string]string {
	return make(map[string]string)
}

func (s StubPkg) ID() string {
	return s.Name
}

func (s StubPkg) DownloadInto(dir string) error {
	return nil
}

func TestMultiResolverResolveOneResolver(t *testing.T) {
	resolverA := MockResolver{
		Name:    "a",
		Version: "1",
		Dir:     "/a",
		Pkg:     StubPkg{"a"},
		Err:     nil,
	}

	multiResolver := NewMultiResolver(resolverA)
	pkg, err := multiResolver.Resolve("/a", "a", "1")

	assert.NoError(t, err)
	assert.Equal(t, pkg, resolverA.Pkg)
}

func TestMultiResolverResolveTwoResolvers(t *testing.T) {
	resolverA := MockResolver{
		Name:    "a",
		Version: "1",
		Dir:     "/a",
		Pkg:     StubPkg{"a"},
		Err:     nil,
	}
	resolverB := MockResolver{
		Name:    "b",
		Version: "2",
		Dir:     "/b",
		Pkg:     StubPkg{"b"},
		Err:     nil,
	}

	multiResolver := NewMultiResolver(resolverA, resolverB)
	pkg, err := multiResolver.Resolve("/a", "a", "1")

	assert.NoError(t, err)
	assert.Equal(t, pkg, resolverA.Pkg)

	pkg, err = multiResolver.Resolve("/b", "b", "2")
	assert.NoError(t, err)
	assert.Equal(t, pkg, resolverB.Pkg)

	pkg, err = multiResolver.Resolve("/b", "b", "3")
	assert.NoError(t, err)
	assert.Equal(t, pkg, nil)
}

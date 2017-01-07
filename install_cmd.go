package main

import (
	"github.com/Sirupsen/logrus"
	"path/filepath"
)

func initResolver() Resolver {
	registry := NewRegistry("http://registry.npmjs.com")
	local := NewLocal()
	return NewMultiResolver(local, registry)
}

func initStore(wd string, resolver Resolver) *Store {
	dir := filepath.Join(wd, "node_modules")
	store := NewStore(dir, resolver)
	if err := store.Init(); err != nil {
		logrus.Fatalf("failed to init store: %v", err)
	}
	return store
}

func installCmd(wd string, config *Config, args []string) {
	resolver := initResolver()
	store := initStore(wd, resolver)

	logrus.Println(args)

	for _, name := range args {
		if err := store.Install(nil, name, "*"); err != nil {
			logrus.Printf("failed to install %v: %v", name, err)
		}
	}
}

package main

import (
	"archive/tar"
	"io"
	"os"
	"path/filepath"
)

// Untar unpacks a tarball.
func Untar(dir string, reader *tar.Reader) error {
	header, err := reader.Next()
	if err == io.EOF {
		return nil
	}
	if err != nil {
		return err
	}

	path := filepath.Join(dir, header.Name)

	if err := os.MkdirAll(filepath.Dir(path), os.ModePerm); err != nil {
		return err
	}

	switch header.Typeflag {
	case tar.TypeDir:
		// Create directory.
		if err := os.Mkdir(path, os.ModePerm); err != nil {
			return err
		}
	case tar.TypeReg:
		// Create file.
		writer, err := os.Create(path)
		if err != nil {
			return err
		}

		// Use happy path. We need to close the writer either way.
		io.Copy(writer, reader)
		writer.Close()

		// Fix file permission.
		// TODO Make files executable
		if err := os.Chmod(path, os.ModePerm); err != nil {
			return err
		}
	}

	return Untar(dir, reader)
}

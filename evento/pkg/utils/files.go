package utils

import (
	"os"
	"path/filepath"
)

// WorkDir returns folder where binary file of program is located
func WorkDir() string {
	workDir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
	return workDir
}

// FileNotExist checks if file exists on disk
func FileNotExist(filename string) error {
	if _, err := os.Stat(filename); err == nil {
		return nil
	} else if os.IsNotExist(err) {
		return err
	} else {
		return err
	}
}

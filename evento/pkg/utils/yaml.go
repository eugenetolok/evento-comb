package utils

import (
	"io/ioutil"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Unmarshal yaml files
func UnmarshalYaml(filename string, i interface{}) bool {
	if FileNotExist(filepath.Join(WorkDir(), filename)) == nil {
		file, _ := ioutil.ReadFile(filepath.Join(filepath.Join(WorkDir(), filename)))
		err := yaml.Unmarshal(file, i)
		return err == nil
	}
	return false
}

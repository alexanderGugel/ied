package main

import (
	"encoding/json"
	"fmt"
)

type LogEvent struct {
	Level string `json:"level"`

	// Type specifies what kind of event is being logged, e.g. is it related to
	// resolving the dependency, downloading the package etc.
	Type    string `json:"type"`
	Message string `json:"message"`

	// Progress int `json:"progress"`
}

func Log(level string, typ string, message string) {
	ev := LogEvent{
		Level:   level,
		Type:    typ,
		Message: message,
	}
	b, err := json.Marshal(ev)
	if err != nil {
		// TODO
		// fmt.Println("error:", err)
	}
	fmt.Println(string(b))
}

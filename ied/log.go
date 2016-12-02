package main

import (
	"encoding/json"
	"fmt"
)

type LogEvent struct {
	Level string `json:"level"`

	// Name specifies what type of event is being logged, e.g. is it related to
	// resolving the dependency, downloading the package etc.
	Name    string        `json:"name"`
	Message string        `json:"message"`
	Data    []interface{} `json:"data"`
}

func (ev LogEvent) String() (string, error) {
	b, err := json.Marshal(ev)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func Log(level string, name string, message string, data ...interface{}) {
	message = fmt.Sprintf(message, data...)
	ev := LogEvent{level, name, message, data}
	msg, err := ev.String()
	if err != nil {
		panic(err)
	}
	fmt.Println(msg)
}

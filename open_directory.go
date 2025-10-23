package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
)

// openDirectory attempts to reveal the given directory in the default file explorer.
func openDirectory(path string) error {
	if path == "" {
		return fmt.Errorf("no path provided")
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve path: %w", err)
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", absPath)
	case "darwin":
		cmd = exec.Command("open", absPath)
	default:
		cmd = exec.Command("xdg-open", absPath)
	}

	hideWindow := runtime.GOOS != "windows" // keep Explorer visible on Windows
	configureCommand(cmd, hideWindow)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("launch file explorer: %w", err)
	}

	return nil
}

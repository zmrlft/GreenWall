//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// configureCommand applies platform specific process settings.
func configureCommand(cmd *exec.Cmd, hideWindow bool) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: hideWindow}
}

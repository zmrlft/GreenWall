//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// configureCommand ensures spawned processes do not flash a console window.
func configureCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

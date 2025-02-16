//go:build !windows

package main

import "os/exec"

func configureCommand(cmd *exec.Cmd) {}

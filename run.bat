@echo off
chcp 65001 >nul

REM 清空日志文件
type nul > run.log

echo ==================
echo 正在启动 GreenWall...
echo ==================

REM 使用 PowerShell 同时输出到控制台和日志文件 (UTF-8)
REM 处理逻辑：去除 ANSI 颜色代码写入日志，同时保留控制台颜色；修复 stderr 被包装为异常对象的问题
powershell -ExecutionPolicy ByPass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $esc = [char]27; wails dev 2>&1 | ForEach-Object { $s = $_; if ($s -is [System.Management.Automation.ErrorRecord]) { $s = $s.TargetObject } Write-Host $s; $s -replace \"$esc\[[0-9;]*[mK]\", '' | Out-File -FilePath run.log -Append -Encoding utf8 }"
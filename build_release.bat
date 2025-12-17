@echo off
chcp 65001 >nul
echo ==========================================
echo       GreenWall 应用程序打包脚本
echo ==========================================
echo.

REM 检查 wails 是否安装
where wails >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 wails 命令。
    echo 请先安装 Wails CLI: go install github.com/wailsapp/wails/v2/cmd/wails@latest
    echo.
    pause
    exit /b 1
)

echo [1/3] 清理旧构建并开始编译...
echo 正在执行: wails build -clean -platform windows/amd64
echo.

call wails build -clean -platform windows/amd64

if %errorlevel% equ 0 (
    echo.
    echo [2/3] 打包成功！
    echo.
    echo [3/3] 输出文件信息:
    if exist "build\bin\green-wall.exe" (
        dir "build\bin\green-wall.exe" | findstr "green-wall.exe"
        echo.
        echo 您的应用程序已准备好: %~dp0build\bin\green-wall.exe
    ) else (
        echo [警告] 构建命令成功但未找到输出文件。
    )
) else (
    echo.
    echo [失败] 打包过程中出现错误，请检查上方日志。
)

echo.
echo 按任意键退出...
pause >nul

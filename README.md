# GreenWall - GitHub Contribution Calendar Generator

> 🌐 **Multi-language Note**
> - This is the primary English documentation (README.md)
> - For Chinese version, see [README_zh.md](README_zh.md) (pending synchronization update)

## 📖 Table of Contents
- [✨ Features](#features)
- [🚀 Quick Start](#quick-start)
  - [Step 1: Get GitHub Token](#step-1-get-github-token)
  - [Step 2: Download the App](#step-2-download-the-app)
    - [Windows/Linux Users](#windowslinux-users)
    - [macOS Users](#macos-users)
  - [Step 3: Usage Guide](#step-3-usage-guide)
- [🎨 Tips & Tricks](#tips--tricks)
- [🛠️ Development Guide](#development-guide)
  - [Environment Setup](#environment-setup)
  - [Running the Project](#running-the-project)
  - [Building for Release](#building-for-release)
- [🔮 Future Features](#future-features)
- [📊 Star History](#star-history)
- [❓ Frequently Asked Questions](#frequently-asked-questions)
- [⚠️ Disclaimer](#disclaimer)

---

## ✨ Features

GreenWall is a visual tool that helps you "draw" custom patterns on your GitHub contribution calendar. With simple drag-and-drop operations, you can:

- 🎨 Create arbitrary green patterns on GitHub contribution calendar
- 🤖 Automatically create and push GitHub repositories
- 🔒 Choose between public/private repositories
- 📱 Cross-platform support (Windows/macOS/Linux)

**Application Screenshot**
![Application Interface](app-screenshot.png)

---

## 🚀 Quick Start

### Step 1: Get GitHub Token
To securely access your GitHub account, you need to create a Personal Access Token (PAT):

1. Visit [GitHub Token Settings](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Fill in Note (e.g., "GreenWall Access")
4. Check the `repo` permission (full repository control)
5. Click **"Generate token"**
6. **Immediately copy the generated token** (only shown once!)

> 💡 **Security Tip**: Save the token securely and don't share it with others.

### Step 2: Download the App

#### Windows/Linux Users
1. Go to [Release Page](https://github.com/zmrlft/GreenWall/releases/latest)
2. Download the executable for your system:
   - Windows: `green-wall-windows.exe`
   - Linux: `green-wall-linux`
3. Extract and run the file

#### macOS Users
Since the app is not yet signed, you need to remove security restrictions on first run:

1. Download `green-wall-macos.app`
2. Open Terminal and execute:
   ```bash
   # Navigate to the app directory (e.g., Downloads)
   cd ~/Downloads
   
   # Try these commands in order (usually the first works)
   sudo xattr -cr ./green-wall.app
   # If still can't open, try:
   sudo xattr -r -d com.apple.quarantine ./green-wall.app
Double-click green-wall.app to launch

⚠️ Note: These commands only modify file attributes and won't auto-launch the app.

Step 3: Usage Guide
Login: Launch the app and paste your GitHub Token

Draw: Drag mouse on the left calendar area to draw patterns

Erase: Right-click to toggle between brush/eraser modes

Adjust: Use intensity slider to control green shades

Create: Click "Create Remote Repo"

Configure: Set repository name, description, and visibility

Generate: Click "Generate & Push" to auto-create repository

⏳ Reminder: GitHub may take 5 minutes to 48 hours to display contributions on your profile. You can set repository to private and enable "Include private contributions" in GitHub profile settings.

https://private-setting.png

🎨 Tips & Tricks
Quick Toggle: Right-click to switch between brush and eraser

Color Intensity: Use intensity slider for different green shades

Detailed Drawing: Zoom in calendar area for fine adjustments

Undo/Redo: App supports undo/redo (Ctrl+Z / Ctrl+Y)

Pattern Examples

text
text       catfish    lovecat
helloWorld androidlife
🛠️ Development Guide
Environment Setup
1. Install Prerequisites
Go 1.23+: Download

Node.js v22+: Download

Git: Download

2. Install Wails Framework
bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.2
Running the Project
Clone Repository

bash
git clone https://github.com/zmrlft/GreenWall.git
cd GreenWall
Install Frontend Dependencies

bash
cd frontend && npm install
cd ..  # Return to project root
Start Development Environment

bash
wails dev
This starts a hot-reload development server.

Building for Release
bash
# Build application
wails build

# Output location: build/bin/
🔮 Future Features
We plan to add in future versions:

🌐 Multi-language Templates: Support for Java, Python, JavaScript, etc.

🎯 Pattern Library: Preset common patterns and text templates

📅 Batch Generation: Create contributions for multiple dates at once

🔄 Live Preview: Real-time contribution calendar preview

👥 Team Collaboration: Multi-user collaborative drawing

📊 Star History
https://star-history.com/#zmrlft/GreenWall&Date

❓ Frequently Asked Questions
Q1: Why aren't my contributions showing immediately?
A: GitHub contribution statistics are not real-time, usually requiring:

5 minutes to 2 hours: Initial display

Up to 48 hours: Complete synchronization

Solutions:

Ensure repository was created successfully

Enable "Include private contributions" in GitHub profile settings

Wait patiently for synchronization

Q2: macOS says "cannot be opened because the developer cannot be verified"
A: This is because the app isn't signed by Apple.

Solutions:

Follow macOS Users steps to remove restrictions

Alternatively: System Settings → Security & Privacy → Click "Open Anyway"

Q3: Will generated repositories affect my GitHub statistics?
A: Yes, but limited impact:

✅ Counts toward contribution streak

✅ Shows on contribution calendar

⚠️ Won't significantly change language stats (unless future language templates)

Q4: Is internet connection required?
A: Yes, for these operations:

GitHub login (token verification)

Creating remote repositories

Pushing code to GitHub

Q5: Can I customize commit messages?
A: Current version auto-generates commit messages. Future versions will support customization.

Q6: How to uninstall?
A:

Windows: Delete the executable file

macOS: Drag app to Trash

Linux: Delete the executable

The app doesn't create additional files or registry entries.

⚠️ Disclaimer
Important Notice

This project is intended only for legitimate purposes:

🔬 Learning GitHub contribution mechanisms

🎓 Educational demonstration purposes

🧪 Technical research experiments

Prohibited Uses:

❌ Falsifying job application materials

❌ Deceptively showcasing programming skills

❌ Any form of academic dishonesty

User Responsibility:
Users bear full responsibility for all consequences arising from using this tool. Developers are not responsible for:

GitHub account restrictions due to unusual activity

Employer or educational institution质疑 of contribution authenticity

Any legal or ethical issues

Open Source Spirit:
We encourage:

👍 Learning and understanding GitHub workflows

🤝 Making genuine contributions to open source projects

💡 Using this tool to inspire real programming interest

🙏 Acknowledgments
Thanks to all contributors and users for your support! If you like this project, please:

⭐ Give us a Star

🐛 Submit Issues for feedback

🔧 Submit PRs to help improve

📢 Share with more developers

Happy Coding, Honest Contributing! 🎉

Version: 1.0.0
Last Updated: 2024-11
License: MIT License

📞 Contact & Support
Issue Reporting: GitHub Issues

Feature Suggestions: GitHub Discussions

Security Vulnerabilities: Please report privately

Tip: Please read the full documentation before use to ensure understanding of how the tool works and its potential impacts.
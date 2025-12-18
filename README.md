# README (English)

> 中文: [README (中文)](README_zh.md)

## Project Milestones

In early November, this project was recommended by YiFeng Ruan(阮一峰), and officially featured in [Tech Enthusiast Weekly Issue 372](https://www.ruanyifeng.com/blog/2025/11/weekly-issue-372.html); in mid-November, it was recommended by the well-known influencer "it咖啡馆" and featured in [GitHub Weekly Hotspots Issue 93](https://youtu.be/pjQftatKpjc?si=5pMK1bAyFXfp6oyF); in December, it was successfully selected as an "interesting project" by the renowned open-source community HelloGitHub <a href="https://hellogithub.com/repository/zmrlft/GreenWall" target="_blank"><img src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=c1b693c5b9244e26953733a6816eac62&claim_uid=KodS5CpL41Jj0Z8&theme=small" alt="Featured｜HelloGitHub" /></a>

## How to use

Make sure Git is installed on your computer.

![app screenshot](/docs/images/app.png)

Download the app, open it, and first grab a Personal Access Token (PAT) so you can sign in to GitHub. You can follow this guide: [how to get your PAT](docs/githubtoken_en.md).

Once you’re logged in you’ll see your avatar and name in the upper-left corner. Drag across the calendar to paint your design. When you’re satisfied, click **Create Remote Repo**. You can edit the repo name and description, choose whether it’s public or private, and then press **Generate & Push** to let the app create and push the repository for you automatically.

> **Heads-up:** GitHub may take anywhere from 5 minutes to 2 days to show the contributions on your profile. You can keep the repo private and enable “Include private contributions” in your profile settings so others can’t see the repo content but the contribution streak still counts.

![private setting screenshot](docs/images/privatesetting.png)

### Quick Tips

- Right-click while painting to toggle between the brush and the eraser.
- Use the brush intensity control to switch between different shades of green.
- **Copy and Paste Feature**: Click the "Copy Mode" button to enter copy mode. Drag to select an area on the calendar and press `Ctrl+C` to copy. The app will show a "Copy successful" message. After copying, the selected pattern will follow the mouse as a preview. Left-click or press `Ctrl+V` to paste to the target location, right-click to cancel the paste preview. Press `Ctrl+V` to quickly restore the last copied pattern.

### Windows/Linux

Download and run the application directly.

### macOS

Since this application is not yet signed, you may encounter security restrictions on first launch. Follow these steps to resolve:

```bash
cd the-directory-where-green-wall.app-is-located
sudo xattr -cr ./green-wall.app
sudo xattr -r -d com.apple.quarantine ./green-wall.app
```

**Tip:** You don't need to execute all of these commands. Try them in order from top to bottom, and stop once one resolves the issue.

**Warning:** The commands will not automatically launch the application. You need to manually double-click the app to start it (the commands only modify file attributes).

## Rendering

![text](docs/images/cailg.png)
![catfish](docs/images/cat.png)
![lovecat](docs/images/darkcat.jpg)
![helloWorld](docs/images/darkhw.png)
![androidlife](docs/images/darkandroid.png)

## Development Guide

- Environmental Preparation

  Install Go 1.23+

  Install Node.js (v22+)

  Install Git

- Install dependent tools

  ```
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.2
  ```

- Project operation

  Clone the repository and enter the directory:

  ```
  git clone https://github.com/zmrlft/GreenWall.git
  cd GreenWall
  ```

  Install front-end dependencies:

  ```
  cd frontend && npm install
  ```

  Start the development environment

  ```
  wails dev
  ```

  Construction

  ```
  wails build
  ```

  Output path: build/bin/

## Future features

We may add support for creating repositories in custom languages. For example, if you want a Java repository, the tool would generate one and it would be reflected in your GitHub language statistics.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zmrlft/GreenWall&type=date&legend=top-left)](https://www.star-history.com/#zmrlft/GreenWall&type=date&legend=top-left)

## Disclaimer

This project is provided for educational, demonstration, and research purposes related to GitHub contribution mechanics. Misuse (for example to falsify job applications) is the user's responsibility.

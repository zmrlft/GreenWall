# README (中文)

> English: [README (English)](README.md)

## 如何使用

请确保你的电脑已经安装了 git。

### GitHub OAuth 登录（可选）

你可以使用 GitHub OAuth 自动填充用户名和邮箱。

- 📖 [OAuth 配置指南](docs/OAUTH_USAGE.md) - 快速开始指南
- 🔒 [安全配置指南](docs/SECURITY_CONFIG.md) - 推荐的安全配置方法
- 🚀 [CI/CD 配置指南](docs/CI_CD_SETUP.md) - 在 CI/CD 中安全使用密钥

![app screenshot](/docs/images/appnew.png)

下载软件，打开，发挥你的艺术才能！生成仓库需要等待一会，生成后复制仓库目录进入仓库文件夹。

### Windows/Linux

下载后直接点击运行即可。

### macOS

由于本应用暂时未进行签名服务，首次运行时可能会遇到安全限制。按以下步骤解决：

```bash
cd 你的green-wall.app存在的目录
sudo xattr -cr ./green-wall.app
sudo spctl --master-disable
sudo xattr -r -d com.apple.quarantine ./green-wall.app
```

**提示：** 这些指令并不需要全部执行，从上往下依次尝试，如果某条指令解决了问题就无需继续执行。

**警告：** 命令执行后不会自动弹出应用界面，需要手动双击应用来启动（命令只是改变了文件属性）。

### 快速提示

- 绘画过程中右键可以切换画笔和橡皮擦

## 下一步操作

1. 登录你的 GitHub 账号，创建一个空的远程仓库（不要勾选 README、.gitignore 或 License）。
2. 在当前目录执行以下命令，把本地仓库推送到远程仓库：

```bash
git remote add origin <远程仓库地址>
git branch -M main
git push -u origin main
```

注意：推送后 GitHub 可能需要 5 分钟至两天才会显示你的贡献度。你可以把仓库设置为私人仓库，并在贡献统计中允许显示私人仓库的贡献，这样他人看不到仓库内容但可以看到贡献记录。

![private setting screenshot](docs/images/privatesetting.png)

## 效果图

![text](docs/images/cailg.png)
![catfish](docs/images/cat.png)
![lovecat](docs/images/darkcat.jpg)
![helloWorld](docs/images/darkhw.png)
![androidlife](docs/images/darkandroid.png)

## 开发指南

- 环境准备

  安装 Go 1.23+

  安装 Node.js (v22+)

  安装 git

- 安装依赖工具

  ```
  go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.2
  ```

- 项目操作

  克隆仓库并进入目录：

  ```
  git clone https://github.com/zmrlft/GreenWall.git
  cd GreenWall
  ```

  安装前端依赖：

  ```
  cd frontend && npm install
  ```

  启动开发环境

  ```
  wails dev
  ```

  构建

  ```
  wails build
  ```

  输出路径：build/bin/

## 未来的功能

我们可能会增加创建自定义语言仓库的功能，例如生成一个 Java 仓库并在你的主页语言占比中统计它。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zmrlft/GreenWall&type=date&legend=top-left)](https://www.star-history.com/#zmrlft/GreenWall&type=date&legend=top-left)

## 免责

免责声明：本项目仅用于教育、演示及研究 GitHub 贡献机制，如用于求职造假，所造成后果自负。

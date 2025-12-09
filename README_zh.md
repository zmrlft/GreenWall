# GreenWall - GitHub 贡献日历生成器

> 🌐 **多语言说明**
> - 本文档为中文版本 (README_zh.md)
> - 英文主版本请查看 [README.md](README.md)
> - 本版本基于英文v1.0同步翻译，部分技术术语保留英文原词

## 📖 目录
- [✨ 功能特点](#功能特点)
- [🚀 快速开始](#快速开始)
  - [第一步：获取 GitHub Token](#第一步获取-github-token)
  - [第二步：下载应用](#第二步下载应用)
    - [Windows/Linux 用户](#windowslinux-用户)
    - [macOS 用户](#macos-用户)
  - [第三步：使用指南](#第三步使用指南)
- [🎨 使用技巧](#使用技巧)
- [🛠️ 开发指南](#开发指南)
  - [环境准备](#环境准备)
  - [项目运行](#项目运行)
  - [构建发布](#构建发布)
- [🔮 未来功能](#未来功能)
- [📊 Star 历史](#star-历史)
- [❓ 常见问题](#常见问题)
- [⚠️ 免责声明](#免责声明)

---

## ✨ 功能特点

GreenWall 是一个可视化工具，帮助你在 GitHub 贡献日历上"绘制"自定义图案。通过简单的拖拽操作，你可以：

- 🎨 在 GitHub 贡献日历上创建任意绿色图案
- 🤖 自动创建并推送 GitHub 仓库
- 🔒 支持公有/私有仓库选择
- 📱 跨平台支持 (Windows/macOS/Linux)

**应用截图**
![应用界面](app-screenshot.png)

---

## 🚀 快速开始

### 第一步：获取 GitHub Token
为了安全地访问你的 GitHub 账户，你需要创建一个 Personal Access Token (PAT)：

1. 访问 [GitHub Token 设置页面](https://github.com/settings/tokens)
2. 点击 **"Generate new token (classic)"**
3. 填写备注 (例如："GreenWall 访问")
4. 勾选 `repo` 权限 (完整仓库控制)
5. 点击 **"Generate token"**
6. **立即复制生成的 token** (只显示一次！)

> 💡 **安全提示**：将 token 保存在安全的地方，不要分享给他人。

### 第二步：下载应用

#### Windows/Linux 用户
1. 前往 [发布页面](https://github.com/zmrlft/GreenWall/releases/latest)
2. 下载对应系统的可执行文件：
   - Windows: `green-wall-windows.exe`
   - Linux: `green-wall-linux`
3. 解压文件并双击运行

#### macOS 用户
由于应用尚未签名，首次运行时需要解除安全限制：

1. 下载 `green-wall-macos.app`
2. 打开终端，执行以下命令：
   ```bash
   # 进入应用所在目录 (如下载目录)
   cd ~/Downloads
   
   # 尝试以下命令 (按顺序尝试，通常第一个即可)
   sudo xattr -cr ./green-wall.app
   # 如果仍然无法打开，尝试：
   sudo xattr -r -d com.apple.quarantine ./green-wall.app
   ```
3. 双击 `green-wall.app` 启动应用

> ⚠️ **注意**：上述命令只修改文件属性，不会自动启动应用。

### 第三步：使用指南
1. **登录**：启动应用后，粘贴你的 GitHub Token
2. **绘制**：在左侧日历区域拖拽鼠标绘制图案
3. **擦除**：右键点击切换画笔/橡皮擦模式
4. **调整**：使用强度滑块控制绿色深浅
5. **创建**：点击 **"Create Remote Repo"** 
6. **配置**：设置仓库名称、描述和可见性
7. **生成**：点击 **"Generate & Push"** 自动创建仓库

> ⏳ **温馨提示**：GitHub 可能需要 **5分钟到48小时** 才能在个人资料页显示贡献。你可以在仓库设为私有时，开启 GitHub 个人资料的 **"Include private contributions"** 选项。

![私有贡献设置](private-setting.png)

---

## 🎨 使用技巧

- **快速切换**：右键点击在画笔和橡皮擦之间切换
- **颜色深浅**：使用强度滑块控制绿色阴影
- **精细绘制**：放大日历区域进行细节调整
- **撤销操作**：应用支持撤销/重做功能 (Ctrl+Z / Ctrl+Y)

**图案示例**
```
text       catfish    lovecat
helloWorld androidlife
```

---

## 🛠️ 开发指南

### 环境准备

#### 1. 安装基础环境
- **Go 1.23+**: [下载地址](https://go.dev/dl/)
- **Node.js v22+**: [下载地址](https://nodejs.org/)
- **Git**: [下载地址](https://git-scm.com/)

#### 2. 安装 Wails 框架
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.2
```

### 项目运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/zmrlft/GreenWall.git
   cd GreenWall
   ```

2. **安装前端依赖**
   ```bash
   cd frontend && npm install
   cd ..  # 返回项目根目录
   ```

3. **启动开发环境**
   ```bash
   wails dev
   ```
   这将启动热重载的开发服务器。

### 构建发布

```bash
# 构建应用
wails build

# 输出位置：build/bin/
```

---

## 🔮 未来功能

我们计划在未来版本中添加：

- 🌐 **多语言模板**：支持 Java、Python、JavaScript 等语言的仓库模板
- 🎯 **图案库**：预设常用图案和文字模板
- 📅 **批量生成**：一次创建多个日期的贡献
- 🔄 **实时预览**：实时查看贡献日历效果
- 👥 **团队协作**：多人协作绘制图案

---

## 📊 Star 历史

![Star History Chart](https://star-history.com/#zmrlft/GreenWall&Date)

---

## ❓ 常见问题

### Q1: 为什么我的贡献没有立即显示？
**A**: GitHub 的贡献统计不是实时的，通常需要：
- 5分钟到2小时：初步显示
- 最多48小时：完全同步

**解决方案**：
1. 确保仓库已成功创建
2. 在 GitHub 个人资料设置中开启 **"Include private contributions"**
3. 耐心等待同步完成

### Q2: macOS 提示"无法打开，因为开发者身份不明"
**A**: 这是因为应用未经过 Apple 官方签名。

**解决方案**：
1. 按照 [macOS 用户](#macos-用户) 步骤解除限制
2. 或者：系统设置 → 安全性与隐私 → 仍要打开

### Q3: 生成的仓库会影响我的 GitHub 统计吗？
**A**: 是的，但影响有限：
- ✅ 会计入贡献连续天数
- ✅ 会显示在贡献日历中
- ⚠️ 不会显著改变语言统计 (除非未来支持语言模板)

### Q4: 需要网络连接吗？
**A**: 是的，以下操作需要网络：
- 登录 GitHub (需要验证 token)
- 创建远程仓库
- 推送代码到 GitHub

### Q5: 支持自定义提交信息吗？
**A**: 当前版本自动生成提交信息。未来版本将支持自定义。

### Q6: 如何卸载？
**A**:
- **Windows**: 删除可执行文件即可
- **macOS**: 将应用拖到废纸篓
- **Linux**: 删除可执行文件
> 应用不会在系统中创建额外文件或注册表项。

---

## ⚠️ 免责声明

**重要声明**

本项目仅供以下合法用途：
- 🔬 学习 GitHub 贡献机制
- 🎓 教学演示目的
- 🧪 技术研究实验

**禁止用途**：
- ❌ 伪造工作申请材料
- ❌ 欺骗性地展示编程能力
- ❌ 任何形式的学术不端行为

**用户责任**：
使用本工具产生的所有后果由用户自行承担。开发者不对以下情况负责：
- GitHub 账户因异常活动被限制
- 雇佣方或教育机构对贡献真实性的质疑
- 任何法律或道德问题

**开源精神**：
我们鼓励：
- 👍 学习并理解 GitHub 工作流程
- 🤝 为开源项目做真实贡献
- 💡 用这个工具激发真正的编程兴趣

---

## 🙏 致谢

感谢所有贡献者和用户的支持！如果你喜欢这个项目，请：
- ⭐ 给个 Star 支持我们
- 🐛 提交 Issue 反馈问题
- 🔧 提交 PR 帮助改进
- 📢 分享给更多开发者

**快乐编码，诚实贡献！** 🎉

---

**版本**: 1.0.0  
**最后更新**: 2024年11月  
**许可证**: [MIT License](LICENSE)

---

## 📞 联系与支持

- **问题反馈**: [GitHub Issues](https://github.com/zmrlft/GreenWall/issues)
- **功能建议**: [GitHub Discussions](https://github.com/zmrlft/GreenWall/discussions)
- **安全漏洞**: 请私密报告

> 温馨提示：请在使用前阅读完整文档，确保理解工具的工作原理和潜在影响。
```
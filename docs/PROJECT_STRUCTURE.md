# 项目结构说明

## 目录结构

```
GreenWall/
├── .github/                    # GitHub配置
│   └── workflows/
│       └── build.yml          # CI/CD构建流程
│
├── build/                      # 构建输出目录
│   └── bin/                   # 编译后的二进制文件
│
├── docs/                       # 文档目录
│   ├── GITHUB_ACTIONS_SETUP.md # GitHub Actions配置说明
│   ├── PROJECT_STRUCTURE.md    # 项目结构说明（本文件）
│   └── images/                # 文档图片
│
├── frontend/                   # 前端代码
│   ├── src/                   # 源代码
│   │   ├── components/        # React组件
│   │   ├── i18n.tsx          # 国际化配置
│   │   ├── App.tsx           # 主应用组件
│   │   └── main.tsx          # 入口文件
│   ├── dist/                  # 构建输出（gitignore）
│   ├── package.json           # 前端依赖
│   └── vite.config.ts        # Vite配置
│
├── logs/                       # 日志目录（gitignore）
│   └── YYYY-MM-DD.log         # 按日期分割的日志
│
├── scripts/                    # 脚本目录（预留）
│
├── app.go                      # 应用主逻辑
├── github.go                   # GitHub API交互
├── logger.go                   # 日志系统
├── main.go                     # 程序入口
├── oauth.go                    # OAuth认证
├── open_directory.go           # 目录操作
├── cmd_*.go                    # 平台特定命令
│
├── oauth_config.example.json   # OAuth配置示例
├── oauth_config.json           # OAuth配置（gitignore）
│
├── go.mod                      # Go模块依赖
├── go.sum                      # Go依赖校验
├── wails.json                  # Wails配置
├── Makefile                    # 构建脚本
│
├── .gitignore                  # Git忽略规则
├── LICENSE                     # 开源协议
├── README.md                   # 英文说明
└── README_zh.md                # 中文说明
```

## 核心模块说明

### 后端（Go）

| 文件 | 说明 | 主要功能 |
|------|------|---------|
| `main.go` | 程序入口 | 初始化日志、启动Wails应用 |
| `app.go` | 应用逻辑 | Git操作、仓库生成、数据导入导出 |
| `oauth.go` | OAuth认证 | GitHub登录、Token管理、用户信息 |
| `github.go` | GitHub API | 仓库创建、推送、Token验证 |
| `logger.go` | 日志系统 | Zap日志、文件输出、结构化日志 |
| `open_directory.go` | 系统操作 | 打开文件夹 |
| `cmd_*.go` | 平台命令 | 不同平台的命令执行 |

### 前端（React + TypeScript）

| 目录/文件 | 说明 |
|----------|------|
| `src/components/` | UI组件 |
| `src/i18n.tsx` | 国际化（中英文） |
| `src/App.tsx` | 主应用 |
| `src/main.tsx` | 入口 |

### 配置文件

| 文件 | 说明 | 是否提交 |
|------|------|---------|
| `oauth_config.json` | OAuth真实配置 | ❌ 不提交（敏感） |
| `oauth_config.example.json` | OAuth示例配置 | ✅ 提交 |
| `wails.json` | Wails配置 | ✅ 提交 |
| `go.mod` | Go依赖 | ✅ 提交 |
| `package.json` | 前端依赖 | ✅ 提交 |

## 构建流程

### 本地开发
```bash
# 开发模式
wails dev

# 生产构建
wails build
```

### CI/CD
1. GitHub Actions触发
2. 从Secrets创建OAuth配置（可选）
3. 安装依赖
4. 构建前端
5. 构建应用
6. 打包发布

## 日志系统

- **位置**: `logs/YYYY-MM-DD.log`
- **格式**: JSON结构化日志
- **级别**: Debug, Info, Warn, Error, Fatal
- **输出**: 文件 + 控制台

## 配置嵌入

使用Go embed将配置文件嵌入到二进制：

```go
//go:embed oauth_config.json oauth_config.example.json
var embeddedFS embed.FS
```

优先级：
1. 外部配置文件（多个路径）
2. 嵌入的`oauth_config.json`
3. 嵌入的`oauth_config.example.json`

## 国际化

支持语言：
- 🇺🇸 English
- 🇨🇳 中文

配置文件：`frontend/src/i18n.tsx`

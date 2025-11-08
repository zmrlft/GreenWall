# GitHub OAuth 配置指南

[English](OAUTH_USAGE.en.md) | 简体中文

> **🔒 安全提示**: 为了保护你的 OAuth 密钥，请查看 [安全配置指南](SECURITY_CONFIG.md) 了解最佳实践。

## 快速开始

### 1. 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写:
   - **Application name**: GreenWall
   - **Homepage URL**: `http://localhost`
   - **Authorization callback URL**: `http://localhost:8888/callback`
4. 记录 **Client ID** 和 **Client Secret**

### 2. 配置文件

在 `config` 文件夹中创建 `config.json`:

```json
{
  "github": {
    "clientId": "你的_client_id",
    "clientSecret": "你的_client_secret",
    "redirectUrl": "http://localhost:8888/callback",
    "scopes": ["user:email", "repo"]
  }
}
```

**注意**: 
- 配置文件位于 `config/config.json`
- `redirectUrl` 必须与 GitHub OAuth App 中的回调 URL 完全一致
- 可以参考 `config/config.example.json` 模板
- **推荐**: 也可以使用环境变量配置（更安全），详见 [安全配置指南](SECURITY_CONFIG.md)

### 3. 使用

```bash
wails dev
```

点击"使用 GitHub 登录"按钮,在浏览器中完成授权即可。

## 代理设置

如果需要代理访问 GitHub:

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
wails dev
```

## 常见问题

**端口被占用**: 修改 `redirectUrl` 中的端口号,同时更新 GitHub OAuth App 设置

**网络超时**: 检查网络连接或配置代理

**配置错误**: 确保所有配置项都已正确填写,参考 `config.example.json`

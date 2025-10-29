# GitHub Actions 配置说明

## OAuth配置

为了在GitHub Actions中构建包含真实OAuth配置的应用，需要配置GitHub Secrets。

### 配置步骤

1. **进入仓库设置**
   - 访问：`https://github.com/你的用户名/GreenWall/settings/secrets/actions`

2. **添加以下Secrets**：

   | Secret名称 | 说明 | 示例值 |
   |-----------|------|--------|
   | `OAUTH_CLIENT_ID` | GitHub OAuth应用的Client ID | `Ov23liABC123...` |
   | `OAUTH_CLIENT_SECRET` | GitHub OAuth应用的Client Secret | `1a2b3c4d5e6f...` |

3. **获取OAuth信息**
   - 访问：https://github.com/settings/developers
   - 创建或查看你的OAuth应用
   - 复制Client ID和Client Secret

### 工作流程

#### 有Secrets配置时
```
1. GitHub Actions运行
2. 从Secrets创建oauth_config.json
3. 构建时嵌入真实配置
4. 生成的应用包含真实OAuth信息
```

#### 无Secrets配置时
```
1. GitHub Actions运行
2. 跳过配置文件创建
3. 构建时嵌入oauth_config.example.json
4. 生成的应用使用示例配置
```

## 本地开发

本地开发时：

1. **创建配置文件**
   ```bash
   cp oauth_config.example.json oauth_config.json
   ```

2. **编辑配置**
   ```json
   {
     "client_id": "你的Client ID",
     "client_secret": "你的Client Secret",
     "redirect_uri": "http://localhost:8888/callback",
     "scopes": "user:email repo"
   }
   ```

3. **打包**
   ```bash
   wails build
   ```

配置文件会自动嵌入到应用中。

## 安全说明

- ✅ `oauth_config.json` 已在 `.gitignore` 中，不会提交到Git
- ✅ GitHub Secrets是加密存储的
- ✅ Secrets不会出现在日志中
- ⚠️ 不要在公开的Issue或PR中暴露Client Secret

## 发布流程

### 个人使用（包含真实配置）
1. 配置GitHub Secrets
2. 推送tag或手动触发workflow
3. 下载生成的应用，开箱即用

### 开源分发（使用示例配置）
1. 不配置GitHub Secrets
2. 推送tag或手动触发workflow
3. 下载生成的应用
4. 用户需要自己配置OAuth应用

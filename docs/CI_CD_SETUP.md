# GitHub Actions 配置指南

> 在 GitHub Actions 中安全使用 OAuth 密钥

## 配置步骤

### 1. 添加 Secrets

1. 进入仓库 `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. 添加以下 secrets（可选）：
   - `GREENWALL_GITHUB_CLIENT_ID`
   - `GREENWALL_GITHUB_CLIENT_SECRET`

> **提示**: 不配置 secrets 时，应用仍可正常构建，只是不包含 OAuth 功能。

### 2. 验证配置

提交代码后，查看 Actions 日志：

```
[Config] Using ClientID from environment variable
[Config] Using ClientSecret from environment variable
```

✅ 看到上述输出说明配置成功，密钥会显示为 `***`

## 触发构建

- **自动**: 推送代码或创建 tag
- **手动**: Actions 标签页 → Build workflow → Run workflow

## 常见问题

**Q: OAuth 不工作？**
- 检查是否添加了 secrets
- 验证 secret 名称是否正确（必须带 `GREENWALL_` 前缀）

**Q: 如何验证密钥安全？**
```bash
strings green-wall | grep "your_secret"  # 应该找不到
```

**Q: Fork 的仓库能用吗？**
- Fork 仓库需要自己配置 secrets
- 或构建不含 OAuth 的版本

## 安全提示

- ✅ 密钥会自动在日志中遮蔽
- ✅ 定期轮换密钥（建议 3-6 个月）
- ❌ 不要在代码中硬编码密钥
- ❌ 不要提交 `config.json` 到 Git

## 参考文档

- [安全配置指南](SECURITY_CONFIG.md)
- [快速开始](QUICK_START_SECURITY.md)

---

## English

> Securely use OAuth secrets in GitHub Actions

## Setup Steps

### 1. Add Secrets

1. Go to repository `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Add these secrets (optional):
   - `GREENWALL_GITHUB_CLIENT_ID`
   - `GREENWALL_GITHUB_CLIENT_SECRET`

> **Note**: Without secrets, the app still builds normally, just without OAuth functionality.

### 2. Verify Configuration

After committing, check Actions logs:

```
[Config] Using ClientID from environment variable
[Config] Using ClientSecret from environment variable
```

✅ Seeing this output means configuration is successful, secrets will show as `***`

## Trigger Build

- **Auto**: Push code or create tag
- **Manual**: Actions tab → Build workflow → Run workflow

## FAQ

**Q: OAuth not working?**
- Check if secrets are added
- Verify secret names are correct (must have `GREENWALL_` prefix)

**Q: How to verify secrets are safe?**
```bash
strings green-wall | grep "your_secret"  # Should find nothing
```

**Q: Can forked repos use this?**
- Forked repos need to configure their own secrets
- Or build without OAuth

## Security Tips

- ✅ Secrets are automatically masked in logs
- ✅ Rotate secrets regularly (every 3-6 months)
- ❌ Don't hardcode secrets in code
- ❌ Don't commit `config.json` to Git

## Reference

- [Security Configuration Guide](SECURITY_CONFIG.md)
- [Quick Start](QUICK_START_SECURITY.md)

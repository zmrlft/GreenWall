# GitHub OAuth Configuration Guide

English | [简体中文](OAUTH_USAGE.md)

## Quick Start

### 1. Create GitHub OAuth App

1. Visit https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: GreenWall
   - **Homepage URL**: `http://localhost`
   - **Authorization callback URL**: `http://localhost:8888/callback`
4. Note down **Client ID** and **Client Secret**

### 2. Configuration File

Create `config.json` in `config` folder:

```json
{
  "github": {
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "redirectUrl": "http://localhost:8888/callback",
    "scopes": ["user:email", "repo"]
  }
}
```

**Note**: 
- Configuration file is located at `config/config.json`
- `redirectUrl` must exactly match the callback URL in GitHub OAuth App settings
- You can refer to `config/config.example.json` template

### 3. Usage

```bash
wails dev
```

Click "Login with GitHub" button and complete authorization in browser.

## Proxy Settings

If you need proxy to access GitHub:

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
wails dev
```

## Common Issues

**Port in use**: Change port in `redirectUrl` and update GitHub OAuth App settings

**Network timeout**: Check network connection or configure proxy

**Configuration error**: Ensure all config items are correctly filled, refer to `config.example.json`

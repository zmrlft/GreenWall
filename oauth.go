package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// ============================================================================
// 类型定义
// ============================================================================

// OAuthStartRequest 开始 OAuth 流程请求
type OAuthStartRequest struct {
	ClientID    string   `json:"clientId"`
	RedirectURL string   `json:"redirectUrl"`
	Scopes      []string `json:"scopes"`
}

// OAuthStartResponse 开始 OAuth 流程响应
type OAuthStartResponse struct {
	AuthURL string `json:"authUrl"`
	State   string `json:"state"`
}

// OAuthCallbackRequest OAuth 回调请求
type OAuthCallbackRequest struct {
	Code         string `json:"code"`
	State        string `json:"state"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RedirectURL  string `json:"redirectUrl"`
}

// OAuthCallbackResponse OAuth 回调响应
type OAuthCallbackResponse struct {
	AccessToken string      `json:"accessToken"`
	User        *GitHubUser `json:"user"`
}

// GitHubUser GitHub 用户信息
type GitHubUser struct {
	Login     string `json:"login"`
	ID        int64  `json:"id"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Bio       string `json:"bio"`
}

// GitHubTokenResponse GitHub token 响应
type GitHubTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

// ============================================================================
// OAuth 服务
// ============================================================================

// OAuthService GitHub OAuth 服务
type OAuthService struct {
	ctx              context.Context
	currentState     string
	configManager    *ConfigManager
	callbackServer   *CallbackServer
	callbackServerMu sync.Mutex
}

// NewOAuthService 创建新的 OAuth 服务实例
func NewOAuthService(configManager *ConfigManager) *OAuthService {
	return &OAuthService{
		configManager: configManager,
	}
}

// startup OAuth 服务启动时调用
func (s *OAuthService) startup(ctx context.Context) {
	s.ctx = ctx
}

// generateState 生成随机 state 用于 CSRF 保护
func (s *OAuthService) generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	state := base64.URLEncoding.EncodeToString(b)
	s.currentState = state
	return state, nil
}

// GetOAuthConfig 获取并验证 OAuth 配置
func (s *OAuthService) GetOAuthConfig() (*GitHubConfig, error) {
	config := s.configManager.GetConfig()
	if config == nil {
		return nil, fmt.Errorf("无法读取配置文件\n请在项目根目录创建 config.json 文件,参考 config.example.json")
	}

	// 验证必需的配置
	githubConfig := &config.GitHub

	if githubConfig.ClientID == "" {
		return nil, fmt.Errorf("GitHub Client ID 未配置\n请在 config.json 中设置 github.clientId")
	}

	if githubConfig.ClientSecret == "" {
		return nil, fmt.Errorf("GitHub Client Secret 未配置\n请在 config.json 中设置 github.clientSecret")
	}

	if len(githubConfig.Scopes) == 0 {
		return nil, fmt.Errorf("OAuth Scopes 未配置\n请在 config.json 中设置 github.scopes (例如: [\"user:email\", \"repo\"])")
	}

	return githubConfig, nil
}

// StartOAuth 开始 GitHub OAuth 流程
func (s *OAuthService) StartOAuth(req OAuthStartRequest) (*OAuthStartResponse, error) {
	// 从配置文件读取并验证
	config, err := s.GetOAuthConfig()
	if err != nil {
		return nil, err
	}

	// 使用请求参数,如果为空则使用配置文件
	clientID := req.ClientID
	if clientID == "" {
		clientID = config.ClientID
	}

	redirectURL := req.RedirectURL
	if redirectURL == "" {
		redirectURL = config.RedirectURL
	}

	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = config.Scopes
	}

	// 生成 state
	state, err := s.generateState()
	if err != nil {
		return nil, fmt.Errorf("generate state: %w", err)
	}

	// 构建授权 URL
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
		url.QueryEscape(clientID),
		url.QueryEscape(redirectURL),
		url.QueryEscape(strings.Join(scopes, " ")),
		url.QueryEscape(state),
	)

	return &OAuthStartResponse{
		AuthURL: authURL,
		State:   state,
	}, nil
}

// HandleOAuthCallback 处理 OAuth 回调
func (s *OAuthService) HandleOAuthCallback(req OAuthCallbackRequest) (*OAuthCallbackResponse, error) {
	fmt.Printf("[OAuth] HandleOAuthCallback: validating state...\n")

	// 验证 state
	if req.State != s.currentState {
		return nil, fmt.Errorf("invalid state parameter")
	}

	if req.Code == "" {
		return nil, fmt.Errorf("authorization code is required")
	}

	fmt.Printf("[OAuth] HandleOAuthCallback: loading config...\n")

	// 从配置文件读取并验证
	config, err := s.GetOAuthConfig()
	if err != nil {
		return nil, err
	}

	// 使用请求参数,如果为空则使用配置文件
	clientID := req.ClientID
	if clientID == "" {
		clientID = config.ClientID
	}

	clientSecret := req.ClientSecret
	if clientSecret == "" {
		clientSecret = config.ClientSecret
	}

	redirectURL := req.RedirectURL
	if redirectURL == "" {
		redirectURL = config.RedirectURL
	}

	fmt.Printf("[OAuth] HandleOAuthCallback: exchanging code for token...\n")

	// 交换 code 获取 access token
	token, err := s.exchangeCodeForToken(req.Code, clientID, clientSecret, redirectURL)
	if err != nil {
		return nil, fmt.Errorf("exchange code for token: %w", err)
	}

	fmt.Printf("[OAuth] HandleOAuthCallback: fetching user info...\n")

	// 获取用户信息
	user, err := s.fetchGitHubUser(token)
	if err != nil {
		return nil, fmt.Errorf("fetch user info: %w", err)
	}

	fmt.Printf("[OAuth] HandleOAuthCallback: success, user=%s\n", user.Login)

	// 清除 state
	s.currentState = ""

	return &OAuthCallbackResponse{
		AccessToken: token,
		User:        user,
	}, nil
}

// exchangeCodeForToken 用授权码交换访问令牌
func (s *OAuthService) exchangeCodeForToken(code, clientID, clientSecret, redirectURL string) (string, error) {
	fmt.Printf("[OAuth] exchangeCodeForToken: preparing request...\n")

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURL)

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	fmt.Printf("[OAuth] exchangeCodeForToken: sending request to GitHub...\n")

	// 创建带超时和代理支持的 HTTP 客户端
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment, // 自动使用系统代理设置
	}

	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request failed (check network/proxy): %w", err)
	}
	defer resp.Body.Close()

	fmt.Printf("[OAuth] exchangeCodeForToken: received response, status=%d\n", resp.StatusCode)

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github returned status %d: %s", resp.StatusCode, string(body))
	}

	fmt.Printf("[OAuth] exchangeCodeForToken: parsing response...\n")

	var tokenResp GitHubTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("parse response: %w, body: %s", err, string(body))
	}

	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("no access token in response: %s", string(body))
	}

	fmt.Printf("[OAuth] exchangeCodeForToken: success, got token\n")
	return tokenResp.AccessToken, nil
}

// fetchGitHubUser 获取 GitHub 用户信息
func (s *OAuthService) fetchGitHubUser(token string) (*GitHubUser, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// 创建带超时和代理支持的 HTTP 客户端
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
	}

	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request failed (check network/proxy): %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("github api returned status %d: %s", resp.StatusCode, string(body))
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// CancelOAuth 取消当前的 OAuth 流程
func (s *OAuthService) CancelOAuth() error {
	s.callbackServerMu.Lock()
	defer s.callbackServerMu.Unlock()

	if s.callbackServer != nil {
		fmt.Printf("[OAuth] Cancelling OAuth flow, stopping callback server...\n")
		err := s.callbackServer.Stop()
		s.callbackServer = nil
		return err
	}

	return nil
}

// GetUserEmail 获取用户的主要邮箱
func (s *OAuthService) GetUserEmail(token string) (string, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("github api returned status %d: %s", resp.StatusCode, string(body))
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}

	// 查找主要且已验证的邮箱
	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email, nil
		}
	}

	// 如果没有主要邮箱,返回第一个已验证的邮箱
	for _, email := range emails {
		if email.Verified {
			return email.Email, nil
		}
	}

	return "", fmt.Errorf("no verified email found")
}

// ============================================================================
// 浏览器打开辅助函数
// ============================================================================

// openBrowserFallback 使用系统命令打开浏览器
func openBrowserFallback(url string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// ============================================================================
// 自动化 OAuth 流程
// ============================================================================

// parsePortFromURL 从 URL 中解析端口号
func parsePortFromURL(urlStr string) (int, error) {
	u, err := url.Parse(urlStr)
	if err != nil {
		return 0, err
	}

	port := u.Port()
	if port == "" {
		return 0, fmt.Errorf("redirect URL 中未指定端口\n请在 config.json 的 github.redirectUrl 中包含端口号 (例如: http://localhost:8888/callback)")
	}

	portNum, err := strconv.Atoi(port)
	if err != nil {
		return 0, fmt.Errorf("无效的端口号: %s\n请在 config.json 的 github.redirectUrl 中使用有效的端口号", port)
	}

	return portNum, nil
}

// parsePathFromURL 从 URL 中解析路径
func parsePathFromURL(urlStr string) (string, error) {
	u, err := url.Parse(urlStr)
	if err != nil {
		return "", err
	}

	path := u.Path
	if path == "" {
		return "", fmt.Errorf("redirect URL 中未指定路径\n请在 config.json 的 github.redirectUrl 中包含完整路径 (例如: http://localhost:8888/callback)")
	}

	return path, nil
}

// StartOAuthWithAutoCallback 开始 OAuth 流程并自动处理回调
func (s *OAuthService) StartOAuthWithAutoCallback(req OAuthStartRequest) (*OAuthCallbackResponse, error) {
	// 从配置文件读取并验证
	config, err := s.GetOAuthConfig()
	if err != nil {
		return nil, err
	}

	// 使用请求参数,如果为空则使用配置文件
	clientID := req.ClientID
	if clientID == "" {
		clientID = config.ClientID
	}

	redirectURL := req.RedirectURL
	if redirectURL == "" {
		redirectURL = config.RedirectURL
	}

	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = config.Scopes
	}

	// 从 redirectURL 中解析端口和路径
	port, err := parsePortFromURL(redirectURL)
	if err != nil {
		return nil, fmt.Errorf("parse port from redirect URL: %w", err)
	}

	callbackPath, err := parsePathFromURL(redirectURL)
	if err != nil {
		return nil, fmt.Errorf("parse path from redirect URL: %w", err)
	}

	// 停止之前的回调服务器(如果存在)
	s.callbackServerMu.Lock()
	if s.callbackServer != nil {
		fmt.Printf("[OAuth] Stopping previous callback server...\n")
		s.callbackServer.Stop()
		s.callbackServer = nil
	}
	s.callbackServerMu.Unlock()

	// 启动本地回调服务器
	callbackServer := NewCallbackServer(port, callbackPath)
	if err := callbackServer.Start(); err != nil {
		return nil, fmt.Errorf("start callback server: %w", err)
	}

	// 保存服务器实例
	s.callbackServerMu.Lock()
	s.callbackServer = callbackServer
	s.callbackServerMu.Unlock()

	// 确保函数结束时停止服务器
	defer func() {
		s.callbackServerMu.Lock()
		if s.callbackServer == callbackServer {
			s.callbackServer.Stop()
			s.callbackServer = nil
		}
		s.callbackServerMu.Unlock()
	}()

	// 开始 OAuth 流程
	oauthResp, err := s.StartOAuth(OAuthStartRequest{
		ClientID:    clientID,
		RedirectURL: redirectURL,
		Scopes:      scopes,
	})
	if err != nil {
		return nil, fmt.Errorf("start oauth: %w", err)
	}

	// 在系统浏览器中打开授权 URL
	fmt.Printf("[OAuth] Opening browser for authorization...\n")
	if s.ctx != nil {
		wailsruntime.BrowserOpenURL(s.ctx, oauthResp.AuthURL)
	} else {
		// 如果 context 未初始化,使用系统默认方式打开浏览器
		fmt.Printf("[OAuth] Context not initialized, using system open command...\n")
		if err := openBrowserFallback(oauthResp.AuthURL); err != nil {
			fmt.Printf("[OAuth] Warning: Failed to open browser: %v\n", err)
		}
	}

	// 等待接收授权码 (5分钟超时)
	fmt.Printf("[OAuth] Waiting for authorization callback...\n")
	code, err := callbackServer.WaitForCode(5 * time.Minute)
	if err != nil {
		return nil, fmt.Errorf("wait for callback: %w", err)
	}

	fmt.Printf("[OAuth] Received authorization code, exchanging for token...\n")

	// 使用授权码完成认证
	callbackResp, err := s.HandleOAuthCallback(OAuthCallbackRequest{
		Code:         code,
		State:        oauthResp.State,
		ClientID:     clientID,
		ClientSecret: config.ClientSecret,
		RedirectURL:  redirectURL,
	})
	if err != nil {
		return nil, fmt.Errorf("handle callback: %w", err)
	}

	fmt.Printf("[OAuth] Successfully authenticated user: %s\n", callbackResp.User.Login)
	return callbackResp, nil
}

// ============================================================================
// 回调服务器
// ============================================================================

// CallbackServer 本地 HTTP 服务器用于接收 OAuth 回调
type CallbackServer struct {
	server       *http.Server
	port         int
	callbackPath string
	codeChan     chan string
	errChan      chan error
	mu           sync.Mutex
	running      bool
}

// NewCallbackServer 创建回调服务器
func NewCallbackServer(port int, callbackPath string) *CallbackServer {
	if callbackPath == "" {
		callbackPath = "/oauth/callback"
	}
	return &CallbackServer{
		port:         port,
		callbackPath: callbackPath,
		codeChan:     make(chan string, 1),
		errChan:      make(chan error, 1),
	}
}

// Start 启动回调服务器
func (s *CallbackServer) Start() error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return fmt.Errorf("server already running")
	}
	s.running = true
	s.mu.Unlock()

	mux := http.NewServeMux()
	mux.HandleFunc(s.callbackPath, s.handleCallback)

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	// 检查端口是否可用
	listener, err := net.Listen("tcp", s.server.Addr)
	if err != nil {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
		return fmt.Errorf("failed to listen on port %d: %w", s.port, err)
	}

	go func() {
		fmt.Printf("[OAuth] Callback server listening on http://localhost:%d%s\n", s.port, s.callbackPath)
		if err := s.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			s.errChan <- err
		}
	}()

	return nil
}

// handleCallback 处理 OAuth 回调
func (s *CallbackServer) handleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	errorParam := r.URL.Query().Get("error")

	if errorParam != "" {
		errorDesc := r.URL.Query().Get("error_description")
		s.errChan <- fmt.Errorf("oauth error: %s - %s", errorParam, errorDesc)
		s.renderErrorPage(w, errorParam, errorDesc)
		return
	}

	if code == "" {
		s.errChan <- fmt.Errorf("no authorization code received")
		s.renderErrorPage(w, "no_code", "未收到授权码")
		return
	}

	// 发送授权码到通道
	select {
	case s.codeChan <- code:
		s.renderSuccessPage(w)
	default:
		s.renderErrorPage(w, "channel_full", "服务器繁忙")
	}
}

// renderSuccessPage 渲染成功页面
func (s *CallbackServer) renderSuccessPage(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	html := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>授权成功</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #2d3748;
            margin: 0 0 1rem 0;
            font-size: 1.75rem;
        }
        p {
            color: #718096;
            margin: 0;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>授权成功!</h1>
        <p>您已成功授权 GreenWall</p>
        <p style="margin-top: 1rem;">请返回应用继续操作</p>
        <p style="margin-top: 1.5rem; font-size: 0.875rem;">您可以关闭此窗口</p>
    </div>
    <script>
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>
`
	w.Write([]byte(html))
}

// renderErrorPage 渲染错误页面
func (s *CallbackServer) renderErrorPage(w http.ResponseWriter, errorType, errorDesc string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusBadRequest)
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>授权失败</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%);
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #2d3748;
            margin: 0 0 1rem 0;
            font-size: 1.75rem;
        }
        p {
            color: #718096;
            margin: 0;
            line-height: 1.6;
        }
        .error-detail {
            background: #fed7d7;
            color: #c53030;
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin-top: 1rem;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>授权失败</h1>
        <p>很抱歉，授权过程中出现了问题</p>
        <div class="error-detail">
            <strong>错误:</strong> %s<br>
            <strong>描述:</strong> %s
        </div>
        <p style="margin-top: 1.5rem; font-size: 0.875rem;">请关闭此窗口并重试</p>
    </div>
</body>
</html>
`, errorType, errorDesc)
	w.Write([]byte(html))
}

// WaitForCode 等待接收授权码
func (s *CallbackServer) WaitForCode(timeout time.Duration) (string, error) {
	select {
	case code := <-s.codeChan:
		return code, nil
	case err := <-s.errChan:
		return "", err
	case <-time.After(timeout):
		return "", fmt.Errorf("timeout waiting for authorization code")
	}
}

// Stop 停止回调服务器
func (s *CallbackServer) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return nil
	}

	s.running = false

	if s.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.server.Shutdown(ctx)
	}

	return nil
}

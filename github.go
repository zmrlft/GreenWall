package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"go.uber.org/zap"
)

// GitHubRepo GitHub仓库信息
type GitHubRepo struct {
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	Private       bool   `json:"private"`
	HTMLURL       string `json:"html_url"`
	DefaultBranch string `json:"default_branch"`
}

// CreateRepoRequest 创建仓库请求
type CreateRepoRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Private     bool   `json:"private"`
	AutoInit    bool   `json:"auto_init"`
}

// PushRepoRequest 推送仓库请求
type PushRepoRequest struct {
	RepoPath      string `json:"repoPath"`
	RepoName      string `json:"repoName"`
	IsNewRepo     bool   `json:"isNewRepo"`
	IsPrivate     bool   `json:"isPrivate"`
	ForcePush     bool   `json:"forcePush"`
	CommitCount   int    `json:"commitCount"`
}

// PushRepoResponse 推送仓库响应
type PushRepoResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	RepoURL string `json:"repoUrl"`
}

// GetUserRepos 获取用户的所有仓库
func (a *App) GetUserRepos() ([]GitHubRepo, error) {
	LogInfo("获取用户仓库列表")
	
	if a.userInfo == nil || a.userInfo.Token == "" {
		LogError("获取仓库列表失败：用户未登录")
		return nil, fmt.Errorf("未登录")
	}

	req, err := http.NewRequest("GET", "https://api.github.com/user/repos?per_page=100", nil)
	if err != nil {
		LogError("创建请求失败", zap.Error(err))
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+a.userInfo.Token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		LogError("请求GitHub API失败", zap.Error(err))
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		LogError("GitHub API返回错误", zap.Int("status_code", resp.StatusCode), zap.String("response", string(body)))
		return nil, fmt.Errorf("GitHub API返回错误 %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		LogError("读取响应失败", zap.Error(err))
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	var repos []GitHubRepo
	if err := json.Unmarshal(body, &repos); err != nil {
		LogError("解析仓库列表失败", zap.Error(err))
		return nil, fmt.Errorf("解析仓库列表失败: %w", err)
	}

	LogInfo("获取仓库列表成功", zap.Int("count", len(repos)))
	return repos, nil
}

// VerifyGitHubToken 验证GitHub token是否有效
func (a *App) VerifyGitHubToken() error {
	if a.userInfo == nil || a.userInfo.Token == "" {
		return fmt.Errorf("未登录")
	}

	LogInfo("验证GitHub token")
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+a.userInfo.Token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	
	if resp.StatusCode == 401 {
		LogError("Token无效或已过期")
		return fmt.Errorf("token无效或已过期")
	}
	
	if resp.StatusCode == 403 {
		LogError("Token权限不足", zap.String("response", string(body)))
		return fmt.Errorf("token权限不足")
	}
	
	if resp.StatusCode != 200 {
		LogError("Token验证失败", zap.Int("status_code", resp.StatusCode), zap.String("response", string(body)))
		return fmt.Errorf("验证失败: %d", resp.StatusCode)
	}

	LogInfo("Token验证成功")
	
	// 检查token的scopes
	scopes := resp.Header.Get("X-OAuth-Scopes")
	LogInfo("Token权限", zap.String("scopes", scopes))
	
	// 检查是否有repo权限
	if !strings.Contains(scopes, "repo") && !strings.Contains(scopes, "public_repo") {
		LogWarn("Token缺少repo权限", zap.String("scopes", scopes))
		return fmt.Errorf("token缺少'repo'权限，无法创建仓库。\n\n请按以下步骤操作：\n1. 更新 oauth_config.json 中的 scopes 为 'user:email repo'\n2. 退出登录\n3. 重新登录并授权")
	}
	
	return nil
}

// CreateGitHubRepo 在GitHub上创建新仓库
func (a *App) CreateGitHubRepo(name string, isPrivate bool) (*GitHubRepo, error) {
	LogInfo("开始创建GitHub仓库", zap.String("name", name), zap.Bool("private", isPrivate))
	
	if a.userInfo == nil || a.userInfo.Token == "" {
		LogError("创建仓库失败：用户未登录")
		return nil, fmt.Errorf("未登录")
	}

	// 验证token格式
	tokenPrefix := ""
	if len(a.userInfo.Token) > 10 {
		tokenPrefix = a.userInfo.Token[:10] + "..."
	} else {
		tokenPrefix = a.userInfo.Token
	}
	LogDebug("Token信息", zap.String("prefix", tokenPrefix), zap.Int("length", len(a.userInfo.Token)))

	reqBody := CreateRepoRequest{
		Name:        name,
		Description: "Generated with GreenWall",
		Private:     isPrivate,
		AutoInit:    false,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("[CreateRepo] ✗ 序列化请求失败: %v\n", err)
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	LogDebug("创建仓库请求", zap.String("body", string(jsonData)))
	LogInfo("发送创建仓库请求到GitHub API")
	req, err := http.NewRequest("POST", "https://api.github.com/user/repos", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("[CreateRepo] ✗ 创建请求失败: %v\n", err)
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+a.userInfo.Token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "GreenWall-App")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[CreateRepo] ✗ 请求失败: %v\n", err)
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[CreateRepo] ✗ 读取响应失败: %v\n", err)
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	LogInfo("收到GitHub响应", zap.Int("status_code", resp.StatusCode))
	
	if resp.StatusCode != http.StatusCreated {
		LogError("创建仓库失败", zap.Int("status_code", resp.StatusCode), zap.String("response", string(body)))
		return nil, fmt.Errorf("创建仓库失败 %d: %s", resp.StatusCode, string(body))
	}

	var repo GitHubRepo
	if err := json.Unmarshal(body, &repo); err != nil {
		fmt.Printf("[CreateRepo] ✗ 解析响应失败: %v\n", err)
		return nil, fmt.Errorf("解析仓库信息失败: %w", err)
	}

	LogInfo("仓库创建成功", zap.String("url", repo.HTMLURL), zap.String("name", repo.Name))
	return &repo, nil
}

// PushToGitHub 推送仓库到GitHub
func (a *App) PushToGitHub(req PushRepoRequest) (*PushRepoResponse, error) {
	LogInfo("开始推送流程",
		zap.String("repo_name", req.RepoName),
		zap.Bool("is_new", req.IsNewRepo),
		zap.Bool("private", req.IsPrivate),
		zap.Bool("force", req.ForcePush),
		zap.Int("commits", req.CommitCount))
	
	if a.userInfo == nil || a.userInfo.Token == "" {
		LogError("推送失败：用户未登录")
		return &PushRepoResponse{
			Success: false,
			Message: "未登录",
		}, nil
	}

	LogInfo("用户信息", zap.String("username", a.userInfo.Username))
	
	// 验证token
	if err := a.VerifyGitHubToken(); err != nil {
		LogError("Token验证失败", zap.Error(err))
		return &PushRepoResponse{
			Success: false,
			Message: fmt.Sprintf("Token验证失败: %v\n\n请重新登录并确保授权了'repo'权限", err),
		}, nil
	}

	// 如果是新仓库，先在GitHub上创建
	var repoURL string
	var actualRepoName string // 实际创建的仓库名（可能与请求的不同）
	
	if req.IsNewRepo {
		LogInfo("步骤1: 创建新仓库", zap.String("name", req.RepoName), zap.Bool("private", req.IsPrivate))
		repo, err := a.CreateGitHubRepo(req.RepoName, req.IsPrivate)
		if err != nil {
			LogError("创建仓库失败", zap.Error(err))
			return &PushRepoResponse{
				Success: false,
				Message: fmt.Sprintf("创建GitHub仓库失败: %v", err),
			}, nil
		}
		repoURL = repo.HTMLURL
		actualRepoName = repo.Name // 使用API返回的实际仓库名
		LogInfo("仓库创建成功", zap.String("url", repoURL), zap.String("actual_name", actualRepoName))
	} else {
		actualRepoName = req.RepoName
		repoURL = fmt.Sprintf("https://github.com/%s/%s", a.userInfo.Username, actualRepoName)
		LogInfo("使用现有仓库", zap.String("url", repoURL))
	}

	// 配置远程仓库 - 使用实际的仓库名
	remoteURL := fmt.Sprintf("https://%s@github.com/%s/%s.git", 
		a.userInfo.Token, a.userInfo.Username, actualRepoName)
	LogInfo("步骤2: 配置远程仓库", zap.String("repo", fmt.Sprintf("%s/%s", a.userInfo.Username, actualRepoName)))

	// 添加远程仓库
	LogInfo("添加远程仓库origin")
	if err := a.runGitCommand(req.RepoPath, "remote", "add", "origin", remoteURL); err != nil {
		// 如果remote已存在，更新URL
		LogInfo("远程仓库已存在，更新URL")
		a.runGitCommand(req.RepoPath, "remote", "set-url", "origin", remoteURL)
	}

	// 推送到GitHub
	pushArgs := []string{"push", "origin", "main"}
	if req.ForcePush {
		pushArgs = []string{"push", "-f", "origin", "main"}
		LogInfo("步骤3: 强制推送到origin/main")
	} else {
		LogInfo("步骤3: 推送到origin/main")
	}

	if err := a.runGitCommand(req.RepoPath, pushArgs...); err != nil {
		LogError("推送失败", zap.Error(err))
		// 清理临时文件
		LogInfo("清理临时文件", zap.String("path", req.RepoPath))
		os.RemoveAll(req.RepoPath)
		
		return &PushRepoResponse{
			Success: false,
			Message: fmt.Sprintf("推送失败: %v\n\n请检查：\n1. 仓库是否存在\n2. 是否有推送权限\n3. 网络连接是否正常", err),
		}, nil
	}

	LogInfo("推送成功")
	// 推送成功，清理临时文件
	LogInfo("清理临时文件", zap.String("path", req.RepoPath))
	os.RemoveAll(req.RepoPath)

	LogInfo("推送流程完成")
	return &PushRepoResponse{
		Success: true,
		Message: fmt.Sprintf("成功推送 %d 个提交到 %s", req.CommitCount, req.RepoName),
		RepoURL: repoURL,
	}, nil
}

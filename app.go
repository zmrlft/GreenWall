package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"
)

// App struct
type App struct {
	ctx          context.Context
	repoBasePath string
	gitPath      string       // 自定义git路径，空则使用系统默认路径
	userInfo     *UserInfo    // 用户登录信息
	oauthServer  *http.Server // OAuth回调服务器
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		repoBasePath: filepath.Join(os.TempDir(), "green-wall"),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

type ContributionDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type GenerateRepoRequest struct {
	Year           int               `json:"year"`
	GithubUsername string            `json:"githubUsername"`
	GithubEmail    string            `json:"githubEmail"`
	RepoName       string            `json:"repoName"`
	Contributions  []ContributionDay `json:"contributions"`
}

type GenerateRepoResponse struct {
	RepoPath    string `json:"repoPath"`
	CommitCount int    `json:"commitCount"`
}

var repoNameSanitiser = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

type CheckGitInstalledResponse struct {
	Installed bool   `json:"installed"`
	Version   string `json:"version"`
}

type SetGitPathRequest struct {
	GitPath string `json:"gitPath"`
}

type SetGitPathResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Version string `json:"version"`
}

// CheckGitInstalled checks if Git is installed on the system
func (a *App) CheckGitInstalled() (*CheckGitInstalledResponse, error) {
	gitCmd := a.getGitCommand()
	LogInfo("检查Git安装状态", zap.String("git_command", gitCmd))
	
	cmd := exec.Command(gitCmd, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		LogWarn("Git未安装或无法访问", zap.Error(err))
		return &CheckGitInstalledResponse{
			Installed: false,
			Version:   "",
		}, nil
	}
	
	version := strings.TrimSpace(string(output))
	LogInfo("Git已安装", zap.String("version", version))
	return &CheckGitInstalledResponse{
		Installed: true,
		Version:   version,
	}, nil
}

// GetGitPath 获取当前设置的Git路径
func (a *App) GetGitPath() (string, error) {
	return a.gitPath, nil
}

// SetGitPath allows the user to set a custom git path
func (a *App) SetGitPath(req SetGitPathRequest) (*SetGitPathResponse, error) {
	gitPath := strings.TrimSpace(req.GitPath)
	LogInfo("设置Git路径", zap.String("path", gitPath))
	
	// 如果留空，使用系统默认路径
	if gitPath == "" {
		a.gitPath = ""
		LogInfo("重置为系统默认Git路径")
		return &SetGitPathResponse{
			Success: true,
			Message: "已重置为使用系统默认git路径",
			Version: "",
		}, nil
	}
	
	// 检查路径是否存在
	if _, err := os.Stat(gitPath); os.IsNotExist(err) {
		LogWarn("Git路径不存在", zap.String("path", gitPath))
		return &SetGitPathResponse{
			Success: false,
			Message: "指定的路径不存在",
			Version: "",
		}, nil
	}
	
	// 验证是否是有效的git可执行文件
	cmd := exec.Command(gitPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		LogError("无效的Git可执行文件", zap.String("path", gitPath), zap.Error(err))
		return &SetGitPathResponse{
			Success: false,
			Message: "指定的路径不是有效的git可执行文件",
			Version: "",
		}, nil
	}
	
	// 设置成功
	a.gitPath = gitPath
	version := strings.TrimSpace(string(output))
	LogInfo("Git路径设置成功", zap.String("path", gitPath), zap.String("version", version))
	
	return &SetGitPathResponse{
		Success: true,
		Message: "Git路径设置成功",
		Version: version,
	}, nil
}

// getGitCommand returns the git command to use
func (a *App) getGitCommand() string {
	if a.gitPath != "" {
		return a.gitPath
	}
	return "git"
}

// GenerateRepo creates a git repository whose commit history mirrors the given contribution calendar.
func (a *App) GenerateRepo(req GenerateRepoRequest) (*GenerateRepoResponse, error) {
	LogInfo("开始生成仓库", 
		zap.Int("contributions_count", len(req.Contributions)),
		zap.String("username", req.GithubUsername),
		zap.Int("year", req.Year))
	
	if len(req.Contributions) == 0 {
		LogError("生成仓库失败：无贡献数据")
		return nil, fmt.Errorf("no contributions supplied")
	}

	totalRequestedCommits := 0
	for _, c := range req.Contributions {
		if c.Count < 0 {
			LogError("无效的贡献计数", zap.String("date", c.Date), zap.Int("count", c.Count))
			return nil, fmt.Errorf("invalid contribution count for %s: %d", c.Date, c.Count)
		}
		totalRequestedCommits += c.Count
	}
	if totalRequestedCommits == 0 {
		LogWarn("生成仓库失败：无提交需要生成")
		return nil, fmt.Errorf("no commits to generate")
	}

	LogInfo("计算提交总数", zap.Int("total_commits", totalRequestedCommits))

	username := strings.TrimSpace(req.GithubUsername)
	if username == "" {
		username = "zmrlft"
	}
	email := strings.TrimSpace(req.GithubEmail)
	if email == "" {
		email = "2643895326@qq.com"
	}

	if err := os.MkdirAll(a.repoBasePath, 0o755); err != nil {
		return nil, fmt.Errorf("create repo base directory: %w", err)
	}

	repoName := strings.TrimSpace(req.RepoName)
	if repoName == "" {
		repoName = username
		if req.Year > 0 {
			repoName = fmt.Sprintf("%s-%d", repoName, req.Year)
		}
	}
	repoName = sanitiseRepoName(repoName)
	if repoName == "" {
		repoName = "contributions"
	}

	repoPath, err := os.MkdirTemp(a.repoBasePath, repoName+"-")
	if err != nil {
		LogError("创建仓库目录失败", zap.Error(err))
		return nil, fmt.Errorf("create repo directory: %w", err)
	}

	LogInfo("创建仓库目录", zap.String("path", repoPath), zap.String("repo_name", repoName))

	readmePath := filepath.Join(repoPath, "README.md")
	readmeContent := fmt.Sprintf("# %s\n\nGenerated with https://github.com/zmrlft/GreenWall.\n", repoName)
	if err := os.WriteFile(readmePath, []byte(readmeContent), 0o644); err != nil {
		LogError("写入README失败", zap.Error(err))
		return nil, fmt.Errorf("write README: %w", err)
	}

	LogInfo("初始化Git仓库", zap.String("username", username), zap.String("email", email))
	if err := a.runGitCommand(repoPath, "init"); err != nil {
		return nil, err
	}
	if err := a.runGitCommand(repoPath, "config", "user.name", username); err != nil {
		return nil, err
	}
	if err := a.runGitCommand(repoPath, "config", "user.email", email); err != nil {
		return nil, err
	}

    // Optimize: use git fast-import to avoid spawning a process per commit.
    // Also disable slow features for this repo.
    _ = a.runGitCommand(repoPath, "config", "commit.gpgsign", "false")
    _ = a.runGitCommand(repoPath, "config", "gc.auto", "0")
    _ = a.runGitCommand(repoPath, "config", "core.autocrlf", "false")
    _ = a.runGitCommand(repoPath, "config", "core.fsyncObjectFiles", "false")

    // Sort contributions by date ascending to produce chronological history
    contribs := make([]ContributionDay, 0, len(req.Contributions))
    for _, c := range req.Contributions {
        if c.Count > 0 {
            contribs = append(contribs, c)
        }
    }
    sort.Slice(contribs, func(i, j int) bool { return contribs[i].Date < contribs[j].Date })

    // Build fast-import stream
    var stream bytes.Buffer
    // Create README blob once and mark it
    fmt.Fprintf(&stream, "blob\nmark :1\n")
    fmt.Fprintf(&stream, "data %d\n%s\n", len(readmeContent), readmeContent)

    // Prepare to accumulate activity log content across commits
    var activityBuf bytes.Buffer
    nextMark := 2
    totalCommits := 0
    branch := "refs/heads/main"

    for _, day := range contribs {
        parsedDate, err := time.Parse("2006-01-02", day.Date)
        if err != nil {
            return nil, fmt.Errorf("invalid date %q: %w", day.Date, err)
        }
        for i := 0; i < day.Count; i++ {
            // Update activity content in-memory
            entry := fmt.Sprintf("%s commit %d\n", day.Date, i+1)
            activityBuf.WriteString(entry)

            // Emit blob for activity.log
            fmt.Fprintf(&stream, "blob\nmark :%d\n", nextMark)
            act := activityBuf.Bytes()
            fmt.Fprintf(&stream, "data %d\n", len(act))
            stream.Write(act)
            stream.WriteString("\n")

            // Emit commit that points to README (:1) and activity (:nextMark)
            commitTime := parsedDate.Add(time.Duration(i) * time.Second)
            secs := commitTime.Unix()
            tz := commitTime.Format("-0700")
            msg := fmt.Sprintf("Contribution on %s (%d/%d)", day.Date, i+1, day.Count)
            fmt.Fprintf(&stream, "commit %s\n", branch)
            fmt.Fprintf(&stream, "author %s <%s> %d %s\n", username, email, secs, tz)
            fmt.Fprintf(&stream, "committer %s <%s> %d %s\n", username, email, secs, tz)
            fmt.Fprintf(&stream, "data %d\n%s\n", len(msg), msg)
            fmt.Fprintf(&stream, "M 100644 :1 %s\n", filepath.Base(readmePath))
            fmt.Fprintf(&stream, "M 100644 :%d activity.log\n", nextMark)

            nextMark++
            totalCommits++
        }
    }
    stream.WriteString("done\n")

    // Feed stream to fast-import
    if totalCommits > 0 {
        if err := a.runGitFastImport(repoPath, &stream); err != nil {
            return nil, fmt.Errorf("fast-import failed: %w", err)
        }
        // Update working tree to the generated branch for user convenience
        _ = a.runGitCommand(repoPath, "checkout", "-f", "main")
    }

	if err := openDirectory(repoPath); err != nil {
		return nil, fmt.Errorf("open repo directory: %w", err)
	}

	LogInfo("仓库生成成功", 
		zap.String("repo_path", repoPath),
		zap.Int("commit_count", totalCommits),
		zap.String("repo_name", repoName))
	
	return &GenerateRepoResponse{
		RepoPath:    repoPath,
		CommitCount: totalCommits,
	}, nil
}

type ExportContributionsRequest struct {
	Contributions []ContributionDay `json:"contributions"`
}

type ExportContributionsResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	FilePath string `json:"filePath"`
}

// ExportContributions exports the current contributions to a JSON file.
func (a *App) ExportContributions(req ExportContributionsRequest) (*ExportContributionsResponse, error) {
	LogInfo("开始导出贡献数据", zap.Int("count", len(req.Contributions)))
	
	data, err := json.MarshalIndent(req.Contributions, "", "  ")
	if err != nil {
		LogError("序列化贡献数据失败", zap.Error(err))
		return nil, fmt.Errorf("marshal contributions: %w", err)
	}

	// 使用对话框让用户选择保存位置
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出贡献数据",
		DefaultFilename: "contributions.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})

	if err != nil {
		LogError("保存文件对话框失败", zap.Error(err))
		return nil, fmt.Errorf("save file dialog: %w", err)
	}

	// 用户取消了对话框
	if filePath == "" {
		LogInfo("用户取消了导出操作")
		return &ExportContributionsResponse{
			Success: false,
			Message: "用户取消了导出操作",
		}, nil
	}

	if err := os.WriteFile(filePath, data, 0o644); err != nil {
		LogError("写入文件失败", zap.String("path", filePath), zap.Error(err))
		return nil, fmt.Errorf("write file: %w", err)
	}

	LogInfo("导出贡献数据成功", zap.String("path", filePath), zap.Int("size", len(data)))
	return &ExportContributionsResponse{
		Success:  true,
		Message:  "导出成功",
		FilePath: filePath,
	}, nil
}

type ImportContributionsResponse struct {
	Contributions []ContributionDay `json:"contributions"`
}

// ImportContributions imports contributions from a JSON file.
func (a *App) ImportContributions() (*ImportContributionsResponse, error) {
	LogInfo("开始导入贡献数据")
	
	// 使用对话框让用户选择导入文件
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "导入贡献数据",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON 文件 (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		LogError("打开文件对话框失败", zap.Error(err))
		return nil, fmt.Errorf("open file dialog: %w", err)
	}
	if filePath == "" {
		LogInfo("用户取消了导入操作")
		return nil, fmt.Errorf("import cancelled")
	}

	LogInfo("读取导入文件", zap.String("path", filePath))
	data, err := os.ReadFile(filePath)
	if err != nil {
		LogError("读取文件失败", zap.String("path", filePath), zap.Error(err))
		return nil, fmt.Errorf("read contributions file: %w", err)
	}

	var contributions []ContributionDay
	if err := json.Unmarshal(data, &contributions); err != nil {
		LogError("解析JSON失败", zap.Error(err))
		return nil, fmt.Errorf("unmarshal contributions: %w", err)
	}

	LogInfo("导入贡献数据成功", zap.Int("count", len(contributions)))
	return &ImportContributionsResponse{Contributions: contributions}, nil
}

func sanitiseRepoName(input string) string {
	input = strings.TrimSpace(input)
	if input == "" {
		return ""
	}
	input = repoNameSanitiser.ReplaceAllString(input, "-")
	input = strings.Trim(input, "-")
	if input == "" {
		return ""
	}
	if len(input) > 64 {
		input = input[:64]
	}
	return input
}

func appendToFile(path, content string) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := f.WriteString(content); err != nil {
		return err
	}
	return nil
}

func (a *App) runGitCommand(dir string, args ...string) error {
	gitCmd := a.getGitCommand()
	cmd := exec.Command(gitCmd, args...)
	cmd.Dir = dir
	configureCommand(cmd, true)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git %s: %w (%s)", strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}

	return nil
}

func (a *App) runGitCommandWithEnv(dir string, extraEnv map[string]string, args ...string) error {
	gitCmd := a.getGitCommand()
	cmd := exec.Command(gitCmd, args...)
	cmd.Dir = dir
	configureCommand(cmd, true)

	env := os.Environ()
	for key, value := range extraEnv {
		env = append(env, fmt.Sprintf("%s=%s", key, value))
	}
	cmd.Env = env

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git %s: %w (%s)", strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}

	return nil
}

// runGitFastImport runs `git fast-import` with the given stream as stdin.
func (a *App) runGitFastImport(dir string, r *bytes.Buffer) error {
    gitCmd := a.getGitCommand()
    cmd := exec.Command(gitCmd, "fast-import", "--quiet")
    cmd.Dir = dir
    configureCommand(cmd, true)
    cmd.Stdin = r
    var stderr bytes.Buffer
    cmd.Stderr = &stderr
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("git fast-import: %w (%s)", err, strings.TrimSpace(stderr.String()))
    }
    return nil
}

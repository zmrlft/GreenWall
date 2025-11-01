package main

import (
    "bytes"
    "context"
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "regexp"
    "sort"
    "strings"
    "time"
   
    "encoding/json"
   
    "github.com/wailsapp/wails/v2/pkg/runtime"
   )

// App struct
type App struct {
	ctx          context.Context
	repoBasePath string
	gitPath      string // 自定义git路径，空则使用系统默认路径
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
	TargetPath     string            `json:"targetPath"`
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
	cmd := exec.Command(gitCmd, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &CheckGitInstalledResponse{
			Installed: false,
			Version:   "",
		}, nil
	}
	return &CheckGitInstalledResponse{
		Installed: true,
		Version:   strings.TrimSpace(string(output)),
	}, nil
}

// SetGitPath allows the user to set a custom git path
func (a *App) SetGitPath(req SetGitPathRequest) (*SetGitPathResponse, error) {
	gitPath := strings.TrimSpace(req.GitPath)
	
	// 如果留空，使用系统默认路径
	if gitPath == "" {
		a.gitPath = ""
		return &SetGitPathResponse{
			Success: true,
			Message: "已重置为使用系统默认git路径",
			Version: "",
		}, nil
	}

	// 验证路径是否有效
	gitPath = filepath.Clean(gitPath)
	
	// 检查文件是否存在
	if _, err := os.Stat(gitPath); os.IsNotExist(err) {
		return &SetGitPathResponse{
			Success: false,
			Message: "指定的路径不存在",
			Version: "",
		}, nil
	}

	// 临时设置git路径来测试
	a.gitPath = gitPath
	cmd := exec.Command(gitPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		a.gitPath = "" // 恢复为空
		return &SetGitPathResponse{
			Success: false,
			Message: "无法执行git命令: " + err.Error(),
			Version: "",
		}, nil
	}

	version := strings.TrimSpace(string(output))
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

// ValidatePath validates if a given path is accessible and writable
func (a *App) ValidatePath(path string) (bool, string) {
	path = strings.TrimSpace(path)
	if path == "" {
		return false, "路径不能为空"
	}

	// 获取绝对路径
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false, fmt.Sprintf("无法解析路径: %v", err)
	}

	// 检查目录是否存在
	fileInfo, err := os.Stat(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, "目录不存在"
		}
		return false, fmt.Sprintf("无法访问目录: %v", err)
	}

	// 检查是否为目录
	if !fileInfo.IsDir() {
		return false, "路径不是一个目录"
	}

	// 检查写权限 - 尝试创建一个临时文件
	testFile := filepath.Join(absPath, ".green-wall-write-test")
	err = os.WriteFile(testFile, []byte("test"), 0o644)
	if err != nil {
		return false, fmt.Sprintf("目录没有写权限: %v", err)
	}
	_ = os.Remove(testFile) // 清理测试文件

	return true, ""
}

// SelectRepositoryPath opens a folder picker dialog for selecting repository destination
func (a *App) SelectRepositoryPath() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择仓库生成目录",
	})
	if err != nil {
		return "", fmt.Errorf("打开文件夹选择对话框失败: %w", err)
	}
	if path == "" {
		return "", fmt.Errorf("用户取消了选择")
	}

	// 验证选择的路径
	isValid, msg := a.ValidatePath(path)
	if !isValid {
		return "", fmt.Errorf("选择的路径无效: %s", msg)
	}

	return path, nil
}

// GenerateRepo creates a git repository whose commit history mirrors the given contribution calendar.
func (a *App) GenerateRepo(req GenerateRepoRequest) (*GenerateRepoResponse, error) {
	if len(req.Contributions) == 0 {
		return nil, fmt.Errorf("no contributions supplied")
	}

	totalRequestedCommits := 0
	for _, c := range req.Contributions {
		if c.Count < 0 {
			return nil, fmt.Errorf("invalid contribution count for %s: %d", c.Date, c.Count)
		}
		totalRequestedCommits += c.Count
	}
	if totalRequestedCommits == 0 {
		return nil, fmt.Errorf("no commits to generate")
	}

	username := strings.TrimSpace(req.GithubUsername)
	if username == "" {
		username = "zmrlft"
	}
	email := strings.TrimSpace(req.GithubEmail)
	if email == "" {
		email = "2643895326@qq.com"
	}

	// 确定仓库基路径 - 优先使用 TargetPath，否则使用默认临时目录
	repoBasePath := a.repoBasePath
	if req.TargetPath != "" {
		targetPath := strings.TrimSpace(req.TargetPath)
		isValid, msg := a.ValidatePath(targetPath)
		if !isValid {
			return nil, fmt.Errorf("选择的路径无效: %s", msg)
		}
		repoBasePath = targetPath
	}

	if err := os.MkdirAll(repoBasePath, 0o755); err != nil {
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

	repoPath, err := os.MkdirTemp(repoBasePath, repoName+"-")
	if err != nil {
		return nil, fmt.Errorf("create repo directory: %w", err)
	}

	readmePath := filepath.Join(repoPath, "README.md")
	readmeContent := fmt.Sprintf("# %s\n\nGenerated with https://github.com/zmrlft/GreenWall.\n", repoName)
	if err := os.WriteFile(readmePath, []byte(readmeContent), 0o644); err != nil {
		return nil, fmt.Errorf("write README: %w", err)
	}

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

	return &GenerateRepoResponse{
		RepoPath:    repoPath,
		CommitCount: totalCommits,
	}, nil
}

type ExportContributionsRequest struct {
	Contributions []ContributionDay `json:"contributions"`
}

type ExportContributionsResponse struct {
	FilePath string `json:"filePath"`
}

// ExportContributions exports the current contributions to a JSON file.
func (a *App) ExportContributions(req ExportContributionsRequest) (*ExportContributionsResponse, error) {
	data, err := json.MarshalIndent(req.Contributions, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal contributions: %w", err)
	}

	// 使用对话框让用户选择保存位置
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出贡献数据",
		DefaultFilename: "contributions.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON 文件 (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open save file dialog: %w", err)
	}
	if filePath == "" {
		return nil, fmt.Errorf("export cancelled")
	}

	if err := os.WriteFile(filePath, data, 0o644); err != nil {
		return nil, fmt.Errorf("write contributions to file: %w", err)
	}

	return &ExportContributionsResponse{FilePath: filePath}, nil
}

type ImportContributionsResponse struct {
	Contributions []ContributionDay `json:"contributions"`
}

// ImportContributions imports contributions from a JSON file.
func (a *App) ImportContributions() (*ImportContributionsResponse, error) {
	// 使用对话框让用户选择导入文件
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "导入贡献数据",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON 文件 (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open file dialog: %w", err)
	}
	if filePath == "" {
		return nil, fmt.Errorf("import cancelled")
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read contributions file: %w", err)
	}

	var contributions []ContributionDay
	if err := json.Unmarshal(data, &contributions); err != nil {
		return nil, fmt.Errorf("unmarshal contributions: %w", err)
	}

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

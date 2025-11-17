package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	repoBasePath string
	gitPath      string // custom git path; empty means use the system default
	githubToken  string
	githubUser   *GithubUserProfile
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
	if err := a.loadRememberedGithubToken(); err != nil {
		runtime.LogWarningf(ctx, "Failed to restore GitHub login: %v", err)
	}
}

type ContributionDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type GenerateRepoRequest struct {
	Year           int                `json:"year"`
	GithubUsername string             `json:"githubUsername"`
	GithubEmail    string             `json:"githubEmail"`
	RepoName       string             `json:"repoName"`
	Contributions  []ContributionDay  `json:"contributions"`
	RemoteRepo     *RemoteRepoOptions `json:"remoteRepo,omitempty"`
}

type GenerateRepoResponse struct {
	RepoPath    string `json:"repoPath"`
	CommitCount int    `json:"commitCount"`
	RemoteURL   string `json:"remoteUrl,omitempty"`
}

var repoNameSanitiser = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
var githubRepoNameValidator = regexp.MustCompile(`^[a-zA-Z0-9._-]{1,100}$`)

const githubAuthChangedEvent = "github:auth-changed"

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

type RemoteRepoOptions struct {
	Enabled     bool   `json:"enabled"`
	Name        string `json:"name"`
	Private     bool   `json:"private"`
	Description string `json:"description"`
}

type GithubAuthRequest struct {
	Token    string `json:"token"`
	Remember bool   `json:"remember"`
}

type GithubUserProfile struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarUrl"`
}

type GithubAuthResponse struct {
	User       *GithubUserProfile `json:"user"`
	Remembered bool               `json:"remembered"`
}

type GithubLoginStatus struct {
	Authenticated bool               `json:"authenticated"`
	User          *GithubUserProfile `json:"user,omitempty"`
}

type githubEmailEntry struct {
	Email      string `json:"email"`
	Primary    bool   `json:"primary"`
	Verified   bool   `json:"verified"`
	Visibility string `json:"visibility"`
}

type githubRepository struct {
	Name     string `json:"name"`
	FullName string `json:"full_name"`
	HTMLURL  string `json:"html_url"`
	CloneURL string `json:"clone_url"`
	Owner    struct {
		Login string `json:"login"`
	} `json:"owner"`
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

	var remoteOptions *RemoteRepoOptions
	if req.RemoteRepo != nil && req.RemoteRepo.Enabled {
		trimmedName := strings.TrimSpace(req.RemoteRepo.Name)
		if trimmedName == "" {
			return nil, fmt.Errorf("remote repository name cannot be empty")
		}
		if !githubRepoNameValidator.MatchString(trimmedName) {
			return nil, fmt.Errorf("remote repository name may only contain letters, numbers, '.', '_' or '-'")
		}
		if a.githubToken == "" || a.githubUser == nil {
			return nil, fmt.Errorf("GitHub login is required to create a remote repository")
		}
		remoteOptions = &RemoteRepoOptions{
			Enabled:     true,
			Name:        trimmedName,
			Private:     req.RemoteRepo.Private,
			Description: strings.TrimSpace(req.RemoteRepo.Description),
		}
	}

	username := strings.TrimSpace(req.GithubUsername)
	if a.githubUser != nil && strings.TrimSpace(a.githubUser.Login) != "" {
		username = strings.TrimSpace(a.githubUser.Login)
	}
	if username == "" {
		username = "greenwall"
	}
	email := strings.TrimSpace(req.GithubEmail)
	if email == "" && a.githubUser != nil && strings.TrimSpace(a.githubUser.Email) != "" {
		email = strings.TrimSpace(a.githubUser.Email)
	}
	if email == "" {
		email = fmt.Sprintf("%s@users.noreply.github.com", username)
	}

	if err := os.MkdirAll(a.repoBasePath, 0o755); err != nil {
		return nil, fmt.Errorf("create repo base directory: %w", err)
	}

	repoName := strings.TrimSpace(req.RepoName)
	if remoteOptions != nil {
		repoName = remoteOptions.Name
	}
	if repoName == "" {
		repoName = username
		if req.Year > 0 {
			repoName = fmt.Sprintf("%s-%d", repoName, req.Year)
		}
	}
	if remoteOptions == nil {
		repoName = sanitiseRepoName(repoName)
		if repoName == "" {
			repoName = "contributions"
		}
	}

	repoPath, err := os.MkdirTemp(a.repoBasePath, repoName+"-")
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
	_ = a.runGitCommand(repoPath, "config", "credential.helper", "") // ensure global helpers can't override askpass

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
			// Shift to midday UTC so GitHub won't classify the commit into the previous day across time zones.
			commitTime := parsedDate.Add(12*time.Hour + time.Duration(i)*time.Second)
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

	var remoteURL string
	if remoteOptions != nil {
		createdRepo, err := a.createGithubRepository(remoteOptions)
		if err != nil {
			return nil, err
		}
		targetURL := strings.TrimSpace(createdRepo.CloneURL)
		if targetURL == "" {
			return nil, fmt.Errorf("GitHub did not return a clone URL for the new repository")
		}
		ownerLogin := createdRepo.Owner.Login
		if ownerLogin == "" && a.githubUser != nil {
			ownerLogin = a.githubUser.Login
		}
		if err := a.configureRemoteAndPush(repoPath, targetURL, ownerLogin, a.githubToken); err != nil {
			return nil, err
		}
		if createdRepo.HTMLURL != "" {
			remoteURL = createdRepo.HTMLURL
		} else {
			remoteURL = targetURL
		}
		if remoteURL != "" && a.ctx != nil {
			runtime.BrowserOpenURL(a.ctx, remoteURL)
		}
	}

	if err := openDirectory(repoPath); err != nil {
		return nil, fmt.Errorf("open repo directory: %w", err)
	}

	return &GenerateRepoResponse{
		RepoPath:    repoPath,
		CommitCount: totalCommits,
		RemoteURL:   remoteURL,
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
func (a *App) AuthenticateWithToken(req GithubAuthRequest) (*GithubAuthResponse, error) {
	token := strings.TrimSpace(req.Token)
	if token == "" {
		return nil, fmt.Errorf("token cannot be empty")
	}

	user, err := a.fetchGithubUser(token)
	if err != nil {
		return nil, err
	}

	a.githubToken = token
	a.githubUser = user
	a.emitGithubAuthChanged()

	if req.Remember {
		if err := a.saveGithubToken(token); err != nil && a.ctx != nil {
			runtime.LogWarningf(a.ctx, "failed to store GitHub token: %v", err)
		}
	} else {
		if err := a.clearSavedToken(); err != nil && a.ctx != nil {
			runtime.LogWarningf(a.ctx, "failed to clear saved GitHub token: %v", err)
		}
	}

	return &GithubAuthResponse{
		User:       cloneGithubUser(user),
		Remembered: req.Remember,
	}, nil
}

func (a *App) GetGithubLoginStatus() *GithubLoginStatus {
	if a.githubUser == nil {
		return &GithubLoginStatus{Authenticated: false}
	}

	return &GithubLoginStatus{
		Authenticated: true,
		User:          cloneGithubUser(a.githubUser),
	}
}

func (a *App) LogoutGithub() error {
	a.githubToken = ""
	a.githubUser = nil
	a.emitGithubAuthChanged()
	return a.clearSavedToken()
}

func (a *App) fetchGithubUser(token string) (*GithubUserProfile, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, fmt.Errorf("build GitHub request failed: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch GitHub user failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("token invalid or expired")
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("GitHub API returned error (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode GitHub user payload failed: %w", err)
	}

	email := payload.Email
	if email == "" {
		if emails, err := a.fetchGithubEmails(token); err != nil {
			if a.ctx != nil {
				runtime.LogWarningf(a.ctx, "fetch GitHub emails failed: %v", err)
			}
		} else {
			email = pickBestEmail(emails)
			// if a.ctx != nil {
			// 	if raw, err := json.Marshal(emails); err == nil {
			// 		runtime.LogInfof(a.ctx, "GitHub /user/emails response: %s", raw)
			// 	}
			// }
		}
	}

	return &GithubUserProfile{
		Login:     payload.Login,
		Name:      payload.Name,
		Email:     email,
		AvatarURL: payload.AvatarURL,
	}, nil
}

func (a *App) fetchGithubEmails(token string) ([]githubEmailEntry, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/user/emails", nil)
	if err != nil {
		return nil, fmt.Errorf("build GitHub email request failed: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch GitHub emails failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("token invalid or expired when fetching emails")
	}
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("GitHub API returned error for /user/emails (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var entries []githubEmailEntry
	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return nil, fmt.Errorf("decode GitHub emails payload failed: %w", err)
	}

	return entries, nil
}

func pickBestEmail(entries []githubEmailEntry) string {
	for _, entry := range entries {
		if entry.Primary && entry.Verified && entry.Email != "" {
			return entry.Email
		}
	}
	for _, entry := range entries {
		if entry.Verified && entry.Email != "" {
			return entry.Email
		}
	}
	for _, entry := range entries {
		if entry.Email != "" {
			return entry.Email
		}
	}
	return ""
}

func (a *App) createGithubRepository(opts *RemoteRepoOptions) (*githubRepository, error) {
	if a.githubToken == "" {
		return nil, fmt.Errorf("missing GitHub token for remote repository creation")
	}

	payload := map[string]interface{}{
		"name":    opts.Name,
		"private": opts.Private,
	}
	if desc := strings.TrimSpace(opts.Description); desc != "" {
		payload["description"] = desc
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode GitHub repository payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.github.com/user/repos", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build GitHub repository request failed: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+a.githubToken)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("create GitHub repository failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("GitHub API returned error for repository creation (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var repo githubRepository
	if err := json.NewDecoder(resp.Body).Decode(&repo); err != nil {
		return nil, fmt.Errorf("decode GitHub repository response failed: %w", err)
	}
	return &repo, nil
}

func (a *App) configureRemoteAndPush(repoPath string, remoteURL string, username string, token string) error {
	if username == "" && a.githubUser != nil {
		username = a.githubUser.Login
	}
	if username == "" {
		username = "git"
	}

	// Remove any existing origin to avoid conflicts, ignore errors if it doesn't exist.
	_ = a.runGitCommand(repoPath, "remote", "remove", "origin")

	if err := a.runGitCommand(repoPath, "remote", "add", "origin", remoteURL); err != nil {
		return fmt.Errorf("add remote origin: %w", err)
	}

	if err := a.gitPushWithToken(repoPath, username, token); err != nil {
		return err
	}
	return nil
}

func (a *App) gitPushWithToken(repoPath, username, token string) error {
	helperPath, cleanup, err := createGitAskPassHelper()
	if err != nil {
		return err
	}
	defer cleanup()

	gitCmd := a.getGitCommand()
	cmd := exec.Command(gitCmd, "push", "-u", "origin", "main")
	cmd.Dir = repoPath
	configureCommand(cmd, true)

	env := os.Environ()
	env = append(env,
		fmt.Sprintf("GIT_ASKPASS=%s", helperPath),
		"GIT_TERMINAL_PROMPT=0",
		fmt.Sprintf("GITHUB_ASKPASS_USERNAME=%s", username),
		fmt.Sprintf("GITHUB_ASKPASS_TOKEN=%s", token),
	)
	cmd.Env = env

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git push: %w (%s)", err, strings.TrimSpace(stderr.String()))
	}

	return nil
}

func createGitAskPassHelper() (string, func(), error) {
	isWindows := os.PathSeparator == '\\'
	pattern := "gw-askpass-*"
	if isWindows {
		pattern = "gw-askpass-*.cmd"
	}

	file, err := os.CreateTemp("", pattern)
	if err != nil {
		return "", func() {}, fmt.Errorf("create askpass helper failed: %w", err)
	}
	path := file.Name()

	var script string
	if isWindows {
		script = "@echo off\r\nsetlocal EnableDelayedExpansion\r\nset prompt=%*\r\necho !prompt! | findstr /I \"Username\" >nul\r\nif %errorlevel%==0 (\r\n  echo %GITHUB_ASKPASS_USERNAME%\r\n) else (\r\n  echo %GITHUB_ASKPASS_TOKEN%\r\n)\r\nendlocal\r\n"
	} else {
		script = "#!/bin/sh\ncase \"$1\" in\n*Username*) printf '%s\\n' \"$GITHUB_ASKPASS_USERNAME\" ;;\n*) printf '%s\\n' \"$GITHUB_ASKPASS_TOKEN\" ;;\nesac\n"
	}

	if _, err := file.WriteString(script); err != nil {
		file.Close()
		return "", func() {}, fmt.Errorf("write askpass helper failed: %w", err)
	}
	file.Close()

	if !isWindows {
		if err := os.Chmod(path, 0o700); err != nil {
			return "", func() {}, fmt.Errorf("chmod askpass helper failed: %w", err)
		}
	}

	cleanup := func() {
		_ = os.Remove(path)
	}
	return path, cleanup, nil
}

func (a *App) saveGithubToken(token string) error {
	path, err := a.tokenStoragePath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(token), 0o600)
}

func (a *App) clearSavedToken() error {
	path, err := a.tokenStoragePath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (a *App) loadRememberedGithubToken() error {
	path, err := a.tokenStoragePath()
	if err != nil {
		return err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	token := strings.TrimSpace(string(data))
	if token == "" {
		return nil
	}

	user, err := a.fetchGithubUser(token)
	if err != nil {
		_ = os.Remove(path)
		return err
	}

	a.githubToken = token
	a.githubUser = user
	a.emitGithubAuthChanged()
	return nil
}

func (a *App) tokenStoragePath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	appDir := filepath.Join(dir, "green-wall")
	if err := os.MkdirAll(appDir, 0o700); err != nil {
		return "", err
	}

	return filepath.Join(appDir, "github_token"), nil
}

func cloneGithubUser(user *GithubUserProfile) *GithubUserProfile {
	if user == nil {
		return nil
	}
	clone := *user
	return &clone
}

func (a *App) emitGithubAuthChanged() {
	if a.ctx == nil {
		return
	}

	status := &GithubLoginStatus{
		Authenticated: a.githubUser != nil,
		User:          cloneGithubUser(a.githubUser),
	}

	runtime.EventsEmit(a.ctx, githubAuthChangedEvent, status)
}

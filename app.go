package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx          context.Context
	repoBasePath string
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
		return nil, fmt.Errorf("create repo directory: %w", err)
	}

	readmePath := filepath.Join(repoPath, "README.md")
	readmeContent := fmt.Sprintf("# %s\n\nGenerated with GitHub Contributor.\n", repoName)
	if err := os.WriteFile(readmePath, []byte(readmeContent), 0o644); err != nil {
		return nil, fmt.Errorf("write README: %w", err)
	}

	if err := runGitCommand(repoPath, "init"); err != nil {
		return nil, err
	}
	if err := runGitCommand(repoPath, "config", "user.name", username); err != nil {
		return nil, err
	}
	if err := runGitCommand(repoPath, "config", "user.email", email); err != nil {
		return nil, err
	}

	activityFileName := "activity.log"
	activityFilePath := filepath.Join(repoPath, activityFileName)

	totalCommits := 0
	for _, day := range req.Contributions {
		if day.Count <= 0 {
			continue
		}
		parsedDate, err := time.Parse("2006-01-02", day.Date)
		if err != nil {
			return nil, fmt.Errorf("invalid date %q: %w", day.Date, err)
		}

		for i := 0; i < day.Count; i++ {
			entry := fmt.Sprintf("%s commit %d\n", day.Date, i+1)
			if err := appendToFile(activityFilePath, entry); err != nil {
				return nil, fmt.Errorf("update activity log: %w", err)
			}

			if err := runGitCommand(repoPath, "add", activityFileName, filepath.Base(readmePath)); err != nil {
				return nil, err
			}

			commitTime := parsedDate.Add(time.Duration(i) * time.Second)
			env := map[string]string{
				"GIT_AUTHOR_NAME":     username,
				"GIT_AUTHOR_EMAIL":    email,
				"GIT_COMMITTER_NAME":  username,
				"GIT_COMMITTER_EMAIL": email,
				"GIT_AUTHOR_DATE":     commitTime.Format(time.RFC3339),
				"GIT_COMMITTER_DATE":  commitTime.Format(time.RFC3339),
			}
			message := fmt.Sprintf("Contribution on %s (%d/%d)", day.Date, i+1, day.Count)
			if err := runGitCommandWithEnv(repoPath, env, "commit", "-m", message); err != nil {
				return nil, err
			}
			totalCommits++
		}
	}

	return &GenerateRepoResponse{
		RepoPath:    repoPath,
		CommitCount: totalCommits,
	}, nil
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

func runGitCommand(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git %s: %w (%s)", strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}

	return nil
}

func runGitCommandWithEnv(dir string, extraEnv map[string]string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir

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

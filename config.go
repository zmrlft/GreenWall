package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// 不再嵌入配置文件，避免密钥泄露
// 配置优先级：环境变量 > 外部配置文件 > 默认值

// Config 应用配置
type Config struct {
	GitHub GitHubConfig `json:"github"`
}

// GitHubConfig GitHub 相关配置
type GitHubConfig struct {
	ClientID     string   `json:"clientId"`
	ClientSecret string   `json:"clientSecret"`
	RedirectURL  string   `json:"redirectUrl"`
	Scopes       []string `json:"scopes"`
}

// ConfigManager 配置管理器
type ConfigManager struct {
	configPath string
	config     *Config
}

// NewConfigManager 创建配置管理器
func NewConfigManager() *ConfigManager {
	var configPath string

	// 1. 优先使用当前工作目录下的 config 文件夹(开发环境)
	if cwd, err := os.Getwd(); err == nil {
		cwdConfigPath := filepath.Join(cwd, "config", "config.json")
		if _, err := os.Stat(cwdConfigPath); err == nil {
			configPath = cwdConfigPath
			fmt.Printf("[Config] Using config from working directory: %s\n", configPath)
		}
	}

	// 2. 使用可执行文件目录下的 config 文件夹(打包后)
	if configPath == "" {
		if exePath, err := os.Executable(); err == nil {
			exeDir := filepath.Dir(exePath)
			exeConfigDir := filepath.Join(exeDir, "config")
			exeConfigPath := filepath.Join(exeConfigDir, "config.json")

			// 确保 config 目录存在
			if err := os.MkdirAll(exeConfigDir, 0755); err == nil {
				configPath = exeConfigPath
				if _, err := os.Stat(exeConfigPath); err == nil {
					fmt.Printf("[Config] Using config from executable directory: %s\n", configPath)
				} else {
					fmt.Printf("[Config] Config directory ready at: %s (no config.json yet)\n", exeConfigDir)
				}
			}
		}
	}

	// 3. 如果以上都没有,使用用户主目录
	if configPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		homeConfigDir := filepath.Join(homeDir, ".greenwall")
		configPath = filepath.Join(homeConfigDir, "config.json")
		fmt.Printf("[Config] Using config from home directory: %s\n", configPath)
	}

	return &ConfigManager{
		configPath: configPath,
	}
}

// Load 加载配置文件
// 配置优先级：环境变量 > 配置文件 > 默认值
func (cm *ConfigManager) Load() (*Config, error) {
	// 先加载文件配置或使用默认配置
	var config *Config
	if _, err := os.Stat(cm.configPath); os.IsNotExist(err) {
		fmt.Printf("[Config] Config file not found at %s, using default config\n", cm.configPath)
		config = cm.getDefaultConfig()
	} else {
		data, err := os.ReadFile(cm.configPath)
		if err != nil {
			return nil, fmt.Errorf("read config file: %w", err)
		}

		var fileConfig Config
		if err := json.Unmarshal(data, &fileConfig); err != nil {
			return nil, fmt.Errorf("parse config file: %w", err)
		}
		config = &fileConfig
		fmt.Printf("[Config] Loaded config from file: %s\n", cm.configPath)
	}

	// 环境变量覆盖配置文件（优先级最高）
	cm.loadFromEnv(config)

	fmt.Printf("[Config] Final config: ClientID=%s, RedirectURL=%s, Scopes=%v\n",
		config.GitHub.ClientID, config.GitHub.RedirectURL, config.GitHub.Scopes)

	cm.config = config
	return config, nil
}

// Save 保存配置文件
func (cm *ConfigManager) Save(config *Config) error {
	// 确保配置目录存在
	configDir := filepath.Dir(cm.configPath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("create config directory: %w", err)
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(cm.configPath, data, 0600); err != nil {
		return fmt.Errorf("write config file: %w", err)
	}

	cm.config = config
	return nil
}

// GetConfig 获取当前配置
func (cm *ConfigManager) GetConfig() *Config {
	if cm.config == nil {
		config, _ := cm.Load()
		return config
	}
	return cm.config
}

// GetConfigPath 获取配置文件路径
func (cm *ConfigManager) GetConfigPath() string {
	return cm.configPath
}

// getDefaultConfig 获取默认配置
func (cm *ConfigManager) getDefaultConfig() *Config {
	return &Config{
		GitHub: GitHubConfig{
			ClientID:     "",
			ClientSecret: "",
			RedirectURL:  "http://localhost:34115/oauth/callback",
			Scopes:       []string{"user:email", "read:user"},
		},
	}
}

// loadFromEnv 从环境变量加载配置（优先级最高）
// 支持的环境变量：
// - GREENWALL_GITHUB_CLIENT_ID
// - GREENWALL_GITHUB_CLIENT_SECRET
// - GREENWALL_GITHUB_REDIRECT_URL
// - GREENWALL_GITHUB_SCOPES (逗号分隔)
func (cm *ConfigManager) loadFromEnv(config *Config) {
	if clientID := os.Getenv("GREENWALL_GITHUB_CLIENT_ID"); clientID != "" {
		config.GitHub.ClientID = clientID
		fmt.Printf("[Config] Using ClientID from environment variable\n")
	}

	if clientSecret := os.Getenv("GREENWALL_GITHUB_CLIENT_SECRET"); clientSecret != "" {
		config.GitHub.ClientSecret = clientSecret
		fmt.Printf("[Config] Using ClientSecret from environment variable\n")
	}

	if redirectURL := os.Getenv("GREENWALL_GITHUB_REDIRECT_URL"); redirectURL != "" {
		config.GitHub.RedirectURL = redirectURL
		fmt.Printf("[Config] Using RedirectURL from environment variable\n")
	}

	if scopes := os.Getenv("GREENWALL_GITHUB_SCOPES"); scopes != "" {
		config.GitHub.Scopes = strings.Split(scopes, ",")
		// 去除空格
		for i := range config.GitHub.Scopes {
			config.GitHub.Scopes[i] = strings.TrimSpace(config.GitHub.Scopes[i])
		}
		fmt.Printf("[Config] Using Scopes from environment variable\n")
	}
}

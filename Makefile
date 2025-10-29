.PHONY: build build-dev build-prod clean copy-config test

# 开发构建（包含实际配置文件）
build-dev:
	@echo "开始开发构建..."
	wails build
	@echo "复制配置文件..."
	./build/copy-config.sh
	@echo "开发构建完成！"

# 生产构建（只包含示例配置文件）
build-prod:
	@echo "开始生产构建..."
	wails build
	@echo "复制示例配置文件..."
	@if [ -f oauth_config.example.json ]; then \
		cp oauth_config.example.json build/bin/oauth_config.json; \
		echo "✓ 已复制示例配置文件"; \
	fi
	@echo "生产构建完成！"
	@echo "⚠️  用户需要配置 oauth_config.json 文件"

# 默认构建（开发模式）
build: build-dev

# 仅复制配置文件
copy-config:
	@echo "复制配置文件..."
	./build/copy-config.sh

# 清理构建文件
clean:
	@echo "清理构建文件..."
	rm -rf build/bin/*
	@echo "清理完成！"

# 测试
test:
	go test ./...

# 运行开发模式
dev:
	wails dev

# 生成Wails绑定
generate:
	go run github.com/wailsapp/wails/v2/cmd/wails@latest generate module

# 帮助信息
help:
	@echo "可用命令："
	@echo "  make build-dev   - 开发构建（包含实际配置）"
	@echo "  make build-prod  - 生产构建（只包含示例配置）"
	@echo "  make build       - 默认构建（开发模式）"
	@echo "  make copy-config - 复制配置文件到构建目录"
	@echo "  make clean       - 清理构建文件"
	@echo "  make dev         - 运行开发模式"
	@echo "  make generate    - 生成Wails绑定"
	@echo "  make test        - 运行测试"

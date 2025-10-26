import React, { useState } from "react";
import { useTranslations } from "../i18n";

interface GitInstallSidebarProps {
	onCheckAgain: () => void;
}

const GitInstallSidebar: React.FC<GitInstallSidebarProps> = ({ onCheckAgain }) => {
	const { t } = useTranslations();
	const [isExpanded, setIsExpanded] = useState(false);
	const [customGitPath, setCustomGitPath] = useState("");
	const [isSettingPath, setIsSettingPath] = useState(false);
	const [setPathResult, setSetPathResult] = useState<{ success: boolean; message: string } | null>(null);

	const isWindows = navigator.platform.toLowerCase().includes("win");
	const isMac = navigator.platform.toLowerCase().includes("mac");
	const isLinux = navigator.platform.toLowerCase().includes("linux") || 
		navigator.platform.toLowerCase().includes("x11");

	let platform = "windows";
	if (isMac) platform = "mac";
	else if (isLinux) platform = "linux";

	const getInstructions = () => {
		if (platform === "windows") return t("gitInstall.instructions.windows");
		if (platform === "mac") return t("gitInstall.instructions.mac");
		return t("gitInstall.instructions.linux");
	};

	const getDownloadUrl = () => {
		if (platform === "windows") return "https://git-scm.com/download/win";
		if (platform === "mac") return "https://git-scm.com/download/mac";
		return "https://git-scm.com/download/linux";
	};

	const handleSetGitPath = async () => {
		if (!customGitPath.trim()) {
			return;
		}

		setIsSettingPath(true);
		setSetPathResult(null);

		try {
			const { SetGitPath } = await import("../../wailsjs/go/main/App");
			const result = await SetGitPath({ gitPath: customGitPath });
			
			setSetPathResult({
				success: result.success,
				message: result.message,
			});

			if (result.success) {
				// 成功设置后，重新检查git状态
				setTimeout(() => {
					onCheckAgain();
				}, 500);
			}
		} catch (error) {
			console.error("Failed to set git path:", error);
			setSetPathResult({
				success: false,
				message: "设置失败: " + (error as Error).message,
			});
		} finally {
			setIsSettingPath(false);
		}
	};

	const handleResetGitPath = async () => {
		try {
			const { SetGitPath } = await import("../../wailsjs/go/main/App");
			const result = await SetGitPath({ gitPath: "" });
			
			setSetPathResult({
				success: result.success,
				message: result.message,
			});

			if (result.success) {
				setCustomGitPath("");
				setTimeout(() => {
					onCheckAgain();
				}, 500);
			}
		} catch (error) {
			console.error("Failed to reset git path:", error);
			setSetPathResult({
				success: false,
				message: "重置失败: " + (error as Error).message,
			});
		}
	};

	return (
		<div className="fixed bottom-20 left-4 z-40 flex flex-col items-end gap-2">
			{/* 展开的侧边栏 */}
			{isExpanded && (
				<div className="w-80 rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-bold text-gray-900">
							{t("gitInstall.title")}
						</h3>
						<button
							onClick={() => setIsExpanded(false)}
							className="text-gray-500 hover:text-gray-700 transition-colors"
							aria-label={t("gitInstall.close")}
						>
							<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</button>
					</div>

					<div className="space-y-4">
						<p className="text-sm text-gray-700">{t("gitInstall.notInstalled")}</p>
						
						{/* 自定义Git路径输入 */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								自定义Git路径（留空使用系统默认）：
							</label>
							<input
								type="text"
								value={customGitPath}
								onChange={(e) => {
									setCustomGitPath(e.target.value);
									setSetPathResult(null);
								}}
								placeholder="例如: C:\\Program Files\\Git\\bin\\git.exe"
								className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
							/>
							<div className="flex gap-2">
								<button
									onClick={handleSetGitPath}
									disabled={!customGitPath.trim() || isSettingPath}
									className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								>
									{isSettingPath ? "设置中..." : "设置路径"}
								</button>
								<button
									onClick={handleResetGitPath}
									className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
								>
									重置
								</button>
							</div>
							{setPathResult && (
								<p className={`text-xs ${
									setPathResult.success ? "text-green-600" : "text-red-600"
								}`}>
									{setPathResult.message}
								</p>
							)}
						</div>

						<div className="rounded-lg bg-blue-50 p-4 text-sm text-gray-800">
							{getInstructions()}
						</div>

						<a
							href={getDownloadUrl()}
							target="_blank"
							rel="noopener noreferrer"
							className="block w-full rounded-lg bg-gray-900 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-gray-800"
						>
							{t("gitInstall.downloadLink")}
						</a>

						<button
							onClick={onCheckAgain}
							className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							{t("gitInstall.checkAgain")}
						</button>
					</div>
				</div>
			)}

			{/* 提示按钮 */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-black shadow-md transition-all hover:bg-yellow-600"
				aria-label={t("gitInstall.notInstalledLabel")}
			>
				<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<span>{t("gitInstall.notInstalledLabel")}</span>
				<svg 
					className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
				</svg>
			</button>
		</div>
	);
};

export default GitInstallSidebar;


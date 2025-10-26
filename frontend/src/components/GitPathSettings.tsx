import React, { useState } from "react";

interface GitPathSettingsProps {
	isOpen: boolean;
	onClose: () => void;
	onCheckAgain: () => void;
}

const GitPathSettings: React.FC<GitPathSettingsProps> = ({ isOpen, onClose, onCheckAgain }) => {
	const [customGitPath, setCustomGitPath] = useState("");
	const [isSettingPath, setIsSettingPath] = useState(false);
	const [setPathResult, setSetPathResult] = useState<{ success: boolean; message: string } | null>(null);

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
				// 成功设置后，清空输入框并重新检查git状态
				setCustomGitPath("");
				setTimeout(() => {
					onCheckAgain();
					onClose();
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

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="mx-4 w-full max-w-lg border border-black bg-white p-8">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-2xl font-bold">Git 路径设置</h2>
					<button
						onClick={onClose}
						className="text-black hover:text-gray-600"
						aria-label="关闭"
					>
						<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="space-y-6">
					<p className="text-sm text-black">
						如果 Git 已安装但未添加到系统 PATH，请输入 Git 可执行文件的完整路径。
					</p>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-black">
							Git 可执行文件路径
						</label>
						<input
							type="text"
							value={customGitPath}
							onChange={(e) => {
								setCustomGitPath(e.target.value);
								setSetPathResult(null);
							}}
							placeholder="例如: C:\\Program Files\\Git\\bin\\git.exe"
							className="w-full border border-black px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black"
						/>
					</div>

					{setPathResult && (
						<p className={`text-sm ${
							setPathResult.success ? "text-black" : "text-red-600"
						}`}>
							{setPathResult.message}
						</p>
					)}

					<div className="flex items-center justify-between gap-4">
						<button
							onClick={handleSetGitPath}
							disabled={!customGitPath.trim() || isSettingPath}
							className="border border-black bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:border-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{isSettingPath ? "设置中..." : "设置路径"}
						</button>
						<button
							onClick={handleResetGitPath}
							className="border border-black bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
						>
							重置为默认
						</button>
					</div>

					<div className="border-t border-black pt-6">
						<p className="mb-3 text-sm text-black">
							<b>说明：</b>
						</p>
						<ul className="list-inside list-disc space-y-1 text-xs text-black">
							<li>留空或点击"重置为默认"将使用系统 PATH 中的 git 命令</li>
							<li>输入完整路径（如 C:\\Program Files\\Git\\bin\\git.exe）将使用该路径的 git 可执行文件</li>
							<li>设置后需要手动检查 Git 状态</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GitPathSettings;


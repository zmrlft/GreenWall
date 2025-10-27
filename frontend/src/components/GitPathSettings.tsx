import React, { useState } from "react";
import { useTranslations } from "../i18n";

interface GitPathSettingsProps {
	onClose: () => void;
	onCheckAgain: () => void;
}

const GitPathSettings: React.FC<GitPathSettingsProps> = ({ onClose, onCheckAgain }) => {
	const { t } = useTranslations();
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
				message: result.success ? t("gitPathSettings.setSuccess") : t("gitPathSettings.setError", { message: result.message }),
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
				message: t("gitPathSettings.setError", { message: (error as Error).message }),
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
				message: result.success ? t("gitPathSettings.resetSuccess") : t("gitPathSettings.resetError", { message: result.message }),
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
				message: t("gitPathSettings.resetError", { message: (error as Error).message }),
			});
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="mx-4 w-full max-w-lg border border-black bg-white p-8">
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-2xl font-bold">{t("gitPathSettings.title")}</h2>
					<button
						onClick={onClose}
						className="text-black hover:text-gray-600"
						aria-label={t("gitInstall.close")}
					>
						<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="space-y-6">
					<p className="text-sm text-black">
						{t("gitPathSettings.description")}
					</p>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-black">
							{t("gitPathSettings.label")}
						</label>
						<input
							type="text"
							value={customGitPath}
							onChange={(e) => {
								setCustomGitPath(e.target.value);
								setSetPathResult(null);
							}}
							placeholder={t("gitPathSettings.placeholder")}
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
							{isSettingPath ? t("gitPathSettings.setting") : t("gitPathSettings.setPath")}
						</button>
						<button
							onClick={handleResetGitPath}
							className="border border-black bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
						>
							{t("gitPathSettings.reset")}
						</button>
					</div>

					<div className="border-t border-black pt-6">
						<p className="mb-3 text-sm text-black">
							<b>{t("gitPathSettings.noteTitle")}</b>
						</p>
						<ul className="list-inside list-disc space-y-1 text-xs text-black">
							<li>{t("gitPathSettings.noteEmpty")}</li>
							<li>{t("gitPathSettings.noteCustom")}</li>
							<li>{t("gitPathSettings.noteManualCheck")}</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GitPathSettings;


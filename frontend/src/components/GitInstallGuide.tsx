import React from "react";
import { useTranslations } from "../i18n";

interface GitInstallGuideProps {
	onCheckAgain: () => void;
}

const GitInstallGuide: React.FC<GitInstallGuideProps> = ({ onCheckAgain }) => {
	const { t } = useTranslations();

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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-8 shadow-xl">
				<h2 className="mb-4 text-2xl font-bold text-gray-900">
					{t("gitInstall.title")}
				</h2>

				<div className="mb-6 space-y-4">
					<p className="text-gray-700">{t("gitInstall.notInstalled")}</p>
					<p className="rounded-lg bg-blue-50 p-4 text-sm text-gray-800">
						{getInstructions()}
					</p>
				</div>

				<div className="mb-6">
					<a
						href={getDownloadUrl()}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-block rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800"
					>
						{t("gitInstall.downloadLink")}
					</a>
				</div>

				<div className="flex items-center justify-between">
					<button
						onClick={onCheckAgain}
						className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						{t("gitInstall.checkAgain")}
					</button>
				</div>
			</div>
		</div>
	);
};

export default GitInstallGuide;


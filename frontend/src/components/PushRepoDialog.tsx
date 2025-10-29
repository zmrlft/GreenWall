import React from "react";
import { useTranslations } from "../i18n";

type GitHubRepo = {
	name: string;
	fullName: string;
	private: boolean;
	htmlUrl: string;
};

type Props = {
	onClose: () => void;
	onPush: (params: {
		repoPath: string;
		repoName: string;
		isNewRepo: boolean;
		isPrivate: boolean;
		forcePush: boolean;
		commitCount: number;
	}) => void;
	repoPath: string;
	commitCount: number;
	userRepos: GitHubRepo[];
	isLoading?: boolean;
};

// 将仓库名转换为GitHub兼容格式
const sanitizeRepoName = (name: string): string => {
	// GitHub仓库名规则：
	// - 只能包含字母、数字、连字符(-)、下划线(_)、点(.)
	// - 不能以点(.)开头或结尾
	// - 不能包含连续的点(..)
	
	let sanitized = name
		// 移除所有非ASCII字符（包括中文）
		.replace(/[^\x00-\x7F]/g, '')
		// 移除不允许的字符，只保留字母、数字、-、_、.
		.replace(/[^a-zA-Z0-9\-_.]/g, '-')
		// 移除开头和结尾的点
		.replace(/^\.|\.$/g, '')
		// 替换连续的点
		.replace(/\.{2,}/g, '.')
		// 替换连续的连字符
		.replace(/-{2,}/g, '-')
		// 移除开头和结尾的连字符
		.replace(/^-+|-+$/g, '');
	
	// 如果清理后为空，使用默认名称
	if (!sanitized) {
		sanitized = 'my-contributions';
	}
	
	return sanitized;
};

export const PushRepoDialog: React.FC<Props> = ({
	onClose,
	onPush,
	repoPath,
	commitCount,
	userRepos,
	isLoading = false,
}) => {
	const { t } = useTranslations();
	const [isNewRepo, setIsNewRepo] = React.useState(true);
	const [repoName, setRepoName] = React.useState("");
	const [selectedRepo, setSelectedRepo] = React.useState("");
	const [isPrivate, setIsPrivate] = React.useState(false);
	const [forcePush, setForcePush] = React.useState(false);
	const [nameWarning, setNameWarning] = React.useState("");

	// 处理仓库名输入
	const handleRepoNameChange = (value: string) => {
		setRepoName(value);
		
		// 检查是否包含非ASCII字符
		if (/[^\x00-\x7F]/.test(value)) {
			const sanitized = sanitizeRepoName(value);
			setNameWarning(t("pushDialog.nameWarningChinese", { name: sanitized }));
		} else if (/[^a-zA-Z0-9\-_.]/.test(value)) {
			const sanitized = sanitizeRepoName(value);
			setNameWarning(t("pushDialog.nameWarningInvalid", { name: sanitized }));
		} else {
			setNameWarning("");
		}
	};

	const handleSubmit = () => {
		let finalRepoName = isNewRepo ? repoName : selectedRepo;
		
		if (!finalRepoName.trim()) {
			alert(t("pushDialog.emptyNameError"));
			return;
		}

		// 对新仓库名进行清理
		if (isNewRepo) {
			finalRepoName = sanitizeRepoName(finalRepoName);
			
			if (!finalRepoName) {
				alert(t("pushDialog.invalidNameError"));
				return;
			}
		}

		onPush({
			repoPath,
			repoName: finalRepoName,
			isNewRepo,
			isPrivate,
			forcePush,
			commitCount,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="w-full max-w-2xl rounded-none border-2 border-black bg-white p-6 shadow-xl">
				<h2 className="mb-4 text-2xl font-bold">{t("pushDialog.title")}</h2>

				{/* 选择新建或现有仓库 */}
				<div className="mb-6">
					<div className="flex gap-4">
						<label className="flex items-center gap-2">
							<input
								type="radio"
								checked={isNewRepo}
								onChange={() => setIsNewRepo(true)}
								className="h-4 w-4"
							/>
							<span className="font-medium">{t("pushDialog.newRepo")}</span>
						</label>
						<label className="flex items-center gap-2">
							<input
								type="radio"
								checked={!isNewRepo}
								onChange={() => setIsNewRepo(false)}
								className="h-4 w-4"
							/>
							<span className="font-medium">{t("pushDialog.existingRepo")}</span>
						</label>
					</div>
				</div>

				{isNewRepo ? (
					<>
						{/* 新建仓库 */}
						<div className="mb-4">
							<label className="mb-2 block text-sm font-medium">
								{t("pushDialog.repoName")}
							</label>
							<input
								type="text"
								value={repoName}
								onChange={(e) => handleRepoNameChange(e.target.value)}
								placeholder={t("pushDialog.repoNamePlaceholder")}
								className="w-full rounded-none border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
							/>
							{nameWarning && (
								<p className="mt-2 text-xs text-orange-600">
									⚠️ {nameWarning}
								</p>
							)}
							<p className="mt-1 text-xs text-gray-500">
								{t("pushDialog.nameRules")}
							</p>
						</div>

						<div className="mb-6">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={isPrivate}
									onChange={(e) => setIsPrivate(e.target.checked)}
									className="h-4 w-4"
								/>
								<span className="text-sm">{t("pushDialog.privateRepo")}</span>
							</label>
						</div>
					</>
				) : (
					<>
						{/* 选择现有仓库 */}
						<div className="mb-4">
							<label className="mb-2 block text-sm font-medium">
								{t("pushDialog.selectRepo")}
							</label>
							<select
								value={selectedRepo}
								onChange={(e) => setSelectedRepo(e.target.value)}
								className="w-full rounded-none border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
							>
								<option value="">{t("pushDialog.selectRepoPlaceholder")}</option>
								{userRepos.map((repo) => (
									<option key={repo.name} value={repo.name}>
										{repo.name} {repo.private ? "(私有)" : "(公开)"}
									</option>
								))}
							</select>
						</div>

						<div className="mb-6">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={forcePush}
									onChange={(e) => setForcePush(e.target.checked)}
									className="h-4 w-4"
								/>
								<span className="text-sm">{t("pushDialog.forcePush")}</span>
							</label>
							{forcePush && (
								<p className="mt-1 text-xs text-red-600">
									{t("pushDialog.forcePushWarning")}
								</p>
							)}
						</div>
					</>
				)}

				{/* 提交信息 */}
				<div className="mb-6 rounded-none border border-gray-300 bg-gray-50 p-4">
					<p className="text-sm text-gray-700">
						<strong>{t("pushDialog.commitCount", { count: commitCount })}</strong>
					</p>
				</div>

				{/* 按钮 */}
				<div className="flex justify-end gap-3">
					<button
						onClick={onClose}
						disabled={isLoading}
						className="rounded-none border border-black bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
					>
						{t("pushDialog.cancel")}
					</button>
					<button
						onClick={handleSubmit}
						disabled={isLoading}
						className="rounded-none border border-black bg-black px-6 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
					>
						{isLoading ? t("pushDialog.pushing") : t("pushDialog.push")}
					</button>
				</div>
			</div>
		</div>
	);
};

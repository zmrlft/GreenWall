import React from "react";
import { useTranslations } from "../i18n";

/**
 * LoginButton 组件
 * 显示登录按钮或已登录用户信息
 */
type Props = {
	userInfo: { username: string; email: string; avatarUrl?: string } | null;
	onLogin: () => void;
	onLogout: () => void;
	isLoggingIn?: boolean;
};

export const LoginButton: React.FC<Props> = ({
	userInfo,
	onLogin,
	onLogout,
	isLoggingIn = false,
}) => {
	const { t } = useTranslations();

	if (userInfo) {
		// 已登录状态
		return (
			<div className="flex w-full flex-col gap-2 sm:w-auto">
				<div className="flex items-center gap-3 rounded-none border border-black bg-gray-50 px-4 py-2">
					{userInfo.avatarUrl ? (
						<img
							src={userInfo.avatarUrl}
							alt={userInfo.username}
							className="h-10 w-10 rounded-full border-2 border-green-600"
						/>
					) : (
						<svg
							className="h-10 w-10 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					)}
					<div className="flex flex-col">
						<span className="text-sm font-medium text-black">
							{userInfo.username}
						</span>
						<span className="text-xs text-gray-600">{userInfo.email}</span>
					</div>
					<button
						type="button"
						onClick={onLogout}
						className="ml-2 rounded-none border border-red-600 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
						title={t("loginButton.logoutTitle")}
					>
						{t("loginButton.logout")}
					</button>
				</div>
			</div>
		);
	}

	// 未登录状态
	return (
		<div className="flex w-full flex-col gap-2 sm:w-auto">
			<button
				type="button"
				onClick={onLogin}
				className={`flex w-full items-center justify-center gap-2 rounded-none border px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
					isLoggingIn
						? "border-orange-600 bg-orange-50 text-orange-600 hover:bg-orange-100"
						: "border-black bg-white text-black hover:bg-gray-100"
				}`}
				title={isLoggingIn ? t("loginButton.cancelLoginTitle") : t("loginButton.loginTitle")}
			>
				{isLoggingIn ? (
					<>
						<svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						{t("loginButton.loggingIn")}
					</>
				) : (
					<>
						<svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.257.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.303-5.466-1.335-5.466-5.935 0-1.312.47-2.382 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.003.404c2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.838 1.236 1.908 1.236 3.22 0 4.61-2.804 5.628-5.475 5.923.431.372.816 1.103.816 2.222 0 1.605-.014 2.897-.014 3.293 0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0Z" />
						</svg>
						{t("loginButton.loginWithGitHub")}
					</>
				)}
			</button>
			{isLoggingIn && (
				<p className="text-xs text-gray-600">
					{t("loginButton.loginHint")}
				</p>
			)}
		</div>
	);
};

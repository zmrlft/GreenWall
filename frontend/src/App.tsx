import React from "react";
import "./App.css";
import ContributionCalendar, { OneDay } from "./components/ContributionCalendar";
import GitInstallSidebar from "./components/GitInstallSidebar";
import GitPathSettings from "./components/GitPathSettings";
import { TranslationProvider, useTranslations, Language } from "./i18n";

function App() {
	const generateEmptyYearData = (year: number): OneDay[] => {
		const data: OneDay[] = [];
		const start = new Date(year, 0, 1);
		const end = new Date(year, 11, 31);

		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			data.push({
				date: d.toISOString().slice(0, 10),
				count: 0,
				level: 0,
			});
		}
		return data;
	};

	const generateMultiYearData = (): OneDay[] => {
		const data: OneDay[] = [];
		const currentYear = new Date().getFullYear();

		for (let year = 2008; year <= currentYear; year++) {
			data.push(...generateEmptyYearData(year));
		}
		return data;
	};

	const multiYearData: OneDay[] = generateMultiYearData();

	return (
		<TranslationProvider>
			<AppLayout contributions={multiYearData}/>
		</TranslationProvider>
	);
}

type AppLayoutProps = {
	contributions: OneDay[];
};

const AppLayout: React.FC<AppLayoutProps> = ({ contributions }) => {
	const { language, setLanguage, t } = useTranslations();
	const [isGitInstalled, setIsGitInstalled] = React.useState<boolean | null>(null);
	const [gitVersion, setGitVersion] = React.useState<string>("");
	const [isGitPathSettingsOpen, setIsGitPathSettingsOpen] = React.useState<boolean>(false);

	React.useEffect(() => {
		const checkGit = async () => {
			try {
				const { CheckGitInstalled } = await import("../wailsjs/go/main/App");
				const response = await CheckGitInstalled();
				setIsGitInstalled(response.installed);
				setGitVersion(response.version);
			} catch (error) {
				console.error("Failed to check Git installation:", error);
				setIsGitInstalled(false);
			}
		};

		checkGit();
	}, []);

	const handleCheckAgain = React.useCallback(async () => {
		try {
			const { CheckGitInstalled } = await import("../wailsjs/go/main/App");
			const response = await CheckGitInstalled();
			setIsGitInstalled(response.installed);
			setGitVersion(response.version);
		} catch (error) {
			console.error("Failed to check Git installation:", error);
			setIsGitInstalled(false);
		}
	}, []);

	const languageOptions = React.useMemo(
		() => [
			{ value: "en" as Language, label: t("languageSwitcher.english") },
			{ value: "zh" as Language, label: t("languageSwitcher.chinese") },
		],
		[t],
	);

	return (
		<div className="min-h-screen bg-white">
			<div className="container mx-auto px-4 py-4 md:py-6">
				<main className="flex justify-center">
					<div className="rounded-none bg-white p-6 shadow-none">
						<ContributionCalendar contributions={contributions}/>
					</div>
				</main>
			</div>

			<div className="fixed bottom-4 left-4 flex items-center gap-3">
				<a
					href="https://github.com/zmrlft/GreenWall"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open GreenWall repository on GitHub"
					className="text-black transition-colors hover:text-gray-700"
				>
					<svg
						className="h-7 w-7"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							fill="currentColor"
							d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.257.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.303-5.466-1.335-5.466-5.935 0-1.312.47-2.382 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.003.404c2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.838 1.236 1.908 1.236 3.22 0 4.61-2.804 5.628-5.475 5.923.431.372.816 1.103.816 2.222 0 1.605-.014 2.897-.014 3.293 0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0Z"
						/>
					</svg>
				</a>
				<button
					onClick={() => setIsGitPathSettingsOpen(true)}
					className="inline-flex items-center justify-center rounded-none border border-black bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
					aria-label="Git设置"
				>
					<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
				<div
					className="inline-flex overflow-hidden rounded-none border border-black"
					role="group"
					aria-label={t("labels.language")}
				>
					{languageOptions.map((option, index) => {
						const isActive = language === option.value;
						const borderClass = index === 0 ? "border-r border-black" : "";
						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={isActive}
								onClick={() => setLanguage(option.value)}
								className={`px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${borderClass} ${
									isActive
										? "bg-black text-white"
										: "bg-white text-black hover:bg-gray-100"
								}`}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Git 安装提示 - 仅在未安装时显示 */}
			{isGitInstalled === false && (
				<GitInstallSidebar onCheckAgain={handleCheckAgain} />
			)}

			{/* Git 路径设置弹窗 */}
			<GitPathSettings
				isOpen={isGitPathSettingsOpen}
				onClose={() => setIsGitPathSettingsOpen(false)}
				onCheckAgain={handleCheckAgain}
			/>
		</div>
	);
};

export default App;


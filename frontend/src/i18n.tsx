import React from "react";

export type Language = "en" | "zh";

type TranslationDict = {
	languageName: string;
	labels: {
		githubUsername: string;
		githubEmail: string;
		repoName: string;
		year: string;
		drawMode: string;
		actions: string;
		language: string;
		dataActions: string;
	};
	placeholders: {
		githubUsername: string;
		githubEmail: string;
		repoName: string;
	};
	drawModes: {
		pen: string;
		eraser: string;
	};
	buttons: {
		reset: string;
		generateRepo: string;
		generating: string;
		export: string;
		import: string;
	};
	titles: {
		pen: string;
		eraser: string;
		reset: string;
		generate: string;
		export: string;
		import: string;
	};
	messages: {
		generateRepoMissing: string;
		generateRepoError: string;
		noContributions: string;
		exportSuccess: string;
		exportError: string;
		importSuccess: string;
		importError: string;
	};
	calendar: {
		totalContributions: string;
		tooltipNone: string;
		tooltipSome: string;
		tooltipFuture: string;
		legendLess: string;
		legendMore: string;
	};
	months: string[];
	weekdays: {
		mon: string;
		wed: string;
		fri: string;
	};
	languageSwitcher: {
		english: string;
		chinese: string;
	};
};

const translations: Record<Language, TranslationDict> = {
	en: {
		languageName: "English",
		labels: {
			githubUsername: "GitHub Username",
			githubEmail: "GitHub Email",
			repoName: "Repository Name",
			year: "Year",
			drawMode: "Draw Mode",
			actions: "Actions",
			language: "Language",
			dataActions: "Data Actions",
		},
		placeholders: {
			githubUsername: "octocat",
			githubEmail: "monalisa@github.com",
			repoName: "my-contributions",
		},
		drawModes: {
			pen: "Pen",
			eraser: "Eraser",
		},
		buttons: {
			reset: "Reset",
			generateRepo: "Generate Repo",
			generating: "Generating...",
			export: "Export",
			import: "Import",
		},
		titles: {
			pen: "Pen mode - click or drag to add contributions",
			eraser: "Eraser mode - click or drag to clear contributions",
			reset: "Clear all customised contribution data",
			generate: "Create a local git repository matching this contribution calendar",
			export: "Export current contributions to a JSON file",
			import: "Import contributions from a JSON file",
		},
		messages: {
			generateRepoMissing:
				"Please provide a GitHub username and email before generating a repository.",
			noContributions: "No contributions to generate. Add contributions first.",
			generateRepoError: "Failed to generate repository: {{message}}",
			exportSuccess: "Contributions exported to {{filePath}}",
			exportError: "Failed to export contributions: {{message}}",
			importSuccess: "Contributions imported successfully",
			importError: "Failed to import contributions: {{message}}",
		},
		calendar: {
			totalContributions: "{{count}} contributions in {{year}}",
			tooltipNone: "No contributions on {{date}} - Click to add!",
			tooltipSome: "{{count}} contributions on {{date}}",
			tooltipFuture: "Upcoming date {{date}} - editing disabled",
			legendLess: "Less",
			legendMore: "More",
		},
		months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		weekdays: {
			mon: "Mon",
			wed: "Wed",
			fri: "Fri",
		},
		languageSwitcher: {
			english: "English",
			chinese: "中文",
		},
	},
	zh: {
		languageName: "中文",
		labels: {
			githubUsername: "GitHub 用户名",
			githubEmail: "GitHub 邮箱",
			repoName: "仓库名称",
			year: "年份",
			drawMode: "绘制模式",
			actions: "操作",
			language: "语言",
			dataActions: "数据操作",
		},
		placeholders: {
			githubUsername: "octocat",
			githubEmail: "monalisa@github.com",
			repoName: "my-contributions",
		},
		drawModes: {
			pen: "画笔",
			eraser: "橡皮擦",
		},
		buttons: {
			reset: "重置",
			generateRepo: "生成仓库",
			generating: "生成中...",
			export: "导出",
			import: "导入",
		},
		titles: {
			pen: "画笔模式 - 点击或拖拽添加贡献",
			eraser: "橡皮擦模式 - 点击或拖拽清除贡献",
			reset: "清除所有自定义贡献数据",
			generate: "创建与当前贡献图匹配的本地 Git 仓库",
			export: "导出当前贡献数据到 JSON 文件",
			import: "从 JSON 文件导入贡献数据",
		},
		messages: {
			generateRepoMissing: "请先填写 GitHub 用户名和邮箱，然后再生成仓库。",
			noContributions: "没有可生成的贡献，请先添加贡献。",
			generateRepoError: "生成仓库失败：{{message}}",
			exportSuccess: "贡献数据已导出到 {{filePath}}",
			exportError: "导出贡献数据失败：{{message}}",
			importSuccess: "贡献数据已成功导入",
			importError: "导入贡献数据失败：{{message}}",
		},
		calendar: {
			totalContributions: "{{year}} 年共 {{count}} 次贡献",
			tooltipNone: "{{date}} 没有贡献 - 点击添加！",
			tooltipSome: "{{date}} 有 {{count}} 次贡献",
			tooltipFuture: "{{date}} 为未来日期，禁止编辑",
			legendLess: "较少",
			legendMore: "更多",
		},
		months: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12",
		],
		weekdays: {
			mon: "一",
			wed: "三",
			fri: "五",
		},
		languageSwitcher: {
			english: "English",
			chinese: "中文",
		},
	},
};

type TranslationContextValue = {
	language: Language;
	setLanguage: (language: Language) => void;
	t: (key: string, params?: Record<string, string | number>) => string;
	dictionary: TranslationDict;
};

const LANGUAGE_STORAGE_KEY = "github-contributor.language";

const TranslationContext = React.createContext<TranslationContextValue | undefined>(undefined);

function interpolate(template: string, params?: Record<string, string | number>) {
	if (!params) {
		return template;
	}
	return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
		const key = rawKey.trim();
		const value = params[key];
		return value === undefined ? `{{${key}}}` : String(value);
	});
}

function resolveKey(dictionary: TranslationDict, key: string): string | undefined {
	const parts = key.split(".");
	let current: any = dictionary;

	for (const part of parts) {
		if (current && typeof current === "object" && part in current) {
			current = current[part];
		} else {
			return undefined;
		}
	}

	return typeof current === "string" ? current : undefined;
}

export const TranslationProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const [language, setLanguageState] = React.useState<Language>(() => {
		if (typeof window === "undefined") {
			return "en";
		}
		const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
		return stored === "en" || stored === "zh" ? stored : "en";
	});

	const dictionary = translations[language];

	const setLanguage = React.useCallback((next: Language) => {
		setLanguageState(next);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
		}
	}, []);

	const translate = React.useCallback(
		(key: string, params?: Record<string, string | number>) => {
			const template = resolveKey(dictionary, key) ?? key;
			return interpolate(template, params);
		},
		[dictionary],
	);

	const contextValue = React.useMemo(
		() => ({
			language,
			setLanguage,
			t: translate,
			dictionary,
		}),
		[language, setLanguage, translate, dictionary],
	);

	return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
};

export function useTranslations() {
	const context = React.useContext(TranslationContext);
	if (!context) {
		throw new Error("useTranslations must be used within a TranslationProvider");
	}
	return context;
}

export const AVAILABLE_LANGUAGES: { value: Language; label: string }[] = [
	{ value: "en", label: translations.en.languageName },
	{ value: "zh", label: translations.zh.languageName },
];

import React from 'react';

export type Language = 'en' | 'zh';

type TranslationDict = {
  languageName: string;
  labels: {
    githubUsername: string;
    githubEmail: string;
    repoName: string;
    year: string;
    drawMode: string;
    penIntensity: string;
    language: string;
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
  penModes: {
    manual: string;
    auto: string;
  };
  buttons: {
    allGreen: string;
    randomActive: string;
    reset: string;
    copyMode: string;
    generateRepo: string;
    generating: string;
    export: string;
    import: string;
    createRemoteRepo: string;
  };
  titles: {
    pen: string;
    eraser: string;
    penIntensity: string;
    penManualMode: string;
    penAutoMode: string;
    allGreen: string;
    randomActive: string;
    reset: string;
    copyMode: string;
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
    remoteLoginRequired: string;
    cutSuccess: string;
    copySuccess: string;
    noColoredCells: string;
  };
  gitInstall: {
    title: string;
    notInstalled: string;
    notInstalledLabel: string;
    downloadLink: string;
    close: string;
    instructions: {
      windows: string;
      mac: string;
      linux: string;
    };
    checkAgain: string;
    version: string;
  };
  gitPathSettings: {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    setPath: string;
    setting: string;
    reset: string;
    resetSuccess: string;
    setSuccess: string;
    setError: string;
    resetError: string;
    pathNotFound: string;
    noteTitle: string;
    noteEmpty: string;
    noteCustom: string;
    noteManualCheck: string;
  };
  calendar: {
    totalContributions: string;
    tooltipNone: string;
    tooltipSome: string;
    tooltipFuture: string;
    legendLess: string;
    legendMore: string;
  };
  workbench: {
    placeholder: string;
  };
  imageImport: {
    title: string;
    description: string;
    selectImage: string;
    changeImage: string;
    targetWidth: string;
    targetWidthHint: string;
    targetHeight: string;
    targetHeightHint: string;
    startDate: string;
    threshold: string;
    thresholdHint: string;
    mode: string;
    modeAuto: string;
    modeBinary: string;
    modeHint: string;
    smoothing: string;
    smoothingOn: string;
    smoothingOff: string;
    smoothingHint: string;
    binaryRelax: string;
    binaryRelaxHint: string;
    binaryRelax2: string;
    binaryRelax2Hint: string;
    invert: string;
    previewOnCalendar: string;
    previewOnCalendarHint: string;
    apply: string;
    preview: string;
    noPreview: string;
    processing: string;
    invalidDate: string;
    loadFailed: string;
  };
  characterSelector: {
    title: string;
    selectCharacter: string;
    tabUppercase: string;
    tabLowercase: string;
    tabNumbers: string;
    tabSymbols: string;
    previewTooltip: string;
    cancelPreview: string;
    character: string;
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
  loginModal: {
    title: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    remember: string;
    helpLink: string;
    submit: string;
    submitting: string;
    close: string;
    hint: string;
    success: string;
    emailFallback: string;
    missingUser: string;
  };
  remoteModal: {
    title: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    nameHelp: string;
    privacyLabel: string;
    publicOption: string;
    privateOption: string;
    repoDescriptionLabel: string;
    repoDescriptionPlaceholder: string;
    cancel: string;
    confirm: string;
    confirming: string;
    nameRequired: string;
    nameInvalid: string;
  };
};

const translations: Record<Language, TranslationDict> = {
  en: {
    languageName: 'English',
    labels: {
      githubUsername: 'GitHub Username',
      githubEmail: 'GitHub Email',
      repoName: 'Repository Name',
      year: 'Year',
      drawMode: 'Draw Mode',
      penIntensity: 'Pen Intensity',
      language: 'Language',
    },
    placeholders: {
      githubUsername: 'octocat',
      githubEmail: 'monalisa@github.com',
      repoName: 'my-contributions',
    },
    drawModes: {
      pen: 'Pen',
      eraser: 'Eraser',
    },
    penModes: {
      manual: 'Manual',
      auto: 'Auto',
    },
    buttons: {
      allGreen: 'All Green',
      randomActive: 'Random Active',
      reset: 'Reset',
      copyMode: 'Copy Mode',
      generateRepo: 'Generate Repo',
      generating: 'Generating...',
      export: 'Export',
      import: 'Import',
      createRemoteRepo: 'Create Remote Repo',
    },
    titles: {
      pen: 'Pen mode - click or drag to add contributions',
      eraser: 'Eraser mode - click or drag to clear contributions',
      penIntensity: 'Set pen intensity to {{intensity}} contributions',
      penManualMode: 'Manual Mode',
      penAutoMode: 'Auto Mode',
      allGreen: 'Set all contributions to green',
      randomActive: 'Randomly generate a realistic frequent contributor pattern',
      reset: 'Clear all customised contribution data',
      generate: 'Create a local git repository matching this contribution calendar',
      export: 'Export current contributions to a JSON file',
      import: 'Import contributions from a JSON file',
      copyMode: 'Copy mode - select area then press Ctrl+C to copy',
    },
    messages: {
      generateRepoMissing:
        'Please provide a GitHub username and email before generating a repository.',
      noContributions: 'No contributions to generate. Add contributions first.',
      generateRepoError: 'Failed to generate repository: {{message}}',
      exportSuccess: 'Contributions exported to {{filePath}}',
      exportError: 'Failed to export contributions: {{message}}',
      importSuccess: 'Contributions imported successfully',
      importError: 'Failed to import contributions: {{message}}',
      remoteLoginRequired:
        'Please sign in with your GitHub token before creating a remote repository.',
      cutSuccess: 'Cut success: {{count}} colored cells',
      copySuccess: 'Copy success: {{count}} colored cells',
      noColoredCells: 'No colored cells in selection',
    },
    gitInstall: {
      title: 'Git Installation Required',
      notInstalled:
        'Git is not installed on your system. Please install Git to use this application.',
      notInstalledLabel: 'Git Not Installed',
      downloadLink: 'Download Git',
      close: 'Close',
      instructions: {
        windows: 'For Windows: Download Git from the official website and run the installer.',
        mac: "For macOS: Use Homebrew with 'brew install git' or download from the official website.",
        linux: "For Linux: Use your package manager (e.g., 'sudo apt install git' for Ubuntu).",
      },
      checkAgain: 'Check Again',
      version: 'Git Version: {{version}}',
    },
    gitPathSettings: {
      title: 'Git Path Settings',
      description:
        'If Git is installed but not added to system PATH, enter the full path to the Git executable.',
      label: 'Git Executable Path',
      placeholder: 'e.g.: C:\\Program Files\\Git\\bin\\git.exe',
      setPath: 'Set Path',
      setting: 'Setting...',
      reset: 'Reset to Default',
      resetSuccess: 'Reset to default successfully',
      setSuccess: 'Git path set successfully',
      setError: 'Failed to set path: {{message}}',
      resetError: 'Failed to reset: {{message}}',
      pathNotFound: 'Specified path does not exist',
      noteTitle: 'Note:',
      noteEmpty: "Leave empty or click 'Reset to Default' to use the git command from system PATH",
      noteCustom:
        'Enter full path (e.g., C:\\Program Files\\Git\\bin\\git.exe) to use that git executable',
      noteManualCheck: 'You need to manually check Git status after setting',
    },
    calendar: {
      totalContributions: '{{count}} contributions in {{year}}',
      tooltipNone: 'No contributions on {{date}} - Click to add!',
      tooltipSome: '{{count}} contributions on {{date}}',
      tooltipFuture: 'Upcoming date {{date}} - editing disabled',
      legendLess: 'Less',
      legendMore: 'More',
    },
    workbench: {
      placeholder:
        '✨ This area is under development! Got any wild feature ideas? Drop them in the issues and your creativity might ship~ Tips: Right-click to switch between the brush and eraser. In copy mode, select a pattern, press Ctrl+C to copy it, then Ctrl+V or left-click to paste.',
    },
    imageImport: {
      title: 'Image → Heatmap',
      description: '',
      selectImage: 'Choose image',
      changeImage: 'Change image',
      targetWidth: 'Target columns',
      targetWidthHint: 'Fill manually to scale (1–52)',
      targetHeight: 'Target rows',
      targetHeightHint: 'Fill manually to scale (1–7)',
      startDate: 'Start date (top row = Sunday)',
      threshold: 'Brightness threshold',
      thresholdHint: 'Pixels below this brightness in the source will be set to 0 (0-255)',
      mode: 'Quantisation mode',
      modeAuto: 'Auto (grayscale)',
      modeBinary: 'Binary (pure black/white)',
      modeHint: 'Auto: grayscale | Binary: pure black/white',
      smoothing: 'Scaling filter',
      smoothingOn: 'Bilinear (smoother)',
      smoothingOff: 'Nearest (preserve sharp edges)',
      smoothingHint: 'If thin strokes break, try Nearest; if blocky, try Bilinear',
      binaryRelax: 'Binary stroke recovery',
      binaryRelaxHint: 'Lower Otsu threshold by this value when result is too sparse (0–64)',
      binaryRelax2: 'Secondary recovery',
      binaryRelax2Hint: 'Additional threshold reduction after the first recovery (0–64)',
      invert: 'Invert brightness',
      previewOnCalendar: 'Preview on calendar (hover to place, click to apply)',
      previewOnCalendarHint: 'Use hover to position; left-click to apply, right-click to cancel',
      apply: 'Apply to calendar',
      preview: 'Preview',
      noPreview: 'Upload an image to see preview',
      processing: 'Processing image...',
      invalidDate: 'Please pick a valid start date.',
      loadFailed: 'Failed to load image, try another file.',
    },
    characterSelector: {
      title: 'Select Pattern',
      selectCharacter: 'Select Character (A-Z, a-z, 0-9)',
      tabUppercase: 'A-Z',
      tabLowercase: 'a-z',
      tabNumbers: '0-9',
      tabSymbols: '🎨 Symbols',
      previewTooltip: 'Preview character: {{char}}',
      cancelPreview: 'Cancel Preview',
      character: 'Character',
    },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: {
      mon: 'Mon',
      wed: 'Wed',
      fri: 'Fri',
    },
    languageSwitcher: {
      english: 'English',
      chinese: '中文',
    },
    loginModal: {
      title: 'GitHub Login',
      tokenLabel: 'Personal Access Token (classic)',
      tokenPlaceholder: 'Paste your PAT',
      remember: 'Remember this token (stored locally only)',
      helpLink: 'Read how to get a PAT',
      submit: 'Sign in with Token',
      submitting: 'Verifying...',
      close: 'Close',
      hint: 'Your token is only used for GitHub calls and stored locally if you choose to remember it.',
      success: 'Login successful',
      emailFallback: 'Email not public',
      missingUser: 'GitHub profile missing in response',
    },
    remoteModal: {
      title: 'Create Remote Repository',
      description:
        'GreenWall will reuse your generated commits, create a GitHub repository, add it as origin, and push everything for you.',
      nameLabel: 'Repository Name',
      namePlaceholder: 'my-contributions',
      nameHelp: 'Use letters, numbers, ".", "_", or "-" (up to 100 characters).',
      privacyLabel: 'Visibility',
      publicOption: 'Public',
      privateOption: 'Private',
      repoDescriptionLabel: 'Description (optional)',
      repoDescriptionPlaceholder: 'Explain what this repository is about',
      cancel: 'Cancel',
      confirm: 'Generate & Push',
      confirming: 'Working...',
      nameRequired: 'Repository name is required.',
      nameInvalid: 'Repository name can only include letters, numbers, ".", "_", or "-".',
    },
  },
  zh: {
    languageName: '中文',
    labels: {
      githubUsername: 'GitHub 用户名',
      githubEmail: 'GitHub 邮箱',
      repoName: '仓库名称',
      year: '年份',
      drawMode: '绘制模式',
      penIntensity: '画笔强度',
      language: '语言',
    },
    placeholders: {
      githubUsername: 'octocat',
      githubEmail: 'monalisa@github.com',
      repoName: 'my-contributions',
    },
    drawModes: {
      pen: '画笔',
      eraser: '橡皮擦',
    },
    penModes: {
      manual: '手动',
      auto: '自动',
    },
    buttons: {
      allGreen: '全绿',
      randomActive: '随机活跃',
      reset: '重置',
      copyMode: '复制模式',
      generateRepo: '生成仓库',
      generating: '生成中...',
      export: '导出',
      import: '导入',
      createRemoteRepo: '创建远程仓库',
    },
    titles: {
      pen: '画笔模式 - 点击或拖拽添加贡献',
      eraser: '橡皮擦模式 - 点击或拖拽清除贡献',
      penIntensity: '设置画笔强度为 {{intensity}} 次贡献',
      penManualMode: '手动模式',
      penAutoMode: '自动模式',
      allGreen: '将所有贡献设置为绿色',
      randomActive: '随机生成真实的高频贡献者分布',
      reset: '清除所有自定义贡献数据',
      generate: '创建与当前贡献图匹配的本地 Git 仓库',
      export: '导出当前贡献数据到 JSON 文件',
      import: '从 JSON 文件导入贡献数据',
      copyMode: '复制模式 - 选中区域后按 Ctrl+C 复制',
    },
    messages: {
      generateRepoMissing: '请先填写 GitHub 用户名和邮箱，然后再生成仓库。',
      noContributions: '没有可生成的贡献，请先添加贡献。',
      generateRepoError: '生成仓库失败：{{message}}',
      exportSuccess: '贡献数据已导出到 {{filePath}}',
      exportError: '导出贡献数据失败：{{message}}',
      importSuccess: '贡献数据已成功导入',
      importError: '导入贡献数据失败：{{message}}',
      remoteLoginRequired: '请先登录 GitHub 再创建远程仓库。',
      cutSuccess: '剪切成功：{{count}} 个涂色格子',
      copySuccess: '复制成功：{{count}} 个涂色格子',
      noColoredCells: '选区中没有涂色的格子',
    },
    gitInstall: {
      title: '需要安装 Git',
      notInstalled: '系统未安装 Git。请安装 Git 以使用此应用程序。',
      notInstalledLabel: 'Git 未安装',
      downloadLink: '下载 Git',
      close: '关闭',
      instructions: {
        windows: 'Windows 系统：从官方网站下载 Git 并运行安装程序。',
        mac: "macOS 系统：使用 Homebrew 运行 'brew install git' 或从官方网站下载。",
        linux: "Linux 系统：使用包管理器安装（如 Ubuntu 使用 'sudo apt install git'）。",
      },
      checkAgain: '再次检测',
      version: 'Git 版本：{{version}}',
    },
    gitPathSettings: {
      title: 'Git 路径设置',
      description: '如果 Git 已安装但未添加到系统 PATH，请输入 Git 可执行文件的完整路径。',
      label: 'Git 可执行文件路径',
      placeholder: '例如: C:\\Program Files\\Git\\bin\\git.exe',
      setPath: '设置路径',
      setting: '设置中...',
      reset: '重置为默认',
      resetSuccess: '已重置为默认路径',
      setSuccess: 'Git 路径设置成功',
      setError: '设置失败：{{message}}',
      resetError: '重置失败：{{message}}',
      pathNotFound: '指定的路径不存在',
      noteTitle: '说明：',
      noteEmpty: "留空或点击'重置为默认'将使用系统 PATH 中的 git 命令",
      noteCustom:
        '输入完整路径（如 C:\\Program Files\\Git\\bin\\git.exe）将使用该路径的 git 可执行文件',
      noteManualCheck: '设置后需要手动检查 Git 状态',
    },
    calendar: {
      totalContributions: '{{year}} 年共 {{count}} 次贡献',
      tooltipNone: '{{date}} 没有贡献 - 点击添加！',
      tooltipSome: '{{date}} 有 {{count}} 次贡献',
      tooltipFuture: '{{date}} 为未来日期，禁止编辑',
      legendLess: '较少',
      legendMore: '更多',
    },
    workbench: {
      placeholder:
        '✨ 该区域正在开发中！大家有哪些脑洞大开的功能想法？快来 issues 留言，你的创意可能会被实现哦~操作说明：右键可以切换画笔和橡皮擦，复制模式下框选好图案后按 ctrl+C 复制图案，ctrl+V 或者左键粘贴图案',
    },
    imageImport: {
      title: '图片转贡献图',
      description: '',
      selectImage: '选择图片',
      changeImage: '更换图片',
      targetWidth: '目标列数',
      targetWidthHint: '可手动填写以缩放（1~52）',
      targetHeight: '目标行数',
      targetHeightHint: '可手动填写以缩放（1~7）',
      startDate: '起始日期（最上方为周日）',
      threshold: '亮度阈值',
      thresholdHint: '原图中低于此亮度的像素会置为 0（0-255）',
      mode: '量化模式',
      modeAuto: '自动（灰度图）',
      modeBinary: '二值化（纯黑白）',
      modeHint: '自动：灰度图｜二值化：纯黑白',
      smoothing: '缩放平滑',
      smoothingOn: '双线性（更平滑）',
      smoothingOff: '邻近点（保细节）',
      smoothingHint: '笔画断裂选邻近，颗粒感重选双线性',
      binaryRelax: '二值补笔画强度',
      binaryRelaxHint: '当二值结果太稀疏时，下调 Otsu 阈值的幅度（0-64）',
      binaryRelax2: '二次补笔画',
      binaryRelax2Hint: '在第一次补笔画后再下调的幅度（0-64）',
      invert: '反转亮度',
      previewOnCalendar: '在日历中预览（悬停定位，点击应用）',
      previewOnCalendarHint: '鼠标悬停定位，左键应用，右键取消',
      apply: '应用到贡献表',
      preview: '预览',
      noPreview: '上传图片后会显示预览',
      processing: '图片处理中...',
      invalidDate: '请选择有效的起始日期。',
      loadFailed: '图片加载失败，请重试其他文件。',
    },
    characterSelector: {
      title: '选择图案',
      selectCharacter: '选择字符 (A-Z, a-z, 0-9)',
      tabUppercase: 'A-Z',
      tabLowercase: 'a-z',
      tabNumbers: '0-9',
      tabSymbols: '🎨 符号',
      previewTooltip: '预览字符: {{char}}',
      cancelPreview: '取消预览',
      character: '字符',
    },
    months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    weekdays: {
      mon: '一',
      wed: '三',
      fri: '五',
    },
    languageSwitcher: {
      english: 'English',
      chinese: '中文',
    },
    loginModal: {
      title: 'GitHub 登录',
      tokenLabel: 'Personal Access Token (classic)',
      tokenPlaceholder: '粘贴你的 PAT',
      remember: '记住这个 token（仅保存在本机）',
      helpLink: '查看如何获取 PAT',
      submit: '使用 Token 登录',
      submitting: '验证中...',
      close: '关闭',
      hint: '我们只会将 token 用于调用 GitHub，并在本地安全保存。',
      success: '登录成功',
      emailFallback: '未公开邮箱',
      missingUser: '未能获取 GitHub 用户信息',
    },
    remoteModal: {
      title: '创建远程仓库',
      description: 'GreenWall 会复用刚生成的提交，创建 GitHub 仓库并自动推送。',
      nameLabel: '仓库名称',
      namePlaceholder: 'my-contributions',
      nameHelp: '仅可使用字母、数字、“.”、“_”或“-”，最多 100 个字符。',
      privacyLabel: '可见性',
      publicOption: '公开',
      privateOption: '私有',
      repoDescriptionLabel: '仓库描述（可选）',
      repoDescriptionPlaceholder: '简单介绍一下这个仓库',
      cancel: '取消',
      confirm: '生成并推送',
      confirming: '处理中...',
      nameRequired: '请填写仓库名称。',
      nameInvalid: '仓库名称只能包含字母、数字、.、_ 或 -。',
    },
  },
};

type TranslationContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDict;
};

const LANGUAGE_STORAGE_KEY = 'github-contributor.language';

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
  const parts = key.split('.');
  let current: unknown = dictionary;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

export const TranslationProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = React.useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'en';
    }
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    return stored === 'en' || stored === 'zh' ? stored : 'en';
  });

  const dictionary = translations[language];

  const setLanguage = React.useCallback((next: Language) => {
    setLanguageState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    }
  }, []);

  const translate = React.useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = resolveKey(dictionary, key) ?? key;
      return interpolate(template, params);
    },
    [dictionary]
  );

  const contextValue = React.useMemo(
    () => ({
      language,
      setLanguage,
      t: translate,
      dictionary,
    }),
    [language, setLanguage, translate, dictionary]
  );

  return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
};

export function useTranslations() {
  const context = React.useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }
  return context;
}

export const AVAILABLE_LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: translations.en.languageName },
  { value: 'zh', label: translations.zh.languageName },
];

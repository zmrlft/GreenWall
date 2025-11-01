import React from 'react';
import clsx from 'clsx';
import { useTranslations } from '../i18n';
import { CharacterSelector } from './CharacterSelector';

type PenIntensity = 1 | 3 | 6 | 9;

type Props = {
  year?: number;
  onYearChange: (year: number) => void;
  drawMode?: 'pen' | 'eraser';
  penIntensity?: PenIntensity;
  onDrawModeChange: (mode: 'pen' | 'eraser') => void;
  onPenIntensityChange?: (intensity: PenIntensity) => void;
  onReset?: () => void;
  onFillAllGreen?: () => void;
  githubUsername: string;
  githubEmail: string;
  repoName: string;
  onGithubUsernameChange: (username: string) => void;
  onGithubEmailChange: (email: string) => void;
  onRepoNameChange: (name: string) => void;
  onGenerateRepo?: () => void;
  isGeneratingRepo?: boolean;
  onExportContributions?: () => void;
  onImportContributions?: () => void;
  // 字符预览相关
  onStartCharacterPreview?: (char: string) => void;
  previewMode?: boolean;
  onCancelCharacterPreview?: () => void;
};

export const CalendarControls: React.FC<Props> = ({
  year,
  onYearChange,
  drawMode,
  penIntensity = 1,
  onDrawModeChange,
  onPenIntensityChange,
  onReset,
  onFillAllGreen,
  githubUsername,
  githubEmail,
  repoName,
  onGithubUsernameChange,
  onGithubEmailChange,
  onRepoNameChange,
  onGenerateRepo,
  isGeneratingRepo,
  onExportContributions,
  onImportContributions,
  // 字符预览相关
  onStartCharacterPreview,
  previewMode,
  onCancelCharacterPreview,
}) => {
  const { t } = useTranslations();
  const [yearInput, setYearInput] = React.useState<string>(() =>
    typeof year === 'number' ? String(year) : ''
  );

  // 字符选择状态
  const [showCharacterSelector, setShowCharacterSelector] = React.useState<boolean>(false);
  // 画笔强度选择器显示状态
  const [showPenIntensityPicker, setShowPenIntensityPicker] = React.useState<boolean>(false);

  React.useEffect(() => {
    setYearInput(typeof year === 'number' ? String(year) : '');
  }, [year]);

  const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setYearInput(value);

    if (value === '') {
      return;
    }

    const parsed = Number(value);
    const currentYear = new Date().getFullYear();
    if (!Number.isNaN(parsed) && parsed >= 2008 && parsed <= currentYear) {
      onYearChange(parsed);
    }
  };

  const handleYearBlur = () => {
    const parsed = Number(yearInput);
    const currentYear = new Date().getFullYear();
    const isValid =
      yearInput !== '' && !Number.isNaN(parsed) && parsed >= 2008 && parsed <= currentYear;

    if (!isValid) {
      setYearInput(typeof year === 'number' ? String(year) : '');
    }
  };

  const disableGenerateRepo =
    !onGenerateRepo ||
    isGeneratingRepo ||
    githubUsername.trim() === '' ||
    githubEmail.trim() === '';

  const handleGenerateRepo = () => {
    if (!onGenerateRepo) return;
    onGenerateRepo();
  };

  const handleCharacterSelect = (char: string) => {
    if (onStartCharacterPreview) {
      onStartCharacterPreview(char);
    }
  };

  const handleCharacterButtonClick = () => {
    if (previewMode && onCancelCharacterPreview) {
      onCancelCharacterPreview();
    } else {
      setShowCharacterSelector(true);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-nowrap sm:gap-4">
        <div className="flex w-full flex-col space-y-2 sm:flex-1 sm:min-w-[14rem]">
          <label htmlFor="github-username-input" className="text-sm font-medium text-black">
            {t('labels.githubUsername')}
          </label>
          <input
            id="github-username-input"
            type="text"
            value={githubUsername}
            onChange={(event) => onGithubUsernameChange(event.target.value)}
            placeholder={t('placeholders.githubUsername')}
            autoComplete="username"
            className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex w-full flex-col space-y-2 sm:flex-1 sm:min-w-[14rem]">
          <label htmlFor="github-email-input" className="text-sm font-medium text-black">
            {t('labels.githubEmail')}
          </label>
          <input
            id="github-email-input"
            type="email"
            value={githubEmail}
            onChange={(event) => onGithubEmailChange(event.target.value)}
            placeholder={t('placeholders.githubEmail')}
            autoComplete="email"
            className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex w-full flex-col space-y-2 sm:flex-1 sm:min-w-[14rem]">
          <label htmlFor="repo-name-input" className="text-sm font-medium text-black">
            {t('labels.repoName')}
          </label>
          <input
            id="repo-name-input"
            type="text"
            value={repoName}
            onChange={(event) => onRepoNameChange(event.target.value)}
            placeholder={t('placeholders.repoName')}
            autoComplete="off"
            className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full flex-col space-y-2 sm:w-32 sm:flex-none">
          <label htmlFor="year-input" className="text-sm font-medium text-black">
            {t('labels.year')}
          </label>
          <input
            id="year-input"
            type="number"
            min="2008"
            max={new Date().getFullYear()}
            value={yearInput}
            onChange={handleYearChange}
            onBlur={handleYearBlur}
            className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="relative flex w-full flex-col space-y-2 sm:w-auto">
          <span className="text-sm font-medium text-black">{t('labels.drawMode')}</span>
          <div className="grid gap-2 sm:flex sm:flex-nowrap sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onDrawModeChange('pen');
                if (drawMode !== 'pen') {
                  setShowPenIntensityPicker(true);
                } else {
                  setShowPenIntensityPicker(!showPenIntensityPicker);
                }
              }}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200 sm:w-auto',
                drawMode === 'pen'
                  ? 'scale-105 transform bg-black text-white shadow-lg'
                  : 'border border-black bg-white text-black hover:bg-gray-100'
              )}
              title={t('titles.pen')}
            >
              {t('drawModes.pen')}
              {drawMode === 'pen' && onPenIntensityChange && (
                <div
                  className="ml-2 h-4 w-4 rounded-sm border-2 border-white shadow-sm"
                  style={{
                    backgroundColor:
                      penIntensity === 1
                        ? '#9be9a8'
                        : penIntensity === 3
                          ? '#40c463'
                          : penIntensity === 6
                            ? '#30a14e'
                            : '#216e39',
                  }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onDrawModeChange('eraser');
                setShowPenIntensityPicker(false);
              }}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200 sm:w-auto',
                drawMode === 'eraser'
                  ? 'scale-105 transform bg-black text-white shadow-lg'
                  : 'border border-black bg-white text-black hover:bg-gray-100'
              )}
              title={t('titles.eraser')}
            >
              {t('drawModes.eraser')}
            </button>
          </div>

          {/* 悬浮的画笔强度滑动条 - 点击画笔按钮后显示 */}
          {drawMode === 'pen' && showPenIntensityPicker && onPenIntensityChange && (
            <>
              {/* 遮罩层 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPenIntensityPicker(false)}
              />
              {/* 悬浮滑动条面板 */}
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-none border border-black bg-white p-4 shadow-xl">
                <div className="space-y-3">
                  <span className="text-sm font-medium text-black">{t('labels.penIntensity')}</span>
                  <input
                    type="range"
                    min="1"
                    max="9"
                    step="1"
                    value={penIntensity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      let mappedValue: PenIntensity;
                      if (value <= 2) mappedValue = 1;
                      else if (value <= 4) mappedValue = 3;
                      else if (value <= 7) mappedValue = 6;
                      else mappedValue = 9;
                      onPenIntensityChange(mappedValue);
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ebedf0 0%, #9be9a8 25%, #40c463 50%, #30a14e 75%, #216e39 100%)`,
                    }}
                    title={t('titles.penIntensity', { intensity: penIntensity })}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1</span>
                    <span>3</span>
                    <span>6</span>
                    <span>9</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex w-full flex-col space-y-2 sm:w-auto">
          <span className="text-sm font-medium text-black">
            {t('characterSelector.characterTool')}
          </span>
          <button
            type="button"
            onClick={handleCharacterButtonClick}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200 sm:w-auto',
              previewMode
                ? 'scale-105 transform bg-orange-600 text-white shadow-lg'
                : 'border border-black bg-white text-black hover:bg-gray-100'
            )}
            title={
              previewMode ? t('characterSelector.cancelPreview') : t('characterSelector.character')
            }
          >
            {previewMode ? t('characterSelector.cancelPreview') : t('characterSelector.character')}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:items-end">
          <span className="text-sm font-medium text-black sm:invisible">
            {t('labels.dataActions')}
          </span>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onExportContributions}
              className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100 sm:w-auto"
              title={t('titles.export')}
            >
              {t('buttons.export')}
            </button>
            <button
              type="button"
              onClick={onImportContributions}
              className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100 sm:w-auto"
              title={t('titles.import')}
            >
              {t('buttons.import')}
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:items-end">
          <span className="text-sm font-medium text-black sm:invisible">{t('labels.actions')}</span>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onFillAllGreen}
              className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100 sm:w-auto"
              title={t('titles.allGreen')}
            >
              {t('buttons.allGreen')}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-none bg-black px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-gray-800 sm:w-auto"
              title={t('titles.reset')}
            >
              {t('buttons.reset')}
            </button>
            <button
              type="button"
              onClick={handleGenerateRepo}
              disabled={disableGenerateRepo}
              className={clsx(
                'w-full rounded-none px-4 py-2 text-sm font-medium transition-colors duration-200 sm:w-auto',
                disableGenerateRepo
                  ? 'cursor-not-allowed border border-gray-400 bg-gray-200 text-gray-500'
                  : 'border border-black bg-white text-black hover:bg-gray-100'
              )}
              title={t('titles.generate')}
            >
              {isGeneratingRepo ? t('buttons.generating') : t('buttons.generateRepo')}
            </button>
          </div>
        </div>
      </div>

      {/* 字符选择弹窗 */}
      {showCharacterSelector && (
        <CharacterSelector
          onSelect={handleCharacterSelect}
          onClose={() => setShowCharacterSelector(false)}
        />
      )}
    </div>
  );
};

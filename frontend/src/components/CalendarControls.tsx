import React from 'react';
import clsx from 'clsx';
import { useTranslations } from '../i18n';
import { CharacterSelector } from './CharacterSelector';

type PenIntensity = 1 | 3 | 6 | 9;
type PenOption = PenIntensity | 'auto';

type Props = {
  year?: number;
  onYearChange: (year: number) => void;
  drawMode?: 'pen' | 'eraser';
  penIntensity?: PenIntensity;
  onDrawModeChange: (mode: 'pen' | 'eraser') => void;
  onPenIntensityChange?: (intensity: PenIntensity) => void;
  onReset?: () => void;
  onFillAllGreen?: () => void;
  onOpenRemoteRepoModal?: () => void;
  canCreateRemoteRepo?: boolean;
  isGeneratingRepo?: boolean;
  onExportContributions?: () => void;
  onImportContributions?: () => void;
  // 字符预览相关
  onStartCharacterPreview?: (char: string) => void;
  previewMode?: boolean;
  onCancelCharacterPreview?: () => void;
  // 画笔模式
  penMode?: 'manual' | 'auto';
  onPenModeChange?: (mode: 'manual' | 'auto') => void;
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
  onOpenRemoteRepoModal,
  canCreateRemoteRepo = false,
  isGeneratingRepo,
  onExportContributions,
  onImportContributions,
  // 字符预览相关
  onStartCharacterPreview,
  previewMode,
  onCancelCharacterPreview,
  // 画笔模式
  penMode = 'manual',
  onPenModeChange,
}) => {
  const { t } = useTranslations();
  const [yearInput, setYearInput] = React.useState<string>(() =>
    typeof year === 'number' ? String(year) : ''
  );

  // Character selector visibility
  const [showCharacterSelector, setShowCharacterSelector] = React.useState<boolean>(false);
  // Pen intensity picker visibility
  const [showPenIntensityPicker, setShowPenIntensityPicker] = React.useState<boolean>(false);

  React.useEffect(() => {
    setYearInput(typeof year === 'number' ? String(year) : '');
  }, [year]);

  React.useEffect(() => {
    if (drawMode !== 'pen') {
      setShowPenIntensityPicker(false);
    }
  }, [drawMode]);

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

  const disableRemoteRepo = !onOpenRemoteRepoModal || !canCreateRemoteRepo || isGeneratingRepo;
  const handleOpenRemoteRepoModal = () => {
    if (!onOpenRemoteRepoModal) return;
    onOpenRemoteRepoModal();
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

  const penIntensityColors: Record<PenIntensity, string> = {
    1: '#9be9a8',
    3: '#40c463',
    6: '#30a14e',
    9: '#216e39',
  };
  const penOptions: PenOption[] = [1, 3, 6, 9, 'auto'];

  const handlePenSettingsButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onPenIntensityChange) {
      return;
    }
    if (drawMode !== 'pen') {
      onDrawModeChange('pen');
    }
    setShowPenIntensityPicker((prev) => !prev);
  };

  const handlePenOptionSelect = (option: PenOption) => {
    if (option === 'auto') {
      onPenModeChange?.('auto');
      setShowPenIntensityPicker(false);
      return;
    }
    onPenModeChange?.('manual');
    onPenIntensityChange?.(option);
    setShowPenIntensityPicker(false);
  };

  const renderPenSettingsLabel = () => {
    if (penMode === 'auto') {
      return t('penModes.auto');
    }
    return `${t('labels.penIntensity')} ${penIntensity}`;
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Row 1: year + draw controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="flex w-full flex-col gap-2 md:max-w-xs">
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
            className="w-full rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="relative flex w-full flex-col gap-4 rounded-xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-black">{t('labels.drawMode')}</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onDrawModeChange('pen')}
                className={clsx(
                  'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200',
                  drawMode === 'pen'
                    ? 'scale-105 transform bg-black text-white shadow-lg'
                    : 'border border-black bg-white text-black hover:bg-gray-100'
                )}
                title={t('titles.pen')}
              >
                <span>{t('drawModes.pen')}</span>
                {onPenIntensityChange && (
                  <button
                    type="button"
                    className={clsx(
                      'flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200',
                      drawMode === 'pen'
                        ? 'border-white/60 bg-white/10 text-white hover:bg-white/20'
                        : 'border-black/40 bg-black/5 text-black/70'
                    )}
                    onClick={handlePenSettingsButtonClick}
                  >
                    <span>{renderPenSettingsLabel()}</span>
                    {penMode === 'manual' && (
                      <span
                        className="ml-1 h-3 w-3 rounded-sm border border-white/60"
                        style={{ backgroundColor: penIntensityColors[penIntensity] }}
                      />
                    )}
                  </button>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDrawModeChange('eraser');
                  setShowPenIntensityPicker(false);
                }}
                className={clsx(
                  'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200',
                  drawMode === 'eraser'
                    ? 'scale-105 transform bg-black text-white shadow-lg'
                    : 'border border-black bg-white text-black hover:bg-gray-100'
                )}
                title={t('titles.eraser')}
              >
                {t('drawModes.eraser')}
              </button>
            </div>
          </div>

          {drawMode === 'pen' && onPenIntensityChange && showPenIntensityPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPenIntensityPicker(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-black bg-white p-4 shadow-xl">
                <div className="space-y-3">
                  <span className="text-sm font-medium text-black">{t('labels.penIntensity')}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {penOptions.map((option) => {
                      const isAuto = option === 'auto';
                      const isActive = isAuto
                        ? penMode === 'auto'
                        : penMode === 'manual' && penIntensity === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handlePenOptionSelect(option)}
                          className={clsx(
                            'flex items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-black'
                          )}
                        >
                          <span>
                            {isAuto ? t('penModes.auto') : `${t('labels.penIntensity')} ${option}`}
                          </span>
                          {!isAuto && (
                            <span
                              className="h-3 w-3 rounded-sm border border-black/30"
                              style={{
                                backgroundColor: penIntensityColors[option],
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: character tool + import/export */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="flex w-full flex-col gap-2 md:flex-1">
          <button
            type="button"
            onClick={handleCharacterButtonClick}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200',
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

        <div className="flex w-full flex-col gap-2 md:flex-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onExportContributions}
              className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100"
              title={t('titles.export')}
            >
              {t('buttons.export')}
            </button>
            <button
              type="button"
              onClick={onImportContributions}
              className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100"
              title={t('titles.import')}
            >
              {t('buttons.import')}
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: remaining actions */}
      <div className="flex w-full flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onFillAllGreen}
            className="w-full rounded-none border border-black bg-white px-4 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100"
            title={t('titles.allGreen')}
          >
            {t('buttons.allGreen')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-none bg-black px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-gray-800"
            title={t('titles.reset')}
          >
            {t('buttons.reset')}
          </button>
          <button
            type="button"
            onClick={handleOpenRemoteRepoModal}
            disabled={disableRemoteRepo}
            className={clsx(
              'w-full rounded-none px-4 py-2 text-sm font-medium transition-colors duration-200',
              disableRemoteRepo
                ? 'cursor-not-allowed border border-gray-400 bg-gray-200 text-gray-500'
                : 'border border-black bg-white text-black hover:bg-gray-100'
            )}
            title={t('titles.generate')}
          >
            {isGeneratingRepo ? t('buttons.generating') : t('buttons.createRemoteRepo')}
          </button>
        </div>
      </div>

      {/* Character selector modal */}
      {showCharacterSelector && (
        <CharacterSelector
          onSelect={handleCharacterSelect}
          onClose={() => setShowCharacterSelector(false)}
        />
      )}
    </div>
  );
};

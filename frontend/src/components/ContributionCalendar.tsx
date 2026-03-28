import React from 'react';
import clsx from 'clsx';
import {
  useContributionEditor,
  type OneDay,
  type PenIntensity,
} from '../hooks/useContributionEditor';
import { useTranslations } from '../i18n';
import type { main } from '../../wailsjs/go/models';
import styles from './ContributionCalendar.module.scss';
import { CharacterSelector } from './CharacterSelector';
import { ImageImportCard } from './ImageImportCard';
import RemoteRepoModal from './RemoteRepoModal';
import { parseIsoDate } from '../utils/date';

function calculateLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count >= 1 && count <= 2) return 1;
  if (count >= 3 && count <= 5) return 2;
  if (count >= 6 && count <= 8) return 3;
  if (count > 8) return 4;
  return 0;
}

type IconProps = {
  className?: string;
};

const InfoIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6" />
    <circle cx="12" cy="7.25" r=".7" fill="currentColor" stroke="none" />
  </svg>
);

const BookIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h11.75v15H7.5a2.75 2.75 0 0 0-2.75 2.75V5.75Zm0 0A2.75 2.75 0 0 0 2 8.5v9.75h5.5"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5h7M9 11h7" />
  </svg>
);

const ImportIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v11" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
  </svg>
);

const ExportIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m16 14-4-4-4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14" />
  </svg>
);

const GenerateIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h6" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 13.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 1.17-.447 2.235-1.18 3.034L12 21l-3.32-4.466A4.482 4.482 0 0 1 7.5 13.5Z"
    />
  </svg>
);

const PenIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.7 4.3 5 5L8.25 20.75H3.25v-5L14.7 4.3Zm0 0 2.75-2.75a1.768 1.768 0 0 1 2.5 2.5L17.2 6.8"
    />
  </svg>
);

const EraserIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m7 14.5 7.25-7.25a2.475 2.475 0 0 1 3.5 0l2 2a2.475 2.475 0 0 1 0 3.5L14.5 18H8.75L5 14.25a1.768 1.768 0 0 1 0-2.5l5-5"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 18H20" />
  </svg>
);

const CopyIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="9" y="9" width="10" height="10" rx="2" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
    />
  </svg>
);

const ImageIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="8.25" cy="10" r="1.6" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m5.5 16 4.25-4.5L13 14l2.25-2.25L18.5 16"
    />
  </svg>
);

const TypeIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14M12 6v12M8 18h8" />
  </svg>
);

const AutoIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 2 6 13h4l-1.5 9L18 11h-4.25L13.5 2Z"
    />
  </svg>
);

const LogoutIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25 20 12l-4.25 3.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h11" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 4.75H7A2.25 2.25 0 0 0 4.75 7v10A2.25 2.25 0 0 0 7 19.25h3.5"
    />
  </svg>
);

const UserIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="8.25" r="3.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 19a6.5 6.5 0 0 1 13 0" />
  </svg>
);

type Props = {
  contributions: OneDay[];
  className?: string;
  githubUser?: main.GithubUserProfile | null;
  isGitInstalled: boolean | null;
  onOpenGitSettings: () => void;
  onOpenLogin: () => void;
  onLogout: () => void | Promise<void>;
} & React.HTMLAttributes<HTMLDivElement>;

const penIntensityColors: Record<PenIntensity, string> = {
  1: '#b9edc1',
  3: '#79d792',
  6: '#4db66c',
  9: '#2f8048',
};

function ContributionCalendar({
  contributions: originalContributions,
  className,
  githubUser,
  isGitInstalled,
  onOpenGitSettings,
  onOpenLogin,
  onLogout,
  ...rest
}: Props) {
  const { style: externalStyle, ...divProps } = rest;
  const { language, setLanguage, t, dictionary } = useTranslations();
  const {
    MIN_YEAR,
    currentYear,
    year,
    setYear,
    filteredContributions,
    userContributions,
    total,
    drawMode,
    setDrawMode,
    penIntensity,
    setPenIntensity,
    penMode,
    setPenMode,
    copyMode,
    toggleCopyMode,
    previewMode,
    previewCharacter,
    previewDates,
    startCharacterPreview,
    cancelCharacterPreview,
    applyCharacterPreview,
    selectionDates,
    pastePreviewActive,
    pastePreviewDates,
    previewImageGrid,
    cancelPastePreview,
    applyPaste,
    getTooltip,
    isFutureDate,
    handleTileMouseDown,
    handleTileMouseEnter,
    handleTileMouseUp,
    reset,
    fillAllGreen,
    exportContributions,
    importContributions,
    openRemoteModal,
    closeRemoteModal,
    submitRemoteModal,
    isRemoteModalOpen,
    remoteRepoDefaultName,
    isGeneratingRepo,
    toast,
  } = useContributionEditor({
    contributions: originalContributions,
    githubUser,
  });

  const [isImageImportOpen, setIsImageImportOpen] = React.useState(false);
  const [isCharacterSelectorOpen, setIsCharacterSelectorOpen] = React.useState(false);

  const displayName = githubUser?.name?.trim() || githubUser?.login || 'GreenWall';
  const languageOptions = [
    { value: 'en' as const, label: t('languageSwitcher.english') },
    { value: 'zh' as const, label: t('languageSwitcher.chinese') },
  ];

  const openExternalUrl = React.useCallback(async (url: string) => {
    try {
      const { BrowserOpenURL } = await import('../../wailsjs/runtime/runtime');
      if (typeof BrowserOpenURL === 'function') {
        BrowserOpenURL(url);
        return;
      }
    } catch (error) {
      console.warn('BrowserOpenURL not available (dev mode)', error);
    }

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const openRepository = React.useCallback(() => {
    openExternalUrl('https://github.com/zmrlft/GreenWall');
  }, [openExternalUrl]);

  const openDocumentation = React.useCallback(() => {
    const url =
      language === 'zh'
        ? 'https://github.com/zmrlft/GreenWall/blob/main/README_zh.md'
        : 'https://github.com/zmrlft/GreenWall/blob/main/README.md';
    openExternalUrl(url);
  }, [language, openExternalUrl]);

  const handleCharacterButtonClick = React.useCallback(() => {
    if (previewMode) {
      cancelCharacterPreview();
      return;
    }
    setIsCharacterSelectorOpen(true);
  }, [cancelCharacterPreview, previewMode]);

  const handleImagePreview = React.useCallback(
    (grid: { width: number; height: number; data: number[][] }) => {
      previewImageGrid(grid);
      setIsImageImportOpen(false);
    },
    [previewImageGrid]
  );

  const calendarMeta = React.useMemo(() => {
    if (filteredContributions.length === 0) {
      return {
        renderedMonths: [] as React.ReactElement[],
        startRow: 0,
      };
    }

    const firstDate = parseIsoDate(filteredContributions[0].date);
    const startRow = firstDate.getDay();
    const months: (React.ReactElement | undefined)[] = [];
    let latestMonth = -1;

    filteredContributions.forEach((entry, index) => {
      const date = parseIsoDate(entry.date);
      const month = date.getMonth();
      if (date.getDay() === 0 && month !== latestMonth) {
        const gridColumn = 2 + Math.floor((index + startRow) / 7);
        latestMonth = month;
        months.push(
          <span className={styles.month} key={entry.date} style={{ gridColumn }}>
            {dictionary.months[month]}
          </span>
        );
      }
    });

    const firstMonth = months[0];
    if (firstMonth && dictionary.months[firstDate.getMonth()] === firstMonth.props.children) {
      months[0] = React.cloneElement(firstMonth, {
        style: { ...(firstMonth.props.style || {}), gridColumn: 2 },
      });
    }

    if (months.length > 1 && months[0] && months[1]) {
      const firstColumn = months[0]?.props?.style?.gridColumn as number | undefined;
      const secondColumn = months[1]?.props?.style?.gridColumn as number | undefined;
      if (
        typeof firstColumn === 'number' &&
        typeof secondColumn === 'number' &&
        secondColumn - firstColumn < 3
      ) {
        months[0] = undefined;
      }
    }

    const lastMonth = months.at(-1);
    if (
      lastMonth &&
      typeof lastMonth.props?.style?.gridColumn === 'number' &&
      lastMonth.props.style.gridColumn > 53
    ) {
      months[months.length - 1] = undefined;
    }

    return {
      renderedMonths: months.filter(Boolean) as React.ReactElement[],
      startRow,
    };
  }, [dictionary.months, filteredContributions]);

  const tiles = filteredContributions.map((entry, index) => {
    const isCharacterPreviewDate = previewMode && previewDates.has(entry.date);
    const isPastePreviewDate = pastePreviewActive && pastePreviewDates.has(entry.date);
    const isPreviewDate = isCharacterPreviewDate || isPastePreviewDate;
    const isSelectionDate = selectionDates.has(entry.date);
    const future = isFutureDate(entry.date);
    const userContribution = userContributions.get(entry.date) || 0;
    const displayCount = userContribution > 0 ? userContribution : entry.count;
    const displayLevel = isPreviewDate
      ? 4
      : userContribution > 0
        ? calculateLevel(userContribution)
        : entry.level;

    return (
      <i
        className={clsx(
          styles.tile,
          isPreviewDate && styles.preview,
          isSelectionDate && styles.selection
        )}
        key={`${entry.date}-${index}`}
        data-level={displayLevel}
        data-future={future ? 'true' : undefined}
        title={
          isPreviewDate
            ? t('characterSelector.previewTooltip', { char: previewCharacter })
            : getTooltip({ date: entry.date, count: displayCount, level: displayLevel })
        }
        onMouseDown={(event) => {
          if (previewMode) {
            if (event.button === 0) {
              applyCharacterPreview();
            } else if (event.button === 2) {
              event.preventDefault();
              cancelCharacterPreview();
            }
            return;
          }

          if (pastePreviewActive) {
            if (event.button === 0) {
              applyPaste(entry.date);
            } else if (event.button === 2) {
              event.preventDefault();
              cancelPastePreview();
            }
            return;
          }

          handleTileMouseDown(entry.date, event);
        }}
        onMouseEnter={() => handleTileMouseEnter(entry.date)}
        onMouseUp={handleTileMouseUp}
        onContextMenu={(event) => event.preventDefault()}
        style={{
          cursor: future
            ? 'not-allowed'
            : isPreviewDate
              ? 'pointer'
              : drawMode === 'pen'
                ? 'crosshair'
                : 'grab',
        }}
      />
    );
  });

  if (tiles.length > 0) {
    const firstTile = tiles[0];
    tiles[0] = React.cloneElement(firstTile, {
      style: { ...(firstTile.props.style || {}), gridRow: calendarMeta.startRow + 1 },
    });
  }

  const stageStatus = previewMode
    ? t('characterSelector.previewTooltip', { char: previewCharacter })
    : pastePreviewActive
      ? t('imageImport.previewOnCalendarHint')
      : copyMode
        ? t('titles.copyMode')
        : drawMode === 'eraser'
          ? t('titles.eraser')
          : penMode === 'auto'
            ? t('penModes.auto')
            : t('titles.penIntensity', { intensity: penIntensity });

  const gitBadgeState =
    isGitInstalled === false ? 'is-warning' : isGitInstalled === true ? 'is-ready' : '';

  return (
    <div
      {...divProps}
      className={clsx('workspace', className)}
      style={externalStyle}
      onMouseUp={handleTileMouseUp}
    >
      <aside className="workspace__sidebar">
        <div className="workspace__nav">
          <button
            type="button"
            className="workspace__icon-button"
            onClick={openDocumentation}
            aria-label="Open documentation"
            title="Open documentation"
          >
            <InfoIcon className="workspace__icon" />
          </button>
          <button
            type="button"
            className="workspace__icon-button"
            onClick={openRepository}
            aria-label="Open repository"
            title="Open repository"
          >
            <BookIcon className="workspace__icon" />
          </button>
        </div>

        <div className="workspace__sidebar-spacer" />

        <div className="workspace__profile">
          {githubUser ? (
            <>
              {githubUser.avatarUrl ? (
                <img
                  src={githubUser.avatarUrl}
                  alt={displayName}
                  className="workspace__avatar"
                  referrerPolicy="no-referrer"
                  title={displayName}
                />
              ) : (
                <div className="workspace__avatar workspace__avatar--fallback" title={displayName}>
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                className="workspace__icon-button workspace__icon-button--ghost"
                onClick={() => {
                  void onLogout();
                }}
                aria-label="Log out"
                title="Log out"
              >
                <LogoutIcon className="workspace__icon workspace__icon--small" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="workspace__avatar workspace__avatar--login"
              onClick={onOpenLogin}
              aria-label={t('loginModal.title')}
              title={t('loginModal.title')}
            >
              <UserIcon className="workspace__icon" />
            </button>
          )}
        </div>
      </aside>

      <main className="workspace__main">
        <header className="workspace__topbar">
          <div className="workspace__toolbar-group">
            <div className="workspace__language" role="group" aria-label={t('labels.language')}>
              {languageOptions.map((option) => {
                const isActive = option.value === language;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={clsx('workspace__language-button', isActive && 'is-active')}
                    aria-pressed={isActive}
                    onClick={() => setLanguage(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={clsx('workspace__git-badge', gitBadgeState)}
              onClick={onOpenGitSettings}
              title={t('gitPathSettings.title')}
            >
              <span className="workspace__git-dot" />
              <span>Git</span>
            </button>
          </div>

          <div className="workspace__brand">GreenWall</div>

          <div className="workspace__toolbar-group workspace__toolbar-group--end">
            <button type="button" className="workspace__command" onClick={importContributions}>
              <ImportIcon className="workspace__command-icon" />
              <span>{t('buttons.import')}</span>
            </button>
            <button type="button" className="workspace__command" onClick={exportContributions}>
              <ExportIcon className="workspace__command-icon" />
              <span>{t('buttons.export')}</span>
            </button>
            <button
              type="button"
              className="workspace__command workspace__command--primary"
              onClick={openRemoteModal}
              disabled={isGeneratingRepo}
            >
              <GenerateIcon className="workspace__command-icon" />
              <span>{isGeneratingRepo ? t('buttons.generating') : t('buttons.generateRepo')}</span>
            </button>
          </div>
        </header>

        <div className="workspace__content">
          <section className="workspace__stage">
            <div className="workspace__stage-card">
              <div className="workspace__stage-meta">
                <span className="workspace__stage-status" title={stageStatus}>
                  {stageStatus}
                </span>
                <span className="workspace__stage-total">
                  {t('calendar.totalContributions', { count: total, year })}
                </span>
              </div>

              <div className="workspace__calendar-frame">
                <div className="workspace__calendar-scroll">
                  <div className={styles.container}>
                    {calendarMeta.renderedMonths}
                    <span className={styles.week} data-week-label="true">
                      {dictionary.weekdays.mon}
                    </span>
                    <span className={styles.week} data-week-label="true">
                      {dictionary.weekdays.wed}
                    </span>
                    <span className={styles.week} data-week-label="true">
                      {dictionary.weekdays.fri}
                    </span>

                    <div className={styles.tiles}>{tiles}</div>
                  </div>
                </div>
              </div>

              <div className="workspace__year-switcher">
                <span className="workspace__year-label">{t('labels.year')}:</span>
                <div className="workspace__year-control">
                  <button
                    type="button"
                    className="workspace__year-button"
                    onClick={() => setYear(year - 1)}
                    disabled={year <= MIN_YEAR}
                    aria-label="Previous year"
                  >
                    ‹
                  </button>
                  <span className="workspace__year-value">{year}</span>
                  <button
                    type="button"
                    className="workspace__year-button"
                    onClick={() => setYear(year + 1)}
                    disabled={year >= currentYear}
                    aria-label="Next year"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="workspace__dock">
            <button
              type="button"
              className={clsx('workspace__dock-button', drawMode === 'pen' && 'is-active')}
              onClick={() => setDrawMode('pen')}
              title={t('titles.pen')}
            >
              <PenIcon className="workspace__dock-icon" />
              <span>{t('drawModes.pen')}</span>
            </button>
            <button
              type="button"
              className={clsx('workspace__dock-button', drawMode === 'eraser' && 'is-active')}
              onClick={() => setDrawMode('eraser')}
              title={t('titles.eraser')}
            >
              <EraserIcon className="workspace__dock-icon" />
              <span>{t('drawModes.eraser')}</span>
            </button>
            <button
              type="button"
              className={clsx('workspace__dock-button', copyMode && 'is-active')}
              onClick={toggleCopyMode}
              title={t('titles.copyMode')}
            >
              <CopyIcon className="workspace__dock-icon" />
              <span>{t('buttons.copyMode')}</span>
            </button>
            <button
              type="button"
              className={clsx('workspace__dock-button', previewMode && 'is-active')}
              onClick={handleCharacterButtonClick}
              title={
                previewMode
                  ? t('characterSelector.cancelPreview')
                  : t('characterSelector.character')
              }
            >
              <TypeIcon className="workspace__dock-icon" />
              <span>
                {previewMode
                  ? t('characterSelector.cancelPreview')
                  : t('characterSelector.character')}
              </span>
            </button>
            <button
              type="button"
              className={clsx('workspace__dock-button', pastePreviewActive && 'is-active')}
              onClick={() => setIsImageImportOpen(true)}
              title={t('imageImport.title')}
            >
              <ImageIcon className="workspace__dock-icon" />
              <span>{t('imageImport.title')}</span>
            </button>

            <div className="workspace__dock-divider" />

            <div className="workspace__swatches">
              <button
                type="button"
                className={clsx(
                  'workspace__swatch workspace__swatch--auto',
                  penMode === 'auto' && drawMode === 'pen' && 'is-active'
                )}
                onClick={() => {
                  setDrawMode('pen');
                  setPenMode('auto');
                }}
                title={t('penModes.auto')}
              >
                <AutoIcon className="workspace__dock-icon" />
              </button>
              {(Object.keys(penIntensityColors) as Array<`${PenIntensity}`>).map((key) => {
                const value = Number(key) as PenIntensity;
                const isActive =
                  drawMode === 'pen' && penMode === 'manual' && penIntensity === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={clsx('workspace__swatch', isActive && 'is-active')}
                    style={{ backgroundColor: penIntensityColors[value] }}
                    onClick={() => {
                      setDrawMode('pen');
                      setPenMode('manual');
                      setPenIntensity(value);
                    }}
                    title={t('titles.penIntensity', { intensity: value })}
                  >
                    <span className="sr-only">
                      {t('titles.penIntensity', { intensity: value })}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="workspace__dock-divider" />

            <button type="button" className="workspace__dock-button" onClick={fillAllGreen}>
              <span>{t('buttons.allGreen')}</span>
            </button>
            <button type="button" className="workspace__dock-button" onClick={reset}>
              <span>{t('buttons.reset')}</span>
            </button>
          </div>
        </div>
      </main>

      {toast && <div className="workspace__toast">{toast}</div>}

      {isCharacterSelectorOpen && (
        <CharacterSelector
          onSelect={(char) => {
            startCharacterPreview(char);
            setIsCharacterSelectorOpen(false);
          }}
          onClose={() => setIsCharacterSelectorOpen(false)}
        />
      )}

      {isImageImportOpen && (
        <div className="modal__backdrop" role="presentation">
          <div className="workspace__tool-modal" role="dialog" aria-modal="true">
            <div className="workspace__tool-modal-header">
              <div>
                <h2>{t('imageImport.title')}</h2>
                <p>{t('imageImport.previewOnCalendarHint')}</p>
              </div>
              <button
                type="button"
                className="workspace__tool-modal-close"
                onClick={() => setIsImageImportOpen(false)}
                aria-label={t('gitInstall.close')}
              >
                ×
              </button>
            </div>
            <div className="workspace__tool-modal-body">
              <ImageImportCard onPreview={handleImagePreview} className="workspace__image-card" />
            </div>
          </div>
        </div>
      )}

      {isRemoteModalOpen && (
        <RemoteRepoModal
          open={isRemoteModalOpen}
          defaultName={remoteRepoDefaultName}
          defaultDescription=""
          defaultPrivate
          isSubmitting={isGeneratingRepo}
          onClose={closeRemoteModal}
          onSubmit={submitRemoteModal}
        />
      )}
    </div>
  );
}

export type { OneDay };
export default React.memo(ContributionCalendar);

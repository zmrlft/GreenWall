import React from 'react';
import { ExportContributions, GenerateRepo, ImportContributions } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import type { RemoteRepoPayload } from '../components/RemoteRepoModal';
import { getPatternById, gridToBoolean } from '../data/characterPatterns';
import { useTranslations } from '../i18n';
import { formatIsoDate, getYearFromIsoDate, parseIsoDate } from '../utils/date';
import { useContributionHistory } from './useContributionHistory';

export type OneDay = { level: number; count: number; date: string };
export type DrawMode = 'pen' | 'eraser';
export type PenIntensity = 1 | 3 | 6 | 9;
export type ContributionBuffer = {
  width: number;
  height: number;
  data: number[][];
};

const MIN_YEAR = 2008;

function getNextContribution(current: number): number {
  if (current < 1) return 1;
  if (current < 3) return 3;
  if (current < 6) return 6;
  if (current < 9) return 9;
  return current;
}

function characterToPattern(char: string): boolean[][] {
  const pattern = getPatternById(char);
  if (pattern) {
    return gridToBoolean(pattern.grid);
  }

  return Array(7)
    .fill(null)
    .map(() => Array(5).fill(false));
}

type UseContributionEditorOptions = {
  contributions: OneDay[];
  githubUser?: main.GithubUserProfile | null;
};

export function useContributionEditor({
  contributions: originalContributions,
  githubUser,
}: UseContributionEditorOptions) {
  const { t } = useTranslations();
  const { userContributions, setUserContributions, pushSnapshot, undo, redo } =
    useContributionHistory(new Map());

  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const [year, setYearState] = React.useState<number>(currentYear);
  const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
  const [penIntensity, setPenIntensity] = React.useState<PenIntensity>(1);
  const [penMode, setPenMode] = React.useState<'manual' | 'auto'>('auto');
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
  const [isGeneratingRepo, setIsGeneratingRepo] = React.useState(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [previewCharacter, setPreviewCharacter] = React.useState('');
  const [previewDates, setPreviewDates] = React.useState<Set<string>>(new Set());
  const [copyMode, setCopyMode] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<string | null>(null);
  const [selectionDates, setSelectionDates] = React.useState<Set<string>>(new Set());
  const [selectionBuffer, setSelectionBuffer] = React.useState<ContributionBuffer | null>(null);
  const [pastePreviewActive, setPastePreviewActive] = React.useState(false);
  const [pastePreviewDates, setPastePreviewDates] = React.useState<Set<string>>(new Set());
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);

  const setYear = React.useCallback(
    (nextYear: number) => {
      const clampedYear = Math.min(Math.max(nextYear, MIN_YEAR), currentYear);
      setYearState(clampedYear);
    },
    [currentYear]
  );

  const filteredContributions = React.useMemo(
    () => originalContributions.filter((entry) => getYearFromIsoDate(entry.date) === year),
    [originalContributions, year]
  );

  const tomorrowTime = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return tomorrowStart.getTime();
  }, []);

  const isCurrentYear = year === currentYear;

  const isFutureDate = React.useCallback(
    (dateStr: string) => {
      if (!isCurrentYear) {
        return false;
      }

      return parseIsoDate(dateStr).getTime() >= tomorrowTime;
    },
    [isCurrentYear, tomorrowTime]
  );

  const showToast = React.useCallback((message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionDates(new Set());
  }, []);

  const cancelPastePreview = React.useCallback(() => {
    setPastePreviewActive(false);
    setPastePreviewDates(new Set());
  }, []);

  const cancelCharacterPreview = React.useCallback(() => {
    setPreviewMode(false);
    setPreviewCharacter('');
    setPreviewDates(new Set());
  }, []);

  const getDateCoord = React.useCallback(
    (dateStr: string) => {
      const date = parseIsoDate(dateStr);
      const yearStart = new Date(year, 0, 1);
      const firstDayOfWeek = yearStart.getDay();
      const daysSinceYearStart = Math.floor(
        (date.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        row: date.getDay(),
        col: Math.floor((daysSinceYearStart + firstDayOfWeek) / 7),
      };
    },
    [year]
  );

  const computeSelectionDates = React.useCallback(
    (startDate: string, endDate: string) => {
      const a = getDateCoord(startDate);
      const b = getDateCoord(endDate);
      const minRow = Math.min(a.row, b.row);
      const maxRow = Math.max(a.row, b.row);
      const minCol = Math.min(a.col, b.col);
      const maxCol = Math.max(a.col, b.col);
      const set = new Set<string>();

      for (const entry of filteredContributions) {
        const coord = getDateCoord(entry.date);
        if (
          coord.row >= minRow &&
          coord.row <= maxRow &&
          coord.col >= minCol &&
          coord.col <= maxCol
        ) {
          set.add(entry.date);
        }
      }

      return { set, minRow, minCol, maxRow, maxCol };
    },
    [filteredContributions, getDateCoord]
  );

  const calculatePreviewDates = React.useCallback(
    (char: string, centerDateStr: string | null) => {
      if (!char || !centerDateStr || filteredContributions.length === 0) {
        return new Set<string>();
      }

      const pattern = characterToPattern(char);
      const previewSet = new Set<string>();
      const centerContribution = filteredContributions.find(
        (entry) => entry.date === centerDateStr
      );
      if (!centerContribution) {
        return new Set<string>();
      }

      const centerDate = parseIsoDate(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const firstDayOfWeek = yearStart.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDate.getDay();
      const patternHeight = pattern.length;
      const patternWidth = pattern[0]?.length ?? 0;
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);

      for (let patternY = 0; patternY < patternHeight; patternY++) {
        for (let patternX = 0; patternX < patternWidth; patternX++) {
          if (!pattern[patternY][patternX]) {
            continue;
          }

          const offsetY = patternY - patternCenterY;
          const offsetX = patternX - patternCenterX;
          const targetRow = centerRow + offsetY;
          const targetCol = centerWeek + offsetX;

          if (targetRow < 0 || targetRow >= 7 || targetCol < 0) {
            continue;
          }

          const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
          const targetDate = new Date(centerDate);
          targetDate.setDate(targetDate.getDate() + daysOffset);
          const dateStr = formatIsoDate(targetDate);
          const contribution = filteredContributions.find((entry) => entry.date === dateStr);

          if (contribution && !isFutureDate(dateStr)) {
            previewSet.add(dateStr);
          }
        }
      }

      return previewSet;
    },
    [filteredContributions, isFutureDate, year]
  );

  const buildBufferFromSelection = React.useCallback(
    (startDate: string, endDate: string) => {
      const { set } = computeSelectionDates(startDate, endDate);
      const coloredCells: { row: number; col: number; value: number }[] = [];

      for (const dateStr of set) {
        const coord = getDateCoord(dateStr);
        const current =
          userContributions.get(dateStr) ??
          filteredContributions.find((entry) => entry.date === dateStr)?.count ??
          0;

        if (current > 0) {
          coloredCells.push({ row: coord.row, col: coord.col, value: current });
        }
      }

      if (coloredCells.length === 0) {
        return { width: 0, height: 0, data: [] };
      }

      const minRow = Math.min(...coloredCells.map((cell) => cell.row));
      const maxRow = Math.max(...coloredCells.map((cell) => cell.row));
      const minCol = Math.min(...coloredCells.map((cell) => cell.col));
      const maxCol = Math.max(...coloredCells.map((cell) => cell.col));
      const width = maxCol - minCol + 1;
      const height = maxRow - minRow + 1;
      const data: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

      for (const cell of coloredCells) {
        data[cell.row - minRow][cell.col - minCol] = cell.value;
      }

      return { width, height, data };
    },
    [computeSelectionDates, filteredContributions, getDateCoord, userContributions]
  );

  const calculateBufferPreviewDates = React.useCallback(
    (buffer: ContributionBuffer, centerDateStr: string) => {
      const previewSet = new Set<string>();
      const patternHeight = buffer.height;
      const patternWidth = buffer.width;
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);
      const centerDate = parseIsoDate(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const firstDayOfWeek = yearStart.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDate.getDay();

      for (let py = 0; py < patternHeight; py++) {
        for (let px = 0; px < patternWidth; px++) {
          const value = buffer.data[py][px];
          if (!value) {
            continue;
          }

          const offsetY = py - patternCenterY;
          const offsetX = px - patternCenterX;
          const targetRow = centerRow + offsetY;
          const targetCol = centerWeek + offsetX;

          if (targetRow < 0 || targetRow >= 7 || targetCol < 0) {
            continue;
          }

          const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
          const targetDate = new Date(centerDate);
          targetDate.setDate(targetDate.getDate() + daysOffset);
          const dateStr = formatIsoDate(targetDate);
          const contribution = filteredContributions.find((entry) => entry.date === dateStr);

          if (contribution && !isFutureDate(dateStr)) {
            previewSet.add(dateStr);
          }
        }
      }

      return previewSet;
    },
    [filteredContributions, isFutureDate, year]
  );

  const applyPaste = React.useCallback(
    (centerDateStr: string) => {
      if (!selectionBuffer || !centerDateStr) {
        return;
      }

      const patternHeight = selectionBuffer.height;
      const patternWidth = selectionBuffer.width;
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);
      const centerDate = parseIsoDate(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const firstDayOfWeek = yearStart.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDate.getDay();

      pushSnapshot();
      setUserContributions((previous) => {
        const nextMap = new Map(previous);
        for (let py = 0; py < patternHeight; py++) {
          for (let px = 0; px < patternWidth; px++) {
            const value = selectionBuffer.data[py][px];
            if (!value) {
              continue;
            }

            const offsetY = py - patternCenterY;
            const offsetX = px - patternCenterX;
            const targetRow = centerRow + offsetY;
            const targetCol = centerWeek + offsetX;

            if (targetRow < 0 || targetRow >= 7 || targetCol < 0) {
              continue;
            }

            const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
            const targetDate = new Date(centerDate);
            targetDate.setDate(targetDate.getDate() + daysOffset);
            const dateStr = formatIsoDate(targetDate);

            if (!isFutureDate(dateStr)) {
              nextMap.set(dateStr, value);
            }
          }
        }
        return nextMap;
      });

      cancelPastePreview();
    },
    [cancelPastePreview, isFutureDate, pushSnapshot, selectionBuffer, setUserContributions, year]
  );

  const startCharacterPreview = React.useCallback(
    (char: string) => {
      setPreviewCharacter(char);
      setPreviewDates(new Set());
      setPreviewMode(true);
      cancelPastePreview();
      clearSelection();
      setCopyMode(false);
    },
    [cancelPastePreview, clearSelection]
  );

  const applyCharacterPreview = React.useCallback(() => {
    if (!previewMode || previewDates.size === 0) {
      return;
    }

    pushSnapshot();
    setUserContributions((previous) => {
      const nextMap = new Map(previous);
      for (const dateStr of previewDates) {
        const current = previous.get(dateStr) ?? 0;
        nextMap.set(dateStr, penMode === 'auto' ? getNextContribution(current) : penIntensity);
      }
      return nextMap;
    });

    cancelCharacterPreview();
  }, [
    cancelCharacterPreview,
    penIntensity,
    penMode,
    previewDates,
    previewMode,
    pushSnapshot,
    setUserContributions,
  ]);

  const previewImageGrid = React.useCallback(
    (grid: ContributionBuffer) => {
      setSelectionBuffer(grid);
      setPastePreviewActive(true);
      setPastePreviewDates(new Set());
      clearSelection();
      cancelCharacterPreview();
      setCopyMode(false);
    },
    [cancelCharacterPreview, clearSelection]
  );

  const reset = React.useCallback(() => {
    pushSnapshot();
    setUserContributions(new Map());
  }, [pushSnapshot, setUserContributions]);

  const fillAllGreen = React.useCallback(() => {
    pushSnapshot();
    setUserContributions((previous) => {
      const nextMap = new Map(previous);
      for (const entry of filteredContributions) {
        if (!isFutureDate(entry.date)) {
          nextMap.set(entry.date, 9);
        }
      }
      return nextMap;
    });
  }, [filteredContributions, isFutureDate, pushSnapshot, setUserContributions]);

  const exportContributions = React.useCallback(async () => {
    const contributionsToExport = filteredContributions
      .map((entry) => {
        const override = userContributions.get(entry.date);
        return {
          date: entry.date,
          count: override !== undefined ? override : entry.count,
        };
      })
      .filter((entry) => entry.count > 0);

    try {
      const payload = main.ExportContributionsRequest.createFrom({
        contributions: contributionsToExport,
      });
      const result = await ExportContributions(payload);
      window.alert(t('messages.exportSuccess', { filePath: result.filePath }));
    } catch (error) {
      console.error('Failed to export contributions', error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('messages.exportError', { message }));
    }
  }, [filteredContributions, t, userContributions]);

  const importContributions = React.useCallback(async () => {
    try {
      const result = await ImportContributions();
      const importedMap = new Map<string, number>();
      result.contributions.forEach((entry) => {
        importedMap.set(entry.date, entry.count);
      });
      pushSnapshot();
      setUserContributions(importedMap);
      window.alert(t('messages.importSuccess'));
    } catch (error) {
      console.error('Failed to import contributions', error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('messages.importError', { message }));
    }
  }, [pushSnapshot, setUserContributions, t]);

  const runGenerateRepo = React.useCallback(
    async (remoteRepoOptions: RemoteRepoPayload) => {
      const githubLogin = githubUser?.login?.trim() ?? '';
      const githubEmail =
        githubUser?.email?.trim() || (githubLogin ? `${githubLogin}@users.noreply.github.com` : '');

      if (!githubLogin || !githubEmail) {
        window.alert(t('messages.remoteLoginRequired'));
        return;
      }

      const contributionsForBackend = filteredContributions
        .map((entry) => {
          const override = userContributions.get(entry.date);
          return {
            date: entry.date,
            count: override !== undefined ? override : entry.count,
          };
        })
        .filter((entry) => entry.count > 0);

      if (contributionsForBackend.length === 0) {
        window.alert(t('messages.noContributions'));
        return;
      }

      setIsGeneratingRepo(true);
      try {
        const payload = main.GenerateRepoRequest.createFrom({
          year,
          githubUsername: githubLogin,
          githubEmail,
          repoName: remoteRepoOptions.name.trim(),
          contributions: contributionsForBackend,
          remoteRepo: {
            enabled: true,
            name: remoteRepoOptions.name.trim(),
            private: remoteRepoOptions.isPrivate,
            description: remoteRepoOptions.description.trim(),
          },
        });
        const result = await GenerateRepo(payload);
        const baseMessage = `Repository created at ${result.repoPath} with ${result.commitCount} commits.`;
        const fullMessage =
          result.remoteUrl && result.remoteUrl !== ''
            ? `${baseMessage}\nRemote repository: ${result.remoteUrl}`
            : baseMessage;
        window.alert(fullMessage);
      } catch (error) {
        console.error('Failed to generate repository', error);
        const message = error instanceof Error ? error.message : String(error);
        window.alert(t('messages.generateRepoError', { message }));
      } finally {
        setIsGeneratingRepo(false);
      }
    },
    [filteredContributions, githubUser, t, userContributions, year]
  );

  const openRemoteModal = React.useCallback(() => {
    if (!githubUser?.login) {
      window.alert(t('messages.remoteLoginRequired'));
      return;
    }
    setIsRemoteModalOpen(true);
  }, [githubUser, t]);

  const closeRemoteModal = React.useCallback(() => {
    setIsRemoteModalOpen(false);
  }, []);

  const submitRemoteModal = React.useCallback(
    (payload: RemoteRepoPayload) => {
      setIsRemoteModalOpen(false);
      runGenerateRepo(payload);
    },
    [runGenerateRepo]
  );

  const total = React.useMemo(
    () =>
      filteredContributions.reduce((sum, entry) => {
        const userContribution = userContributions.get(entry.date) || 0;
        const displayCount = userContribution > 0 ? userContribution : entry.count;
        return sum + displayCount;
      }, 0),
    [filteredContributions, userContributions]
  );

  const remoteRepoDefaultName = React.useMemo(
    () => (githubUser?.login?.trim() ? `${githubUser.login.trim()}-${year}` : `green-wall-${year}`),
    [githubUser, year]
  );

  const getTooltip = React.useCallback(
    (oneDay: OneDay) => {
      const isoDate = oneDay.date;
      if (isFutureDate(oneDay.date)) {
        return t('calendar.tooltipFuture', { date: isoDate });
      }
      if (oneDay.count === 0) {
        return t('calendar.tooltipNone', { date: isoDate });
      }
      return t('calendar.tooltipSome', { count: oneDay.count, date: isoDate });
    },
    [isFutureDate, t]
  );

  const applyDrawAction = React.useCallback(
    (dateStr: string, mode: DrawMode) => {
      if (isFutureDate(dateStr)) {
        return;
      }

      if (mode === 'pen') {
        setUserContributions((previous) => {
          const nextMap = new Map(previous);
          if (penMode === 'auto') {
            nextMap.set(dateStr, getNextContribution(previous.get(dateStr) ?? 0));
          } else {
            nextMap.set(dateStr, penIntensity);
          }
          return nextMap;
        });
        return;
      }

      setUserContributions((previous) => {
        const nextMap = new Map(previous);
        nextMap.delete(dateStr);
        return nextMap;
      });
    },
    [isFutureDate, penIntensity, penMode, setUserContributions]
  );

  const handleTileMouseDown = React.useCallback(
    (dateStr: string, event: React.MouseEvent) => {
      if (isFutureDate(dateStr)) {
        return;
      }

      if (copyMode) {
        if (event.button === 2) {
          event.preventDefault();
          clearSelection();
          cancelPastePreview();
          return;
        }

        setSelectionStart(dateStr);
        setSelectionEnd(dateStr);
        setSelectionDates(computeSelectionDates(dateStr, dateStr).set);
        setLastHoveredDate(dateStr);
        return;
      }

      if (event.button === 2) {
        event.preventDefault();
        setDrawMode((previous) => (previous === 'pen' ? 'eraser' : 'pen'));
        return;
      }

      pushSnapshot();
      setIsDrawing(true);
      setLastHoveredDate(dateStr);
      applyDrawAction(dateStr, drawMode);
    },
    [
      applyDrawAction,
      cancelPastePreview,
      clearSelection,
      computeSelectionDates,
      copyMode,
      drawMode,
      isFutureDate,
      pushSnapshot,
    ]
  );

  const handleTileMouseEnter = React.useCallback(
    (dateStr: string) => {
      if (isFutureDate(dateStr)) {
        return;
      }

      if (previewMode && previewCharacter) {
        setPreviewDates(calculatePreviewDates(previewCharacter, dateStr));
        return;
      }

      if (pastePreviewActive && selectionBuffer) {
        setLastHoveredDate(dateStr);
        setPastePreviewDates(calculateBufferPreviewDates(selectionBuffer, dateStr));
        return;
      }

      if (copyMode && selectionStart) {
        if (dateStr !== selectionEnd) {
          setSelectionEnd(dateStr);
          setSelectionDates(computeSelectionDates(selectionStart, dateStr).set);
        }
        return;
      }

      if (isDrawing && dateStr !== lastHoveredDate) {
        setLastHoveredDate(dateStr);
        applyDrawAction(dateStr, drawMode);
      }
    },
    [
      applyDrawAction,
      calculateBufferPreviewDates,
      calculatePreviewDates,
      computeSelectionDates,
      copyMode,
      drawMode,
      isDrawing,
      isFutureDate,
      lastHoveredDate,
      pastePreviewActive,
      previewCharacter,
      previewMode,
      selectionBuffer,
      selectionEnd,
      selectionStart,
    ]
  );

  const handleTileMouseUp = React.useCallback(() => {
    setIsDrawing(false);
    setLastHoveredDate(null);
  }, []);

  const toggleCopyMode = React.useCallback(() => {
    setCopyMode((previous) => {
      const next = !previous;
      if (!next) {
        clearSelection();
      }
      return next;
    });
  }, [clearSelection]);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleTileMouseUp();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleTileMouseUp]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier && event.key === 'x' && copyMode && selectionStart && selectionEnd) {
        event.preventDefault();
        const buffer = buildBufferFromSelection(selectionStart, selectionEnd);
        const coloredCount = buffer.data.flat().filter((value) => value > 0).length;

        if (coloredCount === 0) {
          showToast(t('messages.noColoredCells'));
          return;
        }

        setSelectionBuffer(buffer);
        pushSnapshot();
        setUserContributions((previous) => {
          const nextMap = new Map(previous);
          const { set } = computeSelectionDates(selectionStart, selectionEnd);
          for (const dateStr of set) {
            nextMap.delete(dateStr);
          }
          return nextMap;
        });

        showToast(t('messages.cutSuccess', { count: coloredCount }));
        setPastePreviewActive(true);
        clearSelection();
      }

      if (hasModifier && event.key === 'c' && copyMode && selectionStart && selectionEnd) {
        event.preventDefault();
        const buffer = buildBufferFromSelection(selectionStart, selectionEnd);
        const coloredCount = buffer.data.flat().filter((value) => value > 0).length;

        if (coloredCount === 0) {
          showToast(t('messages.noColoredCells'));
          return;
        }

        setSelectionBuffer(buffer);
        showToast(t('messages.copySuccess', { count: coloredCount }));
        setPastePreviewActive(true);
        clearSelection();
      }

      if (hasModifier && event.key === 'v' && selectionBuffer) {
        event.preventDefault();
        if (!pastePreviewActive) {
          setPastePreviewActive(true);
        } else if (lastHoveredDate) {
          applyPaste(lastHoveredDate);
        }
      }

      if (hasModifier && !isDrawing) {
        if (event.code === 'KeyZ') {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (event.code === 'KeyY') {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    applyPaste,
    buildBufferFromSelection,
    clearSelection,
    computeSelectionDates,
    copyMode,
    isDrawing,
    lastHoveredDate,
    pastePreviewActive,
    pushSnapshot,
    redo,
    selectionBuffer,
    selectionEnd,
    selectionStart,
    setUserContributions,
    showToast,
    t,
    undo,
  ]);

  React.useEffect(() => {
    handleTileMouseUp();
    clearSelection();
    cancelCharacterPreview();
    cancelPastePreview();
    setLastHoveredDate(null);
  }, [cancelCharacterPreview, cancelPastePreview, clearSelection, handleTileMouseUp, year]);

  return {
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
    hasSelectionBuffer: Boolean(selectionBuffer),
  };
}

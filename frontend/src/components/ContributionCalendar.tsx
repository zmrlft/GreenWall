import React from 'react';
import clsx from 'clsx';
import styles from './ContributionCalendar.module.scss';
import { CalendarControls } from './CalendarControls';
import RemoteRepoModal, { RemoteRepoPayload } from './RemoteRepoModal';
import { GenerateRepo, ExportContributions, ImportContributions } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { useTranslations } from '../i18n';
import { WindowIsMaximised, WindowIsFullscreen } from '../../wailsjs/runtime/runtime';
import { getPatternById, gridToBoolean } from '../data/characterPatterns';

// 根据贡献数量计算level
function calculateLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count >= 1 && count <= 2) return 1;
  if (count >= 3 && count <= 5) return 2;
  if (count >= 6 && count <= 8) return 3;
  if (count > 8) return 4;
  return 0;
}

// 逐步递进贡献次数 (0 → 1 → 3 → 6 → 9)
function getNextContribution(current: number): number {
  if (current < 1) return 1;
  if (current < 3) return 3;
  if (current < 6) return 6;
  if (current < 9) return 9;
  return current; // 已是最大值
}

// 将字符转换为像素图案 - 使用预定义的图案数据
function characterToPattern(char: string): boolean[][] {
  const pattern = getPatternById(char);
  if (pattern) {
    return gridToBoolean(pattern.grid);
  }

  // 如果找不到预定义图案，返回空图案
  return Array(7)
    .fill(null)
    .map(() => Array(5).fill(false));
}

export type OneDay = { level: number; count: number; date: string };

/**
 * 仿 GitHub 的贡献图，支持交互式点击和拖拽绘制贡献次数。
 *
 * 功能说明：
 * - 画笔模式：点击画笔按钮显示悬浮滑动条，选择画笔强度（1、3、6、9），点击或拖拽绘制格子
 * - 橡皮擦模式：点击或拖拽清除格子贡献
 * - 画笔强度对应不同的绿色深度：1（浅绿）、3（中绿）、6（深绿）、9（最深绿）
 * - 可以输入不同年份查看（2008年-当前年份）
 * - 清除按钮会重置所有用户设置
 * - 支持鼠标左键长按拖拽连续绘制
 *
 * 数据可以用 /script/fetch-contributions.js 抓取。
 *
 * @example
 * const data = [{ level: 1, count: 5, date: 1728272654618 }, ...];
 * <ContributionCalendar contributions={data}/>
 */
type Props = {
  contributions: OneDay[];
  className?: string;
  githubUser?: main.GithubUserProfile | null;
} & React.HTMLAttributes<HTMLDivElement>;

type DrawMode = 'pen' | 'eraser';

// 画笔强度类型：对应不同的贡献次数
type PenIntensity = 1 | 3 | 6 | 9;

type ContainerVars = React.CSSProperties & {
  '--cell'?: string;
  '--gap'?: string;
};

function ContributionCalendar({
  contributions: originalContributions,
  className,
  githubUser,
  ...rest
}: Props) {
  const { style: externalStyle, ...divProps } = rest;
  // 选中日期状态 - 改为存储每个日期的贡献次数
  const { t, dictionary } = useTranslations();
  const monthNames = dictionary.months;

  const [userContributions, setUserContributions] = React.useState<Map<string, number>>(new Map());
  const [year, setYear] = React.useState<number>(new Date().getFullYear());

  // 绘画模式状态
  const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
  const [penIntensity, setPenIntensity] = React.useState<PenIntensity>(1); // 画笔强度，默认为1
  const [penMode, setPenMode] = React.useState<'manual' | 'auto'>('auto'); // 画笔模式：manual 手动强度，auto 自动逐步递进
  const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
  const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
  const [isGeneratingRepo, setIsGeneratingRepo] = React.useState<boolean>(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = React.useState<boolean>(false);
  const [isMaximized, setIsMaximized] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerVars, setContainerVars] = React.useState<ContainerVars>({});

  // 字符预览状态
  const [previewMode, setPreviewMode] = React.useState<boolean>(false);
  const [previewCharacter, setPreviewCharacter] = React.useState<string>('');
  const [previewDates, setPreviewDates] = React.useState<Set<string>>(new Set());
  // 复制/粘贴相关状态
  const [copyMode, setCopyMode] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<string | null>(null);
  const [selectionDates, setSelectionDates] = React.useState<Set<string>>(new Set());
  const [selectionBuffer, setSelectionBuffer] = React.useState<{
    width: number;
    height: number;
    data: number[][];
  } | null>(null);
  const [pastePreviewActive, setPastePreviewActive] = React.useState<boolean>(false);
  const [pastePreviewDates, setPastePreviewDates] = React.useState<Set<string>>(new Set());
  // 简单 toast
  const [toast, setToast] = React.useState<string | null>(null);

  // 允许选择年份，过滤贡献数据
  const filteredContributions = originalContributions.filter(
    (c) => new Date(c.date).getFullYear() === year
  );

  // 计算当前日期与明天零点，用于判断未来日期
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStart = new Date(currentYear, now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowTime = tomorrowStart.getTime();
  const remoteRepoDefaultName = githubUser?.login?.trim()
    ? `${githubUser.login.trim()}-${year}`
    : `green-wall-${year}`;
  const isCurrentYear = year === currentYear;

  const isFutureDate = React.useCallback(
    (dateStr: string) => {
      if (!isCurrentYear) {
        return false;
      }
      const parsed = new Date(dateStr);
      const localDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      return localDate.getTime() >= tomorrowTime;
    },
    [isCurrentYear, tomorrowTime]
  );

  // 计算字符预览的日期列表 - 以指定日期为中心
  const calculatePreviewDates = React.useCallback(
    (char: string, centerDateStr: string | null) => {
      if (!char || !centerDateStr || filteredContributions.length === 0) {
        return new Set<string>();
      }

      const pattern = characterToPattern(char);
      const previewDatesSet = new Set<string>();

      // 找到中心日期在日历中的位置
      const centerContribution = filteredContributions.find((c) => c.date === centerDateStr);
      if (!centerContribution) return new Set<string>();

      const centerDate = new Date(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 计算中心日期的行列位置
      const firstDayOfWeek = yearStart.getDay(); // 0=周日, 1=周一, ...
      const centerDayOfWeek = centerDate.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDayOfWeek;

      // 图案尺寸
      const patternHeight = pattern.length;
      const patternWidth = pattern[0]?.length || 0;

      // 以图案中心为基准计算偏移
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);

      // 遍历图案的每个像素
      for (let patternY = 0; patternY < patternHeight; patternY++) {
        for (let patternX = 0; patternX < patternWidth; patternX++) {
          if (pattern[patternY][patternX]) {
            // 计算相对于中心的偏移
            const offsetY = patternY - patternCenterY;
            const offsetX = patternX - patternCenterX;

            // 计算目标位置
            const targetRow = centerRow + offsetY;
            const targetCol = centerWeek + offsetX;

            // 检查是否在日历范围内
            if (targetRow >= 0 && targetRow < 7 && targetCol >= 0) {
              // 计算目标日期
              const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
              const targetDate = new Date(centerDate);
              targetDate.setDate(targetDate.getDate() + daysOffset);

              const dateStr = targetDate.toISOString().slice(0, 10);

              // 检查该日期是否存在于贡献数据中且不是未来日期
              const contribution = filteredContributions.find((c) => c.date === dateStr);
              if (contribution && !isFutureDate(dateStr)) {
                previewDatesSet.add(dateStr);
              }
            }
          }
        }
      }

      return previewDatesSet;
    },
    [filteredContributions, year, isFutureDate]
  );

  const getTooltip = React.useCallback(
    (oneDay: OneDay, date: Date) => {
      const s = date.toISOString().split('T')[0];
      if (isFutureDate(oneDay.date)) {
        return t('calendar.tooltipFuture', { date: s });
      }
      if (oneDay.count === 0) {
        return t('calendar.tooltipNone', { date: s });
      }
      return t('calendar.tooltipSome', { count: oneDay.count, date: s });
    },
    [isFutureDate, t]
  );

  // 清除所有选中
  const handleReset = () => setUserContributions(new Map());

  // 将可编辑的格子全部填充为最深绿色计数为 9）
  const handleFillAllGreen = () => {
    setUserContributions((prev) => {
      const newMap = new Map(prev);
      for (const c of filteredContributions) {
        if (!isFutureDate(c.date)) {
          newMap.set(c.date, 9);
        }
      }
      return newMap;
    });
  };

  // 开始字符预览
  const handleStartCharacterPreview = React.useCallback((char: string) => {
    setPreviewCharacter(char);
    setPreviewDates(new Set()); // 初始为空，等待鼠标悬停
    setPreviewMode(true);
    // 清除粘贴预览状态，避免冲突
    setPastePreviewActive(false);
    setPastePreviewDates(new Set());
  }, []);

  // helper: convert date -> {row, col}
  const getDateCoord = React.useCallback(
    (dateStr: string) => {
      const date = new Date(dateStr);
      const yearStart = new Date(year, 0, 1);
      const firstDayOfWeek = yearStart.getDay();
      const daysSinceYearStart = Math.floor(
        (date.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const col = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const row = date.getDay();
      return { row, col };
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
      for (const c of filteredContributions) {
        const coord = getDateCoord(c.date);
        if (
          coord.row >= minRow &&
          coord.row <= maxRow &&
          coord.col >= minCol &&
          coord.col <= maxCol
        ) {
          set.add(c.date);
        }
      }
      return { set, minRow, minCol, maxRow, maxCol };
    },
    [filteredContributions, getDateCoord]
  );

  const buildBufferFromSelection = React.useCallback(
    (startDate: string, endDate: string) => {
      const { set } = computeSelectionDates(startDate, endDate);

      // 首先收集所有有颜色的格子
      const coloredCells: { row: number; col: number; value: number }[] = [];

      for (const dateStr of set) {
        const coord = getDateCoord(dateStr);
        const current =
          userContributions.get(dateStr) ??
          filteredContributions.find((x) => x.date === dateStr)?.count ??
          0;
        // 只收集有贡献的格子
        if (current > 0) {
          coloredCells.push({
            row: coord.row,
            col: coord.col,
            value: current,
          });
        }
      }

      // 如果没有涂色的格子，返回空buffer
      if (coloredCells.length === 0) {
        return { width: 0, height: 0, data: [] };
      }

      // 计算涂色格子的边界
      const coloredMinRow = Math.min(...coloredCells.map((c) => c.row));
      const coloredMaxRow = Math.max(...coloredCells.map((c) => c.row));
      const coloredMinCol = Math.min(...coloredCells.map((c) => c.col));
      const coloredMaxCol = Math.max(...coloredCells.map((c) => c.col));

      const width = coloredMaxCol - coloredMinCol + 1;
      const height = coloredMaxRow - coloredMinRow + 1;
      const data: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

      // 将涂色格子填入data数组
      for (const cell of coloredCells) {
        const r = cell.row - coloredMinRow;
        const c = cell.col - coloredMinCol;
        data[r][c] = cell.value;
      }

      return { width, height, data };
    },
    [computeSelectionDates, getDateCoord, userContributions, filteredContributions]
  );

  const calculateBufferPreviewDates = React.useCallback(
    (buffer: { width: number; height: number; data: number[][] }, centerDateStr: string) => {
      if (!buffer || !centerDateStr) return new Set<string>();
      const previewSet = new Set<string>();
      const pattern = buffer.data;
      const patternHeight = buffer.height;
      const patternWidth = buffer.width;
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);

      const centerDate = new Date(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const firstDayOfWeek = yearStart.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDate.getDay();

      for (let py = 0; py < patternHeight; py++) {
        for (let px = 0; px < patternWidth; px++) {
          const val = pattern[py][px];
          // 只预览有贡献的格子
          if (!val || val === 0) continue;
          const offsetY = py - patternCenterY;
          const offsetX = px - patternCenterX;
          const targetRow = centerRow + offsetY;
          const targetCol = centerWeek + offsetX;
          if (targetRow >= 0 && targetRow < 7 && targetCol >= 0) {
            const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
            const targetDate = new Date(centerDate);
            targetDate.setDate(targetDate.getDate() + daysOffset);
            const dateStr = targetDate.toISOString().slice(0, 10);
            const contribution = filteredContributions.find((c) => c.date === dateStr);
            if (contribution && !isFutureDate(dateStr)) {
              previewSet.add(dateStr);
            }
          }
        }
      }
      return previewSet;
    },
    [filteredContributions, year, isFutureDate]
  );

  // 将 buffer 写回网格（以中心日期为锚点）
  const applyPaste = React.useCallback(
    (centerDateStr: string) => {
      if (!selectionBuffer || !centerDateStr) return;
      const buffer = selectionBuffer;
      const pattern = buffer.data;
      const patternHeight = buffer.height;
      const patternWidth = buffer.width;
      const patternCenterY = Math.floor(patternHeight / 2);
      const patternCenterX = Math.floor(patternWidth / 2);

      const centerDate = new Date(centerDateStr);
      const yearStart = new Date(year, 0, 1);
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const firstDayOfWeek = yearStart.getDay();
      const centerWeek = Math.floor((daysSinceYearStart + firstDayOfWeek) / 7);
      const centerRow = centerDate.getDay();

      setUserContributions((prev) => {
        const newMap = new Map(prev);
        for (let py = 0; py < patternHeight; py++) {
          for (let px = 0; px < patternWidth; px++) {
            const val = pattern[py][px];
            // 只处理有颜色的格子，跳过空格子
            if (!val || val === 0) continue;
            const offsetY = py - patternCenterY;
            const offsetX = px - patternCenterX;
            const targetRow = centerRow + offsetY;
            const targetCol = centerWeek + offsetX;
            if (targetRow >= 0 && targetRow < 7 && targetCol >= 0) {
              const daysOffset = targetCol * 7 + targetRow - (centerWeek * 7 + centerRow);
              const targetDate = new Date(centerDate);
              targetDate.setDate(targetDate.getDate() + daysOffset);
              const dateStr = targetDate.toISOString().slice(0, 10);
              if (isFutureDate(dateStr)) continue;
              newMap.set(dateStr, val);
            }
          }
        }
        return newMap;
      });

      // 应用粘贴后清除预览状态
      setPastePreviewActive(false);
      setPastePreviewDates(new Set());
    },
    [selectionBuffer, year, isFutureDate]
  );

  // 取消字符预览
  const handleCancelCharacterPreview = React.useCallback(() => {
    setPreviewMode(false);
    setPreviewCharacter('');
    setPreviewDates(new Set());
  }, []);

  // 应用字符预览到贡献图
  const handleApplyCharacterPreview = React.useCallback(() => {
    if (!previewMode || previewDates.size === 0) return;

    setUserContributions((prev) => {
      const newMap = new Map(prev);
      for (const dateStr of previewDates) {
        const current = prev.get(dateStr) ?? 0;

        if (penMode === 'auto') {
          // auto 模式：逐步递进
          newMap.set(dateStr, getNextContribution(current));
        } else {
          // manual 模式：直接设置为选定的画笔强度值
          newMap.set(dateStr, penIntensity);
        }
      }
      return newMap;
    });

    // 取消预览
    handleCancelCharacterPreview();
  }, [previewMode, previewDates, handleCancelCharacterPreview, penIntensity, penMode]);

  // 检测窗口是否最大化/全屏，用于切换布局与放大样式
  React.useEffect(() => {
    let disposed = false;
    const check = async () => {
      try {
        const m = await WindowIsMaximised();
        const f = await WindowIsFullscreen();
        if (!disposed) setIsMaximized(m || f);
      } catch (error) {
        console.warn('Failed to determine window state', error);
      }
    };
    check();
    const onResize = () => {
      check();
    };
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // 在最大化/全屏时，计算不超出窗口宽度的单元格尺寸，避免横向滚动
  React.useEffect(() => {
    const recalc = () => {
      if (!isMaximized) {
        setContainerVars({});
        return;
      }
      const el = containerRef.current;
      const wrapper = el?.parentElement; // 外层 overflow 容器
      const wrapperWidth = wrapper?.clientWidth ?? window.innerWidth;

      // 变量与常量（应尽量与样式中的值一致）
      const paddingX = 40; // .container 左右 padding: 20 + 20
      const borderX = 2; // 左右边框近似 1px + 1px
      const cols = 53; // 一年最多 53 列
      const gaps = 53; // 列与列之间的 gap 数（54 列 -> 53 间隔），包含周标签列与第一列之间
      const preferredGap = 6; // maximized 下默认 gap
      const minGap = 2; // 允许缩小的最小 gap
      const preferredCell = 20; // maximized 下默认 cell
      const minCell = 8; // 兜底格子尺寸

      // 估计左侧周标签列宽度：取三个星期标签的最大宽度
      let labelW = 48; // 更保守的兜底
      try {
        const weeks = el?.querySelectorAll(`.${styles.week}`);
        if (weeks && weeks.length) {
          weeks.forEach((node) => {
            const elem = node as HTMLElement;
            const w = elem.offsetWidth || 0;
            // 叠加 margin-right 作为 track 的近似宽度
            const cs = window.getComputedStyle(elem);
            const mr = parseFloat(cs.marginRight || '0') || 0;
            const track = w + mr;
            if (w > labelW) labelW = w;
            if (track > labelW) labelW = track;
          });
        }
      } catch (error) {
        console.warn('Failed to measure calendar layout', error);
      }

      // 预留少量余量，避免四舍五入导致轻微溢出
      const safety = 6;
      const availForTracks = wrapperWidth - paddingX - borderX - labelW - safety;

      // 先尽量用较大的 cell，再退而缩小 gap，最后兜底为最小 cell + 最小 gap
      let finalGap = preferredGap;
      let finalCell = preferredCell;

      // 如果首选组合超出，按顺序降低
      const fits = (cell: number, gap: number) => cols * cell + gaps * gap <= availForTracks;
      if (!fits(finalCell, finalGap)) {
        // 优先保证 cell 大小，计算允许的最大 gap
        const maxGap = Math.floor((availForTracks - cols * minCell) / gaps);
        finalGap = Math.max(minGap, Math.min(preferredGap, maxGap));
        // 再计算在该 gap 下允许的最大 cell
        const maxCell = Math.floor((availForTracks - gaps * finalGap) / cols);
        finalCell = Math.max(minCell, Math.min(preferredCell, maxCell));
        // 如仍不 fit，则进一步把 gap 降到最小并重算 cell
        if (!fits(finalCell, finalGap)) {
          finalGap = minGap;
          const maxCell2 = Math.floor((availForTracks - gaps * finalGap) / cols);
          finalCell = Math.max(minCell, Math.min(preferredCell, maxCell2));
        }
      }

      const nextVars: ContainerVars = {
        '--cell': `${finalCell}px`,
        '--gap': `${finalGap}px`,
        maxWidth: '100%',
      };
      setContainerVars(nextVars);
    };

    recalc();
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMaximized]);

  const runGenerateRepo = React.useCallback(
    async (remoteRepoOptions: RemoteRepoPayload) => {
      const githubLogin = githubUser?.login?.trim() ?? '';
      const githubEmail =
        githubUser?.email?.trim() || (githubLogin ? `${githubLogin}@users.noreply.github.com` : '');

      if (githubLogin === '' || githubEmail === '') {
        window.alert(t('messages.remoteLoginRequired'));
        return;
      }

      const contributionsForBackend = filteredContributions
        .map((c) => {
          const override = userContributions.get(c.date);
          const finalCount = override !== undefined ? override : c.count;
          return { date: c.date, count: finalCount };
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

  const handleRemoteModalSubmit = React.useCallback(
    (payload: RemoteRepoPayload) => {
      setIsRemoteModalOpen(false);
      runGenerateRepo(payload);
    },
    [runGenerateRepo]
  );

  const handleOpenRemoteModal = React.useCallback(() => {
    if (!githubUser?.login) {
      window.alert(t('messages.remoteLoginRequired'));
      return;
    }
    setIsRemoteModalOpen(true);
  }, [githubUser, t]);

  const handleExportContributions = React.useCallback(async () => {
    const contributionsToExport = filteredContributions
      .map((c) => {
        const override = userContributions.get(c.date);
        const finalCount = override !== undefined ? override : c.count;
        return {
          date: c.date,
          count: finalCount,
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
  }, [filteredContributions, userContributions, t]);

  const handleImportContributions = React.useCallback(async () => {
    try {
      const result = await ImportContributions();
      const importedMap = new Map<string, number>();
      result.contributions.forEach((c) => {
        importedMap.set(c.date, c.count);
      });
      setUserContributions(importedMap);
      window.alert(t('messages.importSuccess'));
    } catch (error) {
      console.error('Failed to import contributions', error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('messages.importError', { message }));
    }
  }, [t]);

  // 计算总贡献次数（考虑用户设置的数据）
  const total = filteredContributions.reduce((sum, c) => {
    const userContribution = userContributions.get(c.date) || 0;
    const displayCount = userContribution > 0 ? userContribution : c.count;
    return sum + displayCount;
  }, 0);

  const hasContributions = filteredContributions.length > 0;
  const firstContribution = hasContributions ? filteredContributions[0] : undefined;
  const firstDate = firstContribution ? new Date(firstContribution.date) : new Date(year, 0, 1);
  const startRow = firstDate.getDay();
  const months: (React.ReactElement | undefined)[] = [];
  let latestMonth = -1;

  // 处理格子点击或绘制
  const handleTileAction = (dateStr: string, mode: DrawMode) => {
    if (isFutureDate(dateStr)) {
      return;
    }
    if (mode === 'pen') {
      setUserContributions((prev) => {
        const newMap = new Map(prev);

        if (penMode === 'auto') {
          // auto 模式：逐步递进 0 → 1 → 3 → 6 → 9
          const current = prev.get(dateStr) ?? 0;
          // 改为调用方法
          const nextCount = getNextContribution(current);

          newMap.set(dateStr, nextCount);
        } else {
          // manual 模式：直接设置为选定的画笔强度值
          newMap.set(dateStr, penIntensity);
        }

        return newMap;
      });
    } else if (mode === 'eraser') {
      setUserContributions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(dateStr);
        return newMap;
      });
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (dateStr: string, event: React.MouseEvent) => {
    if (isFutureDate(dateStr)) {
      return;
    }
    // 如果处于复制模式，开始/结束选择或触发粘贴
    if (copyMode) {
      // 右键在复制模式下取消选择/预览
      if (event.button === 2) {
        event.preventDefault();
        // 取消选择或取消粘贴预览
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectionDates(new Set());
        setPastePreviewActive(false);
        setPastePreviewDates(new Set());
        return;
      }

      // 左键开始选择
      setSelectionStart(dateStr);
      setSelectionEnd(dateStr);
      const { set } = computeSelectionDates(dateStr, dateStr);
      setSelectionDates(set);
      setLastHoveredDate(dateStr);
      return;
    }

    // 非复制模式，保留原有行为
    // 阻止默认右键菜单
    if (event.button === 2) {
      event.preventDefault();
      setDrawMode((prevMode) => (prevMode === 'pen' ? 'eraser' : 'pen'));
      return;
    }

    setIsDrawing(true);
    setLastHoveredDate(dateStr);
    handleTileAction(dateStr, drawMode);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isFutureDate(dateStr)) {
      return;
    }

    // 预览模式：字符预览（优先级最高）
    if (previewMode && previewCharacter) {
      const newPreviewDates = calculatePreviewDates(previewCharacter, dateStr);
      setPreviewDates(newPreviewDates);
      return;
    }

    // 粘贴预览跟随鼠标
    if (pastePreviewActive && selectionBuffer) {
      setLastHoveredDate(dateStr);
      const newPreview = calculateBufferPreviewDates(selectionBuffer, dateStr);
      setPastePreviewDates(newPreview);
      return;
    }

    // 处于复制模式并且正在拖动选择
    if (copyMode && selectionStart) {
      if (dateStr !== selectionEnd) {
        setSelectionEnd(dateStr);
        const { set } = computeSelectionDates(selectionStart, dateStr);
        setSelectionDates(set);
      }
      return;
    }

    // 绘制模式
    if (isDrawing && dateStr !== lastHoveredDate) {
      setLastHoveredDate(dateStr);
      handleTileAction(dateStr, drawMode);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastHoveredDate(null);
  };

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false);
      setLastHoveredDate(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Ctrl+C: 复制选区 / Ctrl+V: 粘贴 / 右键: 取消
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c' && copyMode && selectionStart && selectionEnd) {
        e.preventDefault();
        const buffer = buildBufferFromSelection(selectionStart, selectionEnd);

        // 统计复制的有色格子数量
        const coloredCount = buffer.data.flat().filter((v) => v > 0).length;

        if (coloredCount === 0) {
          setToast('选区中没有涂色的格子');
          setTimeout(() => setToast(null), 2000);
          return;
        }

        setSelectionBuffer(buffer);
        setToast(`复制成功：${coloredCount} 个涂色格子`);
        setTimeout(() => setToast(null), 2000);
        // 复制后自动启用粘贴预览模式
        setPastePreviewActive(true);
        // 清除选择区域
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectionDates(new Set());
      }

      if (e.ctrlKey && e.key === 'v' && selectionBuffer) {
        e.preventDefault();
        if (!pastePreviewActive) {
          setPastePreviewActive(true);
        } else if (lastHoveredDate) {
          applyPaste(lastHoveredDate);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    copyMode,
    selectionStart,
    selectionEnd,
    buildBufferFromSelection,
    selectionBuffer,
    pastePreviewActive,
    lastHoveredDate,
    applyPaste,
  ]);

  const tiles = filteredContributions.map((c, i) => {
    const date = new Date(c.date);
    const month = date.getMonth();
    const future = isFutureDate(c.date);

    // 计算实际显示的贡献次数（用户设置的优先）
    const userContribution = userContributions.get(c.date) || 0;
    const displayCount = userContribution > 0 ? userContribution : c.count;

    // 在星期天的月份出现变化的列上面显示月份。
    if (date.getDay() === 0 && month !== latestMonth) {
      // 计算月份对应的列，从 1 开始、左上角格子留空所以 +2
      const gridColumn = 2 + Math.floor((i + startRow) / 7);
      latestMonth = month;
      months.push(
        <span className={styles.month} key={i} style={{ gridColumn }}>
          {monthNames[date.getMonth()]}
        </span>
      );
    }

    // 计算显示的level：用户设置的优先，否则用原始数据
    let displayLevel = userContribution > 0 ? calculateLevel(userContribution) : c.level;

    // 如果在预览模式且该日期在预览列表中，显示预览样式
    const isCharacterPreviewDate = previewMode && previewDates.has(c.date);
    const isPastePreviewDate = pastePreviewActive && pastePreviewDates.has(c.date);
    const isPreviewDate = isCharacterPreviewDate || isPastePreviewDate;
    if (isPreviewDate) {
      displayLevel = 4; // 预览时显示最深绿色
    }

    // 选择高亮
    const isSelectionDate = selectionDates.has(c.date);

    // 创建新的tip信息，反映用户设置的贡献次数
    const displayOneDay = { level: displayLevel, count: displayCount, date: c.date };

    return (
      <i
        className={clsx(
          styles.tile,
          isPreviewDate && styles.preview,
          isSelectionDate && styles.selection
        )}
        key={i}
        data-level={displayLevel}
        data-future={future ? 'true' : undefined}
        title={
          isPreviewDate
            ? t('characterSelector.previewTooltip', { char: previewCharacter })
            : getTooltip(displayOneDay, date)
        }
        onMouseDown={(e) => {
          // 处理字符预览应用/取消（预览模式下所有格子都响应，不仅仅是预览格子）
          if (previewMode) {
            if (e.button === 0) {
              // 左键应用预览
              handleApplyCharacterPreview();
            } else if (e.button === 2) {
              // 右键取消预览
              e.preventDefault();
              handleCancelCharacterPreview();
            }
            return;
          }

          // 处理粘贴预览：左键任意位置应用粘贴（以点击位置为中心），右键任意位置取消预览
          if (pastePreviewActive) {
            if (e.button === 0) {
              // 左键应用粘贴，以当前点击的格子为中心
              applyPaste(c.date);
            } else if (e.button === 2) {
              // 右键任意位置都可以取消预览
              e.preventDefault();
              setPastePreviewActive(false);
              setPastePreviewDates(new Set());
            }
            return;
          }

          // 非预览时，默认行为（包括复制选择逻辑）
          handleMouseDown(c.date, e);
        }}
        onMouseEnter={() => handleMouseEnter(c.date)}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
          e.preventDefault(); // 始终阻止默认右键菜单
        }}
        style={{
          cursor: future
            ? 'not-allowed'
            : isPreviewDate
              ? 'pointer'
              : drawMode === 'pen'
                ? 'crosshair'
                : 'grab',
          // userSelect: 'none'
        }}
      />
    );
  });

  // 第一格不一定是周日，此时前面会有空白，需要设置下起始行。
  if (tiles.length > 0) {
    tiles[0] = React.cloneElement(tiles[0], {
      style: { gridRow: startRow + 1 },
    });
  }
  // 如果第一格不是周日，则首月可能跑到第二列，需要再检查下。
  // Safely adjust months. Use optional chaining and avoid mutating props directly.
  if (months.length > 0) {
    const first = months[0];
    if (first && monthNames[firstDate.getMonth()] === (first.props && first.props.children)) {
      // create a new element with adjusted style instead of mutating props
      months[0] = React.cloneElement(first, {
        style: { ...(first.props.style || {}), gridColumn: 2 },
      });
    }
  }

  if (months.length > 1 && months[0] && months[1]) {
    const m0 = months[0];
    const m1 = months[1];
    const g0 = m0?.props?.style?.gridColumn as number | undefined;
    const g1 = m1?.props?.style?.gridColumn as number | undefined;
    if (typeof g0 === 'number' && typeof g1 === 'number' && g1 - g0 < 3) {
      months[0] = undefined;
    }
  }

  const last = months.at(-1);
  if (last && last.props && last.props.style && typeof last.props.style.gridColumn === 'number') {
    if (last.props.style.gridColumn > 53) {
      months[months.length - 1] = undefined;
    }
  }

  const renderedMonths = months.filter(Boolean) as React.ReactElement[];

  if (!hasContributions) {
    return null;
  }

  return (
    <div className="workbench">
      <div className="workbench__canvas">
        <div
          {...divProps}
          ref={containerRef}
          className={clsx(styles.container, isMaximized && styles.maximized, className)}
          style={{
            ...(externalStyle ?? {}),
            ...(isMaximized ? containerVars : {}),
          }}
          onMouseUp={handleMouseUp}
        >
          {renderedMonths}
          <span className={styles.week}>Mon</span>
          <span className={styles.week}>Wed</span>
          <span className={styles.week}>Fri</span>

          <div className={styles.tiles}>{tiles}</div>
          <div className={styles.total}>
            {t('calendar.totalContributions', { count: total, year })}
          </div>
          <div className={styles.legend}>
            {t('calendar.legendLess')}
            <i className={styles.tile} data-level={0} />
            <i className={styles.tile} data-level={1} />
            <i className={styles.tile} data-level={2} />
            <i className={styles.tile} data-level={3} />
            <i className={styles.tile} data-level={4} />
            {t('calendar.legendMore')}
          </div>
        </div>
        {/* Simple toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#000',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 9999,
            }}
          >
            {toast}
          </div>
        )}
      </div>

      <div className="flex flex-row gap-5">
        <aside className="workbench__panel">
          <CalendarControls
            year={year}
            drawMode={drawMode}
            penIntensity={penIntensity}
            onYearChange={setYear}
            onDrawModeChange={setDrawMode}
            onPenIntensityChange={setPenIntensity}
            onReset={handleReset}
            onFillAllGreen={handleFillAllGreen}
            onOpenRemoteRepoModal={handleOpenRemoteModal}
            canCreateRemoteRepo={Boolean(githubUser)}
            isGeneratingRepo={isGeneratingRepo}
            onExportContributions={handleExportContributions}
            onImportContributions={handleImportContributions}
            // 字符预览相关
            onStartCharacterPreview={handleStartCharacterPreview}
            previewMode={previewMode}
            onCancelCharacterPreview={handleCancelCharacterPreview}
            penMode={penMode}
            onPenModeChange={setPenMode}
            // 复制模式
            copyMode={copyMode}
            onCopyModeToggle={() => {
              setCopyMode((v) => {
                const next = !v;
                if (!next) {
                  // 关闭复制模式时清空选择
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setSelectionDates(new Set());
                }
                return next;
              });
            }}
          />
        </aside>
        <aside className="workbench__panel">
          <p className="text-center">
            ✨ 该区域正在筹备中！各位大神有哪些脑洞大开的功能想法？快来 issues
            留言，你的创意可能会被实现哦～
            <br />✨ This area is in the works! Do you have any creative function ideas, dear users?
            Leave a comment in the issues—your creativity might be realized!
          </p>
        </aside>
      </div>
      {isRemoteModalOpen && (
        <RemoteRepoModal
          open={isRemoteModalOpen}
          defaultName={remoteRepoDefaultName}
          defaultDescription=""
          defaultPrivate
          isSubmitting={isGeneratingRepo}
          onClose={() => setIsRemoteModalOpen(false)}
          onSubmit={handleRemoteModalSubmit}
        />
      )}
    </div>
  );
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);

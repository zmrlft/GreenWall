import React from 'react';
import clsx from 'clsx';
import styles from './ContributionCalendar.module.scss';
import { CalendarControls } from './CalendarControls';
import { GenerateRepo, ExportContributions, ImportContributions } from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { useTranslations } from '../i18n';
import { WindowIsMaximised, WindowIsFullscreen } from '../../wailsjs/runtime/runtime';
import { getPatternById, gridToBoolean } from '../data/characterPatterns';
const STORAGE_KEYS = {
  username: 'github-contributor.username',
  email: 'github-contributor.email',
  repoName: 'github-contributor.repoName',
  repositoryPath: 'github-contributor.repositoryPath',
};

function readStoredValue(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredValue(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === '') {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors and keep runtime behaviour unaffected.
  }
}

// 根据贡献数量计算level
function calculateLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count >= 1 && count <= 2) return 1;
  if (count >= 3 && count <= 5) return 2;
  if (count >= 6 && count <= 8) return 3;
  if (count > 8) return 4;
  return 0;
}

// 解析 YYYY-MM-DD 格式的字符串为UTC Date对象
function parseUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
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
} & React.HTMLAttributes<HTMLDivElement>;

type DrawMode = 'pen' | 'eraser';

// 画笔强度类型：对应不同的贡献次数
type PenIntensity = 1 | 3 | 6 | 9;

type ContainerVars = React.CSSProperties & {
  '--cell'?: string;
  '--gap'?: string;
};

function ContributionCalendar({ contributions: originalContributions, className, ...rest }: Props) {
  const { style: externalStyle, ...divProps } = rest;
  // 选中日期状态 - 改为存储每个日期的贡献次数
  const { t, dictionary } = useTranslations();
  const monthNames = dictionary.months;

  const [userContributions, setUserContributions] = React.useState<Map<string, number>>(new Map());
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [githubUsername, setGithubUsername] = React.useState<string>(() =>
    readStoredValue(STORAGE_KEYS.username)
  );
  const [githubEmail, setGithubEmail] = React.useState<string>(() =>
    readStoredValue(STORAGE_KEYS.email)
  );
  const [repoName, setRepoName] = React.useState<string>(() =>
    readStoredValue(STORAGE_KEYS.repoName)
  );

  const [selectedRepositoryPath, setSelectedRepositoryPath] = React.useState<string | null>(() =>
    readStoredValue(STORAGE_KEYS.repositoryPath) || null
  );

  // 绘画模式状态
  const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
  const [penIntensity, setPenIntensity] = React.useState<PenIntensity>(1); // 画笔强度，默认为1
  const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
  const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
  const [isGeneratingRepo, setIsGeneratingRepo] = React.useState<boolean>(false);
  const [isMaximized, setIsMaximized] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerVars, setContainerVars] = React.useState<ContainerVars>({});

  // 字符预览状态
  const [previewMode, setPreviewMode] = React.useState<boolean>(false);
  const [previewCharacter, setPreviewCharacter] = React.useState<string>('');
  const [previewDates, setPreviewDates] = React.useState<Set<string>>(new Set());

  // 允许选择年份，过滤贡献数据
  const filteredContributions = originalContributions.filter(
    (c) => parseUTCDate(c.date).getUTCFullYear() === year
  );

  // 计算当前日期与明天零点，用于判断未来日期
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const todayStart = new Date(Date.UTC(currentYear, now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const tomorrowTime = tomorrowStart.getTime();
  const isCurrentYear = year === currentYear;

  const isFutureDate = React.useCallback(
    (dateStr: string) => {
      if (!isCurrentYear) {
        return false;
      }
      const parsed = parseUTCDate(dateStr);
      return parsed.getTime() >= tomorrowTime;
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

      const centerDate = parseUTCDate(centerDateStr);
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const daysSinceYearStart = Math.floor(
        (centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 计算中心日期的行列位置
      // 注意：现在 startRow 是相对于 Monday 的偏移(0=Mon, 1=Tue, ..., 6=Sun)
      const yearFirstDayOfWeek = yearStart.getUTCDay();
      const yearStartRow = yearFirstDayOfWeek === 0 ? 6 : yearFirstDayOfWeek - 1;
      const centerDayOfWeek = centerDate.getUTCDay();
      const centerDayRow = centerDayOfWeek === 0 ? 6 : centerDayOfWeek - 1; // 相对于Monday的偏移
      const centerWeek = Math.floor((daysSinceYearStart + yearStartRow) / 7);
      const centerRow = centerDayRow;

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
              targetDate.setUTCDate(targetDate.getUTCDate() + daysOffset);

              // 构建UTC日期字符串
              const dateStr = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.getUTCDate()).padStart(2, '0')}`;

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
      // 构建UTC日期字符串用于显示
      const s = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
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
  }, []);

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
        // 设置为最大贡献值 9
        newMap.set(dateStr, 9);
      }
      return newMap;
    });

    // 取消预览
    handleCancelCharacterPreview();
  }, [previewMode, previewDates, handleCancelCharacterPreview]);

  React.useEffect(() => {
    writeStoredValue(STORAGE_KEYS.username, githubUsername);
  }, [githubUsername]);

  React.useEffect(() => {
    writeStoredValue(STORAGE_KEYS.email, githubEmail);
  }, [githubEmail]);

  React.useEffect(() => {
    writeStoredValue(STORAGE_KEYS.repoName, repoName);
  }, [repoName]);

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

  const handleSelectRepositoryPath = React.useCallback(async () => {
    try {
      const { SelectRepositoryPath } = await import('../../wailsjs/go/main/App');
      const path = await SelectRepositoryPath();
      if (path) {
        setSelectedRepositoryPath(path);
        writeStoredValue(STORAGE_KEYS.repositoryPath, path);
        return path;
      }
      return null;
    } catch (error) {
      console.error('Failed to select repository path:', error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('messages.selectPathError', { message }));
      return null;
    }
  }, [t]);

  const handleGenerateRepo = React.useCallback(async () => {
    const trimmedUsername = githubUsername.trim();
    const trimmedEmail = githubEmail.trim();
    const trimmedRepoName = repoName.trim();

    if (trimmedUsername === '' || trimmedEmail === '') {
      window.alert(t('messages.generateRepoMissing'));
      return;
    }

    const contributionsForBackend = filteredContributions
      .map((c) => {
        const override = userContributions.get(c.date);
        const finalCount = override !== undefined ? override : c.count;

        return {
          date: c.date,
          count: finalCount,
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
        githubUsername: trimmedUsername,
        githubEmail: trimmedEmail,
        repoName: trimmedRepoName,
        contributions: contributionsForBackend,
        targetPath: selectedRepositoryPath || '',
      });
      const result = await GenerateRepo(payload);
      window.alert(`Repository created at ${result.repoPath} with ${result.commitCount} commits.`);
    } catch (error) {
      console.error('Failed to generate repository', error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(t('messages.generateRepoError', { message }));
    } finally {
      setIsGeneratingRepo(false);
    }
  }, [filteredContributions, githubEmail, githubUsername, repoName, selectedRepositoryPath, userContributions, year, t]);

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
  const firstDate = firstContribution ? parseUTCDate(firstContribution.date) : new Date(Date.UTC(year, 0, 1));
  
  // GitHub 的日历总是从周一(1)开始显示
  // getUTCDay() 返回: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
  // 我们需要计算相对于周一的偏移
  const dayOfWeek = firstDate.getUTCDay();
  // 转换为相对于Monday的偏移: 0=Mon, 1=Tue, ..., 6=Sun
  // 如果Sunday(0)，偏移应该是6；如果Monday(1)，偏移应该是0
  const startRow = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const months: (React.ReactElement | undefined)[] = [];
  let latestMonth = -1;

  // 处理格子点击或绘制
  const handleTileAction = (dateStr: string, mode: DrawMode) => {
    if (isFutureDate(dateStr)) {
      return;
    }
    if (mode === 'pen') {
      setUserContributions((prev) => {
        // 直接设置为选定的画笔强度值
        const newMap = new Map(prev);
        newMap.set(dateStr, penIntensity);
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

    // 预览模式：实时更新预览位置
    if (previewMode && previewCharacter) {
      const newPreviewDates = calculatePreviewDates(previewCharacter, dateStr);
      setPreviewDates(newPreviewDates);
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

  const tiles = filteredContributions.map((c, i) => {
    const date = parseUTCDate(c.date);
    const month = date.getUTCMonth();
    const future = isFutureDate(c.date);

    // 计算实际显示的贡献次数（用户设置的优先）
    const userContribution = userContributions.get(c.date) || 0;
    const displayCount = userContribution > 0 ? userContribution : c.count;

    // 在周一的月份出现变化的列上面显示月份（GitHub的日历从Monday开始）
    // getUTCDay()=1 是 Monday
    if (date.getUTCDay() === 1 && month !== latestMonth) {
      // 计算月份对应的列，从 1 开始、左上角格子留空所以 +2
      const gridColumn = 2 + Math.floor((i + startRow) / 7);
      latestMonth = month;
      months.push(
        <span className={styles.month} key={i} style={{ gridColumn }}>
          {monthNames[month]}
        </span>
      );
    }

    // 计算显示的level：用户设置的优先，否则用原始数据
    let displayLevel = userContribution > 0 ? calculateLevel(userContribution) : c.level;

    // 如果在预览模式且该日期在预览列表中，显示预览样式
    const isPreviewDate = previewMode && previewDates.has(c.date);
    if (isPreviewDate) {
      displayLevel = 4; // 预览时显示最深绿色
    }

    // 创建新的tip信息，反映用户设置的贡献次数
    const displayOneDay = { level: displayLevel, count: displayCount, date: c.date };

    return (
      <i
        className={clsx(styles.tile, isPreviewDate && styles.preview)}
        key={i}
        data-level={displayLevel}
        data-future={future ? 'true' : undefined}
        title={
          isPreviewDate
            ? t('characterSelector.previewTooltip', { char: previewCharacter })
            : getTooltip(displayOneDay, date)
        }
        onMouseDown={(e) => {
          if (previewMode) {
            // 预览模式下，左键应用，右键取消
            if (e.button === 0) {
              // 左键
              handleApplyCharacterPreview();
            } else if (e.button === 2) {
              // 右键
              e.preventDefault();
              handleCancelCharacterPreview();
            }
          } else {
            handleMouseDown(c.date, e);
          }
        }}
        onMouseEnter={() => handleMouseEnter(c.date)}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
          e.preventDefault(); // 始终阻止默认右键菜单
        }}
        style={{
          cursor: future
            ? 'not-allowed'
            : previewMode
              ? 'pointer'
              : drawMode === 'pen'
                ? 'crosshair'
                : 'grab',
          // userSelect: 'none'
        }}
      />
    );
  });

  // 第一格不一定是周一，此时前面会有空白，需要设置下起始行。
  if (tiles.length > 0) {
    tiles[0] = React.cloneElement(tiles[0], {
      style: { gridRow: startRow + 1 },
    });
  }
  // 如果第一格不是周一，则首月可能跑到第二列，需要再检查下。
  // Safely adjust months. Use optional chaining and avoid mutating props directly.
  if (months.length > 0) {
    const first = months[0];
    if (first && monthNames[firstDate.getUTCMonth()] === (first.props && first.props.children)) {
      // create a new element with adjusted style instead of mutating props
      months[0] = React.cloneElement(first, {
        style: { ...( first.props.style || {}), gridColumn: 2 },
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
    <div
      className={clsx(
        'flex w-full px-4 py-3',
        // 最大化：上下布局，并稍微加大间距
        isMaximized
          ? 'flex-col gap-6 overflow-x-hidden'
          : 'flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-10'
      )}
    >
      <div
        className={clsx('w-full lg:flex-1', isMaximized ? 'overflow-x-hidden' : 'overflow-x-auto')}
      >
        <div
          {...divProps}
          ref={containerRef}
          className={clsx(
            styles.container,
            isMaximized && styles.maximized,
            'mx-auto lg:mx-0',
            className
          )}
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
      </div>

      <div
        className={clsx(
          'w-full',
          // 最大化：放在下方并居中适度加宽；非最大化：右侧窄栏
          isMaximized ? 'max-w-3xl mx-auto' : 'lg:max-w-sm'
        )}
      >
        <CalendarControls
          year={year}
          drawMode={drawMode}
          penIntensity={penIntensity}
          onYearChange={setYear}
          onDrawModeChange={setDrawMode}
          onPenIntensityChange={setPenIntensity}
          onReset={handleReset}
          onFillAllGreen={handleFillAllGreen}
          githubUsername={githubUsername}
          githubEmail={githubEmail}
          repoName={repoName}
          onGithubUsernameChange={setGithubUsername}
          onGithubEmailChange={setGithubEmail}
          onRepoNameChange={setRepoName}
          onGenerateRepo={handleGenerateRepo}
          isGeneratingRepo={isGeneratingRepo}
          onSelectRepositoryPath={handleSelectRepositoryPath}
          selectedRepositoryPath={selectedRepositoryPath}
          onExportContributions={handleExportContributions}
          onImportContributions={handleImportContributions}
          // 字符预览相关
          onStartCharacterPreview={handleStartCharacterPreview}
          previewMode={previewMode}
          onCancelCharacterPreview={handleCancelCharacterPreview}
        />
      </div>
    </div>
  );
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);

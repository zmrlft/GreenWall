import React from "react";
import clsx from "clsx";
import styles from "./ContributionCalendar.module.scss";
import { CalendarControls } from "./CalendarControls";
import { GenerateRepo } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { useTranslations } from "../i18n";
import { WindowIsMaximised, WindowIsFullscreen } from "../../wailsjs/runtime/runtime";
const STORAGE_KEYS = {
	username: "github-contributor.username",
	email: "github-contributor.email",
	repoName: "github-contributor.repoName",
};

function readStoredValue(key: string): string {
	if (typeof window === "undefined") {
		return "";
	}
	try {
		return window.localStorage.getItem(key) ?? "";
	} catch {
		return "";
	}
}

function writeStoredValue(key: string, value: string) {
	if (typeof window === "undefined") {
		return;
	}
	try {
		if (value === "") {
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

export type OneDay = { level: number; count: number; date: string };

/**
 * 仿 GitHub 的贡献图，支持交互式点击和拖拽绘制贡献次数。
 *
 * 功能说明：
 * - 画笔模式：点击或拖拽绘制格子，循环切换贡献次数：0 -> 1 -> 3 -> 6 -> 9 -> 12 -> 0
 * - 橡皮擦模式：点击或拖擦清除格子贡献
 * - 数字越大，绿色越深，最多4级
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

function ContributionCalendar({ contributions: originalContributions, className, ...rest }: Props) {

	// 选中日期状态 - 改为存储每个日期的贡献次数
	const { t, dictionary } = useTranslations();
	const monthNames = dictionary.months;

	const [userContributions, setUserContributions] = React.useState<Map<string, number>>(new Map());
	const [year, setYear] = React.useState<number>(new Date().getFullYear());
	const [githubUsername, setGithubUsername] = React.useState<string>(() => readStoredValue(STORAGE_KEYS.username));
	const [githubEmail, setGithubEmail] = React.useState<string>(() => readStoredValue(STORAGE_KEYS.email));
	const [repoName, setRepoName] = React.useState<string>(() => readStoredValue(STORAGE_KEYS.repoName));

	// 绘画模式状态
	const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
	const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
	const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
	const [hasDragged, setHasDragged] = React.useState<boolean>(false);
    const [isGeneratingRepo, setIsGeneratingRepo] = React.useState<boolean>(false);
    const [isMaximized, setIsMaximized] = React.useState<boolean>(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerVars, setContainerVars] = React.useState<React.CSSProperties>({});

	// 允许选择年份，过滤贡献数据
	const years = Array.from(new Set(originalContributions.map(c => new Date(c.date).getFullYear()))).sort((a, b) => b - a);
	const filteredContributions = originalContributions.filter(c => new Date(c.date).getFullYear() === year);

	// 计算当前日期与明天零点，用于判断未来日期
	const now = new Date();
	const currentYear = now.getFullYear();
	const todayStart = new Date(currentYear, now.getMonth(), now.getDate());
	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(tomorrowStart.getDate() + 1);
	const tomorrowTime = tomorrowStart.getTime();
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
		[isCurrentYear, tomorrowTime],
	);

	const getTooltip = React.useCallback((oneDay: OneDay, date: Date) => {
		const s = date.toISOString().split("T")[0];
		if (isFutureDate(oneDay.date)) {
			return t("calendar.tooltipFuture", { date: s });
		}
		if (oneDay.count === 0) {
			return t("calendar.tooltipNone", { date: s });
		}
		return t("calendar.tooltipSome", { count: oneDay.count, date: s });
	}, [isFutureDate, t]);

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
            } catch {}
        };
        check();
        const onResize = () => { check(); };
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
            const borderX = 2;   // 左右边框近似 1px + 1px
            const cols = 53;     // 一年最多 53 列
            const gaps = 53;     // 列与列之间的 gap 数（54 列 -> 53 间隔），包含周标签列与第一列之间
            const preferredGap = 6; // maximized 下默认 gap
            const minGap = 2;    // 允许缩小的最小 gap
            const preferredCell = 20; // maximized 下默认 cell
            const minCell = 8;   // 兜底格子尺寸

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
            } catch {}

            // 预留少量余量，避免四舍五入导致轻微溢出
            const safety = 6;
            const availForTracks = wrapperWidth - paddingX - borderX - labelW - safety;

            // 先尽量用较大的 cell，再退而缩小 gap，最后兜底为最小 cell + 最小 gap
            let finalGap = preferredGap;
            let finalCell = preferredCell;

            // 如果首选组合超出，按顺序降低
            const fits = (cell: number, gap: number) => (cols * cell + gaps * gap) <= availForTracks;
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

            setContainerVars({
                ['--cell' as any]: `${finalCell}px`,
                ['--gap' as any]: `${finalGap}px`,
                maxWidth: '100%'
            } as React.CSSProperties);
        };

        recalc();
        const onResize = () => recalc();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isMaximized]);

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
	}, [filteredContributions, githubEmail, githubUsername, repoName, userContributions, year]);

	if (!filteredContributions || filteredContributions.length === 0) return null;

	// 计算总贡献次数（考虑用户设置的数据）
	const total = filteredContributions.reduce((sum, c) => {
		const userContribution = userContributions.get(c.date) || 0;
		const displayCount = userContribution > 0 ? userContribution : c.count;
		return sum + displayCount;
	}, 0);

	const firstDate = new Date(filteredContributions[0].date);
	const startRow = firstDate.getDay();
	const months: (React.ReactElement | undefined)[] = [];
	let latestMonth = -1;

	// 处理格子点击或绘制
	const handleTileAction = (dateStr: string) => {
		if (isFutureDate(dateStr)) {
			return;
		}
		if (drawMode === 'pen') {
			setUserContributions(prev => {
				const newMap = new Map(prev);
				const currentCount = newMap.get(dateStr) || 0;

				// 定义合理的贡献切换序列：0 -> 1 -> 3 -> 6 -> 9 -> 12 -> 0
				// 这样可以覆盖所有颜色等级
				const levels = [0, 1, 3, 6, 9];
				const currentIndex = levels.indexOf(currentCount);
				const nextIndex = (currentIndex + 1) % levels.length;
				const nextCount = levels[nextIndex];

				if (nextCount === 0) {
					newMap.delete(dateStr);
				} else {
					newMap.set(dateStr, nextCount);
				}

				return newMap;
			});
		} else if (drawMode === 'eraser') {
			setUserContributions(prev => {
				const newMap = new Map(prev);
				newMap.delete(dateStr);
				return newMap;
			});
		}
	};

	const handleTileClick = (dateStr: string) => {
		// 只有在没有拖拽的情况下才执行点击动作
		if (!hasDragged) {
			handleTileAction(dateStr);
		}
	};

	// 鼠标事件处理
	const handleMouseDown = (dateStr: string) => {
		if (isFutureDate(dateStr)) {
			return;
		}
		setIsDrawing(true);
		setLastHoveredDate(dateStr);
		setHasDragged(false);
		handleTileAction(dateStr);
	};

	const handleMouseEnter = (dateStr: string) => {
		if (isFutureDate(dateStr)) {
			return;
		}
		if (isDrawing && dateStr !== lastHoveredDate) {
			setLastHoveredDate(dateStr);
			setHasDragged(true);
			handleTileAction(dateStr);
		}
	};

	const handleMouseUp = () => {
		setIsDrawing(false);
		setLastHoveredDate(null);
		// 延迟重置hasDragged，确保onClick事件能够正确检测
		setTimeout(() => setHasDragged(false), 10);
	};

	React.useEffect(() => {
		const handleGlobalMouseUp = () => {
			setIsDrawing(false);
			setLastHoveredDate(null);
			setTimeout(() => setHasDragged(false), 10);
		};

		window.addEventListener('mouseup', handleGlobalMouseUp);
		return () => {
			window.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	}, []);

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
				<span
					className={styles.month}
					key={i}
					style={{ gridColumn }}
				>
					{monthNames[date.getMonth()]}
				</span>,
			);
		}

		// 计算显示的level：用户设置的优先，否则用原始数据
		const displayLevel = userContribution > 0 ? calculateLevel(userContribution) : c.level;

		// 创建新的tip信息，反映用户设置的贡献次数
		const displayOneDay = { level: displayLevel, count: displayCount, date: c.date };

		return (
			<i
				className={styles.tile}
				key={i}
				data-level={displayLevel}
				data-future={future ? "true" : undefined}
				title={getTooltip(displayOneDay, date)}
				// onClick={() => handleTileClick(c.date)}
				onMouseDown={() => handleMouseDown(c.date)}
				onMouseEnter={() => handleMouseEnter(c.date)}
				onMouseUp={handleMouseUp}
				style={{
					cursor: future ? 'not-allowed' : (drawMode === 'pen' ? 'crosshair' : 'grab'),
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

	return (
        <div className={clsx(
            "flex w-full px-4 py-3",
            // 最大化：上下布局，并稍微加大间距
            isMaximized ? "flex-col gap-6 overflow-x-hidden" : "flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-10",
        )}>
            <div className={clsx("w-full lg:flex-1", isMaximized ? "overflow-x-hidden" : "overflow-x-auto") }>
                <div
                    {...rest}
                    ref={containerRef}
                    className={clsx(styles.container, isMaximized && styles.maximized, 'mx-auto lg:mx-0', className)}
                    style={{ ...(((rest as any) && (rest as any).style) || {}), ...(isMaximized ? containerVars : {}) }}
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
						<i className={styles.tile} data-level={0}/>
						<i className={styles.tile} data-level={1}/>
						<i className={styles.tile} data-level={2}/>
						<i className={styles.tile} data-level={3}/>
						<i className={styles.tile} data-level={4}/>
						{t('calendar.legendMore')}
					</div>
				</div>
			</div>

			<div className={clsx(
				"w-full",
				// 最大化：放在下方并居中适度加宽；非最大化：右侧窄栏
				isMaximized ? "max-w-3xl mx-auto" : "lg:max-w-sm",
			)}>
				<CalendarControls
					year={year}
					drawMode={drawMode}
					onYearChange={setYear}
					onDrawModeChange={setDrawMode}
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
				/>
			</div>
		</div>
	);
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);

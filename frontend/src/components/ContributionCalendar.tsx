import React from "react";
import clsx from "clsx";
import styles from "./ContributionCalendar.module.scss";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 根据贡献数量计算level
function calculateLevel(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count >= 1 && count <= 2) return 1;
    if (count >= 3 && count <= 5) return 2;
    if (count >= 6 && count <= 8) return 3;
    if (count > 8) return 4;
    return 0;
}

export type OneDay = { level: number; count: number; date: string };

function getTooltip(oneDay: OneDay, date: Date) {
	const s = date.toISOString().split("T")[0];
	switch (oneDay.count) {
		case 0:
			return `No contributions on ${s} - Click to add!`;
		default:
			return `${oneDay.count} contributions on ${s}`;
	}
}

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
	const [userContributions, setUserContributions] = React.useState<Map<string, number>>(new Map());
	const [year, setYear] = React.useState<number>(new Date().getFullYear());

	// 绘画模式状态
	const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
	const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
	const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
	const [hasDragged, setHasDragged] = React.useState<boolean>(false);

	// 允许选择年份，过滤贡献数据
	const years = Array.from(new Set(originalContributions.map(c => new Date(c.date).getFullYear()))).sort((a, b) => b - a);
	const filteredContributions = originalContributions.filter(c => new Date(c.date).getFullYear() === year);

	// 清除所有选中
	const handleReset = () => setUserContributions(new Map());

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
		setIsDrawing(true);
		setLastHoveredDate(dateStr);
		setHasDragged(false);
		handleTileAction(dateStr);
	};

	const handleMouseEnter = (dateStr: string) => {
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
					{MONTH[date.getMonth()]}
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
				title={getTooltip(displayOneDay, date)}
				// onClick={() => handleTileClick(c.date)}
				onMouseDown={() => handleMouseDown(c.date)}
				onMouseEnter={() => handleMouseEnter(c.date)}
				onMouseUp={handleMouseUp}
				style={{
					cursor: drawMode === 'pen' ? 'crosshair' : 'grab',
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
		if (first && MONTH[firstDate.getMonth()] === (first.props && first.props.children)) {
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
		<div className="flex flex-col items-center space-y-6 px-6 py-4">



			<div {...rest} className={clsx(styles.container, className)} onMouseUp={handleMouseUp}>
				{renderedMonths}
				<span className={styles.week}>Mon</span>
				<span className={styles.week}>Wed</span>
				<span className={styles.week}>Fri</span>

				<div className={styles.tiles}>{tiles}</div>
				<div className={styles.total}>
					{total} contributions in {year}
				</div>
				<div className={styles.legend}>
					Less
					<i className={styles.tile} data-level={0}/>
					<i className={styles.tile} data-level={1}/>
					<i className={styles.tile} data-level={2}/>
					<i className={styles.tile} data-level={3}/>
					<i className={styles.tile} data-level={4}/>
					More
				</div>

			</div>
			
			<div className="w-full max-w-2xl">
				<div className="bg-white rounded-none p-4 border border-black">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Year Input */}
						<div className="flex flex-col space-y-2">
							<label htmlFor="year-input" className="text-sm font-medium text-black">年份</label>
							<input
								id="year-input"
								type="number"
								min="2008"
								max={new Date().getFullYear()}
								value={year}
								onChange={e => {
									const newYear = Number(e.target.value);
									if (newYear >= 2008 && newYear <= new Date().getFullYear()) {
										setYear(newYear);
									}
								}}
								className="px-3 py-2 border border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
							/>
						</div>

						{/* Drawing Mode */}
						<div className="flex flex-col space-y-2">
							<span className="text-sm font-medium text-black">绘制模式</span>
							<div className="flex space-x-2">
								<button
									type="button"
									onClick={() => setDrawMode('pen')}
									className={clsx(
										'px-3 py-2 text-sm font-medium rounded-none flex items-center justify-center gap-2 transition-all duration-200',
										drawMode === 'pen'
											? 'bg-black text-white shadow-lg transform scale-105'
											: 'bg-white text-black border border-black hover:bg-gray-100'
									)}
									title="画笔模式 - 点击或拖动增加贡献"
								>
									✏️ 画笔
								</button>
								<button
									type="button"
									onClick={() => setDrawMode('eraser')}
									className={clsx(
										'px-3 py-2 text-sm font-medium rounded-none flex items-center justify-center gap-2 transition-all duration-200',
										drawMode === 'eraser'
											? 'bg-black text-white shadow-lg transform scale-105'
											: 'bg-white text-black border border-black hover:bg-gray-100'
									)}
									title="橡皮擦模式 - 点击或拖动清除贡献"
								>
									🧹 橡皮擦
								</button>
							</div>
						</div>

						{/* Reset Button */}
						<div className="flex flex-col space-y-2">
							<span className="text-sm font-medium text-black invisible">操作</span>
							<button
								type="button"
								onClick={handleReset}
								className="px-4 py-2 text-sm font-medium bg-black text-white rounded-none hover:bg-gray-800 transition-colors duration-200"
								title="清除所有用户设置的贡献数据"
							>
								🔄 清除设置
							</button>
						</div>
					</div>
				</div>
			</div>

		</div>
	);
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);
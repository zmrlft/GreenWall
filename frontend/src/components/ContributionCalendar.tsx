import React from "react";
import clsx from "clsx";
import styles from "./ContributionCalendar.module.scss";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 生成气泡提示的内容，主要就是处理英语就的复数词尾，中文就没这破事。
export type OneDay = { level: number; count: number; date: string };

function getTooltip(oneDay: OneDay, date: Date) {
	const s = date.toISOString().split("T")[0];
	switch (oneDay.count) {
		case 0:
			return `No contributions on ${s}`;
		case 1:
			return `1 contribution on ${s}`;
		default:
			return `${oneDay.count} contributions on ${s}`;
	}
}

/**
 * 仿 GitHub 的贡献图，数据可以用 /script/fetch-contributions.js 抓取。
 *
 * @example
 * const data = [{ level: 1, count: 5, date: 1728272654618 }, ...];
 * <ContributionCalendar contributions={data}/>
 */
type Props = {
	contributions: OneDay[];
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

function ContributionCalendar({ contributions, className, ...rest }: Props) {
	if (!contributions || contributions.length === 0) return null;

	const firstDate = new Date(contributions[0].date);
	const startRow = firstDate.getDay();
	const months: (React.ReactElement | undefined)[] = [];
	let total = 0;
	let latestMonth = -1;

	const tiles = contributions.map((c, i) => {
		const date = new Date(c.date);
		const month = date.getMonth();
		total += c.count;

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
		return (
			<i
				className={styles.tile}
				key={i}
				data-level={c.level}
				title={getTooltip(c, date)}
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
		<div {...rest} className={clsx(styles.container, className)}>
			{renderedMonths}
			<span className={styles.week}>Mon</span>
			<span className={styles.week}>Wed</span>
			<span className={styles.week}>Fri</span>

			<div className={styles.tiles}>{tiles}</div>

			<div className={styles.total}>
				{total} contributions in the last year
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
	);
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);
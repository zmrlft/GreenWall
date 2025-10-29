import React from "react";
import clsx from "clsx";
import styles from "./ContributionCalendar.module.scss";
import { CalendarControls } from "./CalendarControls";
import { PushRepoDialog } from "./PushRepoDialog";
import { GenerateRepo, ExportContributions, ImportContributions, LoadUserInfo, StartOAuthLogin, Logout, GetUserRepos, PushToGitHub } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { useTranslations } from "../i18n";
import { WindowIsMaximised, WindowIsFullscreen } from "../../wailsjs/runtime/runtime";
import { getPatternById, gridToBoolean } from "../data/characterPatterns";

// 根据贡献数量计算level
function calculateLevel(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count >= 1 && count <= 2) return 1;
    if (count >= 3 && count <= 5) return 2;
    if (count >= 6 && count <= 8) return 3;
    if (count > 8) return 4;
    return 0;
}

// 将字符转换为像素图案 - 使用预定义的图案数据
function characterToPattern(char: string): boolean[][] {
    const pattern = getPatternById(char);
    if (pattern) {
        return gridToBoolean(pattern.grid);
    }
    
    // 如果找不到预定义图案，返回空图案
    return Array(7).fill(null).map(() => Array(5).fill(false));
}

export type OneDay = { level: number; count: number; date: string };

/**
 * 仿 GitHub 的贡献图，支持交互式点击和拖拽绘制贡献次数。
 *
 * 功能说明：
 * - 画笔模式：点击或拖拽绘制格子，贡献只会逐步加深：0 -> 1 -> 3 -> 6 -> 9；达到最深绿色（9）后不再变化。
 * - 橡皮擦模式：点击或拖擦清除格子贡献（清零仅通过橡皮擦）。
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
	// 登录相关状态
	const [userInfo, setUserInfo] = React.useState<{ username: string; email: string; avatarUrl?: string } | null>(null);
	const [isLoggingIn, setIsLoggingIn] = React.useState<boolean>(false);
	const loginTimeoutRef = React.useRef<number | null>(null);
	
	// 推送仓库相关状态
	const [showPushDialog, setShowPushDialog] = React.useState<boolean>(false);
	const [userRepos, setUserRepos] = React.useState<any[]>([]);
	const [isPushing, setIsPushing] = React.useState<boolean>(false);
	// 保存待生成的贡献数据
	const [pendingContributions, setPendingContributions] = React.useState<any[]>([]);

	// 加载用户信息
	React.useEffect(() => {
		const loadUser = async () => {
			try {
				const info = await LoadUserInfo();
				if (info) {
					setUserInfo({ 
						username: info.username, 
						email: info.email,
						avatarUrl: info.avatarUrl 
					});
				}
			} catch (error) {
				console.error("加载用户信息失败:", error);
			}
		};
		loadUser();
	}, []);
	
	// 加载用户仓库列表
	const loadUserRepos = React.useCallback(async () => {
		if (!userInfo) return;
		try {
			const repos = await GetUserRepos();
			setUserRepos(repos || []);
		} catch (error) {
			console.error("加载仓库列表失败:", error);
		}
	}, [userInfo]);

	// 绘画模式状态
	const [drawMode, setDrawMode] = React.useState<DrawMode>('pen');
	const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
	const [lastHoveredDate, setLastHoveredDate] = React.useState<string | null>(null);
	const [hasDragged, setHasDragged] = React.useState<boolean>(false);
    const [isGeneratingRepo, setIsGeneratingRepo] = React.useState<boolean>(false);
    const [isMaximized, setIsMaximized] = React.useState<boolean>(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerVars, setContainerVars] = React.useState<React.CSSProperties>({});

    // 字符预览状态
    const [previewMode, setPreviewMode] = React.useState<boolean>(false);
    const [previewCharacter, setPreviewCharacter] = React.useState<string>('');
    const [previewDates, setPreviewDates] = React.useState<Set<string>>(new Set());
    const [previewCenterDate, setPreviewCenterDate] = React.useState<string | null>(null);

	// 允许选择年份，过滤贡献数据
	const years = Array.from(new Set(originalContributions.map(c => new Date(c.date).getFullYear()))).sort((a, b) => b - a);
	const filteredContributions = originalContributions.filter(c => new Date(c.date).getFullYear() === year);

	// 映射当年原始数据，便于在画笔模式下参考基础贡献数
	const originalCountMap = React.useMemo(() => {
		return new Map(filteredContributions.map(c => [c.date, c.count] as const));
	}, [filteredContributions]);

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

	// 计算字符预览的日期列表 - 以指定日期为中心
	const calculatePreviewDates = React.useCallback((char: string, centerDateStr: string | null) => {
		if (!char || !centerDateStr || filteredContributions.length === 0) {
			return new Set<string>();
		}

		const pattern = characterToPattern(char);
		const previewDatesSet = new Set<string>();

		// 找到中心日期在日历中的位置
		const centerContribution = filteredContributions.find(c => c.date === centerDateStr);
		if (!centerContribution) return new Set<string>();

		const centerDate = new Date(centerDateStr);
		const yearStart = new Date(year, 0, 1);
		const daysSinceYearStart = Math.floor((centerDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
		
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
						const daysOffset = (targetCol * 7 + targetRow) - (centerWeek * 7 + centerRow);
						const targetDate = new Date(centerDate);
						targetDate.setDate(targetDate.getDate() + daysOffset);
						
						const dateStr = targetDate.toISOString().slice(0, 10);

						// 检查该日期是否存在于贡献数据中且不是未来日期
						const contribution = filteredContributions.find(c => c.date === dateStr);
						if (contribution && !isFutureDate(dateStr)) {
							previewDatesSet.add(dateStr);
						}
					}
				}
			}
		}

		return previewDatesSet;
	}, [filteredContributions, year, isFutureDate]);

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

	// 取消登录
	const handleCancelLogin = React.useCallback(() => {
		if (loginTimeoutRef.current) {
			clearTimeout(loginTimeoutRef.current);
			loginTimeoutRef.current = null;
		}
		setIsLoggingIn(false);
		console.log("用户取消登录");
	}, []);

	// 处理登录
	const handleLogin = async () => {
		if (isLoggingIn) {
			// 如果正在登录，则取消
			handleCancelLogin();
			return;
		}

		setIsLoggingIn(true);
		
		// 设置客户端超时（2分钟）
		loginTimeoutRef.current = setTimeout(() => {
			if (isLoggingIn) {
				setIsLoggingIn(false);
				alert("登录超时，请重试。");
			}
		}, 120000); // 2分钟超时

		try {
			const response = await StartOAuthLogin();
			
			// 清除超时
			if (loginTimeoutRef.current) {
				clearTimeout(loginTimeoutRef.current);
				loginTimeoutRef.current = null;
			}

			if (response.success && response.userInfo) {
				setUserInfo({
					username: response.userInfo.username,
					email: response.userInfo.email,
					avatarUrl: response.userInfo.avatarUrl,
				});
				alert("登录成功！");
			} else {
				// 显示详细错误信息
				const errorMsg = response.message || "登录失败";
				alert(errorMsg);
			}
		} catch (error) {
			// 清除超时
			if (loginTimeoutRef.current) {
				clearTimeout(loginTimeoutRef.current);
				loginTimeoutRef.current = null;
			}
			
			console.error("登录失败:", error);
			const errorMsg = error instanceof Error ? error.message : String(error);
			alert("登录失败: " + errorMsg);
		} finally {
			setIsLoggingIn(false);
		}
	};

	// 组件卸载时清除超时
	React.useEffect(() => {
		return () => {
			if (loginTimeoutRef.current) {
				clearTimeout(loginTimeoutRef.current);
			}
		};
	}, []);

	// 处理退出登录
	const handleLogout = async () => {
		try {
			await Logout();
			setUserInfo(null);
			alert(t("loginButton.logoutSuccess"));
		} catch (error) {
			console.error("退出登录失败:", error);
			alert(t("loginButton.logoutFailed", { message: String(error) }));
		}
	};

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
		setPreviewCenterDate(null);
		setPreviewMode(true);
	}, []);

	// 取消字符预览
	const handleCancelCharacterPreview = React.useCallback(() => {
		setPreviewMode(false);
		setPreviewCharacter('');
		setPreviewDates(new Set());
		setPreviewCenterDate(null);
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
		if (!userInfo) {
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

		// 保存贡献数据
		setPendingContributions(contributionsForBackend);
		
		// 加载用户仓库列表
		await loadUserRepos();
		
		// 直接显示弹窗，让用户配置
		setShowPushDialog(true);
	}, [filteredContributions, userContributions, loadUserRepos, t, userInfo]);

	// 处理推送到GitHub（先生成仓库，再推送）
	const handlePush = async (params: {
		repoPath: string;
		repoName: string;
		isNewRepo: boolean;
		isPrivate: boolean;
		forcePush: boolean;
		commitCount: number;
	}) => {
		if (!userInfo) {
			console.error('[Push] 用户未登录');
			return;
		}
		
		console.log('[Push] 开始推送流程');
		console.log('[Push] 参数:', {
			repoName: params.repoName,
			isNewRepo: params.isNewRepo,
			isPrivate: params.isPrivate,
			forcePush: params.forcePush,
			contributionsCount: pendingContributions.length,
		});
		
		setIsPushing(true);
		try {
			// 第一步：生成本地仓库
			console.log('[Push] 步骤1: 生成本地仓库');
			const generatePayload = main.GenerateRepoRequest.createFrom({
				year,
				githubUsername: userInfo.username.trim(),
				githubEmail: userInfo.email.trim(),
				repoName: params.repoName,
				contributions: pendingContributions,
			});
			
			console.log('[Push] 生成仓库请求:', {
				year,
				username: userInfo.username,
				email: userInfo.email,
				repoName: params.repoName,
				contributionsCount: pendingContributions.length,
			});
			
			const generateResult = await GenerateRepo(generatePayload);
			console.log('[Push] 仓库生成成功:', {
				repoPath: generateResult.repoPath,
				commitCount: generateResult.commitCount,
			});
			
			// 第二步：推送到GitHub
			console.log('[Push] 步骤2: 推送到GitHub');
			const pushPayload = main.PushRepoRequest.createFrom({
				repoPath: generateResult.repoPath,
				repoName: params.repoName,
				isNewRepo: params.isNewRepo,
				isPrivate: params.isPrivate,
				forcePush: params.forcePush,
				commitCount: generateResult.commitCount,
			});
			
			console.log('[Push] 推送请求:', pushPayload);
			
			const pushResult = await PushToGitHub(pushPayload);
			console.log('[Push] 推送结果:', pushResult);
			
			if (pushResult.success) {
				console.log('[Push] ✓ 推送成功');
				alert(`推送成功！\n\n${pushResult.message}\n\n仓库地址：${pushResult.repoUrl}`);
				setShowPushDialog(false);
				setPendingContributions([]);
			} else {
				console.error('[Push] ✗ 推送失败:', pushResult.message);
				alert(`推送失败：\n\n${pushResult.message}`);
			}
		} catch (error) {
			console.error('[Push] ✗ 异常:', error);
			const message = error instanceof Error ? error.message : String(error);
			alert(`操作失败: ${message}`);
		} finally {
			setIsPushing(false);
			console.log('[Push] 推送流程结束');
		}
	};

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
			result.contributions.forEach(c => {
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
	const handleTileAction = (dateStr: string, mode: DrawMode) => {
		if (isFutureDate(dateStr)) {
			return;
		}
		if (mode === 'pen') {
			setUserContributions(prev => {
				// 当前展示值：优先用户覆写，否则原始值
				const effective = (prev.get(dateStr) ?? originalCountMap.get(dateStr) ?? 0);
				// 已是最深绿色（>=9）则不再变化
				if (effective >= 9) return prev;

				// 步进仅基于用户当前覆写（若没有则从0开始）
				const current = prev.get(dateStr) ?? 0;
				let nextCount = 0;
				if (current < 1) nextCount = 1;
				else if (current < 3) nextCount = 3;
				else if (current < 6) nextCount = 6;
				else nextCount = 9;

				const newMap = new Map(prev);
				newMap.set(dateStr, nextCount);
				return newMap;
			});
		} else if (mode === 'eraser') {
			setUserContributions(prev => {
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
			setDrawMode(prevMode => (prevMode === 'pen' ? 'eraser' : 'pen'));
			return;
		}

		setIsDrawing(true);
		setLastHoveredDate(dateStr);
		setHasDragged(false);
		handleTileAction(dateStr, drawMode);
	};

	const handleMouseEnter = (dateStr: string) => {
		if (isFutureDate(dateStr)) {
			return;
		}
		
		// 预览模式：实时更新预览位置
		if (previewMode && previewCharacter) {
			setPreviewCenterDate(dateStr);
			const newPreviewDates = calculatePreviewDates(previewCharacter, dateStr);
			setPreviewDates(newPreviewDates);
			return;
		}
		
		// 绘制模式
		if (isDrawing && dateStr !== lastHoveredDate) {
			setLastHoveredDate(dateStr);
			setHasDragged(true);
			handleTileAction(dateStr, drawMode);
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
				data-future={future ? "true" : undefined}
				title={isPreviewDate ? t('characterSelector.previewTooltip', { char: previewCharacter }) : getTooltip(displayOneDay, date)}
				onMouseDown={(e) => {
					if (previewMode) {
						// 预览模式下，左键应用，右键取消
						if (e.button === 0) { // 左键
							handleApplyCharacterPreview();
						} else if (e.button === 2) { // 右键
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
					cursor: future ? 'not-allowed' : (previewMode ? 'pointer' : (drawMode === 'pen' ? 'crosshair' : 'grab')),
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
					onGenerateRepo={handleGenerateRepo}
					isGeneratingRepo={isGeneratingRepo}
					onExportContributions={handleExportContributions}
					onImportContributions={handleImportContributions}
					// 字符预览相关
					onStartCharacterPreview={handleStartCharacterPreview}
					previewMode={previewMode}
					onCancelCharacterPreview={handleCancelCharacterPreview}
					// 登录相关
					userInfo={userInfo}
					onLogin={handleLogin}
					onLogout={handleLogout}
					isLoggingIn={isLoggingIn}
				/>
			</div>

			{/* 推送仓库弹窗 */}
			{showPushDialog && (
				<PushRepoDialog
					onClose={() => setShowPushDialog(false)}
					onPush={handlePush}
					repoPath=""
					commitCount={pendingContributions.length}
					userRepos={userRepos}
					isLoading={isPushing}
				/>
			)}
		</div>
	);
}

// 里头需要循环 365 次，耗时 3ms，还是用 memo 包装下吧。
export default React.memo(ContributionCalendar);

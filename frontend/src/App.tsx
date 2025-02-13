import './App.css';
import ContributionCalendar, { OneDay } from './components/ContributionCalendar';

function App() {

    // 生成空的年度数据结构（从年初到年末，所有贡献次数为0）
    const generateEmptyYearData = (year: number): OneDay[] => {
        const data: OneDay[] = [];
        const start = new Date(year, 0, 1); // 年初
        const end = new Date(year, 11, 31); // 年末

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            data.push({
                date: d.toISOString().slice(0, 10), // YYYY-MM-DD
                count: 0,
                level: 0,
            });
        }
        return data;
    };

    // 生成多个年份的空数据（从2008年到当前年份）
    const generateMultiYearData = (): OneDay[] => {
        const data: OneDay[] = [];
        const currentYear = new Date().getFullYear();

        for (let year = 2008; year <= currentYear; year++) {
            data.push(...generateEmptyYearData(year));
        }
        return data;
    };

    const multiYearData: OneDay[] = generateMultiYearData();

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-black mb-2">GitHub Contribution Calendar</h1>
                    <p className="text-black">Visualize and customize your GitHub contribution history</p>
                    <p className="text-black">在可视化画板上自定义你的GitHub贡献历史</p>
                </header>
                <main className="flex justify-center">
                    <div className="bg-white rounded-none shadow-none p-6 border border-black">
                        <ContributionCalendar contributions={multiYearData}></ContributionCalendar>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default App

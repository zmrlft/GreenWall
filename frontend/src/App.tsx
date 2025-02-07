import {useState} from 'react';
import './App.css';
import ContributionCalendar, { OneDay } from './components/ContributionCalendar';

function App() {

    // 生成完整的年度数据（从年初到年末）
    const generateYearlyData = (year: number): OneDay[] => {
        const data: OneDay[] = [];
        const start = new Date(year, 0, 1); // 年初
        const end = new Date(year, 11, 31); // 年末

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const count = Math.floor(Math.random() * 15); // 0-14个贡献，方便测试各个等级

            // 根据贡献数量计算正确的level
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (count >= 1 && count <= 2) level = 1;
            else if (count >= 3 && count <= 5) level = 2;
            else if (count >= 6 && count <= 8) level = 3;
            else if (count > 8) level = 4;

            data.push({
                date: d.toISOString().slice(0, 10), // YYYY-MM-DD
                count: count,
                level: level,
            });
        }
        return data;
    };

    // 生成最近几年的数据
    const currentYear = new Date().getFullYear();
    const fakeData: OneDay[] = [];

    // 生成2022-2024年的数据
    for (let year = 2022; year <= currentYear; year++) {
        fakeData.push(...generateYearlyData(year));
    }

    return (
        <div id="App">
            <div>
                <ContributionCalendar contributions={fakeData}></ContributionCalendar>
            </div>
        </div>
    )
}

export default App

import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {Greet} from "../wailsjs/go/main/App";
import ContributionCalendar, { OneDay } from './components/ContributionCalendar';

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const updateName = (e: any) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    function greet() {
        Greet(name).then(updateResultText);
    }

    // 先随便拼 365 天的假数据
    const fakeData: OneDay[] = Array.from({ length: 365 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (365 - i));
        return {
            date: date.toISOString().slice(0, 10), // YYYY-MM-DD
            count: Math.floor(Math.random() * 5),
            level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4,
        };
    });

    

    return (
        <div id="App">
            <img src={logo} id="logo" alt="logo"/>
            <div id="result" className="result">{resultText}</div>
            <div>
                <ContributionCalendar contributions={fakeData}></ContributionCalendar>
            </div>
            <div id="input" className="input-box">
                <input id="name" className="input" onChange={updateName} autoComplete="off" name="input" type="text"/>
                <button className="btn" onClick={greet}>Greet</button>
            </div>
        </div>
    )
}

export default App

import React from "react";
import clsx from "clsx";

type Props = {
    year?: number;
    onYearChange: (year: number) => void;
    drawMode?: 'pen' | 'eraser';
    onDrawModeChange: (mode: 'pen' | 'eraser') => void;
    onReset?: () => void;
    githubUsername: string;
    githubEmail: string;
    onGithubUsernameChange: (username: string) => void;
    onGithubEmailChange: (email: string) => void;
};

export const CalendarControls: React.FC<Props> = ({
    year,
    onYearChange,
    drawMode,
    onDrawModeChange,
    onReset,
    githubUsername,
    githubEmail,
    onGithubUsernameChange,
    onGithubEmailChange,
}) => {
    const [yearInput, setYearInput] = React.useState<string>(() =>
        typeof year === 'number' ? String(year) : '',
    );

    React.useEffect(() => {
        setYearInput(typeof year === 'number' ? String(year) : '');
    }, [year]);

    const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setYearInput(value);

        if (value === '') {
            return;
        }

        const parsed = Number(value);
        const currentYear = new Date().getFullYear();
        if (!Number.isNaN(parsed) && parsed >= 2008 && parsed <= currentYear) {
            onYearChange(parsed);
        }
    };

    const handleYearBlur = () => {
        const parsed = Number(yearInput);
        const currentYear = new Date().getFullYear();
        const isValid =
            yearInput !== '' &&
            !Number.isNaN(parsed) &&
            parsed >= 2008 &&
            parsed <= currentYear;

        if (!isValid) {
            setYearInput(typeof year === 'number' ? String(year) : '');
        }
    };

    return (
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex w-full flex-col space-y-2 sm:w-72">
                <label htmlFor="github-username-input" className="text-sm font-medium text-black">
                    GitHub Username
                </label>
                <input
                    id="github-username-input"
                    type="text"
                    value={githubUsername}
                    onChange={(event) => onGithubUsernameChange(event.target.value)}
                    placeholder="octocat"
                    autoComplete="username"
                    className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            <div className="flex w-full flex-col space-y-2 sm:w-72">
                <label htmlFor="github-email-input" className="text-sm font-medium text-black">
                    GitHub Email
                </label>
                <input
                    id="github-email-input"
                    type="email"
                    value={githubEmail}
                    onChange={(event) => onGithubEmailChange(event.target.value)}
                    placeholder="monalisa@github.com"
                    autoComplete="email"
                    className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            <div className="flex w-full flex-col space-y-2 sm:w-28">
                <label htmlFor="year-input" className="text-sm font-medium text-black">
                    Year
                </label>
                <input
                    id="year-input"
                    type="number"
                    min="2008"
                    max={new Date().getFullYear()}
                    value={yearInput}
                    onChange={handleYearChange}
                    onBlur={handleYearBlur}
                    className="w-full rounded-none border border-black px-3 py-2 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
            </div>

            <div className="flex w-full flex-col space-y-2 sm:w-auto">
                <span className="text-sm font-medium text-black">Draw Mode</span>
                <div className="grid gap-2 sm:flex sm:flex-nowrap sm:gap-2">
                    <button
                        type="button"
                        onClick={() => onDrawModeChange('pen')}
                        className={clsx(
                            'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200 sm:w-auto',
                            drawMode === 'pen'
                                ? 'scale-105 transform bg-black text-white shadow-lg'
                                : 'border border-black bg-white text-black hover:bg-gray-100',
                        )}
                        title="Pen mode - click or drag to add contributions"
                    >
                        Pen
                    </button>
                    <button
                        type="button"
                        onClick={() => onDrawModeChange('eraser')}
                        className={clsx(
                            'flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-all duration-200 sm:w-auto',
                            drawMode === 'eraser'
                                ? 'scale-105 transform bg-black text-white shadow-lg'
                                : 'border border-black bg-white text-black hover:bg-gray-100',
                        )}
                        title="Eraser mode - click or drag to clear contributions"
                    >
                        Eraser
                    </button>
                </div>
            </div>

            <div className="flex w-full flex-col space-y-2 sm:ml-auto sm:w-auto">
                <span className="text-sm font-medium text-black sm:invisible">Action</span>
                <button
                    type="button"
                    onClick={onReset}
                    className="w-full rounded-none bg-black px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-gray-800 sm:w-auto"
                    title="Clear all customised contribution data"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

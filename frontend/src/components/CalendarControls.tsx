import clsx from "clsx";

type Props = {
    year?: number;
    onYearChange: (year: number) => void;
    drawMode?: 'pen' | 'eraser';
    onDrawModeChange: (mode: 'pen' | 'eraser') => void;
    onReset?: () => void;
};

export const CalendarControls: React.FC<Props> = ({
    year,
    onYearChange,
    drawMode,
    onDrawModeChange,
    onReset,
}) => {
    return (
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex w-full max-w-sm flex-col space-y-2 sm:max-w-[160px]">
                <label htmlFor="year-input" className="text-sm font-medium text-black">
                    Year
                </label>
                <input
                    id="year-input"
                    type="number"
                    min="2008"
                    max={new Date().getFullYear()}
                    value={year ?? ''}
                    onChange={(e) => onYearChange(Number(e.target.value))}
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

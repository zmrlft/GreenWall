/* eslint-disable react/no-unescaped-entities */
import React, { useState } from 'react';

interface ContributionDay {
  date: string;
  count: number;
}

interface RandomPaintRequest {
  startDate: string;
  endDate: string;
  density: number;
  minPerDay: number;
  maxPerDay: number;
  excludeWeekend: boolean;
  randomSeed: number;
}

interface RandomPaintResponse {
  contributions: ContributionDay[];
  totalDays: number;
  activeDays: number;
  totalCommits: number;
}

interface RandomPaintModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (contributions: ContributionDay[]) => void;
}

const RandomPaintModal: React.FC<RandomPaintModalProps> = ({ open, onClose, onApply }) => {
  const [config, setConfig] = useState<RandomPaintRequest>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    density: 0.7,
    minPerDay: 1,
    maxPerDay: 3,
    excludeWeekend: true,
    randomSeed: 0,
  });

  const [previewData, setPreviewData] = useState<RandomPaintResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePreview = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const backend = await import('../../wailsjs/go/main/App');
      if (backend.GenerateRandomContributions) {
        const result = await backend.GenerateRandomContributions(config);
        setPreviewData(result);
      } else {
        throw new Error('后端函数未找到');
      }
    } catch (err) {
      console.error('生成预览失败:', err);
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (previewData) {
      onApply(previewData.contributions);
      onClose();
    }
  };

  React.useEffect(() => {
    if (!open) {
      setPreviewData(null);
      setError(null);
      setIsGenerating(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">🎲 随机刷墙</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="p-6">
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">配置</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1">开始日期</label>
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">结束日期</label>
                    <input
                      type="date"
                      value={config.endDate}
                      onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">密度: {(config.density * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.density}
                      onChange={(e) =>
                        setConfig({ ...config, density: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">每日提交</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.minPerDay}
                        onChange={(e) =>
                          setConfig({ ...config, minPerDay: parseInt(e.target.value) || 1 })
                        }
                        className="w-20 p-2 border rounded"
                        placeholder="最少"
                      />
                      <span className="self-center">到</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.maxPerDay}
                        onChange={(e) =>
                          setConfig({ ...config, maxPerDay: parseInt(e.target.value) || 1 })
                        }
                        className="w-20 p-2 border rounded"
                        placeholder="最多"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="excludeWeekend"
                      checked={config.excludeWeekend}
                      onChange={(e) => setConfig({ ...config, excludeWeekend: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="excludeWeekend">排除周末</label>
                  </div>

                  <button
                    onClick={handleGeneratePreview}
                    disabled={isGenerating}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isGenerating ? '生成中...' : '生成预览'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">预览</h3>

                {previewData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-gray-100 rounded">
                        <div className="text-sm">总天数</div>
                        <div className="text-xl font-bold">{previewData.totalDays}</div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded">
                        <div className="text-sm">活跃天数</div>
                        <div className="text-xl font-bold">{previewData.activeDays}</div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded">
                        <div className="text-sm">总提交</div>
                        <div className="text-xl font-bold">{previewData.totalCommits}</div>
                      </div>
                      <div className="p-3 bg-gray-100 rounded">
                        <div className="text-sm">活跃比例</div>
                        <div className="text-xl font-bold">
                          {((previewData.activeDays / previewData.totalDays) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="border rounded overflow-hidden">
                      <div className="bg-gray-100 p-2 font-medium">贡献数据</div>
                      <div className="max-h-40 overflow-y-auto">
                        {previewData.contributions.slice(0, 10).map((day, i) => (
                          <div key={i} className="flex justify-between p-2 border-b">
                            <span>{day.date}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 rounded-full">
                              {day.count}
                            </span>
                          </div>
                        ))}
                        {previewData.contributions.length > 10 && (
                          <div className="p-2 text-center text-gray-500">
                            还有 {previewData.contributions.length - 10} 条...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎲</div>
                    <p>点击"生成预览"查看结果</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={!previewData}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              应用数据
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomPaintModal;

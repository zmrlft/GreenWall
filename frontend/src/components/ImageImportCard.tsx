import React from 'react';
import clsx from 'clsx';
import { useTranslations } from '../i18n';

type QuantizedGrid = {
  width: number;
  height: number;
  data: number[][];
};

type Props = {
  onPreview?: (grid: QuantizedGrid) => void;
  className?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const levelColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const levelToCount = [0, 1, 3, 6, 9];

function computeQuantileThresholds(values: number[], buckets: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const thresholds: number[] = [];
  for (let i = 1; i < buckets; i++) {
    const idx = Math.floor((sorted.length * i) / buckets);
    thresholds.push(sorted[idx] ?? 255);
  }
  return thresholds;
}

function brightnessToLevel(brightness: number, thresholds: number[]) {
  let level = 0;
  for (const t of thresholds) {
    if (brightness > t) {
      level += 1;
    } else {
      break;
    }
  }
  return clamp(level, 0, 4);
}

export const ImageImportCard: React.FC<Props> = ({ onPreview, className }) => {
  const { t } = useTranslations();
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [autoWidth, setAutoWidth] = React.useState<number | null>(null);
  const [manualWidth, setManualWidth] = React.useState<string>('');
  const [invert, setInvert] = React.useState<boolean>(true);
  const [threshold, setThreshold] = React.useState<number | ''>('');
  const [preview, setPreview] = React.useState<QuantizedGrid | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const targetWidth = React.useMemo(() => {
    const parsed = Number(manualWidth);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return clamp(Math.floor(parsed), 1, 52);
    }
    if (autoWidth !== null) {
      return autoWidth;
    }
    return 14; // safe default
  }, [manualWidth, autoWidth]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const processImage = React.useCallback(
    async (file: File, invertBrightness: boolean, widthOverride?: number) => {
      setIsProcessing(true);
      try {
        const objectUrl = URL.createObjectURL(file);
        setFileUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        });

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const suggestedWidth = clamp(Math.round((w / h) * 7), 1, 52);
        setAutoWidth(suggestedWidth);

        const finalWidth = clamp(widthOverride ?? suggestedWidth, 1, 52);
        const finalHeight = 7;

        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not ready');
        }
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context unavailable');
        }
        ctx.clearRect(0, 0, finalWidth, finalHeight);
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        const { data } = ctx.getImageData(0, 0, finalWidth, finalHeight);

        const brightnessValues: number[] = [];
        const grid: number[][] = Array.from({ length: finalHeight }, () =>
          Array(finalWidth).fill(0)
        );

        const thresholdValue =
          threshold === '' || threshold <= 0 ? null : clamp(Math.floor(threshold), 1, 255);

        for (let y = 0; y < finalHeight; y++) {
          for (let x = 0; x < finalWidth; x++) {
            const idx = (y * finalWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            let value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            if (invertBrightness) {
              value = 255 - value;
            }
            if (thresholdValue !== null && value <= thresholdValue) {
              value = 0;
            }
            brightnessValues.push(value);
            grid[y][x] = value;
          }
        }

        const thresholds = computeQuantileThresholds(brightnessValues, 5);
        const hasVariance = brightnessValues.some((v) => v !== brightnessValues[0]);
        const quantized: number[][] = grid.map((row) =>
          row.map((v) => {
            if (!hasVariance) {
              const linearLevel = Math.round((v / 255) * 4);
              return levelToCount[clamp(linearLevel, 0, 4)];
            }
            return levelToCount[brightnessToLevel(v, thresholds)];
          })
        );

        setPreview({
          width: finalWidth,
          height: finalHeight,
          data: quantized,
        });
      } catch (error) {
        console.error(error);
        window.alert(t('imageImport.loadFailed'));
      } finally {
        setIsProcessing(false);
      }
    },
    [t]
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file, invert);
  };

  const handlePreviewOnCalendar = () => {
    if (!preview) {
      window.alert(t('imageImport.noPreview'));
      return;
    }
    onPreview?.(preview);
  };

  const handleReprocessWithWidth = () => {
    if (!fileUrl) return;
    fetch(fileUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], 'reprocess', { type: blob.type });
        return processImage(file, invert, targetWidth);
      })
      .catch((error) => {
        console.error(error);
        window.alert(t('imageImport.loadFailed'));
      });
  };

  React.useEffect(() => {
    // reprocess when invert toggles
    if (!fileUrl) return;
    fetch(fileUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], 'reprocess', { type: blob.type });
        return processImage(file, invert, targetWidth);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [invert, targetWidth, threshold]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={clsx(
        'flex w-full flex-col gap-3 rounded-xl border border-black/10 bg-white/85 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-black">{t('imageImport.title')}</div>
        <p className="text-sm text-gray-600">{t('imageImport.description')}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={handlePickFile}
          className="w-full rounded-none border border-black bg-white px-3 py-2 text-sm font-medium text-black transition-colors duration-200 hover:bg-gray-100 sm:w-auto"
        >
          {fileUrl ? t('imageImport.changeImage') : t('imageImport.selectImage')}
        </button>
        <div className="text-xs text-gray-600">{t('imageImport.autoWidthHint')}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-black">
          {t('imageImport.targetWidth')}
          <input
            type="number"
            min={1}
            max={52}
            value={manualWidth}
            onChange={(e) => setManualWidth(e.target.value)}
            onBlur={handleReprocessWithWidth}
            className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            placeholder={autoWidth ? String(autoWidth) : undefined}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-black">
          {t('imageImport.threshold')}
          <input
            type="number"
            min={0}
            max={255}
            value={threshold}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                setThreshold('');
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) {
                setThreshold(clamp(Math.floor(n), 0, 255));
              }
            }}
            onBlur={handleReprocessWithWidth}
            className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="0-255"
          />
          <span className="text-[11px] text-gray-500">{t('imageImport.thresholdHint')}</span>
        </label>
        <label className="mt-5 flex items-center gap-2 text-sm text-black sm:mt-auto">
          <input
            type="checkbox"
            checked={invert}
            onChange={(e) => setInvert(e.target.checked)}
            className="h-4 w-4 border-black text-black focus:ring-black"
          />
          {t('imageImport.invert')}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-black">{t('imageImport.preview')}</div>
        <div className="min-h-[120px] rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-3 overflow-x-auto">
          {isProcessing && (
            <div className="text-sm text-gray-600">{t('imageImport.processing')}</div>
          )}
          {!isProcessing && preview && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-0.5">
                {preview.data.map((row, y) => (
                  <div key={y} className="flex flex-row gap-0.5">
                    {row.map((val, x) => {
                      const idx = levelToCount.indexOf(val);
                      const color = levelColors[idx >= 0 ? idx : 0];
                      return (
                        <span
                          key={`${y}-${x}`}
                          style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: color,
                            borderRadius: '2px',
                            display: 'inline-block',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-600">
                {preview.width} × {preview.height} •{' '}
                {fileUrl ? t('imageImport.changeImage') : t('imageImport.selectImage')}
              </div>
            </div>
          )}
          {!isProcessing && !preview && (
            <div className="flex h-full items-center justify-center text-sm text-gray-600">
              {t('imageImport.noPreview')}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      <button
        type="button"
        onClick={handlePreviewOnCalendar}
        disabled={!preview || isProcessing}
        className={clsx(
          'w-full rounded-none px-4 py-2 text-sm font-medium transition-colors duration-200',
          preview && !isProcessing
            ? 'bg-black text-white hover:bg-gray-800'
            : 'cursor-not-allowed border border-gray-400 bg-gray-200 text-gray-500'
        )}
        title={t('imageImport.previewOnCalendarHint')}
      >
        {t('imageImport.previewOnCalendar')}
      </button>
    </div>
  );
};

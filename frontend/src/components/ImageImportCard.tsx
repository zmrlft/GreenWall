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

type Mode = 'auto' | 'binary';

function otsuThreshold(values: number[]): number {
  if (values.length === 0) return 128;
  const hist = new Array(256).fill(0);
  for (const v of values) {
    hist[clamp(Math.round(v), 0, 255)] += 1;
  }
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

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
  const [autoHeight, setAutoHeight] = React.useState<number | null>(null);
  const [manualHeight, setManualHeight] = React.useState<string>('');
  const [invert, setInvert] = React.useState<boolean>(true);
  const [threshold, setThreshold] = React.useState<number | ''>('');
  const [mode, setMode] = React.useState<Mode>('auto');
  const [imageSmoothing, setImageSmoothing] = React.useState<boolean>(true);
  const [binaryRelax, setBinaryRelax] = React.useState<number>(12);
  const [binaryRelax2, setBinaryRelax2] = React.useState<number>(0);
  const [preview, setPreview] = React.useState<QuantizedGrid | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const lastProcessKey = React.useRef<string | null>(null);

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

  const targetHeight = React.useMemo(() => {
    const parsed = Number(manualHeight);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return clamp(Math.floor(parsed), 1, 7);
    }
    if (autoHeight !== null) {
      return clamp(autoHeight, 1, 7);
    }
    return null;
  }, [manualHeight, autoHeight]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const processImage = React.useCallback(
    async (
      file: File,
      invertBrightness: boolean,
      widthOverride?: number,
      heightOverride?: number
    ) => {
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
        const suggestedHeight = clamp(Math.round((h / w) * finalWidth), 1, 7);
        setAutoHeight(suggestedHeight);

        const finalHeight = clamp(heightOverride ?? suggestedHeight, 1, 7);

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
        ctx.imageSmoothingEnabled = imageSmoothing ? true : false;
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

        const nonZero = brightnessValues.filter((v) => v > 0);
        const minNonZero = nonZero.length ? Math.min(...nonZero) : 0;
        const maxNonZero = nonZero.length ? Math.max(...nonZero) : 0;
        const normalizeValue = (v: number) => {
          if (v <= 0) return 0;
          if (maxNonZero === minNonZero) return 255;
          return clamp(Math.round(((v - minNonZero) / (maxNonZero - minNonZero)) * 255), 0, 255);
        };

        const normalizedValues: number[] = [];
        const normalizedGrid: number[][] = grid.map((row) =>
          row.map((v) => {
            const nv = normalizeValue(v);
            normalizedValues.push(nv);
            return nv;
          })
        );

        const effectiveValues = normalizedValues.filter((v) => v > 0);
        const sourceForQuantile =
          effectiveValues.length > 0 && effectiveValues.some((v) => v !== effectiveValues[0])
            ? effectiveValues
            : normalizedValues;
        const thresholds = computeQuantileThresholds(sourceForQuantile, 5);
        const hasVariance = sourceForQuantile.some((v) => v !== sourceForQuantile[0]);
        const otsu = otsuThreshold(sourceForQuantile);
        const binarize = (thr: number) =>
          normalizedGrid.map((row) =>
            row.map((v) => (v > thr ? levelToCount[4] : levelToCount[0]))
          );

        let quantized: number[][] = [];
        if (mode === 'binary') {
          const quantizedOtsu = binarize(otsu);
          const activeOtsu = quantizedOtsu.flat().filter((v) => v > 0).length;
          let chosen = quantizedOtsu;

          if (binaryRelax > 0) {
            const relaxedThr = clamp(otsu - binaryRelax, 0, 255);
            const quantizedRelax = binarize(relaxedThr);
            const activeRelax = quantizedRelax.flat().filter((v) => v > 0).length;
            const sparseThreshold = (finalWidth * finalHeight) / 20;
            if (activeRelax > activeOtsu || activeOtsu < sparseThreshold) {
              chosen = quantizedRelax;
            }
          }

          if (binaryRelax2 > 0) {
            const relaxedThr2 = clamp(otsu - binaryRelax - binaryRelax2, 0, 255);
            const quantizedRelax2 = binarize(relaxedThr2);
            const activeRelax2 = quantizedRelax2.flat().filter((v) => v > 0).length;
            const activeChosen = chosen.flat().filter((v) => v > 0).length;
            if (activeRelax2 > activeChosen) {
              chosen = quantizedRelax2;
            }
          }
          quantized = chosen;
        } else {
          quantized = normalizedGrid.map((row) =>
            row.map((v) => {
              if (!hasVariance) {
                const linearLevel = Math.round((v / 255) * 4);
                return levelToCount[clamp(linearLevel, 0, 4)];
              }
              return levelToCount[brightnessToLevel(v, thresholds)];
            })
          );
        }

        setPreview({
          width: finalWidth,
          height: finalHeight,
          data: quantized,
        });
        const processKey = [
          objectUrl,
          finalWidth,
          finalHeight,
          invertBrightness ? 1 : 0,
          thresholdValue ?? 'none',
          mode,
          imageSmoothing ? 1 : 0,
          binaryRelax,
          binaryRelax2,
        ].join('|');
        lastProcessKey.current = processKey;
      } catch (error) {
        console.error(error);
        window.alert(t('imageImport.loadFailed'));
      } finally {
        setIsProcessing(false);
      }
    },
    [t, threshold, mode, invert, imageSmoothing, binaryRelax, binaryRelax2]
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file, invert);
    // allow selecting the same filename again by resetting the input value
    event.target.value = '';
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
        return processImage(file, invert, targetWidth, targetHeight ?? undefined);
      })
      .catch((error) => {
        console.error(error);
        window.alert(t('imageImport.loadFailed'));
      });
  };
  React.useEffect(() => {
    // reprocess when parameters change, but skip if same key (avoid flicker loops)
    if (!fileUrl || isProcessing) return;
    const desiredKey = [
      fileUrl,
      targetWidth,
      targetHeight,
      invert ? 1 : 0,
      threshold === '' ? 'none' : threshold,
      mode,
      imageSmoothing ? 1 : 0,
      binaryRelax,
      binaryRelax2,
    ].join('|');
    if (lastProcessKey.current === desiredKey) return;

    fetch(fileUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], 'reprocess', { type: blob.type });
        return processImage(file, invert, targetWidth, targetHeight ?? undefined);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [
    invert,
    targetWidth,
    targetHeight,
    threshold,
    mode,
    imageSmoothing,
    binaryRelax,
    binaryRelax2,
    fileUrl,
    isProcessing,
  ]);

  return (
    <div
      className={clsx(
        'flex w-full flex-col gap-3 rounded-xl border border-black/10 bg-white/85 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-black">{t('imageImport.title')}</div>
        {t('imageImport.description') && (
          <p className="text-sm text-gray-600">{t('imageImport.description')}</p>
        )}
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
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
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
            placeholder={autoWidth ? String(autoWidth) : '自动'}
          />
          <span className="text-[11px] text-gray-500">{t('imageImport.targetWidthHint')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-black">
          {t('imageImport.targetHeight')}
          <input
            type="number"
            min={1}
            max={7}
            value={manualHeight}
            onChange={(e) => setManualHeight(e.target.value)}
            onBlur={handleReprocessWithWidth}
            className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            placeholder={autoHeight ? String(autoHeight) : '自动'}
          />
          <span className="text-[11px] text-gray-500">{t('imageImport.targetHeightHint')}</span>
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
        <label className="flex flex-col gap-1 text-sm text-black">
          {t('imageImport.mode')}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="auto">{t('imageImport.modeAuto')}</option>
            <option value="binary">{t('imageImport.modeBinary')}</option>
          </select>
          <span className="text-[11px] text-gray-500">{t('imageImport.modeHint')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-black">
          {t('imageImport.smoothing')}
          <select
            value={imageSmoothing ? 'on' : 'off'}
            onChange={(e) => setImageSmoothing(e.target.value === 'on')}
            className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="off">{t('imageImport.smoothingOff')}</option>
            <option value="on">{t('imageImport.smoothingOn')}</option>
          </select>
          <span className="text-[11px] text-gray-500">{t('imageImport.smoothingHint')}</span>
        </label>
        {mode === 'binary' && (
          <>
            <label className="flex flex-col gap-1 text-sm text-black">
              {t('imageImport.binaryRelax')}
              <input
                type="number"
                min={0}
                max={64}
                value={binaryRelax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) {
                    setBinaryRelax(clamp(Math.floor(v), 0, 64));
                  }
                }}
                onBlur={handleReprocessWithWidth}
                className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="0-64"
              />
              <span className="text-[11px] text-gray-500">{t('imageImport.binaryRelaxHint')}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm text-black">
              {t('imageImport.binaryRelax2')}
              <input
                type="number"
                min={0}
                max={64}
                value={binaryRelax2}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) {
                    setBinaryRelax2(clamp(Math.floor(v), 0, 64));
                  }
                }}
                onBlur={handleReprocessWithWidth}
                className="rounded-none border border-black px-3 py-2 text-base transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="0-64"
              />
              <span className="text-[11px] text-gray-500">{t('imageImport.binaryRelax2Hint')}</span>
            </label>
          </>
        )}
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
              <div className="flex flex-col gap-0.5">
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

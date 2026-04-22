import { useMemo, useState } from 'react';
import type { PlatformPriceData } from '../../types/product';

type PriceChartProps = {
    platforms: PlatformPriceData[];
    title?: string;
};

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
} as const;

const PLATFORM_COLORS: Record<string, string> = {
    Coculux: '#B7848C',
    Gardian: '#7A9E9F',
    Hasaki: '#C4A35A',
};

const FALLBACK_COLORS = ['#B7848C', '#7A9E9F', '#C4A35A', '#8A7BAC', '#6B9E6B'];

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(price);

const formatDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const getColor = (platformName: string, index: number): string =>
    PLATFORM_COLORS[platformName] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

export default function PriceChart({ platforms, title = 'Biến động giá gần đây' }: PriceChartProps) {
    const [hoverInfo, setHoverInfo] = useState<{ platformIndex: number; pointIndex: number; } | null>(null);

    const width = 720;
    const height = 220;
    const paddingX = 20;
    const paddingY = 22;

    const chartData = useMemo(() => {
        if (platforms.length === 0) return null;

        const allPrices = platforms.flatMap((p) => p.prices.map((pt) => pt.price));
        const globalMax = Math.max(...allPrices);
        const globalMin = Math.min(...allPrices);
        const range = globalMax - globalMin === 0 ? 1 : globalMax - globalMin;

        const platformChartData = platforms.map((platform, pIdx) => {
            const points = platform.prices.map((pt, index) => {
                const x = platform.prices.length === 1
                    ? width / 2
                    : paddingX + index * ((width - paddingX * 2) / (platform.prices.length - 1));

                const y = height - paddingY - ((pt.price - globalMin) / range) * (height - paddingY * 2);

                return { x, y, price: pt.price, date: pt.crawledAt };
            });

            const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

            const area = points.length > 0
                ? [
                    `${points[0].x},${height - paddingY}`,
                    ...points.map((p) => `${p.x},${p.y}`),
                    `${points[points.length - 1].x},${height - paddingY}`,
                ].join(' ')
                : '';

            return {
                platformName: platform.platformName,
                color: getColor(platform.platformName, pIdx),
                points,
                polyline,
                area,
                latestPrice: platform.latestPrice,
                averagePrice: platform.averagePrice30Days,
                fakePriceWarning: platform.fakePriceIncreaseWarning,
            };
        });

        return { platformChartData, globalMin, globalMax };
    }, [platforms]);

    if (!chartData) return null;

    const { platformChartData, globalMin, globalMax } = chartData;

    const activePoint = hoverInfo !== null ? platformChartData[hoverInfo.platformIndex]?.points[hoverInfo.pointIndex] : null;
    const activePlatform = hoverInfo !== null ? platformChartData[hoverInfo.platformIndex] : null;

    // ĐÃ SỬA: Hàm handlePointerMove mới, nhận dạng mọi đường giá
    const handlePointerMove = (event: React.MouseEvent<SVGRectElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const relativeX = ((event.clientX - rect.left) / rect.width) * width;
        const relativeY = ((event.clientY - rect.top) / rect.height) * height;

        let closestPlatformIndex = 0;
        let closestPointIndex = 0;
        let closestDistance = Infinity;

        platformChartData.forEach((platform, pIdx) => {
            platform.points.forEach((point, ptIdx) => {
                const dx = point.x - relativeX;
                const dy = point.y - relativeY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlatformIndex = pIdx;
                    closestPointIndex = ptIdx;
                }
            });
        });

        setHoverInfo({ platformIndex: closestPlatformIndex, pointIndex: closestPointIndex });
    };

    return (
        <div className="rounded-[30px] border border-stone-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="max-w-2xl">
                <h3 className="text-3xl tracking-normal text-stone-900" style={{ fontFamily: FONT_STACK.serif }}>
                    {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-500">
                    Di chuột vào đường giá để xem thời điểm và mức giá cụ thể.
                </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
                {platformChartData.map((p) => (
                    <div key={p.platformName} className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-6 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm text-stone-600">{p.platformName}</span>
                        {p.fakePriceWarning && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      Cảnh báo tăng giá ảo
                    </span>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-6">
                <div className="relative">
                    {activePoint && activePlatform && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-[18px] border border-stone-200/80 bg-white/95 px-3 py-2 text-xs shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
                            style={{
                                left: `calc(${(activePoint.x / width) * 100}% - 56px)`,
                                top: Math.max(0, (activePoint.y / height) * 100 - 22) + '%',
                            }}
                        >
                            <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide" style={{ color: activePlatform.color }}>
                                {activePlatform.platformName}
                            </p>
                            <p className="whitespace-nowrap font-medium text-stone-900">{formatPrice(activePoint.price)}</p>
                            <p className="mt-1 whitespace-nowrap text-stone-500">{formatDateLabel(activePoint.date)}</p>
                        </div>
                    )}

                    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" onMouseLeave={() => setHoverInfo(null)}>
                        <defs>
                            {platformChartData.map((p) => (
                                <linearGradient key={`grad-${p.platformName}`} id={`grad-${p.platformName}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={p.color} stopOpacity="0.18" />
                                    <stop offset="100%" stopColor={p.color} stopOpacity="0" />
                                </linearGradient>
                            ))}
                        </defs>

                        {platformChartData.map((p) =>
                            p.area ? <polygon key={`area-${p.platformName}`} points={p.area} fill={`url(#grad-${p.platformName})`} /> : null,
                        )}

                        {platformChartData.map((p) => (
                            <polyline key={`line-${p.platformName}`} fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={p.polyline} />
                        ))}

                        {activePoint && activePlatform && (
                            <>
                                <line x1={activePoint.x} y1={paddingY} x2={activePoint.x} y2={height - paddingY} stroke={activePlatform.color} strokeWidth="1.5" strokeDasharray="4 4" />
                                <circle cx={activePoint.x} cy={activePoint.y} r="14" fill={activePlatform.color} fillOpacity="0.15" />
                                <circle cx={activePoint.x} cy={activePoint.y} r="5" fill={activePlatform.color} />
                            </>
                        )}

                        {/* ĐÃ SỬA: Lớp nền duy nhất bắt sự kiện */}
                        <rect x="0" y="0" width={width} height={height} fill="transparent" onMouseMove={handlePointerMove} />
                    </svg>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {platformChartData.map((p) => (
                    <div key={p.platformName} className="rounded-[16px] border border-stone-100 bg-[#FAFAF9] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: p.color }}>
                            {p.platformName}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-stone-900">{formatPrice(p.latestPrice)}</p>
                        <p className="text-xs text-stone-400">TB 30 ngày: {formatPrice(p.averagePrice)}</p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
                <span>Thấp nhất: <span className="font-medium text-stone-900">{formatPrice(globalMin)}</span></span>
                <span>Cao nhất: <span className="font-medium text-stone-900">{formatPrice(globalMax)}</span></span>
            </div>
        </div>
    );
}
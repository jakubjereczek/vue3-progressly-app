// Thin wrapper — state now lives in the Pinia overview store (visible in devtools, survives HMR).
export type { OverviewRange } from '@/stores/overviewStore';
export { useOverviewStore as useOverviewRange } from '@/stores/overviewStore';

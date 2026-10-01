import type { Camera as CameraType } from '../../../domain/types';

export const cameraCopy: Record<CameraType, { title: string; purpose: string; accent: string }> = {
  side: { title: 'Side Profile', purpose: 'Profile geometry, spray length, direction offset, and pattern angle.', accent: '#1d8fff' },
  front: { title: 'Front Pattern', purpose: 'Spray area, equivalent diameter, circularity, and geometric centroid.', accent: '#0D747A' },
};

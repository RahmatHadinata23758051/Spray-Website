import type { Camera as CameraType } from '@spray-paragon/domain';

export const cameraCopy: Record<CameraType, { title: string; purpose: string; accent: string }> = {
  side: { title: 'Profil Samping', purpose: 'Geometri profil, panjang semprot, offset arah, dan sudut semprot.', accent: '#1d8fff' },
  front: { title: 'Pola Depan', purpose: 'Luas semprot, diameter ekuivalen, sirkularitas, dan centroid geometris.', accent: '#0D747A' },
};

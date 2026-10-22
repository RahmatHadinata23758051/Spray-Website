import { DEFAULT_CAPTURE_SAVE_POLICY, type CaptureSavePolicy } from '@spray-paragon/domain';

const CAPTURE_SAVE_POLICY_KEY = 'spraybot:capture-save-policy';

export function getCaptureSavePolicy(): CaptureSavePolicy {
  try {
    const val = localStorage.getItem(CAPTURE_SAVE_POLICY_KEY);
    if (val === 'auto' || val === 'review') return val;
  } catch {
    // ignore localStorage access errors
  }
  return DEFAULT_CAPTURE_SAVE_POLICY;
}

export function setCaptureSavePolicy(policy: CaptureSavePolicy): void {
  try {
    localStorage.setItem(CAPTURE_SAVE_POLICY_KEY, policy);
  } catch {
    // ignore localStorage access errors
  }
}
import { useEffect, useState } from 'react';
import type { WalletId } from '../utils/paymentMethods';

/**
 * Which wallets THIS device can pay with — so Apple Pay is offered on an
 * iPhone, an iPad or a Mac in Safari, and Google Pay in Chrome or on Android,
 * and neither where it would lead nowhere.
 *
 * Apple's own check (ApplePaySession.canMakePayments) is exact. Google Pay
 * has no check short of loading Google's script, so it is offered where the
 * browser has the Payment Request API and is not Apple's — which is where the
 * payment page can show it.
 */
export const detectDeviceWallets = (): WalletId[] => {
  if (typeof window === 'undefined') return [];
  const found: WalletId[] = [];
  try {
    const session = (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } }).ApplePaySession;
    if (session?.canMakePayments?.()) found.push('apple_pay');
  } catch {
    /* not an Apple device, or Apple Pay is disabled */
  }
  const agent = navigator.userAgent;
  const appleBrowser = /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && /Safari/.test(agent) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(agent));
  if ('PaymentRequest' in window && !appleBrowser && !/Firefox/.test(agent)) found.push('google_pay');
  return found;
};

export const useDeviceWallets = (): WalletId[] => {
  const [wallets, setWallets] = useState<WalletId[]>([]);
  useEffect(() => setWallets(detectDeviceWallets()), []);
  return wallets;
};

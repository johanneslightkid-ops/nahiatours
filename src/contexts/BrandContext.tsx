import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrandSettings, BrandSettings } from '../services/brandService';

interface BrandContextType {
  brandSettings: BrandSettings;
  setBrandSettings: (settings: BrandSettings) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

interface BrandProviderProps {
  children: ReactNode;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({ children }) => {
  // What the page holds for the moment before the real settings arrive. No
  // phone and no payment links, so nothing offers a way to pay somebody who
  // was never configured — not even for that one render.
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    brandName: 'Tours',
    phoneNumber: '',
    paypalMeLink: '',
    verifoneLink: '',
    brandicon: '',
    stripeEnabled: false,
    paymentVisibility: { stripe: true, paypal: true, cash: true },
  });

  useEffect(() => {
    const fetchBrand = async () => {
      const settings = await getBrandSettings();
      setBrandSettings(settings);
    };
    fetchBrand();
  }, []);

  return (
    <BrandContext.Provider value={{ brandSettings, setBrandSettings }}>
      {children}
    </BrandContext.Provider>
  );
};

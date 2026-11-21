'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PreferredLanguage } from '../types';

interface Translations {
  [key: string]: {
    om: string;
    am: string;
    en: string;
  };
}

export const translations: Translations = {
  // Brand
  appName: {
    om: 'Buna Gatii Qajeelaa',
    am: 'ቡና ትክክለኛ ዋጋ',
    en: 'Buna Fair Price',
  },
  tagline: {
    om: 'Qotee bultoota buna Jimmaa gatii madaalawaa fi gabaa qulqulluun cimsuu',
    am: 'የጅማ ቡና አምራች ገበሬዎችን ግልፅና ፍትሃዊ ዋጋ በማረጋገጥ ማብቃት',
    en: 'Empowering Jimma coffee farmers with price transparency and fair verified buyers',
  },
  
  // Navigation
  navHome: { om: 'Fuula Duraa', am: 'ዋና ገጽ', en: 'Home' },
  navMarketPrices: { om: 'Gatii Gabaa ECX', am: 'የገበያ ዋጋ (ECX)', en: 'Market Prices' },
  navMarketplace: { om: 'Gabaa Bunaa', am: 'የቡና ገበያ', en: 'Marketplace' },
  navLeaderboard: { om: 'Sadarkaa Qulqullinaa', am: 'ደረጃ ሰንጠረዥ', en: 'Leaderboard' },
  navFarmerPortal: { om: 'Karoora Qotee Bulaa', am: 'የአርሶ አደር መድረክ', en: 'Farmer Portal' },
  navBuyerPortal: { om: 'Karoora Bittaa', am: 'የገዢዎች መድረክ', en: 'Buyer Portal' },
  navAdminPortal: { om: 'Bulchiinsa Sirnaa', am: 'የስርዓት አስተዳዳሪ', en: 'System Admin' },
  navTelegramBot: { om: 'BunaJimma Bot', am: 'ቴሌግራም ቦት', en: 'Telegram Bot' },
  login: { om: 'Seeni', am: 'ግባ', en: 'Sign In' },
  logout: { om: 'Bahi', am: 'ውጣ', en: 'Sign Out' },
  register: { om: 'Galmaa’i', am: 'ይመዝገቡ', en: 'Register' },

  // Hero Section
  heroTitle: {
    om: 'Buna Keessaniif Gatii Qajeelaa Argadhaa',
    am: 'ለቡናዎ ትክክለኛና ፍትሃዊ ዋጋ ያግኙ',
    en: 'Get Real Fair Value for Your Coffee Harvest',
  },
  heroSubtitle: {
    om: 'Gatii gabaa ECX guyyaa guyyaa Jimmaa hordofaa, daldaltoota mirkanaa’an waliin daldalaa, bu’aa keessan dabalaa.',
    am: 'የዕለቱን የጅማ ECX ቡና መነሻ ዋጋ በቀጥታ ይከታተሉ፤ ከተመሰከረላቸው ገዢዎች ጋር በፍትሃዊ ዋጋ ይገበያዩ።',
    en: 'See fair reference prices and floors for Jimma coffee, trade directly with verified fair buyers, and eliminate unfair middleman discounts.',
  },
  browseListings: { om: 'Buna Gabaarra Jiru Ilaali', am: 'የቀረበ ቡና ይመልከቱ', en: 'Browse Coffee' },
  listMyCoffee: { om: 'Buna Koo Gurguruuf Dhiyeessi', am: 'ቡናዎን ለሽያጭ ያቅርቡ', en: 'List Harvest' },
  checkPrices: { om: 'Gatii Har’aa Ilaali', am: 'የዛሬውን ዋጋ ያረጋግጡ', en: 'Check Today’s Price' },

  // Stats
  statFarmers: { om: 'Qotee Bultoota Galmaa’an', am: 'የተመዘገቡ አርሶ አደሮች', en: 'Smallholder Farmers' },
  statTrades: { om: 'Daldala Mirkanaa’e', am: 'የተጠናቀቁ ግብይቶች', en: 'Completed Trades' },
  statFairRate: { om: 'Gatii ECX Ol/Qixxee', am: 'ከመነሻ ዋጋ በላይ የተሸጠ', en: 'Trades Above Floor' },
  statValue: { om: 'Gatii Walii Galaa (ETB)', am: 'አጠቃላይ የገንዘብ ዝውውር', en: 'Total Traded Value' },

  // Market Prices
  dailyFloorPrice: { om: 'Gatii Gadi-aanaa (Floor)', am: 'ዝቅተኛ መነሻ ዋጋ', en: 'Protection Floor' },
  currentAveragePrice: { om: 'Gatii Giddu-galeessaa', am: 'አማካኝ የገበያ ዋጋ', en: 'Current Benchmark' },
  priceCalculator: { om: 'Shallaggii Gatii Bunaa', am: 'የቡና ዋጋ ማሰያ', en: 'Crop Value Calculator' },
  calculateValue: { om: 'Gatii Qajeelaa Shallagi', am: 'ፍትሃዊ ዋጋ አስላ', en: 'Calculate Payout' },
  kgLabel: { om: 'Kiilogiraama (Kg)', am: 'ኪሎግራም (Kg)', en: 'Quantity (Kg)' },
  selectGrade: { om: 'Sadarkaa Bunaa Filadhu', am: 'የቡና ደረጃ ይምረጡ', en: 'Select Grade' },
  estimatedPayout: { om: 'Gatii Qajeelaa Tilmaamame', am: 'የሚገመት ትክክለኛ ገቢ', en: 'Estimated Minimum Payout' },

  // Marketplace & Offers
  fairPriceBadge: { om: 'Gatii Qajeelaa ✓', am: 'ፍትሃዊ ዋጋ ✓', en: 'Fair Price ✓' },
  belowFloorBadge: { om: 'Gatii Madaallii Gadi ⚠️', am: 'ከመነሻ በታች ⚠️', en: 'Below Floor ⚠️' },
  makeOffer: { om: 'Gatii Dhiyeessi', am: 'የግዢ ዋጋ ያቅርቡ', en: 'Make Offer' },
  offeredPrice: { om: 'Gatii Tokkoo (ETB/Kg)', am: 'የቀረበ ዋጋ (ብር/ኪግ)', en: 'Offer (ETB/Kg)' },
  qualityScore: { om: 'Qulqullina (Cupping)', am: 'የጥራት ውጤት', en: 'Quality Score' },
  woredaLocation: { om: 'Aanaa / Bakka', am: 'ወረዳ / አድራሻ', en: 'Woreda' },
  processingMethod: { om: 'Haala Qophii', am: 'አዘገጃጀት', en: 'Processing' },

  // Farmer Portal
  myListings: { om: 'Buna Koo Gabaa Jiru', am: 'ያቀረብኳቸው ቡናዎች', en: 'My Active Listings' },
  incomingOffers: { om: 'Gatiiwwan Dhiyaatan', am: 'የቀረቡልኝ ዋጋዎች', en: 'Incoming Offers' },
  acceptOffer: { om: 'Fudhadhu', am: 'ተቀበል', en: 'Accept' },
  rejectOffer: { om: 'Didii', am: 'ውድቅ አድርግ', en: 'Reject' },
  voiceAssistant: { om: 'Sagaleedhaan Gaafadhu', am: 'በድምፅ ይጠይቁ', en: 'Voice Inquiry' },

  // Buyer Portal
  fairBuyerStatus: { om: 'Sadarkaa Bittoota Qajeeloo', am: 'የፍትሃዊ ገዢነት ደረጃ', en: 'Fair Buyer Score' },
  myOffers: { om: 'Gatiiwwan Ani Dhiyeesse', am: 'ያቀረብኳቸው ዋጋዎች', en: 'My Submitted Offers' },
  verifiedBadge: { om: 'Daldalaa Mirkanaa’e', am: 'የተረጋገጠ ፈቃድ', en: 'Verified Buyer' },

  // Admin Portal
  pendingVerifications: { om: 'Bittoota Mirkaneessa Eegan', am: 'ማረጋገጫ የሚጠብቁ ገዢዎች', en: 'Pending Verifications' },
  approveBuyer: { om: 'Hayyami / Mirkaneessi', am: 'አጽድቅ', en: 'Approve Buyer' },
  rejectBuyer: { om: 'Kufaa Taasisi', am: 'ከልክል', en: 'Reject Buyer' },
  suspiciousAlerts: { om: 'Daldaltoota Gatii Gadi Aansan', am: 'ዝቅተኛ ዋጋ አቅራቢዎች', en: 'Below-Floor Alerts' },
};

interface LanguageContextType {
  language: PreferredLanguage;
  setLanguage: (lang: PreferredLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<PreferredLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem('buna_lang') as PreferredLanguage;
    if (saved && (saved === 'om' || saved === 'am' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: PreferredLanguage) => {
    setLanguage(lang);
    localStorage.setItem('buna_lang', lang);
  };

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

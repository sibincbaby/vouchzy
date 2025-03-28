
import React, { createContext, useContext, useState, useEffect } from "react";
import { VoucherData, VoucherTheme, generateUniqueId } from "@/lib/voucher-utils";

interface VoucherContextProps {
  vouchers: VoucherData[];
  recentVouchers: VoucherData[];
  currentVoucher: VoucherData | null;
  createVoucher: (title: string, code: string, theme: VoucherTheme, provider: string, message?: string, expiryDate?: string) => string;
  getVoucherById: (id: string) => VoucherData | undefined;
  isDuplicateCode: (code: string) => boolean;
  getDailyVoucherCount: () => number;
}

const VoucherContext = createContext<VoucherContextProps | undefined>(undefined);

export function VoucherProvider({ children }: { children: React.ReactNode }) {
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<VoucherData[]>([]);
  const [currentVoucher, setCurrentVoucher] = useState<VoucherData | null>(null);

  // Load vouchers from localStorage on mount
  useEffect(() => {
    const savedVouchers = localStorage.getItem("vouchers");
    if (savedVouchers) {
      setVouchers(JSON.parse(savedVouchers));
    }
    
    const savedRecentVouchers = localStorage.getItem("recentVouchers");
    if (savedRecentVouchers) {
      setRecentVouchers(JSON.parse(savedRecentVouchers));
    }
  }, []);

  // Save vouchers to localStorage when they change
  useEffect(() => {
    if (vouchers.length > 0) {
      localStorage.setItem("vouchers", JSON.stringify(vouchers));
    }
  }, [vouchers]);
  
  // Save recent vouchers to localStorage when they change
  useEffect(() => {
    if (recentVouchers.length > 0) {
      localStorage.setItem("recentVouchers", JSON.stringify(recentVouchers));
    }
  }, [recentVouchers]);

  const createVoucher = (title: string, code: string, theme: VoucherTheme, provider: string, message?: string, expiryDate?: string) => {
    const id = generateUniqueId();
    const newVoucher: VoucherData = {
      id,
      title,
      code,
      theme,
      provider,
      message,
      expiryDate,
      createdAt: Date.now()
    };
    
    setVouchers(prev => [...prev, newVoucher]);
    setCurrentVoucher(newVoucher);
    
    // Update recent vouchers (keep only the last 5)
    setRecentVouchers(prev => {
      const updated = [newVoucher, ...prev].slice(0, 5);
      localStorage.setItem("recentVouchers", JSON.stringify(updated));
      return updated;
    });
    
    return id;
  };

  const getVoucherById = (id: string) => {
    return vouchers.find(v => v.id === id);
  };

  // Modified duplicate code checker to be more strict and exact
  const isDuplicateCode = (code: string): boolean => {
    if (!code) return false;
    
    // Check if this exact code was used today (case insensitive)
    const today = new Date().toDateString();
    const normalizedCode = code.trim().toLowerCase();
    
    // Get vouchers created today only
    const todayVouchers = vouchers.filter(v => 
      new Date(v.createdAt).toDateString() === today
    );
    
    // Check for exact match only (not partial matches)
    return todayVouchers.some(v => 
      v.code.trim().toLowerCase() === normalizedCode
    );
  };

  // Add a method to get the current daily voucher count
  const getDailyVoucherCount = (): number => {
    const voucherCountData = localStorage.getItem('dailyVoucherCount');
    if (!voucherCountData) return 0;
    
    const { count, date } = JSON.parse(voucherCountData);
    const today = new Date().toDateString();
    
    // If it's a new day, reset the counter
    if (date !== today) return 0;
    
    return count;
  };

  return (
    <VoucherContext.Provider value={{ 
      vouchers, 
      recentVouchers,
      currentVoucher, 
      createVoucher, 
      getVoucherById,
      isDuplicateCode,
      getDailyVoucherCount
    }}>
      {children}
    </VoucherContext.Provider>
  );
}

export function useVoucher() {
  const context = useContext(VoucherContext);
  if (context === undefined) {
    throw new Error('useVoucher must be used within a VoucherProvider');
  }
  return context;
}

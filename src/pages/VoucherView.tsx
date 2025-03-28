
import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useVoucher } from "@/contexts/VoucherContext";
import { VoucherDisplay } from "@/components/voucher/VoucherDisplay";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { VoucherData, VoucherTheme, updateMetaTags, isVoucherExpired } from "@/lib/voucher-utils";

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const { getVoucherById } = useVoucher();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voucherData, setVoucherData] = useState<VoucherData | undefined>(undefined);
  
  const location = useLocation();
  
  useEffect(() => {
    // First try to get voucher data from URL parameter
    const searchParams = new URLSearchParams(location.search);
    const encodedData = searchParams.get('data');
    
    if (encodedData) {
      try {
        const decodedData = JSON.parse(atob(decodeURIComponent(encodedData)));
        if (id) {
          const voucher = {
            id,
            title: decodedData.title,
            code: decodedData.code,
            theme: decodedData.theme,
            provider: decodedData.provider || "",
            message: decodedData.message,
            expiryDate: decodedData.expiryDate,
            createdAt: decodedData.createdAt
          };
          
          setVoucherData(voucher);
          
          // Update meta tags with voucher information
          updateMetaTags(voucher.title, voucher.provider, voucher.theme, voucher.message);
          
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error parsing voucher data from URL:", error);
      }
    }
    
    // If no URL data, try to get from local storage
    const storedVoucher = id ? getVoucherById(id) : undefined;
    
    // Short timeout to allow for smooth transitions
    const timer = setTimeout(() => {
      setLoading(false);
      
      if (storedVoucher) {
        setVoucherData(storedVoucher);
        
        // Update meta tags with voucher information
        updateMetaTags(storedVoucher.title, storedVoucher.provider, storedVoucher.theme, storedVoucher.message);
      } else {
        setNotFound(!encodedData); // Only set not found if we also didn't have URL data
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [id, getVoucherById, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-80 h-40 bg-gray-200 rounded-md mb-4"></div>
          <div className="w-60 h-6 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }
  
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Voucher Not Found</h1>
        <p className="text-muted-foreground mb-6">This voucher may have expired or the link is incorrect.</p>
        <Link to="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Create Your Own Voucher
          </Button>
        </Link>
      </div>
    );
  }
  
  // Check if voucher is expired (for UI messaging)
  const isExpired = voucherData?.expiryDate ? isVoucherExpired(voucherData.expiryDate) : false;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {voucherData && <VoucherDisplay voucher={voucherData} />}
      
      <div className="mt-8">
        <Link to="/" className="inline-block">
          <Button variant="outline" size="sm" className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your Own Voucher
          </Button>
        </Link>
      </div>
    </div>
  );
}

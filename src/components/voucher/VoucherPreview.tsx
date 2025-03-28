
import React from "react";
import { Calendar, Copy, MessageSquare, Tag, Clock } from "lucide-react";
import { VoucherData, VoucherTheme, VOUCHER_THEMES, isVoucherExpired, getExpiryTimeRemaining } from "@/lib/voucher-utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface VoucherPreviewProps {
  voucher: Partial<VoucherData>;
  onThemeChange?: (theme: VoucherTheme) => void;
}

export function VoucherPreview({ voucher, onThemeChange }: VoucherPreviewProps) {
  const theme = VOUCHER_THEMES.find(t => t.id === voucher.theme) || VOUCHER_THEMES[0];
  const isExpired = voucher.expiryDate ? isVoucherExpired(voucher.expiryDate) : false;
  const expiryTimeRemaining = voucher.expiryDate ? getExpiryTimeRemaining(voucher.expiryDate) : '';
  
  // Handler to prevent the default form submission when clicking theme buttons
  const handleThemeClick = (e: React.MouseEvent<HTMLButtonElement>, themeId: VoucherTheme) => {
    e.preventDefault(); // Prevent form submission
    if (onThemeChange) {
      onThemeChange(themeId);
    }
  };
  
  return (
    <div className="w-full">
      <h3 className="text-lg font-medium mb-3">Preview</h3>
      
      {onThemeChange && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Theme</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VOUCHER_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={(e) => handleThemeClick(e, t.id)}
                type="button" // Explicitly set to button type to prevent form submission
                className={`${
                  voucher.theme === t.id
                    ? 'ring-2 ring-primary'
                    : ''
                } ${t.colors} p-2 rounded-md text-xs text-center transition-all cursor-pointer flex flex-col items-center justify-center h-14`}
              >
                <span className="text-xl mb-1">{t.emoji}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <Card className={`w-full overflow-hidden shadow-lg ${theme.colors}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Calendar className="h-5 w-5" />
            <div className="text-xs opacity-80">
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <CardTitle className="text-xl font-bold">
              {voucher.title || "Voucher Title"}
            </CardTitle>
            <span className="text-3xl">{theme.emoji}</span>
          </div>
          {voucher.provider && (
            <div className="flex items-center mt-2 text-sm bg-white/10 px-2 py-1 rounded-md w-fit">
              <Tag className="h-3 w-3 mr-1" />
              <span>{voucher.provider}</span>
            </div>
          )}
          
          {voucher.expiryDate && (
            <div className={`mt-2 text-xs ${isExpired ? 'bg-red-500/20' : 'bg-white/10'} px-2 py-1 rounded-md flex items-center w-fit`}>
              <Clock className="h-3 w-3 mr-1" />
              <span>{expiryTimeRemaining}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-xs mb-1 opacity-80">Your voucher code:</p>
            <div className="text-xl font-mono font-bold tracking-wider break-all">
              {isExpired ? (
                <span className="text-red-200">This voucher has expired</span>
              ) : (
                voucher.code || "CODE123"
              )}
            </div>
          </div>
          
          {voucher.message && (
            <div className="mt-3 bg-white/10 p-3 rounded-lg">
              <div className="flex items-center text-xs mb-1">
                <MessageSquare className="h-3 w-3 mr-1" />
                <span className="opacity-80">Personal Message:</span>
              </div>
              <p className="text-xs italic">"{voucher.message}"</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 justify-center pt-0 pb-4">
          <div className="text-xs text-center opacity-70">Preview Mode</div>
        </CardFooter>
      </Card>
    </div>
  );
}

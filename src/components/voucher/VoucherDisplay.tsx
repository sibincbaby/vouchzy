
import React, { useState, useEffect } from "react";
import { Calendar, Copy, Share, Tag, MessageSquare, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  VOUCHER_THEMES, 
  VoucherData, 
  shortenUrl, 
  isVoucherExpired, 
  isVoucherExpiredAsync, 
  getExpiryTimeRemaining, 
  getExpiryTimeRemainingAsync, 
  updateMetaTags 
} from "@/lib/voucher-utils";

interface VoucherDisplayProps {
  voucher: VoucherData;
}

export function VoucherDisplay({ voucher }: VoucherDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [expired, setExpired] = useState(false);
  const [isInitialChecking, setIsInitialChecking] = useState(true);
  
  const theme = VOUCHER_THEMES.find(t => t.id === voucher.theme) || VOUCHER_THEMES[0];
  
  useEffect(() => {
    // Update meta tags for better link sharing
    updateMetaTags(voucher.title, voucher.provider, voucher.theme, voucher.message);
    
    // Check if voucher has expired using server time
    if (voucher.expiryDate) {
      const checkExpiry = async () => {
        // Use both the async and sync methods
        const [isExpiredAsync, timeRemainingAsync] = await Promise.all([
          isVoucherExpiredAsync(voucher.expiryDate),
          getExpiryTimeRemainingAsync(voucher.expiryDate)
        ]);
        
        // Fall back to system time check if server check fails
        const isExpiredSync = isVoucherExpired(voucher.expiryDate);
        const timeRemainingSync = getExpiryTimeRemaining(voucher.expiryDate);
        
        // Use the server check if available, otherwise use the system time check
        setExpired(isExpiredAsync);
        setTimeRemaining(timeRemainingAsync);
        setIsInitialChecking(false);
      };
      
      checkExpiry();
      
      // Update countdown every minute - using both async and sync methods
      const interval = setInterval(() => {
        checkExpiry();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [voucher.expiryDate, voucher.title, voucher.provider, voucher.theme, voucher.message]);
  
  const copyCode = () => {
    if (expired) return;
    
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "The voucher code has been copied to your clipboard.",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareVoucher = async () => {
    setSharing(true);
    try {
      // Get the current URL and add a timestamp to prevent duplicate URLs
      const timestamp = Date.now();
      let currentUrl = window.location.href;
      
      // Add timestamp if not already there
      if (!currentUrl.includes('t=')) {
        currentUrl += (currentUrl.includes('?') ? '&' : '?') + `t=${timestamp}`;
      }
      
      // Shorten the URL with the timestamp
      const shortenedUrl = await shortenUrl(currentUrl);
      
      if (navigator.share) {
        await navigator.share({
          title: "Check out my voucher",
          text: "Check out this voucher I created for you!",
          url: shortenedUrl,
        });
      } else {
        // If Web Share API is not available, copy the shortened link
        await navigator.clipboard.writeText(shortenedUrl);
        toast({
          title: "Link copied!",
          description: "The voucher link is now on your clipboard, ready to send.",
        });
      }
    } catch (error) {
      console.error("Error sharing voucher:", error);
      toast({
        title: "Something went wrong",
        description: "Couldn't prepare your voucher for sharing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };
  
  return (
    <Card className={`w-full max-w-md mx-auto overflow-hidden shadow-lg ${theme.colors}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Calendar className="h-6 w-6" />
          <div className="text-sm opacity-80">
            {new Date(voucher.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <CardTitle className="text-2xl font-bold">{voucher.title}</CardTitle>
          <span className="text-4xl animate-bounce">{theme.emoji}</span>
        </div>
        {voucher.provider && (
          <div className="flex items-center mt-2 text-sm bg-white/10 px-2 py-1 rounded-md w-fit">
            <Tag className="h-3 w-3 mr-1" />
            <span>{voucher.provider}</span>
          </div>
        )}
        
        {voucher.expiryDate && (
          <div className={`mt-2 text-sm ${expired ? 'bg-red-500/20' : 'bg-white/10'} px-2 py-1 rounded-md flex items-center w-fit`}>
            <Clock className="h-4 w-4 mr-1" />
            {isInitialChecking ? (
              <span className="text-xs">Checking expiry...</span>
            ) : (
              <span>{timeRemaining}</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-center">
          <p className="text-sm mb-2 opacity-80">Your voucher code:</p>
          <div className="text-3xl font-mono font-bold tracking-wider break-all">
            {expired ? (
              <span className="text-red-200">This voucher has expired</span>
            ) : (
              voucher.code
            )}
          </div>
        </div>
        
        {voucher.message && (
          <div className="mt-4 bg-white/10 p-3 rounded-lg">
            <div className="flex items-center text-sm mb-1">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="opacity-80">Personal Message:</span>
            </div>
            <p className="text-sm italic">"{voucher.message}"</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 justify-center pt-0">
        <Button 
          onClick={copyCode} 
          variant="secondary" 
          className="text-black bg-white hover:bg-white/90 disabled:opacity-50"
          disabled={expired}
        >
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy Code"}
        </Button>
        <Button 
          onClick={shareVoucher}
          variant="outline" 
          className="border-white text-white bg-white/20 hover:bg-white/30 flex items-center"
          disabled={sharing}
        >
          <Share className="mr-2 h-4 w-4" />
          {sharing ? "Preparing..." : "Send to Friend"}
        </Button>
      </CardFooter>
    </Card>
  );
}

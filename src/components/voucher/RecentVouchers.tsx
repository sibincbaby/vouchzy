
import React, { useState } from "react";
import { useVoucher } from "@/contexts/VoucherContext";
import { Link } from "react-router-dom";
import { Copy, Share, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VOUCHER_THEMES, shortenUrl } from "@/lib/voucher-utils";

export function RecentVouchers() {
  const { recentVouchers } = useVoucher();
  const { toast } = useToast();
  const [sharing, setSharing] = useState<string | null>(null);
  
  if (!recentVouchers.length) {
    return null;
  }
  
  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied!",
      description: "The voucher code has been copied to your clipboard.",
    });
  };
  
  const shareVoucher = async (id: string, url: string) => {
    setSharing(id);
    try {
      // Get the current URL
      const voucherUrl = `${window.location.origin}/voucher/${id}`;
      
      // Shorten the URL
      const shortenedUrl = await shortenUrl(voucherUrl);
      
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
      setSharing(null);
    }
  };
  
  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Recently Created Vouchers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {recentVouchers.map((voucher) => {
            const theme = VOUCHER_THEMES.find(t => t.id === voucher.theme) || VOUCHER_THEMES[0];
            
            return (
              <div key={voucher.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{theme.emoji}</span>
                    <span className="font-medium">{voucher.title}</span>
                    {voucher.provider && (
                      <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                        {voucher.provider}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-sm mt-1 bg-muted/50 px-2 py-1 rounded inline-flex items-center">
                    {voucher.code}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-1"
                      onClick={() => copyVoucherCode(voucher.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link to={`/voucher/${voucher.id}`}>
                    <Button variant="outline" size="sm" className="h-8">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8"
                    onClick={() => shareVoucher(voucher.id, `${window.location.origin}/voucher/${voucher.id}`)}
                    disabled={sharing === voucher.id}
                  >
                    <Share className="h-3 w-3 mr-1" />
                    {sharing === voucher.id ? "Preparing..." : "Send"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

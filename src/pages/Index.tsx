
import React from "react";
import { VoucherCreator } from "@/components/voucher/VoucherCreator";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Create & Share Vouchers</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Create beautiful vouchers with custom themes and share them instantly with anyone.
        </p>
      </div>
      
      <VoucherCreator />
      
      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>Choose a theme, enter your details, and share the code with someone special.</p>
      </div>
    </div>
  );
};

export default Index;

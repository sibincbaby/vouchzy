import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useVoucher } from "@/contexts/VoucherContext";
import { VOUCHER_THEMES, VoucherTheme, shortenUrl, sanitizeText, containsProfanity } from "@/lib/voucher-utils";
import { Gift, Share, Loader, AlertCircle, Calendar, Copy, Check, Info } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VoucherPreview } from "./VoucherPreview";
import { RecentVouchers } from "./RecentVouchers";

// Define maximum character limits
const MAX_CHARS = {
  title: 50,
  provider: 30,
  code: 25,
  message: 150
};

// Define rate limiting constants
const MIN_GENERATION_INTERVAL = 5000; // 5 seconds
const MAX_DAILY_VOUCHERS = 10;

const formSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(MAX_CHARS.title, `Title cannot exceed ${MAX_CHARS.title} characters`),
  code: z.string()
    .min(3, "Code must be at least 3 characters")
    .max(MAX_CHARS.code, `Code cannot exceed ${MAX_CHARS.code} characters`),
  theme: z.enum(["light", "dark", "elegant", "birthday", "wedding", "anniversary", "thank-you", "congratulations"] as const),
  provider: z.string()
    .max(MAX_CHARS.provider, `Provider cannot exceed ${MAX_CHARS.provider} characters`)
    .optional(),
  message: z.string()
    .max(MAX_CHARS.message, `Message cannot exceed ${MAX_CHARS.message} characters`)
    .optional(),
  expiryDate: z.string().optional()
});

export function VoucherCreator() {
  const { toast } = useToast();
  const { createVoucher, isDuplicateCode, getDailyVoucherCount } = useVoucher();
  const [isCreating, setIsCreating] = useState(false);
  const [rateLimitError, setRateLimitError] = useState("");
  const [profanityError, setProfanityError] = useState("");
  const [duplicateError, setDuplicateError] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [dailyVoucherCount, setDailyVoucherCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      code: "",
      theme: "light" as VoucherTheme,
      provider: "",
      message: "",
      expiryDate: ""
    },
  });

  // Check for daily limit on initial load
  useEffect(() => {
    const dailyCount = getDailyVoucherCount();
    setDailyVoucherCount(dailyCount);
    
    if (dailyCount >= MAX_DAILY_VOUCHERS) {
      setLimitReached(true);
      setRateLimitError(`You have reached the daily limit of ${MAX_DAILY_VOUCHERS} vouchers. Please try again tomorrow.`);
    }
  }, [getDailyVoucherCount]);

  // Reset errors when form values change and check for profanity/duplicates
  useEffect(() => {
    if (rateLimitError && !limitReached) setRateLimitError("");
    if (profanityError) setProfanityError("");
    
    // Check for profanity in real-time
    const values = form.getValues();
    const fields = ['title', 'provider', 'code', 'message'] as const;
    
    for (const field of fields) {
      if (values[field] && containsProfanity(values[field] as string)) {
        setProfanityError(`Inappropriate language detected in ${field}. Please remove it.`);
        break;
      }
    }
    
    // Check for duplicate code in real-time - only if there's a change in the code field
    const codeValue = form.watch("code");
    if (codeValue) {
      const isDuplicate = isDuplicateCode(codeValue);
      setDuplicateError(isDuplicate);
    } else {
      setDuplicateError(false);
    }
  }, [form.watch(), rateLimitError, profanityError, isDuplicateCode, limitReached]);

  // Function to check if we can generate a new voucher
  const canGenerateVoucher = (): boolean => {
    // Check for profanity
    const values = form.getValues();
    const fields = ['title', 'provider', 'code', 'message'] as const;
    
    for (const field of fields) {
      if (values[field] && containsProfanity(values[field] as string)) {
        setProfanityError(`Inappropriate language detected in ${field}. Please remove it.`);
        return false;
      }
    }
    
    // Check for duplicate code - reuse the same values variable instead of redeclaring it
    if (isDuplicateCode(values.code)) {
      setDuplicateError(true);
      return false;
    }
    
    // Check for rate limiting
    const lastGeneration = localStorage.getItem('lastVoucherGeneration');
    if (lastGeneration) {
      const timeSinceLastGeneration = Date.now() - parseInt(lastGeneration, 10);
      if (timeSinceLastGeneration < MIN_GENERATION_INTERVAL) {
        setRateLimitError("Please wait a few seconds before generating another voucher.");
        return false;
      }
    }

    // Check for daily limit
    const voucherCountData = localStorage.getItem('dailyVoucherCount');
    if (voucherCountData) {
      const { count, date } = JSON.parse(voucherCountData);
      const today = new Date().toDateString();
      
      // If it's a new day, reset the counter
      if (date !== today) {
        localStorage.setItem('dailyVoucherCount', JSON.stringify({ count: 1, date: today }));
        setDailyVoucherCount(1);
        return true;
      }
      
      // Check if we've hit the limit
      if (count >= MAX_DAILY_VOUCHERS) {
        setRateLimitError(`You have reached the daily limit of ${MAX_DAILY_VOUCHERS} vouchers. Please try again tomorrow.`);
        setLimitReached(true);
        return false;
      }
      
      // Update the counter for today
      localStorage.setItem('dailyVoucherCount', JSON.stringify({ count: count + 1, date: today }));
      setDailyVoucherCount(count + 1);
    } else {
      // First voucher of the day
      const today = new Date().toDateString();
      localStorage.setItem('dailyVoucherCount', JSON.stringify({ count: 1, date: today }));
      setDailyVoucherCount(1);
    }
    
    return true;
  };

  const onContinueToPreview = () => {
    // Validate the form before showing preview
    form.trigger().then(isValid => {
      if (isValid && !profanityError && !duplicateError) {
        setIsPreviewMode(true);
      }
    });
  };
  
  const onBackToDetails = () => {
    setIsPreviewMode(false);
  };
  
  const handleThemeChange = (theme: VoucherTheme) => {
    form.setValue('theme', theme);
  };

  const handleCopyLink = async () => {
    if (shortUrl) {
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      
      // Reset copy success after a delay
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      
      toast({
        title: "Link copied!",
        description: "The voucher link has been copied to your clipboard.",
      });
    }
  };
  
  const handleShareVoucher = async () => {
    if (shortUrl) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Check out my voucher",
            text: "Check out this voucher I created for you!",
            url: shortUrl
          });
          
          toast({
            title: "Shared successfully!",
            description: "Your voucher has been shared.",
          });
        } catch (error) {
          console.error("Error sharing:", error);
          // Fallback to copy if sharing fails
          handleCopyLink();
        }
      } else {
        // Fallback for browsers that don't support share API
        handleCopyLink();
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Explicitly prevent auto-submission when just switching themes
    if (isPreviewMode && !isCreating) {
      console.log("Form submission - actual submit button clicked");
    }
    
    // Check rate limiting and daily limits
    if (!canGenerateVoucher()) {
      return;
    }

    setIsCreating(true);
    
    try {
      // Sanitize inputs for URL shortening
      const sanitizedValues = {
        title: sanitizeText(values.title),
        code: values.code,
        theme: values.theme,
        provider: values.provider ? sanitizeText(values.provider) : "",
        message: values.message ? sanitizeText(values.message) : "",
        expiryDate: values.expiryDate || undefined
      };

      const voucherId = createVoucher(
        sanitizedValues.title, 
        sanitizedValues.code, 
        sanitizedValues.theme, 
        sanitizedValues.provider,
        sanitizedValues.message,
        sanitizedValues.expiryDate
      );
      
      // Create a URL with the voucher ID and add a timestamp to prevent duplicate URLs
      const timestamp = Date.now();
      const baseUrl = `${window.location.origin}/voucher/${voucherId}`;
      
      // Create voucher data with timestamp to make URL unique
      const voucherData = {
        title: sanitizedValues.title,
        code: sanitizedValues.code,
        theme: sanitizedValues.theme,
        provider: sanitizedValues.provider || "",
        message: sanitizedValues.message || "",
        expiryDate: sanitizedValues.expiryDate,
        createdAt: timestamp
      };
      
      const dataParam = encodeURIComponent(btoa(JSON.stringify(voucherData)));
      const universalShareUrl = `${baseUrl}?data=${dataParam}&t=${timestamp}`;
      
      // Shorten the URL
      const shortUrl = await shortenUrl(universalShareUrl);
      setShortUrl(shortUrl);
      
      // Store the last generation time for rate limiting
      localStorage.setItem('lastVoucherGeneration', Date.now().toString());
      
      // Copy the shortened link to clipboard
      await navigator.clipboard.writeText(shortUrl);
      
      toast({
        title: "Voucher created!",
        description: "Your voucher link is ready and copied to your clipboard.",
      });
    } catch (error) {
      console.error("Error creating voucher:", error);
      toast({
        title: "Something went wrong",
        description: "There was a problem creating your voucher. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (limitReached && !isPreviewMode && !shortUrl) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Daily Limit Reached
          </CardTitle>
          <CardDescription className="text-center">
            You have created the maximum number of vouchers for today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Daily Limit Reached</AlertTitle>
            <AlertDescription>
              You have reached the daily limit of {MAX_DAILY_VOUCHERS} vouchers. Please try again tomorrow.
            </AlertDescription>
          </Alert>
          
          <RecentVouchers />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="relative">
          <div className="absolute right-6 top-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-full flex items-center justify-center ${dailyVoucherCount >= MAX_DAILY_VOUCHERS ? 'bg-red-100 text-red-600' : dailyVoucherCount > MAX_DAILY_VOUCHERS * 0.7 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Info className="h-4 w-4" />
                  </div>
                  <span className="ml-1.5 text-xs font-medium">
                    {dailyVoucherCount}/{MAX_DAILY_VOUCHERS}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>You can create up to {MAX_DAILY_VOUCHERS} vouchers per day.</p>
                <p className="text-xs text-muted-foreground">You have created {dailyVoucherCount} today.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {isPreviewMode ? "Preview & Create Your Voucher" : "Create a Voucher"}
          </CardTitle>
          <CardDescription className="text-center">
            {isPreviewMode 
              ? "Check how your voucher will look and select a theme before sharing" 
              : "Enter your voucher details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(rateLimitError || profanityError || duplicateError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>There was a problem</AlertTitle>
              <AlertDescription>
                {rateLimitError || profanityError || (duplicateError ? "This voucher code has already been shared today." : "")}
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!isPreviewMode ? (
                // Details Entry Mode
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Title</FormLabel>
                          <span className={`text-xs ${field.value.length > MAX_CHARS.title * 0.8 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {field.value.length}/{MAX_CHARS.title}
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Birthday Gift Card" 
                            {...field} 
                            maxLength={MAX_CHARS.title}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Provider</FormLabel>
                          <span className={`text-xs ${field.value && field.value.length > MAX_CHARS.provider * 0.8 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {field.value?.length || 0}/{MAX_CHARS.provider}
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Amazon, Starbucks" 
                            {...field} 
                            maxLength={MAX_CHARS.provider}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Voucher Code</FormLabel>
                          <span className={`text-xs ${field.value.length > MAX_CHARS.code * 0.8 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {field.value.length}/{MAX_CHARS.code}
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="e.g. BIRTHDAY2023" 
                            {...field} 
                            maxLength={MAX_CHARS.code}
                            className={duplicateError ? "border-red-500" : ""}
                          />
                        </FormControl>
                        {duplicateError && (
                          <p className="text-sm text-red-500 mt-1">
                            This voucher code has already been shared today.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Message (Optional)</FormLabel>
                          <span className={`text-xs ${field.value && field.value.length > MAX_CHARS.message * 0.8 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {field.value?.length || 0}/{MAX_CHARS.message}
                          </span>
                        </div>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a personal message..." 
                            {...field} 
                            maxLength={MAX_CHARS.message}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormDescription>
                          Add a personal note to accompany your voucher
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Expiry Date (Optional)</FormLabel>
                        </div>
                        <FormControl>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Input 
                              type="date" 
                              {...field} 
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Set an expiration date for your voucher
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={onContinueToPreview}
                    disabled={!form.formState.isValid || !!profanityError || duplicateError}
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Continue to Preview
                  </Button>
                </div>
              ) : (
                // Preview Mode
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <VoucherPreview 
                      voucher={form.getValues()} 
                      onThemeChange={handleThemeChange}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Voucher Details</h3>
                      <dl className="divide-y">
                        <div className="py-2 grid grid-cols-3">
                          <dt className="text-sm font-medium text-muted-foreground">Title</dt>
                          <dd className="col-span-2 text-sm">{form.getValues().title}</dd>
                        </div>
                        {form.getValues().provider && (
                          <div className="py-2 grid grid-cols-3">
                            <dt className="text-sm font-medium text-muted-foreground">Provider</dt>
                            <dd className="col-span-2 text-sm">{form.getValues().provider}</dd>
                          </div>
                        )}
                        <div className="py-2 grid grid-cols-3">
                          <dt className="text-sm font-medium text-muted-foreground">Code</dt>
                          <dd className="col-span-2 text-sm font-mono">{form.getValues().code}</dd>
                        </div>
                        {form.getValues().expiryDate && (
                          <div className="py-2 grid grid-cols-3">
                            <dt className="text-sm font-medium text-muted-foreground">Expires</dt>
                            <dd className="col-span-2 text-sm">
                              {new Date(form.getValues().expiryDate).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                        {form.getValues().message && (
                          <div className="py-2 grid grid-cols-3">
                            <dt className="text-sm font-medium text-muted-foreground">Message</dt>
                            <dd className="col-span-2 text-sm italic">"{form.getValues().message}"</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    
                    {shortUrl ? (
                      <div className="space-y-3">
                        <div className="bg-muted p-3 rounded-md flex items-center">
                          <div className="truncate mr-2 flex-grow text-sm">
                            {shortUrl}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            type="button" 
                            className="flex items-center"
                            onClick={handleShareVoucher}
                          >
                            <Share className="mr-1 h-4 w-4" />
                            Share
                          </Button>
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => {
                            form.reset();
                            setShortUrl(null);
                            setIsPreviewMode(false);
                            setDuplicateError(false); // Reset duplicate error when creating a new voucher
                          }}
                        >
                          Create Another Voucher
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3">
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isCreating || !form.formState.isValid || !!profanityError || duplicateError}
                        >
                          {isCreating ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Share className="mr-2 h-4 w-4" />
                              Create & Send Voucher
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full" 
                          onClick={onBackToDetails}
                          disabled={isCreating}
                        >
                          Back to Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <RecentVouchers />
    </>
  );
}

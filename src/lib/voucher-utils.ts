/**
 * Generates a unique ID for voucher links
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Available voucher themes
 */
export const VOUCHER_THEMES = [
  { 
    id: "light", 
    name: "Light", 
    colors: "bg-gradient-to-r from-blue-50 via-white to-blue-50 text-blue-900", 
    icon: "sun",
    emoji: "☀️"
  },
  { 
    id: "dark", 
    name: "Dark", 
    colors: "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white", 
    icon: "moon",
    emoji: "🌙" 
  },
  { 
    id: "elegant", 
    name: "Elegant", 
    colors: "bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-800 text-white", 
    icon: "sparkles",
    emoji: "✨" 
  },
  { 
    id: "birthday", 
    name: "Birthday", 
    colors: "bg-gradient-to-r from-pink-500 via-pink-400 to-purple-600 text-white", 
    icon: "cake",
    emoji: "🎂"
  },
  { 
    id: "wedding", 
    name: "Wedding", 
    colors: "bg-gradient-to-r from-blue-300 via-indigo-400 to-blue-500 text-white", 
    icon: "heart",
    emoji: "💍" 
  },
  { 
    id: "anniversary", 
    name: "Anniversary", 
    colors: "bg-gradient-to-r from-amber-400 via-red-400 to-amber-500 text-white", 
    icon: "trophy",
    emoji: "🥂" 
  },
  { 
    id: "thank-you", 
    name: "Thank You", 
    colors: "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-white", 
    icon: "smile",
    emoji: "🙏" 
  },
  { 
    id: "congratulations", 
    name: "Congratulations", 
    colors: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 text-white", 
    icon: "award",
    emoji: "🎉" 
  },
] as const;

export type VoucherTheme = typeof VOUCHER_THEMES[number]['id'];

export interface VoucherData {
  id: string;
  title: string;
  code: string;
  theme: VoucherTheme;
  provider: string;
  message?: string;
  expiryDate?: string;
  createdAt: number;
}

/**
 * Fetches accurate UTC time from Cloudflare to prevent time manipulation
 */
export async function getServerTime(): Promise<Date> {
  try {
    const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
    const text = await response.text();
    const match = text.match(/ts=(\d+)/);  // Extract timestamp (Unix time in seconds)
    
    if (match) {
      return new Date(parseInt(match[1]) * 1000);  // Convert to JavaScript Date object
    }
  } catch (error) {
    console.error("Failed to fetch server time:", error);
  }
  
  return new Date(); // Fallback to system time if API fails
}

// Caching mechanism for server time to reduce API calls
let cachedServerTime: Date | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // Cache for 1 minute

/**
 * Gets server time with caching
 */
export async function getAccurateTime(): Promise<Date> {
  const now = Date.now();
  
  // Check if we need to refresh the cached time
  if (!cachedServerTime || now - lastFetchTime > CACHE_DURATION) {
    cachedServerTime = await getServerTime();
    lastFetchTime = now;
  }
  
  // Calculate the offset from when we fetched the time
  const elapsedSinceCache = now - lastFetchTime;
  const adjustedTime = new Date(cachedServerTime.getTime() + elapsedSinceCache);
  
  return adjustedTime;
}

// List of words that might trigger spam filters
const SUSPICIOUS_WORDS = [
  'free', 'win', 'winner', 'offer', 'discount', 'limited', 'special', 
  'exclusive', 'prize', 'gift', 'promotion', 'deal', 'bargain', 'sale',
  'cash', 'money', 'bonus', 'unlimited'
];

// List of profanity/offensive words to block
export const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'ass', 'asshole', 'cunt', 'dick', 'bastard',
  'whore', 'slut', 'piss', 'damn', 'hell', 'nigger', 'nigga', 'fag',
  'faggot', 'retard', 'moron', 'idiot', 'stupid', 'dumb', 'pussy', 'cock'
];

/**
 * Checks text for profanity/offensive words
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase().trim();
  
  // Check for exact matches or partial matches with common variations
  return BLOCKED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b|\\b${word}[*]+\\b|\\b${word[0]}[*]+${word.slice(-1)}\\b`, 'i');
    return regex.test(normalizedText);
  });
}

/**
 * Sanitizes text to avoid spam detection
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Normalize the text (trim and remove extra spaces)
  let sanitized = text.trim().replace(/\s+/g, ' ');
  
  // Convert to lowercase for comparison
  const lowerText = sanitized.toLowerCase();
  
  // Check for suspicious words and replace them with safer alternatives
  SUSPICIOUS_WORDS.forEach(word => {
    // Only replace whole words, not parts of words
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    
    // Build a replacement based on the word
    let replacement;
    switch (word) {
      case 'free': replacement = 'no-cost'; break;
      case 'discount': replacement = 'savings'; break;
      case 'offer': replacement = 'option'; break;
      case 'win': case 'winner': replacement = 'receive'; break;
      case 'prize': case 'gift': replacement = 'present'; break;
      case 'unlimited': replacement = 'full'; break;
      case 'promotion': case 'deal': replacement = 'opportunity'; break;
      default: replacement = ''; // Remove the word if no replacement
    }
    
    sanitized = sanitized.replace(regex, replacement);
  });
  
  // Remove any special characters that aren't needed
  sanitized = sanitized.replace(/[^\w\s.,!?-]/g, '');
  
  return sanitized;
}

/**
 * Checks if a voucher has expired using server time
 */
export async function isVoucherExpiredAsync(expiryDate?: string): Promise<boolean> {
  if (!expiryDate) return false;
  
  // Set expiry to the end of the chosen day (23:59:59.999)
  const expiry = new Date(expiryDate);
  expiry.setHours(23, 59, 59, 999);
  
  const serverTime = await getAccurateTime();
  
  return serverTime > expiry;
}

/**
 * Checks if a voucher has expired (synchronous version for backwards compatibility)
 */
export function isVoucherExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  
  // Set expiry to the end of the chosen day (23:59:59.999)
  const expiry = new Date(expiryDate);
  expiry.setHours(23, 59, 59, 999);
  
  const now = new Date();
  
  return now > expiry;
}

/**
 * Returns the remaining time until expiry in a formatted string
 */
export function getExpiryTimeRemaining(expiryDate?: string): string {
  if (!expiryDate) return '';
  
  // Set expiry to the end of the chosen day (23:59:59.999)
  const expiry = new Date(expiryDate);
  expiry.setHours(23, 59, 59, 999);
  
  const now = new Date();
  
  if (now > expiry) return 'Expired';
  
  const diffMs = expiry.getTime() - now.getTime();
  
  // Calculate days, hours, minutes
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  
  return `${minutes}m remaining`;
}

/**
 * Returns the remaining time until expiry in a formatted string using server time
 */
export async function getExpiryTimeRemainingAsync(expiryDate?: string): Promise<string> {
  if (!expiryDate) return '';
  
  // Set expiry to the end of the chosen day (23:59:59.999)
  const expiry = new Date(expiryDate);
  expiry.setHours(23, 59, 59, 999);
  
  const serverTime = await getAccurateTime();
  
  if (serverTime > expiry) return 'Expired';
  
  const diffMs = expiry.getTime() - serverTime.getTime();
  
  // Calculate days, hours, minutes
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  
  return `${minutes}m remaining`;
}

/**
 * Creates a shareable URL that includes voucher data
 */
export function createShareableVoucherUrl(voucher: VoucherData): string {
  const timestamp = Date.now(); // Add timestamp to make URL unique
  const baseUrl = `${window.location.origin}/voucher/${voucher.id}`;
  const dataToEncode = {
    title: voucher.title,
    code: voucher.code,
    theme: voucher.theme,
    provider: voucher.provider,
    message: voucher.message,
    expiryDate: voucher.expiryDate,
    createdAt: voucher.createdAt
  };
  
  const encodedData = encodeURIComponent(btoa(JSON.stringify(dataToEncode)));
  return `${baseUrl}?data=${encodedData}&t=${timestamp}`;
}

/**
 * Shortens a URL using is.gd service with safeguards against rate limiting
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    // Add a small random variation to prevent duplicate URLs if not already present
    if (!longUrl.includes('t=')) {
      const separator = longUrl.includes('?') ? '&' : '?';
      longUrl += `${separator}t=${Date.now()}`;
    }
    
    // First try with is.gd
    const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
    
    if (!response.ok) {
      console.warn('URL shortening service returned an error, using original URL');
      return longUrl;
    }
    
    const data = await response.json();
    return data.shorturl || longUrl;
  } catch (error) {
    console.error('Error shortening URL:', error);
    return longUrl; // Return original URL if shortening fails
  }
}

/**
 * Updates the document's meta tags for better link sharing
 */
export function updateMetaTags(title: string, provider: string, theme: VoucherTheme, message?: string): void {
  // Update title
  document.title = title || 'Voucher';
  
  // Find and update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  
  const themeInfo = VOUCHER_THEMES.find(t => t.id === theme) || VOUCHER_THEMES[0];
  let descriptionText = `${title} - ${provider ? `${provider} voucher` : 'Gift voucher'} ${themeInfo.emoji}`;
  
  // Add a snippet of the message if available
  if (message) {
    const messageSnippet = message.length > 50 ? message.substring(0, 47) + '...' : message;
    descriptionText += ` "${messageSnippet}"`;
  }
  
  metaDescription.setAttribute('content', descriptionText);
  
  // Update OG tags for link preview
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', `${title} ${themeInfo.emoji}`);
  
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogDescription) {
    ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    document.head.appendChild(ogDescription);
  }
  
  let ogDescText = `${provider ? `${provider} voucher` : 'Gift voucher'} from ${title}. Click to view and use!`;
  
  ogDescription.setAttribute('content', ogDescText);
  
  // Create a dynamic OG image based on theme if possible
  let ogImage = document.querySelector('meta[property="og:image"]');
  if (!ogImage) {
    ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    document.head.appendChild(ogImage);
  }
  
  // Keep the default OG image for now - in a real implementation, you'd generate a dynamic image
  // based on the voucher theme and title
  ogImage.setAttribute('content', 'https://lovable.dev/opengraph-image-p98pqg.png');
}

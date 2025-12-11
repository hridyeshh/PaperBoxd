/**
 * Detects if the user is in an embedded browser (webview)
 * This is important because Google OAuth blocks requests from embedded browsers
 * for security reasons (Error 403: disallowed_useragent)
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Common patterns for embedded browsers/webviews
  const embeddedPatterns = [
    // LinkedIn in-app browser
    'linkedinapp',
    'linkedin',
    // Facebook in-app browser
    'fban',
    'fbav',
    // Instagram in-app browser
    'instagram',
    // Twitter in-app browser
    'twitter',
    // WeChat
    'micromessenger',
    // Line
    'line',
    // WhatsApp
    'whatsapp',
    // Generic webview indicators
    'wv', // Android WebView
    'webview',
    // iOS webview (WKWebView)
    'iphone os',
  ];

  // Check if user agent matches any embedded browser pattern
  const isEmbedded = embeddedPatterns.some(pattern => userAgent.includes(pattern));

  // Additional check: if standalone is false, it might be in a webview
  // (though this isn't always reliable)
  // Note: standalone is an iOS Safari property, not standard
  const navigatorWithStandalone = window.navigator as typeof window.navigator & { standalone?: boolean };
  const isStandalone = navigatorWithStandalone.standalone === true;
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

  // If we detect embedded patterns OR we're not in standalone mode on mobile,
  // it's likely an embedded browser
  if (isEmbedded) {
    return true;
  }

  // Check for mobile devices that might be in webview
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  if (isMobile && !isStandalone && !isInStandaloneMode) {
    // Additional heuristic: check if we're in a known social media app context
    // by checking referrer or other indicators
    const referrer = document.referrer.toLowerCase();
    const socialMediaDomains = ['linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com'];
    const isFromSocialMedia = socialMediaDomains.some(domain => referrer.includes(domain));
    
    if (isFromSocialMedia) {
      return true;
    }
  }

  return false;
}

/**
 * Gets a user-friendly message explaining the embedded browser issue
 */
export function getEmbeddedBrowserMessage(): {
  title: string;
  message: string;
  instructions: string[];
} {
  return {
    title: 'Open in Browser',
    message: 'Google Sign-In requires a secure browser. Please open this page in your regular browser to continue.',
    instructions: [
      'Tap the menu (⋮) or share button in your browser',
      'Select "Open in Browser" or "Open in Safari/Chrome"',
      'Return to this page and try signing in again',
    ],
  };
}

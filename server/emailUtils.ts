/**
 * Email Utility Functions
 * Improves email deliverability by adding plain text versions and proper headers
 */

/**
 * Convert HTML to plain text for email
 * Removes HTML tags and formats content for plain text viewing
 */
export function htmlToPlainText(html: string): string {
  let text = html;
  
  // Remove script and style tags with their content
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convert common HTML elements to plain text equivalents
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' | ');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Convert links to plain text with URL
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&pound;/g, '£');
  text = text.replace(/&euro;/g, '€');
  text = text.replace(/&copy;/g, '©');
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
  text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
  text = text.trim();
  
  // Wrap text at 80 characters for better readability
  return wrapText(text, 80);
}

/**
 * Wrap text at specified line length
 */
function wrapText(text: string, maxLength: number): string {
  const lines = text.split('\n');
  const wrappedLines: string[] = [];
  
  for (const line of lines) {
    if (line.length <= maxLength) {
      wrappedLines.push(line);
      continue;
    }
    
    const words = line.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) {
          wrappedLines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          // Word is longer than maxLength, add it anyway
          wrappedLines.push(word);
        }
      } else {
        currentLine += word + ' ';
      }
    }
    
    if (currentLine) {
      wrappedLines.push(currentLine.trim());
    }
  }
  
  return wrappedLines.join('\n');
}

/**
 * Generate email headers for improved deliverability
 */
export function getEmailHeaders(options: {
  entityRefId?: string;
  isMarketing?: boolean;
  unsubscribeEmail?: string;
  unsubscribeUrl?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Mailer': 'Boomiis Restaurant System',
  };
  
  // Add unique identifier for tracking
  if (options.entityRefId) {
    headers['X-Entity-Ref-ID'] = options.entityRefId;
  }
  
  // Add List-Unsubscribe header for marketing emails (required by Gmail/Yahoo)
  if (options.isMarketing) {
    const unsubscribeLinks: string[] = [];
    
    if (options.unsubscribeEmail) {
      unsubscribeLinks.push(`<mailto:${options.unsubscribeEmail}>`);
    }
    
    if (options.unsubscribeUrl) {
      unsubscribeLinks.push(`<${options.unsubscribeUrl}>`);
    }
    
    if (unsubscribeLinks.length > 0) {
      headers['List-Unsubscribe'] = unsubscribeLinks.join(', ');
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
  }
  
  return headers;
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Check if email content contains spam trigger words
 * Returns array of found trigger words
 */
export function checkSpamTriggers(content: string): string[] {
  const spamWords = [
    // Money/Free related
    'free', 'winner', 'prize', 'cash', 'bonus', 'earn money', 'make money', 'get paid',
    // Urgency
    'act now', 'urgent', 'hurry', 'limited time', 'expires', 'don\'t wait', 'only today',
    // Suspicious
    'click here', 'click below', 'buy now', 'order now', 'subscribe', 'sign up now',
    // Excessive punctuation indicators
    '!!!', '???', '$$$', '£££',
  ];
  
  const lowerContent = content.toLowerCase();
  const foundTriggers: string[] = [];
  
  for (const word of spamWords) {
    if (lowerContent.includes(word.toLowerCase())) {
      foundTriggers.push(word);
    }
  }
  
  return foundTriggers;
}

/**
 * Calculate spam score for email content (0-100, lower is better)
 */
export function calculateSpamScore(subject: string, htmlBody: string): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;
  
  // Check subject line
  if (subject.length > 60) {
    score += 5;
    issues.push('Subject line too long (>60 chars)');
  }
  
  if (subject.toUpperCase() === subject && subject.length > 10) {
    score += 15;
    issues.push('Subject line is all caps');
  }
  
  if ((subject.match(/!/g) || []).length > 1) {
    score += 10;
    issues.push('Multiple exclamation marks in subject');
  }
  
  // Check spam trigger words
  const triggers = checkSpamTriggers(subject + ' ' + htmlBody);
  if (triggers.length > 0) {
    score += triggers.length * 5;
    issues.push(`Spam trigger words found: ${triggers.join(', ')}`);
  }
  
  // Check for excessive links
  const linkCount = (htmlBody.match(/<a /g) || []).length;
  if (linkCount > 10) {
    score += 10;
    issues.push(`Too many links (${linkCount})`);
  }
  
  // Check for images without alt text
  const imgTags = htmlBody.match(/<img[^>]*>/g) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt=')).length;
  if (imgsWithoutAlt > 0) {
    score += imgsWithoutAlt * 3;
    issues.push(`${imgsWithoutAlt} images missing alt text`);
  }
  
  // Check text to image ratio (rough estimate)
  const textLength = htmlBody.replace(/<[^>]+>/g, '').length;
  const imageCount = imgTags.length;
  if (imageCount > 0 && textLength / imageCount < 100) {
    score += 10;
    issues.push('Too many images relative to text');
  }
  
  // Check for URL shorteners
  if (htmlBody.match(/bit\.ly|tinyurl|goo\.gl|ow\.ly/i)) {
    score += 15;
    issues.push('URL shorteners detected (use full URLs)');
  }
  
  return { score: Math.min(score, 100), issues };
}

/**
 * Sanitize email content to remove potential spam triggers
 */
export function sanitizeEmailContent(html: string): string {
  let sanitized = html;
  
  // Replace common spam phrases with safer alternatives
  const replacements: Record<string, string> = {
    'FREE': 'Complimentary',
    'Free': 'Complimentary',
    'Click here': 'View details',
    'CLICK HERE': 'View details',
    'Act now': 'Available now',
    'ACT NOW': 'Available now',
    'Buy now': 'Order now',
    'BUY NOW': 'Order now',
  };
  
  for (const [trigger, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(trigger, 'g');
    sanitized = sanitized.replace(regex, replacement);
  }
  
  // Remove excessive exclamation marks (keep max 1)
  sanitized = sanitized.replace(/!{2,}/g, '!');
  
  // Remove excessive question marks (keep max 1)
  sanitized = sanitized.replace(/\?{2,}/g, '?');
  
  return sanitized;
}

/**
 * Generate email preview text (shown in inbox before opening)
 * This should be compelling but not spammy
 */
export function generatePreviewText(content: string, maxLength: number = 100): string {
  // Convert HTML to plain text
  let preview = htmlToPlainText(content);
  
  // Take first sentence or up to maxLength
  preview = preview.substring(0, maxLength);
  
  // Trim to last complete word
  const lastSpace = preview.lastIndexOf(' ');
  if (lastSpace > 0 && preview.length === maxLength) {
    preview = preview.substring(0, lastSpace) + '...';
  }
  
  return preview;
}

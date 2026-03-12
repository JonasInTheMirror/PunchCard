/**
 * UNIFIED FORMATTERS
 * Centralized logic for date and time display across the application.
 */

/**
 * Formats total seconds into HH:MM:SS
 */
export const formatSeconds = (totalSeconds: any): string => {
  // Force to number and floor it
  const secs = parseFloat(String(totalSeconds));
  if (isNaN(secs)) return "00:00:00";
  
  const total = Math.floor(Math.abs(secs));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  
  return [h, m, s].map(v => Math.floor(v).toString().padStart(2, '0')).join(':');
};

/**
 * Formats a Date object or ISO string into HH:MM:SS (Taiwan Time)
 */
export const formatTime = (time: any): string => {
  if (time === null || time === undefined || time === "" || time === "--:--:--") {
    return "--:--:--";
  }
  
  // If it's a number, it's likely seconds
  if (typeof time === 'number') {
    return formatSeconds(time);
  }
  
  if (typeof time === 'string') {
    // 1. If it's a time string like "HH:MM:SS.sss"
    if (time.includes(':') && !time.includes('-') && !time.includes('/')) {
      // Just take the HH:MM:SS part
      const parts = time.split(':');
      if (parts.length >= 3) {
        const seconds = parts[2].split('.')[0];
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${seconds.padStart(2, '0')}`;
      }
      return time.split('.')[0]; // Fallback
    }
    
    // 2. Try parsing as a full date/ISO string
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-GB', { 
        timeZone: 'Asia/Taipei',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    // 3. Last resort: if it's a string representation of a float
    if (!isNaN(parseFloat(time))) {
      return formatSeconds(parseFloat(time));
    }
  }
  
  return String(time);
};

/**
 * Formats a Date object or ISO string into YYYY/MM/DD (Taiwan Time)
 */
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replace(/-/g, '/');
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Taipei'
  }).replace(/-/g, '/');
};

/**
 * Formats a Date object or ISO string into YYYY-MM-DD (Taiwan Time)
 * Useful for state and API calls.
 */
export const formatDateDash = (date: Date | string = new Date()): string => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

// Simple XSS sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove script tags and event handlers
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
          .replace(/javascript:/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  // Don't sanitize params as it can break routing
  next();
};

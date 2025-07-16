/**
 * DuckDuckGo Search Provider - No API keys required
 * Simple, PowerShell-like JavaScript syntax
 */

export class SearchProvider {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main search method with caching
   */
  async search(query, limit = 5) {
    // Check cache first
    const cacheKey = query.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTimeout) {
        return cached.results;
      }
    }

    // Perform search
    try {
      const results = await this.searchDuckDuckGo(query, limit);
      
      // Cache results
      this.cache.set(cacheKey, {
        results: results,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      this.cleanCache();
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Fetch and parse DuckDuckGo search results
   */
  async searchDuckDuckGo(query, limit) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const results = this.parseResults(html, limit);
    
    return results;
  }

  /**
   * Parse HTML results from DuckDuckGo
   */
  parseResults(html, limit) {
    // Service workers don't have DOMParser, so we'll use regex parsing
    const results = [];
    
    // Match result blocks
    const resultPattern = /<div[^>]*class="[^"]*result__body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;
    
    while ((match = resultPattern.exec(html)) !== null && results.length < limit) {
      const resultHtml = match[1];
      
      // Extract title and URL
      const titleMatch = resultHtml.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/i);
      if (!titleMatch) continue;
      
      const url = this.extractUrl(titleMatch[1]);
      const title = this.cleanText(this.stripHtml(titleMatch[2]));
      
      // Extract description
      const snippetMatch = resultHtml.match(/<span[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)<\/span>/i);
      const description = snippetMatch ? this.cleanText(this.stripHtml(snippetMatch[1])) : '';
      
      // Build result object
      const result = {
        title: title,
        url: url,
        description: description
      };
      
      // Only add valid results
      if (result.title && result.url) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Extract clean URL from DuckDuckGo redirect
   */
  extractUrl(duckDuckGoUrl) {
    try {
      // DuckDuckGo wraps URLs, extract the actual URL
      const match = duckDuckGoUrl.match(/uddg=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
      
      // Fallback to original URL
      return duckDuckGoUrl;
    } catch {
      return duckDuckGoUrl;
    }
  }

  /**
   * Clean text by removing extra whitespace
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * Remove old cache entries
   */
  cleanCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.cache) {
      const age = now - value.timestamp;
      if (age > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}
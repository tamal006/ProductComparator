const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Product Image Fetcher
 * Searches for product images from multiple sources.
 * Uses Google/Bing image search scraping with fallbacks.
 */

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Try fetching a product image from Bing Image Search
 */
async function fetchFromBing(productName) {
    try {
        const url = `https://www.bing.com/images/search?q=${encodeURIComponent(productName + ' product')}&first=1&count=3`;
        const resp = await axios.get(url, { headers: HEADERS, timeout: 6000 });
        const $ = cheerio.load(resp.data);
        
        const images = [];
        $('a.iusc').each((i, el) => {
            try {
                const m = $(el).attr('m');
                if (m) {
                    const parsed = JSON.parse(m);
                    if (parsed.murl) images.push(parsed.murl);
                }
            } catch (e) { /* skip */ }
        });
        
        if (images.length > 0) return images[0];
    } catch (e) {
        console.warn(`[ImageFetcher] Bing search failed: ${e.message}`);
    }
    return null;
}

/**
 * Try fetching a product image from Google Shopping / Search
 */
async function fetchFromGoogle(productName) {
    try {
        const url = `https://www.google.com/search?q=${encodeURIComponent(productName)}&tbm=isch&safe=active`;
        const resp = await axios.get(url, { headers: HEADERS, timeout: 6000 });
        const html = resp.data;
        
        // Google embeds base64 images and also has URLs in script tags
        const imgRegex = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\s*\d+,\s*\d+\]/gi;
        let match;
        const images = [];
        while ((match = imgRegex.exec(html)) !== null) {
            const imgUrl = match[1];
            if (!imgUrl.includes('gstatic') && !imgUrl.includes('google') && imgUrl.length < 500) {
                images.push(imgUrl);
            }
        }
        
        if (images.length > 0) return images[0];
    } catch (e) {
        console.warn(`[ImageFetcher] Google search failed: ${e.message}`);
    }
    return null;
}

/**
 * Try fetching product image from Amazon India
 */
async function fetchFromAmazon(productName) {
    try {
        const url = `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
        const resp = await axios.get(url, { headers: HEADERS, timeout: 6000 });
        const $ = cheerio.load(resp.data);
        
        const img = $('img.s-image').first().attr('src');
        if (img && img.startsWith('http')) return img;
    } catch (e) {
        console.warn(`[ImageFetcher] Amazon search failed: ${e.message}`);
    }
    return null;
}

/**
 * Main entry: fetch the best available product image.
 * Tries multiple sources in parallel, picks the first success.
 */
async function fetchProductImage(productName) {
    console.log(`[ImageFetcher] Searching image for: "${productName}"`);
    
    // Run searches in parallel
    const [bing, google, amazon] = await Promise.allSettled([
        fetchFromBing(productName),
        fetchFromGoogle(productName),
        fetchFromAmazon(productName)
    ]);
    
    // Pick the first successful result
    const result = [bing, google, amazon].find(r => r.status === 'fulfilled' && r.value);
    
    if (result) {
        console.log(`[ImageFetcher] Found image for "${productName}"`);
        return result.value;
    }
    
    console.log(`[ImageFetcher] No image found for "${productName}", using placeholder`);
    return null;
}

/**
 * Fetch images for both products in a comparison query.
 */
async function fetchComparisonImages(query) {
    const cleanQuery = query.toLowerCase()
        .replace('compare ', '')
        .split(' vs ');
    
    const productA = cleanQuery[0]?.trim() || 'Product A';
    const productB = cleanQuery[1]?.split(' for ')[0]?.trim() || cleanQuery[1]?.trim() || 'Product B';

    const [imgA, imgB] = await Promise.all([
        fetchProductImage(productA),
        fetchProductImage(productB)
    ]);

    return {
        productA: { name: productA, image: imgA },
        productB: { name: productB, image: imgB }
    };
}

module.exports = { fetchProductImage, fetchComparisonImages };

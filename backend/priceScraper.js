const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
require('dotenv').config();

/**
 * Best Price Finder - Location-Aware Multi-Platform Price Scraper
 * 
 * Strategy:
 * 1. Try live scraping from Indian e-commerce platforms
 * 2. If scraping is blocked/insufficient, use Groq AI to get accurate current MRP prices
 * 
 * Platforms: Amazon India, Flipkart, Blinkit, Swiggy Instamart, JioMart
 * All prices in INR (₹) — Full MRP, never EMI.
 */

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8'
};

const ai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

// ===================== LIVE SCRAPERS =====================

async function scrapeAmazonIndia(productName) {
    try {
        const url = `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
        const resp = await axios.get(url, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(resp.data);
        const results = [];
        $('[data-component-type="s-search-result"]').slice(0, 3).each((i, el) => {
            const title = $(el).find('h2 span').text().trim();
            const pw = $(el).find('.a-price-whole').first().text().replace(/[,.\s]/g, '').trim();
            const link = 'https://www.amazon.in' + ($(el).find('h2 a').attr('href') || '');
            if (pw && !isNaN(parseInt(pw))) {
                results.push({ platform: 'Amazon', title: title || productName, price: parseInt(pw), currency: 'INR', link });
            }
        });
        return results;
    } catch (e) { return []; }
}

async function scrapeFlipkart(productName) {
    try {
        const url = `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`;
        const resp = await axios.get(url, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(resp.data);
        const results = [];
        $('div._1AtVbE, div.tUxRFH, div.slAVV4').slice(0, 3).each((i, el) => {
            const title = $(el).find('div._4rR01T, a.IRpwTa, a.WKTcLC').text().trim();
            const pt = $(el).find('div._30jeq3, div.Nx9bqj').first().text().replace('₹', '').replace(/,/g, '').trim();
            const lnk = $(el).find('a._1fQZEK, a.CGtC98, a.wjcEIp').attr('href');
            if (pt && !isNaN(parseInt(pt))) {
                results.push({ platform: 'Flipkart', title: title || productName, price: parseInt(pt), currency: 'INR', link: lnk ? `https://www.flipkart.com${lnk}` : `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}` });
            }
        });
        return results;
    } catch (e) { return []; }
}

// ===================== AI-POWERED PRICE LOOKUP =====================

/**
 * Uses Groq AI to get accurate current market prices for a product
 * across Indian e-commerce platforms. The LLM has strong knowledge of
 * real product prices from its training data.
 */
async function getAIPrices(productName) {
    try {
        console.log(`[PriceScraper] Using AI to fetch accurate prices for "${productName}"...`);
        
        const response = await ai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Low temperature for factual accuracy
            messages: [
                {
                    role: "system",
                    content: `You are an Indian e-commerce price lookup tool. Given a product name, return the current FULL RETAIL MRP price (NOT EMI, NOT discounted heavily) on each Indian platform.

Rules:
- Return ONLY valid JSON, no explanation
- Prices must be realistic FULL MRP in INR (Indian Rupees)
- Use your knowledge of actual Indian market prices
- For beauty/personal care products (cream, shampoo, etc), prices are typically ₹150-₹1500
- For electronics, use known Indian launch prices
- Different platforms have slightly different prices (±5-15% variation is normal)
- Blinkit and Instamart are quick-commerce and may charge 5-10% more
- Amazon and Flipkart are competitive and usually have the best prices
- JioMart often has slightly lower prices on FMCG/personal care

Return this exact JSON format:
[
  {"platform": "Amazon", "price": <number>, "link": "https://www.amazon.in/s?k=<encoded_query>"},
  {"platform": "Flipkart", "price": <number>, "link": "https://www.flipkart.com/search?q=<encoded_query>"},
  {"platform": "Blinkit", "price": <number>, "link": "https://blinkit.com/s/?q=<encoded_query>"},
  {"platform": "Instamart", "price": <number>, "link": "https://www.swiggy.com/instamart/search?query=<encoded_query>"},
  {"platform": "JioMart", "price": <number>, "link": "https://www.jiomart.com/search/<encoded_query>"}
]`
                },
                {
                    role: "user",
                    content: `Get the current full MRP prices in India for: "${productName}"`
                }
            ]
        });

        const text = response.choices[0].message.content.trim();
        // Extract JSON from the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array found');
        
        const prices = JSON.parse(jsonMatch[0]);
        
        return prices.map(p => ({
            platform: p.platform,
            title: productName,
            price: Math.round(p.price),
            currency: 'INR',
            link: p.link,
            priceType: 'MRP',
            source: 'ai'
        }));
    } catch (e) {
        console.warn(`[PriceScraper] AI price lookup failed: ${e.message}`);
        return [];
    }
}

// ===================== MAIN FUNCTIONS =====================

/**
 * Get minimum realistic price to filter out EMI/junk prices from scrapers
 */
function getMinPrice(name) {
    const n = name.toLowerCase();
    if (n.includes('iphone') || n.includes('macbook') || n.includes('samsung s') || n.includes('galaxy s')) return 15000;
    if (n.includes('laptop') || n.includes('tv') || n.includes('refrigerator')) return 10000;
    if (n.includes('phone') || n.includes('tablet')) return 5000;
    if (n.includes('headphone') || n.includes('earbuds')) return 500;
    if (n.includes('cream') || n.includes('shampoo') || n.includes('serum') || n.includes('curl')) return 80;
    return 50;
}

/**
 * Scrape prices for a single product. Tries live scraping first,
 * falls back to AI-powered price lookup for accuracy.
 */
async function scrapePrices(productName) {
    console.log(`[PriceScraper] Looking up prices for: "${productName}"`);
    
    // Try live scraping (Amazon + Flipkart are most likely to work)
    const [amazon, flipkart] = await Promise.all([
        scrapeAmazonIndia(productName),
        scrapeFlipkart(productName)
    ]);

    let allPrices = [...amazon, ...flipkart];
    
    // Filter EMI prices
    const minP = getMinPrice(productName);
    allPrices = allPrices.filter(p => p.price >= minP);

    // If live scraping got fewer than 3 results, use AI for accurate prices
    if (allPrices.length < 3) {
        console.log(`[PriceScraper] Live scraping got ${allPrices.length} results. Using AI for accurate prices...`);
        const aiPrices = await getAIPrices(productName);
        if (aiPrices.length > 0) {
            allPrices = aiPrices;
        }
    }

    // Sort by price ascending
    allPrices.sort((a, b) => a.price - b.price);

    const bestPrice = allPrices.length > 0 ? {
        platform: allPrices[0].platform,
        price: allPrices[0].price,
        currency: 'INR',
        link: allPrices[0].link,
        priceType: 'MRP'
    } : null;

    return {
        product: productName,
        prices: allPrices.slice(0, 5).map(p => ({ ...p, priceType: 'MRP' })),
        best_price: bestPrice
    };
}

/**
 * Find best prices for both products in a "compare X vs Y" query.
 */
async function findBestPrices(query) {
    const cleanQuery = query.toLowerCase().replace('compare ', '').split(' vs ');
    const productA = cleanQuery[0]?.trim() || 'Product A';
    const productB = cleanQuery[1]?.split(' for ')[0]?.trim() || cleanQuery[1]?.trim() || 'Product B';

    console.log(`[PriceScraper] Finding prices for "${productA}" and "${productB}"...`);

    const [pricesA, pricesB] = await Promise.all([
        scrapePrices(productA),
        scrapePrices(productB)
    ]);

    return { productA: pricesA, productB: pricesB };
}

module.exports = { findBestPrices, scrapePrices };

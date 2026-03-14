const express = require('express');
const { verifyPaymentWithTx, getPaymentRequest, hasValidPayment } = require('./payment');
const { scrapeReviews } = require('./scraper');
const { getYouTubeOpinions } = require('./youtube');
const { findBestPrices } = require('./priceScraper');
const { fetchComparisonImages } = require('./imageFetcher');
const { analyzeProducts } = require('./aiEngine');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Serve static frontend for MetaMask payment
app.use('/pay', express.static(path.join(__dirname, '../frontend')));

// Serve the dashboard UI
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dashboard.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dashboard.html')));

// Endpoint to check if a txHash is valid
app.post('/verify-payment', async (req, res) => {
  const { userAddress, txHash } = req.body;
  const success = await verifyPaymentWithTx(userAddress, txHash);
  if (success) {
    res.json({ success: true, message: "Payment verified on blockchain!" });
  } else {
    res.status(400).json({ success: false, error: "Invalid or unconfirmed transaction" });
  }
});

app.post('/recommend', async (req, res) => {
  const { query, userAddress, txHash } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  // 1. Verify Payment using x402 architecture
  // If a txHash is provided, verify it on-chain now.
  if (txHash) {
    const validTx = await verifyPaymentWithTx(userAddress, txHash);
    if (!validTx) {
      return res.status(400).json({ error: "The provided transaction hash is either invalid, pending, failed, or does not meet the 0.00001 AVAX requirement." });
    }
  }

  const hasPaid = await hasValidPayment(userAddress);
  
  if (!hasPaid) {
    // 402 Payment Required
    const paymentRequest = getPaymentRequest();
    return res.status(402).json(paymentRequest);
  }

  try {
    // 2. Data Collection
    console.log(`[Server] Processing query: "${query}"`);
    console.log(`[Server] Gathering e-commerce reviews...`);
    const reviews = await scrapeReviews(query);
    
    console.log(`[Server] Gathering YouTube opinions...`);
    const videos = await getYouTubeOpinions(query);
    
    console.log(`[Server] Finding best prices across platforms...`);
    console.log(`[Server] Fetching product images...`);
    const [priceData, imageData] = await Promise.all([
        findBestPrices(query),
        fetchComparisonImages(query)
    ]);
    
    // 3. AI Analysis (now includes price data)
    console.log(`[Server] Running AI Engine...`);
    const recommendation = await analyzeProducts(query, reviews, videos, priceData);
    
    // 4. Attach raw price data and images to the response
    recommendation.price_data = priceData;
    recommendation.product_images = imageData;
    
    // 5. Return result
    return res.status(200).json(recommendation);
  } catch (error) {
    console.error("[Server] Error processing request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

const axios = require('axios');

const API_URL = 'http://localhost:3000';
// Generate a random mock user address for demonstration so each run requires payment
const USER_WALLET = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, '0');

async function main() {
  const query = process.argv.slice(2).join(' ');
  
  if (!query) {
    console.log("Please provide a query. Example:");
    console.log("node agent.js \"compare iPhone 15 vs Samsung S24 for camera\"");
    process.exit(1);
  }

  console.log(`\n🤖 [Agent] Querying AI Server about: "${query}"`);

  try {
    // Attempt the initial request
    const response = await axios.post(`${API_URL}/recommend`, { 
      query,
      userAddress: USER_WALLET
    });
    
    // If it succeeds without 402, print the recommendation
    printRecommendation(response.data);
    
  } catch (error) {
    // Handle x402 Payment Required scenario
    if (error.response && error.response.status === 402) {
      console.log(`\n💳 [Agent] 402 Payment Required`);
      const paymentInfo = error.response.data;
      console.log(`Price: ${paymentInfo.price}`);
      console.log(`Description: ${paymentInfo.description}`);
      console.log(`Contract: ${paymentInfo.contract}`);
      
      // Simulate user payment
      const paid = await handlePayment(paymentInfo);
      if (!paid) {
        console.log("\n❌ [Agent] Cannot proceed without payment.");
        process.exit(1);
      }
      
      // Retry request after payment
      console.log(`\n🤖 [Agent] Retrying request with transaction verification...`);
      try {
        const retryResponse = await axios.post(`${API_URL}/recommend`, { 
          query,
          userAddress: USER_WALLET,
          txHash: paid // The paid variable now holds the txHash
        });
        printRecommendation(retryResponse.data);
      } catch (retryError) {
        console.error("Failed on retry:", retryError.message);
      }
    } else {
      console.error("\n❌ [Agent] Error:", error.message || error);
    }
  }
}

const readline = require('readline');

async function handlePayment(paymentInfo) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n⏳ [Agent] A payment of ${paymentInfo.price} is required on ${paymentInfo.network}.`);
    console.log(`🌐 Open the payment portal: ${paymentInfo.url}`);
    
    rl.question(`\nOnce you have paid, please paste your Transaction Hash here (or type "cancel"): `, async (answer) => {
      rl.close();
      const txHash = answer.trim();
      
      if (txHash.toLowerCase() === 'cancel' || txHash.length < 10) {
        console.log(`\n❌ [Agent] Payment cancelled or invalid hash.`);
        resolve(false);
      } else {
        console.log(`\n⏳ [Agent] Submitting ${txHash} for verification...`);
        // We resolve with the txHash, so the main loop can send it to the server
        resolve(txHash);
      }
    });
  });
}

function printRecommendation(data) {
  console.log(`\n\x1b[1m\x1b[36m📊 ==== UNIVERSAL AI BUYING ASSISTANT ====\x1b[0m\n`);
  
  console.log(`\x1b[1m1. Product Overview\x1b[0m\n   ${data.product_overview}\n`);
  
  console.log(`\x1b[1m2. Key Comparison Factors\x1b[0m`);
  data.key_factors.forEach(f => console.log(`   - ${f}`));
  console.log("");
  
  console.log(`\x1b[1m3. Feature Comparison Table\x1b[0m`);
  data.feature_comparison.forEach(row => {
    console.log(`   ⚡ \x1b[33m${row.feature}:\x1b[0m ${row.productA} vs ${row.productB}`);
  });
  console.log("");
  
  console.log(`\x1b[1m4. Review Trust Score\x1b[0m\n   🛡️ ${data.trust_score}\n`);
  
  console.log(`\x1b[1m5. Internet Consensus Score\x1b[0m\n   🌐 ${data.consensus_score}\n`);
  
  console.log(`\x1b[1m6. Most Common Complaints\x1b[0m`);
  data.common_complaints.forEach(c => console.log(`   🚨 ${c}`));
  console.log("");
  
  console.log(`\x1b[1m7. Regret Analysis\x1b[0m\n   😔 ${data.regret_analysis}\n`);
  
  console.log(`\x1b[1m8. Category Winners\x1b[0m`);
  data.category_winners.forEach(w => console.log(`   🏆 ${w.category}: ${w.winner}`));
  console.log("");
  
  console.log(`\x1b[1m9. Value for Money Score\x1b[0m\n   💰 ${data.value_score}\n`);
  
  console.log(`\x1b[1m10. Long-Term Ownership Insights\x1b[0m\n   ⏳ ${data.long_term_insights}\n`);

  console.log(`\x1b[1m11. Personalized Recommendation\x1b[0m\n   🧑‍💼 ${data.personalized_recommendation}\n`);
  
  console.log(`\x1b[1m\x1b[32m12. Final Winner\x1b[0m\n   👑 ${data.final_winner}\n`);
  
  console.log(`\x1b[1m13. Confidence Score\x1b[0m\n   📈 ${data.confidence_score}\n`);
  
  console.log(`\x1b[1m14. 30-Second Buying Summary\x1b[0m\n   📝 ${data.buying_summary}\n`);
  
  // === Best Price Finder Section ===
  if (data.price_verdict) {
    console.log(`\x1b[1m15. Price Verdict\x1b[0m\n   💲 ${data.price_verdict}\n`);
  }

  if (data.price_data) {
    console.log(`\x1b[1m\x1b[33m💰 ==== BEST PRICE FINDER ====\x1b[0m\n`);
    
    const printProductPrices = (productData) => {
      if (!productData || !productData.prices) return;
      console.log(`  \x1b[1m📦 ${productData.product}\x1b[0m`);
      if (productData.best_price) {
        const sym = productData.best_price.currency === 'INR' ? '₹' : '$';
        console.log(`  \x1b[32m   ✅ Best Price: ${sym}${productData.best_price.price} on ${productData.best_price.platform}\x1b[0m`);
        if (productData.best_price.link) {
          console.log(`  \x1b[36m   🔗 Buy here: ${productData.best_price.link}\x1b[0m`);
        }
      }
      console.log(`     Other Prices:`);
      productData.prices.forEach(p => {
        const sym = p.currency === 'INR' ? '₹' : '$';
        const isBest = productData.best_price && p.platform === productData.best_price.platform && p.price === productData.best_price.price;
        const marker = isBest ? '\x1b[32m★\x1b[0m' : ' ';
        console.log(`     ${marker} ${p.platform.padEnd(14)} - ${sym}${p.price}`);
      });
      console.log('');
    };

    printProductPrices(data.price_data.productA);
    printProductPrices(data.price_data.productB);
  }

  console.log(`\x1b[1m\x1b[36m==================================================\x1b[0m\n`);
}

main();

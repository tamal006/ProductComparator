require('dotenv').config();
const { OpenAI } = require('openai');

// Note: The user provided a key starting with `gsk_`, which is a Groq API key, not xAI's Grok.
// Groq provides blazing fast inference for open source models using an OpenAI-compatible endpoint.
const ai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

async function analyzeProducts(query, reviews, videos, priceData) {
    console.log(`[AI Engine] Invoking Groq (LLaMA 3) for multi-agent reasoning on query: ${query}...`);

    const systemPrompt = `You are a Universal AI Buying Assistant. Your task is to analyze the user's product comparison query against scraped internet reviews and video opinions, and output a highly structured JSON decision.

You must operate in MULTI-AGENT REASONING MODE internally:
- Agent A: Argues for Product A using the evidence.
- Agent B: Argues for Product B using the evidence.
- Final Judge: Determines the best option based on the evidence.

You must adapt your analysis categories dynamically based on what the products are (Electronics, Cars, Software, etc).
Analyze sentiments, detect regrets ("I wish I bought", "stopped working"), identify trust scores (penalize promotional language), compute consensus (0-10), and evaluate long term ownership.

User Query: "${query}"
Scraped Reviews Data: ${JSON.stringify(reviews)}
Video Analysis Data: ${JSON.stringify(videos)}
Price Data Across Platforms (Full MRP, NOT EMI): ${JSON.stringify(priceData)}

IMPORTANT: All prices in the data are FULL RETAIL MRP prices, NOT EMI or installment prices. When mentioning prices, always state them as full market retail price (MRP). Never suggest EMI prices.

If the provided reviews/video data is empty or generic, use your broad internal knowledge of the specific products to fulfill the 14-point comparison accurately without hallucinating completely fake user stories. Always highlight both strengths and weaknesses.

YOU MUST strictly follow this JSON structure in your output and return only JSON:
{
  "product_overview": "A brief overview of the products being compared.",
  "key_factors": ["durability", "battery", "efficiency"],
  "feature_comparison": [
    { "feature": "Camera", "productA": "Excellent in low light", "productB": "Average" }
  ],
  "trust_score": "85%",
  "consensus_score": "8.5/10",
  "common_complaints": ["Screen burn-in", "Laggy UI"],
  "regret_analysis": "Many users regret buying earlier models due to battery...",
  "category_winners": [
    { "category": "Battery", "winner": "Product A" }
  ],
  "value_score": "9/10",
  "long_term_insights": "Users report degradation after 2 years...",
  "personalized_recommendation": "If you care most about X, choose Y.",
  "final_winner": "The single best product recommendation.",
  "confidence_score": "92%",
  "buying_summary": "30-Second Buying Summary in under 4 sentences.",
  "price_verdict": "Which product offers the best value based on actual prices found online. Mention specific platforms and prices."
}`;

    try {
        const response = await ai.chat.completions.create({
            model: "llama-3.3-70b-versatile", // High capability model on Groq
            messages: [
                { role: "system", content: systemPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        // Parse and return the structured JSON
        const result = JSON.parse(response.choices[0].message.content);
        return result;
    } catch (error) {
        console.error("[AI Engine] Error calling Groq API:", error);
        throw error;
    }
}

module.exports = { analyzeProducts };

const ethers = require('ethers');
const path = require('path');
const TOKEN_ABI = require('./tokenABI.json');

// In-memory record of paid addresses
const paidAddresses = new Set();

// Avalanche Fuji Testnet public RPC
const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x4d9718e7235CC8c11E26829eCCa34EB19Aa5cb68";
const REQUIRED_AMOUNT_TOKENS = "0.00001";
const RECEIVER_ADDRESS = "0xA645E5D0724d84c7949F312e9eBd7d7eBd05B15A";

async function hasValidPayment(userAddress) {
  if (!userAddress) return false;
  return paidAddresses.has(userAddress.toLowerCase());
}

async function verifyPaymentWithTx(userAddress, txHash) {
  if (!userAddress || !txHash) return false;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log(`[Payment] Verifying txHash: ${txHash}...`);

    // Fetch transaction details
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      console.log("[Payment] Transaction not found.");
      return false;
    }

    // Fetch transaction receipt to ensure it was successful
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      console.log("[Payment] Transaction failed or pending.");
      return false;
    }

    // It's an ERC20 transfer if the transaction 'to' address is the token contract
    const isToContract = tx.to && tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
    
    let isCorrectAmount = false;
    let isCorrectReceiver = false;

    try {
        const iface = new ethers.Interface(TOKEN_ABI);
        const parsedTx = iface.parseTransaction({ data: tx.data, value: tx.value });
        
        if (parsedTx && parsedTx.name === 'transfer') {
            const recipient = parsedTx.args[0];
            const amount = parsedTx.args[1];

            isCorrectReceiver = recipient.toLowerCase() === RECEIVER_ADDRESS.toLowerCase();
            const requiredWei = ethers.parseEther(REQUIRED_AMOUNT_TOKENS.toString());
            isCorrectAmount = amount >= requiredWei;
        }
    } catch (e) {
        console.error("[Payment] Failed to parse tx data as ERC20 transfer");
    }
    
    if (isToContract && isCorrectReceiver && isCorrectAmount) {
      console.log(`[Payment] ✅ Payment verified for ${userAddress}`);
      paidAddresses.add(userAddress.toLowerCase());
      return true;
    } else {
      console.log(`[Payment] ❌ Verification failed - IsToContract: ${isToContract}, IsCorrectReceiver: ${isCorrectReceiver}, IsCorrectAmount: ${isCorrectAmount}`);
      return false;
    }
  } catch (error) {
    console.error("[Payment] Verification Error:", error.message);
    return false;
  }
}

function getPaymentRequest() {
  return {
    "price": `${REQUIRED_AMOUNT_TOKENS} Tokens`,
    "description": "Product comparison analysis payment portal",
    "contract": CONTRACT_ADDRESS,
    "network": "Avalanche Fuji Testnet",
    "url": "http://localhost:3000/pay?address=" + CONTRACT_ADDRESS
  };
}

module.exports = {
  hasValidPayment,
  verifyPaymentWithTx,
  getPaymentRequest
};

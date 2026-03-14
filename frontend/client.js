const facinetSdk = require('facinet-sdk');
const Facinet = facinetSdk.Facinet || facinetSdk.default;

const REQUIRED_AMOUNT = "0.00001"; 

document.getElementById('payBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const txHashEl = document.getElementById('txHash');
    
    const urlParams = new URLSearchParams(window.location.search);
    const contractAddress = urlParams.get('address') || "0x1234567890123456789012345678901234567890";

    if (typeof window.ethereum === 'undefined') {
        statusEl.innerHTML = "❌ MetaMask is not installed!";
        return;
    }

    try {
        document.getElementById('payBtn').disabled = true;
        statusEl.innerHTML = "Initializing Facinet (Gasless)...";
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const facinet = new Facinet({
          network: 'avalanche-fuji'
        });

        statusEl.innerHTML = "Please sign the gasless payment in MetaMask...";
        
        const result = await facinet.pay({
          amount: REQUIRED_AMOUNT,
          recipient: contractAddress,
        });

        statusEl.innerHTML = `✅ Gasless Payment Successful (Processed by ${result.facilitator?.name || 'Facilitator'})! Copy the transaction hash below and paste it in the CLI.`;
        txHashEl.style.display = "block";
        txHashEl.innerHTML = `<b>TxHash for CLI:</b><br>${result.txHash}`;

    } catch (error) {
        console.error(error);
        statusEl.innerHTML = `❌ Error: ${error.message || error}`;
    } finally {
        document.getElementById('payBtn').disabled = false;
    }
});

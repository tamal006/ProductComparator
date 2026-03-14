const hre = require("hardhat");

async function main() {
  console.log("Deploying ProductPay contract...");

  const ProductPay = await hre.ethers.getContractFactory("ProductPay");
  const contract = await ProductPay.deploy();

  await contract.waitForDeployment();

  console.log("ProductPay deployed to:", await contract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

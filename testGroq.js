const { analyzeProducts } = require('./backend/aiEngine');

async function run() {
    try {
        const result = await analyzeProducts(
            "compare iPhone 5 vs Samsung S24 for camera",
            ["Review 1: Camera is great", "Review 2: Battery sucks"],
            ["Video 1: Awesome focus"]
        );
        console.log("SUCCESS:");
        console.log(result);
    } catch (e) {
        console.error("ERROR:");
        console.error(JSON.stringify(e, null, 2));
    }
}
run();

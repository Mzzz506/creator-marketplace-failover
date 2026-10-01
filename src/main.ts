import { prepareOrder } from "./marketplace_service.js";

const sample = {
  orderId: "order-demo-001",
  sellerName: "Mina Studio",
  assetTitle: "Quiet morning reel",
  assetType: "video",
  buyerNote: "Please include the 9:16 export and a short caption.",
};

if (!process.env.INFRAI_API_KEY) throw new Error("Set INFRAI_API_KEY before running the example.");
console.log(JSON.stringify(await prepareOrder(sample), null, 2));

import assert from "node:assert/strict";
import { orderRequest } from "./marketplace_service.js";

const parsed = orderRequest.parse({ orderId: "o-7", sellerName: "Ava", assetTitle: "Launch cut", assetType: "video", buyerNote: "Need captions" });
assert.equal(parsed.assetType, "video");
assert.throws(() => orderRequest.parse({ orderId: "", sellerName: "Ava", assetTitle: "Launch cut", assetType: "video", buyerNote: "Need captions" }));
console.log("order boundary test passed");

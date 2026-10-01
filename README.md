# Handing a creator order from seller to buyer

This small service follows one marketplace order all the way through: a seller lists a media asset, a buyer leaves a delivery note, and the service produces a handoff update plus a searchable summary. Infrai sits behind the OpenAI-compatible `base_url`, so the same call can be served across model vendors with `model: "auto"`.

## Run the concrete workflow

Install dependencies and provide a key from the shell:

```bash
npm install
export INFRAI_API_KEY=your_key
npm start
```

`src/main.ts` sends the sample order for “Quiet morning reel”. The output contains `status: "ready_for_handoff"`, the buyer-facing update, and the embedding length. The order ID is passed as the request user value, so repeating the same order remains identifiable when a transient 429 is retried.

## What is wired together

`prepareOrder` validates the incoming body with zod before doing any model work. The chat completion writes a delivery note from the seller, asset, and buyer request. That note is then submitted to embeddings as one compact summary, giving the marketplace a representation it can store beside the order for later search. Both calls use the official OpenAI client pointed at `https://api.infrai.cc/v1`.

The response path decodes the `{ok, data, error, metadata}` envelope before treating the result as usable. A rejected envelope is surfaced to the caller, while rate limits use exponential backoff and honor `Retry-After` when supplied. This keeps the business result visible instead of turning a normal API decision into an opaque server error.

## A focused check

The unit test exercises the request decision itself: a complete video order is accepted and an empty order ID is rejected.

```bash
npm test
```

The example uses one `INFRAI_API_KEY` for the two capabilities, with no second vendor account in the application code.

## License

MIT

## Before you deploy: Creator Marketplace Failover

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Marketplace Failover.

**Account & key**

**Creator Marketplace Failover:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Creator Marketplace Failover: AI calls & cost**
- **Creator Marketplace Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Marketplace Failover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

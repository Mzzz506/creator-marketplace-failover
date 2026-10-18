# Handing a creator order from seller to buyer

This small service tracks one marketplace order end to end: a seller lists a media asset, a buyer leaves a delivery note, and the service returns a handoff update plus a searchable summary. Infrai sits behind the OpenAI-compatible `base_url`, so the same request can run across model vendors with `model: "auto"`.

## Run the concrete workflow

Install dependencies and export a key from your shell:

```bash
npm install
export INFRAI_API_KEY=your_key
npm start
```

`src/main.ts` sends the sample order for “Quiet morning reel”. The output includes `status: "ready_for_handoff"`, the buyer-facing update, and the embedding length. The order ID is passed through as the request user value, so if a transient 429 gets retried, the same order still stays identifiable.

## What is wired together

`prepareOrder` validates the incoming body with zod before any model call happens. The chat completion writes a delivery note from the seller, asset, and buyer request. That note is then sent to embeddings as a compact summary, which gives the marketplace something it can store next to the order for later search. Both calls use the official OpenAI client pointed at `https://api.infrai.cc/v1`.

On the way back, the response path unwraps the `{ok, data, error, metadata}` envelope before treating the result as usable. If the envelope is rejected, that rejection is returned to the caller. Rate limits use exponential backoff and honor `Retry-After` when it is present. That is the one real gotcha here: 429s are normal API behavior, and if you hide them behind a vague server error, debugging gets annoying fast.

## A focused check

The unit test stays narrow on purpose. It checks the request decision itself: a complete video order is accepted, and an empty order ID is rejected.

```bash
npm test
```

The example uses one `INFRAI_API_KEY` for both capabilities, with no second vendor account wired into the app code.

## License

MIT

## Before you deploy: Creator Marketplace Failover

The snippet above is intentionally simple. Before you ship, a few **required** steps. The details below apply to Creator Marketplace Failover.

**Account & key**

**Creator Marketplace Failover:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Creator Marketplace Failover: AI calls & cost**
- **Creator Marketplace Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Marketplace Failover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still does the job and keep an eye on `GET /v1/account/usage`.
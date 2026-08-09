# Optional reconstruction accelerator contract

FM1 Editor is fully usable without a server. The optional reconstruction accelerator is disabled unless a deployment explicitly sets `VITE_RECONSTRUCTION_ACCELERATOR_URL`.

This contract exists to prevent an optional compute worker from becoming an implicit upload path or an opaque model dependency.

## Current roadmap decision

There is **no active server-accelerator implementation/deployment task**. Local retrieval, constrained CMA-ES, the admitted browser-local SpiegeLib initializer and the validated 2+2+2 evidence runner are the supported reconstruction path.

A remote service is intentionally deferred unless committed real-reference evidence later demonstrates a material runtime or reconstruction-quality limitation that cannot be addressed acceptably by the local paths. Until such evidence exists, implementing or deploying a server would add privacy, hosting, operational and maintenance surface without an accepted product need.

This decision closes the accelerator as a standing `PLAN.md` item. It does **not** remove the capability or forbid a future service: the contract below is the admission gate if evidence activates that work later.

## Client invariants

- No default remote endpoint is shipped.
- Capability discovery sends no reference audio.
- Non-local endpoints must use HTTPS. Plain HTTP is accepted only for `localhost`, `127.0.0.1` or `::1` development.
- Normal editing, virtual audition, nearest-preset retrieval, constrained CMA-ES and benchmark receipts remain available locally when no server or consent exists.
- Upload consent is explicit, one-shot, expires after 15 minutes and is bound to:
  - the uploaded reference SHA-256;
  - endpoint origin;
  - capability-policy identity;
  - service ID/version;
  - model ID/version.
- A changed reference, service policy, service version or model version invalidates the previous consent.
- The prepared selected region is encoded to mono PCM16 WAV only when the user presses the upload action.
- The client sends requests with `credentials: omit` and does not silently attach browser account cookies.
- Returned candidates must decode to exactly 155 bytes of legal unpacked Yamaha DX7 voice data before they can be loaded into the editor.

## Capability discovery

`GET {baseUrl}/v1/reconstruction/capabilities`

Response schema: `fm1-editor.reconstruction-accelerator-capabilities.v1`

```json
{
  "schema": "fm1-editor.reconstruction-accelerator-capabilities.v1",
  "serviceId": "example-python-worker",
  "serviceVersion": "1.0.0",
  "model": {
    "id": "example-initializer",
    "version": "2026-08-08",
    "kind": "learned-initialization",
    "licenseSpdx": "Apache-2.0"
  },
  "retention": {
    "mode": "ephemeral",
    "maxSeconds": 60,
    "deletion": "automatic",
    "statement": "Reference bytes are deleted after processing and are never retained for training."
  },
  "accepts": {
    "mimeTypes": ["audio/wav"],
    "maxBytes": 2000000
  }
}
```

Required model kinds are `retrieval`, `evolutionary`, `learned-initialization` or `hybrid`. The client rejects capability documents without non-empty service/model/license metadata, a positive upload limit, a positive retention limit, or automatic deletion.

A capability document is a policy statement, not production admission. Model code, weights, datasets and preprocessing still require the separate provenance/license review described in the reconstruction research documents.

## Estimation request

`POST {baseUrl}/v1/reconstruction/estimate`

Content type: browser-generated `multipart/form-data`.

Parts:

- `metadata`: JSON string with schema `fm1-editor.reconstruction-accelerator-request.v1`, reference hash, original filename, selected region, prepared sample rate/duration, pitch metadata, consent ID and the consented service/model versions.
- `reference`: mono `audio/wav`, PCM16, containing only the prepared selected region.

Header:

- `X-FM1-Consent-Id`: the one-shot consent ID.

The service should reject requests when its current service/model identity no longer matches the request metadata. It must not repurpose the uploaded audio for training, analytics or retention outside the advertised policy.

## Result

Response schema: `fm1-editor.reconstruction-accelerator-result.v1`

```json
{
  "schema": "fm1-editor.reconstruction-accelerator-result.v1",
  "requestId": "request-123",
  "serviceId": "example-python-worker",
  "serviceVersion": "1.0.0",
  "modelId": "example-initializer",
  "modelVersion": "2026-08-08",
  "candidates": [
    {
      "voiceDataBase64": "BASE64_OF_EXACTLY_155_UNPACKED_DX7_BYTES",
      "distance": 0.1234,
      "sourceInitialization": "Example learned initializer"
    }
  ],
  "retentionReceipt": {
    "referenceDeleted": true,
    "deletedAt": "2026-08-08T08:00:02.000Z",
    "deleteBy": null
  }
}
```

`distance` may be `null` when the remote method does not expose a comparable distance. Otherwise it must be a non-negative finite number.

The result service/model identity must match the capability document that the user consented to. Candidate payloads are decoded and validated by FM1 Editor before becoming usable voices.

## Retention receipt

Every successful response must provide `retentionReceipt`.

- If `referenceDeleted` is `true`, `deletedAt` may record immediate deletion.
- If deletion is deferred, `deleteBy` is mandatory and must not exceed the advertised `retention.maxSeconds` window measured from submission.
- A response without deletion proof or a bounded delete-by timestamp is rejected even if it contains otherwise valid candidates.

The receipt is a service assertion and should be complemented by server-side operational controls and logs when a real service is deployed.

## Future service activation gate

Do not deploy an accelerator merely because the contract exists. Re-open server implementation only after a committed closure-ready real-reference benchmark demonstrates a material need and records the local limitation being addressed.

Before a service is production-enabled, record:

- the benchmark evidence and explicit reason local execution is insufficient;
- source repository and immutable revision;
- dependency lock or image digest;
- model/checkpoint hash and reuse license;
- dataset/preprocessing provenance when applicable;
- public service/model versions matching capability output;
- maximum request size and timeout;
- retention/deletion implementation and operational verification;
- authentication/rate-limit policy if the endpoint is internet-exposed;
- CORS allowlist for the intended FM1 Editor deployment origin;
- a test proving that editing/audition/retrieval still work with the service absent or unreachable.

If the real-reference benchmark does not establish that need, the correct outcome is to keep the service undeployed and the existing local path authoritative.

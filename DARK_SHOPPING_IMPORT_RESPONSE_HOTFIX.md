# Dark Shopping product-import response hotfix

Integration marker: **2026-09-04.4**

## Failure fixed

The admin import action sends a selected `ids` array to Dark.shopping `product/list`.
The previous client encoded POST bodies as `application/x-www-form-urlencoded`.
Dark.shopping currently documents POST search bodies as **multipart form-data or JSON**.
The mismatch could make an upstream gateway/API parser return HTML or another non-envelope response, which Ysello surfaced as `Dark Shopping returned an invalid response.`

## Changes

- `product/list` now sends documented `application/json` POST bodies, with the API key in the body.
- Selected IDs stay as a real JSON array.
- Attribute filters are converted to the documented `filter_type` field shape.
- For this read-only catalog request only, transport/gateway failures can retry once using documented multipart form-data.
- 401/403/429 responses are not blindly retried.
- JSON parsing accepts a UTF-8 BOM and boolean-like `success` values (`true`, `false`, `1`, `0`) without accepting arbitrary malformed responses.
- Non-JSON/HTML responses now return an actionable provider HTTP/content-type diagnostic without exposing the API key or supplier response body.
- Integration marker bumped to `2026-09-04.4`.

## Deployment

No database migration is required for this hotfix. Deploy the updated Railway/API service. Then open **Admin → Dark Shopping resale** and confirm the integration marker is `2026-09-04.4`. Reload products and retry the import.

If the supplier still returns a gateway response, the UI/API error will now include the provider HTTP status rather than the old generic message, which makes the remaining provider-side issue identifiable without exposing secrets.

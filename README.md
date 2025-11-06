## Requirements

- **Single endpoint**: `POST /validate-address`.
- **Input**: free-form text property address.
- **Output**: structured, validated address fields: street, number, city, state, zip code.
- **Scope**: may restrict to US addresses only.
- **Outcomes**: indicate whether the address is **valid**, **corrected**, or **unverifiable**.
- **Edge cases**: handle partial addresses, typos, multiple matches gracefully.
- **Quality**: clean code, clear error handling, easy-to-follow structure.

---

## Address Validator API (TypeScript + Express)

### Overview

Backend API that validates and standardizes free-form property addresses using Google Maps Geocoding API. It returns a normalized structure and classifies the result as VALIDATED, CORRECTED, or UNVERIFIABLE. The service is limited to US addresses and provides robust error handling and minimal input validation.

### Tech Stack

- TypeScript, Node.js, Express
- Google Maps Geocoding API

### Project Structure

- `src/index.ts` — App bootstrap and middleware wiring
- `src/routes/validateAddress.ts` — Router layer
- `src/controllers/validateAddressController.ts` — Endpoint controller
- `src/services/googleGeocodingService.ts` — Integration and result normalization
- `src/middleware/validateAddressPayload.ts` — Minimal free-form input validation/normalization
- `src/middleware/errorHandler.ts` — Centralized error handling
- `src/middleware/requestLogger.ts` — Request logging with ID
- `src/utils/asyncHandler.ts` — Async handler wrapper
- `src/utils/logger.ts` — Structured JSON logger

### Setup and Run

1. Prerequisites

- Node.js 18+
- A Google Maps API key with Geocoding enabled

2. Install dependencies

```bash
npm install
```

3. Configure environment

Create a `.env` file at the root:

```bash
# Required
GOOGLE_MAPS_GEOCODING_API_KEY=your_api_key_here
GOOGLE_MAPS_GEOCODING_API_URL=https://maps.googleapis.com/maps/api/geocode/json
PORT=3000
LOG_LEVEL=info
```

4. Start the server

```bash
npm run build && npm start
npm run dev
```

### API

- Method/Path: `POST /validate-address`
- Request body:

```json
{
  "address": "1600 Amphitheatre Pkwy Mountain View CA"
}
```

- Minimal input validation:

  - `address` must be a string
  - normalized by trimming and collapsing whitespace
  - max length 512 chars
  - control characters rejected

- Success responses (200):
  - VALIDATED — exact match with structured components
  - CORRECTED — approximate/partial match, `possibleMatches` returned
  - UNVERIFIABLE — no usable result

Example 200 (VALIDATED):

```json
{
  "original_input": "1600 Amphitheatre Pkwy Mountain View CA",
  "status": "VALIDATED",
  "exactMatch": {
    "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    "components": {
      "street": "Amphitheatre Pkwy",
      "city": "Mountain View",
      "state": "CA",
      "postalCode": "94043"
    }
  },
  "metadata": {
    "source": "Google Maps Geocoding API",
    "country_restricted_to": "US"
  }
}
```

- Error responses:
  - 400 — invalid input (type/empty/oversize/control chars) or Google `INVALID_REQUEST`
  - 403 — Google `OVER_DAILY_LIMIT` / `REQUEST_DENIED`
  - 429 — Google `OVER_QUERY_LIMIT`
  - 502 — unexpected upstream status / unavailable
  - 503 — Google `UNKNOWN_ERROR` or upstream 5xx

Example 400:

```json
{ "error": "'address' must be a non-empty string" }
```

### Logging and Observability

- Structured JSON logs controlled by `LOG_LEVEL` (default `info`)
- Request logger adds `requestId`, method, path, status, durationMs
- Error handler logs `request.error` with status and message
- Service logs only non-OK or error scenarios from Geocoding

### Design Notes and Trade-offs

- Free-form input: minimal validation to avoid rejecting unusual but valid inputs, while preventing abuse (length/controls)
- Clear outcome states: `VALIDATED`, `CORRECTED`, `UNVERIFIABLE` map to user-friendly flows
- US-only scope: simplifies parsing and avoids country-specific variance
- Centralized error mapping: converts Google statuses to appropriate HTTP responses
- Logging: focused on errors and request lifecycle; avoids noisy success logs

### Thought Process: Validation and Classification Logic

This API classifies results as VALIDATED, CORRECTED, or UNVERIFIABLE based on Google Maps Geocoding response semantics, specifically `location_type` and flags:

- VALIDATED

  - Uses results with `partial_match = false` and `location_type = ROOFTOP` (precise street-address accuracy).
  - Extracts `street_number`, `street_name`, `city`, `state`, `zipCode` from `address_components`.

- CORRECTED

  - Uses results that are less precise but still meaningful: any with `partial_match = true` or `location_type` in { `RANGE_INTERPOLATED`, `GEOMETRIC_CENTER`, `APPROXIMATE` }.
  - Returns `possibleMatches` for client-side disambiguation instead of asserting a single authoritative address.

- UNVERIFIABLE
  - No results, or results fail heuristics (e.g., US-only bias fallback yielding country-only data).
  - Country-only fallback handling: Google bias via `components=country:US` can return a generic US result for junk input. We filter out such cases by treating a result as country-only fallback when it is a `partial_match` and either typed as `country` or lacks all detail fields (`street_number`, `street_name`, `city`, `zipCode`). These are marked UNVERIFIABLE.

Google `location_type` reference used in the logic:

- ROOFTOP: precise geocode with street address precision.
- RANGE_INTERPOLATED: approximate point along a road where rooftops are unavailable.
- GEOMETRIC_CENTER: geometric center of a street/polyline or region/polygon.
- APPROXIMATE: general approximation.

### Tools Used (including AI)

- ChatGPT assistance was used to generate initial scaffolding for repetitive setup tasks such as:
  - Creating an Express app with TypeScript support
  - Setting up tsconfig.json and ESLint
  - Drafting README sections and JSDoc comment blocks
  - Accelerating refactors (router/controller split)

AI also assisted with proofreading and structuring this README for clarity and brevity. All architecture and design descriptions reflect my own understanding and decisions.

Additionally, AI was used to brainstorm test scenarios covering:

- Validated, corrected, and unverifiable address outcomes
- Upstream API error handling (e.g., OVER_QUERY_LIMIT, INVALID_REQUEST)

### How to Test

```bash
curl -s -X POST http://localhost:3000/validate-address \
  -H 'Content-Type: application/json' \
  -d '{"address": "1600 Amphitheatre Parkway, Mountain View, CA"}' | jq .
```

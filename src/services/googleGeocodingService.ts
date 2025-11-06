import axios from "axios";
import { HttpError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import {
  AddressComponents,
  AddressValidationResult,
} from "../types/Address.js";
import { config } from "../config/env.js";

/**
 * Validates a US address using Google Maps Geocoding API.
 *
 * Maps Google `data.status` to actionable outcomes or HTTP errors:
 * - OK: analyze results for exact/corrected/unverifiable
 * - ZERO_RESULTS: returns UNVERIFIABLE with message
 * - OVER_QUERY_LIMIT: throws 429
 * - OVER_DAILY_LIMIT/REQUEST_DENIED: throws 403
 * - INVALID_REQUEST: throws 400
 * - UNKNOWN_ERROR: throws 503 (retryable)
 * - default: throws 502
 *
 * @param address Human-entered address string.
 * @param apiKey Google Maps Geocoding API key.
 * @returns Normalized validation result.
 * @throws {HttpError} When Google returns status indicating an error or quota issue.
 */
export async function validateUSAddress(
  address: string,
  apiKey: string
): Promise<AddressValidationResult> {
  const url = `${config.geocodingUrl}?address=${encodeURIComponent(
    address
  )}&components=country:US&key=${apiKey}`;

  try {
    const { data } = await axios.get(url);
    const statusOutcome = mapGoogleStatus(data.status);
    if (statusOutcome) return statusOutcome;
    return classifyGeocodeResults(data.results, address);
  } catch (err: any) {
    rethrowAxiosAsHttpError(err);
  }
}

function mapGoogleStatus(status: string): AddressValidationResult | null {
  if (status === "OK") return null;
  if (status === "ZERO_RESULTS")
    return { status: "UNVERIFIABLE", message: "No address found." };

  const statusToError: Record<
    string,
    { code: number; msg: string; log: string }
  > = {
    OVER_QUERY_LIMIT: {
      code: 429,
      msg: "Geocoding quota exceeded",
      log: "geocoding.over_query_limit",
    },
    OVER_DAILY_LIMIT: {
      code: 403,
      msg: "Geocoding request denied: invalid/missing key, billing, or usage cap",
      log: "geocoding.over_daily_limit",
    },
    REQUEST_DENIED: {
      code: 403,
      msg: "Geocoding request denied",
      log: "geocoding.request_denied",
    },
    INVALID_REQUEST: {
      code: 400,
      msg: "Invalid geocoding request: missing or malformed query",
      log: "geocoding.invalid_request",
    },
    UNKNOWN_ERROR: {
      code: 503,
      msg: "Geocoding service error, try again later",
      log: "geocoding.unknown_error",
    },
  };

  const mapping = statusToError[status];
  if (mapping) {
    logger.warn(mapping.log);
    throw new HttpError(mapping.code, mapping.msg);
  }

  logger.warn("geocoding.unexpected_status", { status });
  throw new HttpError(502, `Unexpected geocoding status: ${status}`);
}

function classifyGeocodeResults(
  results: any[],
  originalInput: string
): AddressValidationResult {
  if (!results || results.length === 0) {
    return { status: "UNVERIFIABLE", message: "No address found." };
  }

  // Filter out country-only fallbacks (e.g., "United States" due to country bias)
  const nonCountryResults = results.filter((r: any) => !isCountryOnlyResult(r));
  if (nonCountryResults.length === 0) {
    return { status: "UNVERIFIABLE", message: "No precise US match found." };
  }

  const exactMatches = nonCountryResults.filter(
    (r: any) => !r.partial_match && r.geometry?.location_type === "ROOFTOP"
  );
  if (exactMatches.length > 0) {
    const best = exactMatches[0];
    const components = extractAddressComponents(best.address_components);
    const matchStatus = compareAddresses(originalInput, best.formatted_address);
    if (matchStatus === "validated") {
      return {
        status: "VALIDATED",
        exactMatch: {
          formatted_address: best.formatted_address,
          components,
        },
      };
    }

    return {
      status: "CORRECTED",
      possibleMatches: [best.formatted_address],
    };
  }

  const possibleMatches = nonCountryResults.filter(
    (r: any) =>
      r.partial_match ||
      ["RANGE_INTERPOLATED", "GEOMETRIC_CENTER", "APPROXIMATE"].includes(
        r.geometry?.location_type
      )
  );

  if (possibleMatches.length > 0) {
    return {
      status: "CORRECTED",
      possibleMatches: possibleMatches.map((r: any) => r.formatted_address),
    };
  }

  return { status: "UNVERIFIABLE", message: "No precise US match found." };
}

function rethrowAxiosAsHttpError(err: any): never {
  if (err instanceof HttpError) {
    throw err;
  }
  const isAxios = !!(err && err.isAxiosError);
  if (isAxios) {
    const status = err.response?.status;
    logger.error("geocoding.http_error", { status });
    if (status === 403) throw new HttpError(403, "Geocoding access forbidden");
    if (status === 429) throw new HttpError(429, "Geocoding rate limited");
    if (status && status >= 500)
      throw new HttpError(503, "Geocoding upstream error");
    throw new HttpError(502, "Geocoding upstream unavailable");
  }
  logger.error("geocoding.unexpected_error", { message: err?.message });
  throw new HttpError(500, "Unexpected error during geocoding", err?.message);
}

type MatchStatus = "validated" | "corrected";

/**
 * Compares input address with Google's formatted result to determine if they match.
 * Uses normalization and word overlap similarity to handle typos and abbreviations.
 *
 * @param input User-provided address string.
 * @param result Google's formatted address string.
 * @returns "validated" if addresses match closely, "corrected" if Google made significant changes.
 */
function compareAddresses(input: string, result: string): MatchStatus {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\.,]/g, "")
      .replace(/\b(road)\b/g, "rd")
      .replace(/\b(street)\b/g, "st")
      .replace(/\b(avenue)\b/g, "ave")
      .replace(/\b(mountain)\b/g, "mtn")
      .replace(/\s+/g, " ")
      .trim();

  const normInput = normalize(input);
  const normResult = normalize(result);

  if (normInput === normResult) {
    return "validated";
  }

  const inputWords = new Set(normInput.split(" "));
  const resultWords = new Set(normResult.split(" "));
  const common = [...inputWords].filter((w) => resultWords.has(w)).length;
  const total = Math.max(inputWords.size, resultWords.size);
  const similarity = common / total;
  // If mostly overlapping (like typos or abbreviations) then validated
  if (similarity > 0.6) {
    return "validated";
  }
  return "corrected";
}

function isCountryOnlyResult(result: any): boolean {
  // Only consider partial matches as country-only fallbacks (due to US bias)
  if (!result.partial_match) {
    return false;
  }
  // Must be typed as country or have only country-level components
  const hasCountryType =
    Array.isArray(result.types) && result.types.includes("country");
  const components = extractAddressComponents(result.address_components || []);
  const lacksDetail =
    !components.street_number &&
    !components.street_name &&
    !components.city &&
    !components.zipCode;
  // Consider partial country-only fallback as unverifiable
  return hasCountryType || lacksDetail;
}

/**
 * Extracts a simplified set of address components from Google `address_components`.
 *
 * @param components Raw `address_components` array from Google.
 * @returns Simplified component set used by the API.
 */
function extractAddressComponents(components: any[]): AddressComponents {
  const get = (type: string, useShort = false) => {
    const comp = components.find((c: any) => c.types.includes(type));
    if (!comp) return undefined;
    return useShort ? comp.short_name : comp.long_name;
  };
  return {
    street_number: get("street_number"),
    street_name: get("route"),
    city: get("locality") || get("postal_town"),
    state: get("administrative_area_level_1", true),
    zipCode: get("postal_code"),
  };
}

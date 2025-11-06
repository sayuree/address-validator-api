import { Request, Response } from "express";
import { validateUSAddress } from "../services/googleGeocodingService.js";
import { config } from "../config/env.js";

/**
 * Validates a user-provided US address via Google Maps Geocoding API
 * and returns a normalized result. Assumes request payload has been
 * validated by middleware and errors bubble to centralized handlers.
 *
 * @param req Express request with `{ address: string }` body
 * @param res Express response
 * @returns Sends JSON response
 */
export async function validateAddressController(req: Request, res: Response) {
  const { address } = req.body;

  const result = await validateUSAddress(address, config.googleApiKey);

  return res.status(200).json({
    original_input: address,
    ...result,
    metadata: {
      source: "Google Maps Geocoding API",
      country_restricted_to: "US",
    },
  });
}



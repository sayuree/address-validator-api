import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  googleApiKey: process.env.GOOGLE_MAPS_GEOCODING_API_KEY as string,
  geocodingUrl:
    process.env.GOOGLE_MAPS_GEOCODING_API_URL ||
    "https://maps.googleapis.com/maps/api/geocode/json",
};

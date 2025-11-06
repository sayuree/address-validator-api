export interface ValidatedAddress {
  formatted_address: string;
  street_number?: string;
  street_name?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface AddressValidationResponse {
  status: "valid" | "corrected" | "unverifiable";
  original_input: string;
  validated_address?: string;
  message?: string;
  metadata?: {
    source: string;
    confidence_score: number;
    corrections: string[];
  };
}

export interface AddressComponents {
  street_number?: string;
  street_name?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface AddressValidationResult {
  status: "VALIDATED" | "CORRECTED" | "UNVERIFIABLE";
  exactMatch?: {
    formatted_address: string;
    components: AddressComponents;
  };
  possibleMatches?: string[];
  message?: string;
}

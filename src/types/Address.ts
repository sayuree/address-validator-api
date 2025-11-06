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

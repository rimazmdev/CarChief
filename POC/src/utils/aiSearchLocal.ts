import { Vehicle } from "../types";

/**
 * Lightning-fast local heuristic search parser for automotive queries.
 * Evaluates the query against structured fields using regular expressions and keywords.
 * Resolves in under 2ms, bypasses network latency, and avoids unnecessary Gemini/Firestore load.
 */
export function localHeuristicSearch(query: string, vehicles: Vehicle[]): { matchedIds: string[]; isConfident: boolean } {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) {
    return { matchedIds: [], isConfident: true };
  }

  // 1. Extract Price Constraints
  // Supports "under $15,000", "below 15k", "< 15000", "under 15000", "price < 25000"
  let maxPrice: number | null = null;
  let minPrice: number | null = null;

  // Regex for "under/below/less than $X/Xk"
  const underPriceRegex = /(?:under|below|less than|max|maximum|<=|<)\s*\$?\s*(\d+(?:,\d+)?)\s*(k)?/i;
  const underMatch = cleanQuery.match(underPriceRegex);
  if (underMatch) {
    let val = parseFloat(underMatch[1].replace(/,/g, ''));
    if (underMatch[2] && underMatch[2].toLowerCase() === 'k') {
      val *= 1000;
    }
    maxPrice = val;
  }

  // Regex for "above/over/more than $X/Xk"
  const overPriceRegex = /(?:above|over|more than|min|minimum|>=|>)\s*\$?\s*(\d+(?:,\d+)?)\s*(k)?/i;
  const overMatch = cleanQuery.match(overPriceRegex);
  if (overMatch) {
    let val = parseFloat(overMatch[1].replace(/,/g, ''));
    if (overMatch[2] && overMatch[2].toLowerCase() === 'k') {
      val *= 1000;
    }
    minPrice = val;
  }

  // 2. Extract Mileage Constraints
  // Supports "less than 80,000 km", "under 80000", "below 80k", "mileage under 50000"
  let maxMileage: number | null = null;
  const mileageRegex = /(?:mileage|km|kms|miles)?\s*(?:under|below|less than|<=|<)\s*(\d+(?:,\d+)?)\s*(k|thousand|km|miles)?/i;
  const mileageMatch = cleanQuery.match(mileageRegex);
  if (mileageMatch) {
    let val = parseFloat(mileageMatch[1].replace(/,/g, ''));
    if (mileageMatch[2] && (mileageMatch[2].toLowerCase() === 'k' || mileageMatch[2].toLowerCase() === 'thousand')) {
      val *= 1000;
    }
    maxMileage = val;
  }

  // 3. Extract Year Constraints
  // Supports "after 2018", "newer than 2020", "from 2015", "year > 2019"
  let minYear: number | null = null;
  let maxYear: number | null = null;
  
  const yearRegex = /(?:year|newer than|after|from|>=|>)\s*(\d{4})/i;
  const yearMatch = cleanQuery.match(yearRegex);
  if (yearMatch) {
    minYear = parseInt(yearMatch[1], 10);
  }

  const olderYearRegex = /(?:older than|before|<=|<)\s*(\d{4})/i;
  const olderYearMatch = cleanQuery.match(olderYearRegex);
  if (olderYearMatch) {
    maxYear = parseInt(olderYearMatch[1], 10);
  }

  // 4. Transmission
  const isAutomatic = cleanQuery.includes("automatic") || cleanQuery.includes("auto") || cleanQuery.includes("dual-clutch") || cleanQuery.includes("dct");
  const isManual = cleanQuery.includes("manual") || cleanQuery.includes("stick shift");

  // 5. Fuel Type
  const isHybrid = cleanQuery.includes("hybrid");
  const isElectric = cleanQuery.includes("electric") || cleanQuery.includes("ev");
  const isDiesel = cleanQuery.includes("diesel");
  const isPetrol = cleanQuery.includes("petrol") || cleanQuery.includes("gasoline") || cleanQuery.includes("v8") || cleanQuery.includes("v6");

  // 6. Colors
  const colors = ["white", "black", "red", "silver", "gray", "grey", "blue", "yellow", "green", "orange", "gold", "bronze"];
  const matchedColors = colors.filter(c => cleanQuery.includes(c));

  // 7. Dynamic Make/Brand Detection
  // Find all unique makes from the current active vehicles so we don't have to hardcode!
  const uniqueMakes = Array.from(new Set(vehicles.map(v => v.make.toLowerCase()).filter(Boolean)));
  const matchedMakes = uniqueMakes.filter(make => cleanQuery.includes(make));

  // 8. Dynamic Model Detection
  // Find all unique models from active vehicles
  const uniqueModels = Array.from(new Set(vehicles.map(v => v.model.toLowerCase()).filter(Boolean)));
  // Filter models that are long enough to avoid false positives (e.g. model "3" or "a")
  const matchedModels = uniqueModels.filter(model => model.length >= 3 && cleanQuery.includes(model));

  // 9. Vehicle Type
  const types = ["suv", "sedan", "coupe", "hatchback", "convertible", "truck", "wagon", "van"];
  const matchedTypes = types.filter(t => cleanQuery.includes(t));

  // 10. Status/Arrival Constraint
  // "arriving next month", "upcoming", "transit", "arriving soon", "incoming"
  const isTransitOrArriving = cleanQuery.includes("arriving") || cleanQuery.includes("transit") || cleanQuery.includes("upcoming") || cleanQuery.includes("incoming") || cleanQuery.includes("next month");

  // Filter candidate list
  const results = vehicles.filter(v => {
    // Price match
    if (maxPrice !== null && v.price > maxPrice) return false;
    if (minPrice !== null && v.price < minPrice) return false;

    // Mileage match
    if (maxMileage !== null && v.mileage > maxMileage) return false;

    // Year match
    if (minYear !== null && v.year < minYear) return false;
    if (maxYear !== null && v.year > maxYear) return false;

    // Transmission match
    if (isAutomatic && !v.transmission.toLowerCase().includes("auto") && !v.transmission.toLowerCase().includes("dual")) return false;
    if (isManual && !v.transmission.toLowerCase().includes("manual")) return false;

    // Fuel Type match
    if (isHybrid && !v.fuelType.toLowerCase().includes("hybrid")) return false;
    if (isElectric && !v.fuelType.toLowerCase().includes("electric") && !v.fuelType.toLowerCase().includes("ev")) return false;
    if (isDiesel && !v.fuelType.toLowerCase().includes("diesel")) return false;
    if (isPetrol && !v.fuelType.toLowerCase().includes("petrol") && !v.fuelType.toLowerCase().includes("gasoline") && !v.engine.toLowerCase().includes("v8") && !v.engine.toLowerCase().includes("v6")) return false;

    // Color match (any of the matched colors must match the vehicle's color or description)
    if (matchedColors.length > 0) {
      const vColor = v.color.toLowerCase();
      const vDesc = (v.description || "").toLowerCase();
      const hasColorMatch = matchedColors.some(c => vColor.includes(c) || vDesc.includes(c));
      if (!hasColorMatch) return false;
    }

    // Make/Brand match
    if (matchedMakes.length > 0) {
      const vMake = v.make.toLowerCase();
      const hasMakeMatch = matchedMakes.some(m => vMake === m);
      if (!hasMakeMatch) return false;
    }

    // Model match
    if (matchedModels.length > 0) {
      const vModel = v.model.toLowerCase();
      const hasModelMatch = matchedModels.some(m => vModel.includes(m));
      if (!hasModelMatch) return false;
    }

    // Vehicle Type match
    if (matchedTypes.length > 0) {
      const vType = (v.type || "").toLowerCase();
      const hasTypeMatch = matchedTypes.some(t => vType.includes(t));
      if (!hasTypeMatch) return false;
    }

    // Arrival/Transit match
    if (isTransitOrArriving) {
      const vStatus = v.status.toLowerCase();
      const hasArrivalStatus = vStatus === "arriving" || vStatus === "transit" || vStatus === "upcoming" || (v.etaDate && v.etaDate.trim() !== "");
      if (!hasArrivalStatus) return false;
    }

    return true;
  });

  // Decide if we are confident to skip server API call:
  // We are highly confident if we parsed at least one structured criteria:
  // e.g. a matched make, matched model, matched color, matched type, price constraints, mileage constraints, or arrival state.
  const hasStructuredFilters = 
    matchedMakes.length > 0 || 
    matchedModels.length > 0 || 
    matchedColors.length > 0 || 
    matchedTypes.length > 0 || 
    maxPrice !== null || 
    minPrice !== null || 
    maxMileage !== null || 
    minYear !== null || 
    isTransitOrArriving ||
    isAutomatic ||
    isManual;

  // We fall back to the server if the query is a long, highly conversational prompt (e.g., > 8 words) 
  // that might contain semantic nuances we missed, OR if no structured filter was identified.
  const wordCount = cleanQuery.split(/\s+/).length;
  const isConfident = hasStructuredFilters && (wordCount <= 9);

  return {
    matchedIds: results.map(v => v.id),
    isConfident
  };
}

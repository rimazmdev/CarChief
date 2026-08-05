/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerTier } from '../customer/types';

/**
 * Calculates weeks elapsed between a vehicle's purchasedDate (or creation date) and the current date.
 * If less than 1 week or negative/invalid, returns 1.
 */
export function getWeeksElapsed(purchasedDateStr?: string, createdAtStr?: string): number {
  const dateStr = purchasedDateStr || createdAtStr;
  if (!dateStr) return 1;

  try {
    const purchaseDate = new Date(dateStr);
    const currentDate = new Date();
    
    // Calculate difference in milliseconds
    const diffTime = currentDate.getTime() - purchaseDate.getTime();
    if (diffTime <= 0) return 1; // counts as week 1

    // Convert milliseconds to weeks (ceil to count any partial week as elapsed, e.g. day 1-7 is week 1, day 8 is week 2)
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks || 1;
  } catch (err) {
    console.error("Error parsing vehicle dates for pricing:", err);
    return 1;
  }
}

/**
 * Looks up the correct discount percentage from the CustomerTier's dynamic week discount rules.
 */
export function getTierDiscountPercentage(tier: CustomerTier | null, vehicle: any): number {
  if (!tier) return 0;

  const weeks = getWeeksElapsed(vehicle.purchasedDate, vehicle.createdAt);

  if (tier.discountRules && tier.discountRules.length > 0) {
    const matchedRule = tier.discountRules.find(rule => {
      const startMatch = weeks >= rule.startWeek;
      const endMatch = rule.endWeek === null || rule.endWeek === undefined || weeks <= rule.endWeek;
      return startMatch && endMatch;
    });
    if (matchedRule) {
      return matchedRule.discountPercentage;
    }
  }

  // Fallback to the general discountPercentage of the tier (if configured)
  return tier.discountPercentage || 0;
}

/**
 * Computes the final discounted price after applying the percentage.
 */
export function getDiscountedPrice(originalPrice: number, discountPercentage: number): number {
  if (discountPercentage <= 0) return originalPrice;
  const discountAmount = originalPrice * (discountPercentage / 100);
  return Math.max(0, originalPrice - discountAmount);
}

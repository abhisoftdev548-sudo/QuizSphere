export const CREATOR_RATING_PROMOTION_MINIMUM = 5;

export function qualifiesCreatorRating(ratingCount: number): boolean {
  return ratingCount >= CREATOR_RATING_PROMOTION_MINIMUM;
}

export type ConfidenceTier = "weak" | "moderate" | "high" | "stable";

// Sample-size buckets for displayed winrates. Rough rule of thumb, not a CI:
// the next PR will swap this for a Wilson interval, but the badge alone is
// enough to stop users from drawing strong conclusions off 7 games.
export function confidenceTier(gameCount: number): ConfidenceTier {
  if (gameCount >= 1000) return "stable";
  if (gameCount >= 200) return "high";
  if (gameCount >= 50) return "moderate";
  return "weak";
}

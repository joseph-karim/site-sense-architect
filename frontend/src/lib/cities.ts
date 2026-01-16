export const Cities = ["seattle", "austin", "chicago"] as const;
export type City = (typeof Cities)[number];

export function isCity(value: string): value is City {
  return (Cities as readonly string[]).includes(value);
}


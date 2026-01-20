export const Cities = ["seattle", "austin", "chicago"] as const;
export type City = (typeof Cities)[number];

export const CityNames: Record<City, string> = {
  seattle: "Seattle",
  austin: "Austin",
  chicago: "Chicago",
};

export function isCity(value: string): value is City {
  return (Cities as readonly string[]).includes(value);
}


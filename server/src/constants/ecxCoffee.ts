export const ECX_COFFEE_GRADES = [
  'Washed G1', 'Washed G2', 'Washed G3', 'Washed G4', 'Washed G5',
  'Natural G1', 'Natural G2', 'Natural G3', 'Natural G4', 'Natural G5',
  'Specialty Q1', 'Specialty Q2', 'Under Grade',
] as const;

export type EcxCoffeeGrade = (typeof ECX_COFFEE_GRADES)[number];

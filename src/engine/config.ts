export interface Config {
  playing: boolean;
  ink: string;
  paper: string;
  length: number;
  smear: number;
  soft: number;
  angle: number;
  turbulence: number;
  frequency: number;
  intensity: number;
  speed: number;
  seed: number;
  toneVariance: number;
  edgeRough: number;
  grain: boolean;
  grainAmt: number;
  grainSpeed: number;
}

export const cfg: Config = {
  playing: true,
  ink: '#92C2D9',
  paper: '#F7F4ED',
  length: 5,
  smear: 7,
  soft: 6,
  angle: Math.PI / 4,
  turbulence: 3,
  frequency: 5,
  intensity: 7,
  speed: 3,
  seed: Math.floor(Math.random() * 1000),
  toneVariance: 1,
  edgeRough: 6,
  grain: true,
  grainAmt: 2,
  grainSpeed: 6,
};

export const SWATCH_PALETTE = [
  '#F7F4ED',
  '#92C2D9',
  '#95BB69',
  '#CDBE6B',
  '#FEAC49',
  '#FE8F46',
];

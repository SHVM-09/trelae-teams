import { Trelae } from 'trelae-files';

const TRELAE_API_KEY = process.env.TRELAE_API_KEY!;

export const trelae = new Trelae({
  apiKey: TRELAE_API_KEY,
  devMode: false
});
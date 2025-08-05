import { Trelae } from 'trelae-files';
import { env } from "$env/dynamic/private";

const TRELAE_API_KEY = env.TRELAE_API_KEY!;

export const trelae = new Trelae({
  apiKey: TRELAE_API_KEY,
  devMode: false
});
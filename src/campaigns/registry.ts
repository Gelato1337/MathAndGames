import type { Campaign } from '../campaign';
import type { CampaignId } from '../data';
import { game } from '../state';
import { eigenvale } from './eigenvale';
import { numerola } from './numerola';

export const CAMPAIGNS: Record<CampaignId, Campaign> = { numerola, eigenvale };
export const CAMPAIGN_ORDER: CampaignId[] = ['numerola', 'eigenvale'];

/** The campaign being played. */
export function campaign(): Campaign {
  return CAMPAIGNS[game.campaign];
}

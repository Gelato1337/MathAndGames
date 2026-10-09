import type { Campaign } from '../campaign';
import type { CampaignId } from '../data';
import { game } from '../state';
import { chancewood } from './chancewood';
import { eigenvale } from './eigenvale';
import { numerola } from './numerola';

export const CAMPAIGNS: Record<CampaignId, Campaign> = { numerola, eigenvale, chancewood };
export const CAMPAIGN_ORDER: CampaignId[] = ['numerola', 'chancewood', 'eigenvale'];

/** The campaign being played. */
export function campaign(): Campaign {
  return CAMPAIGNS[game.campaign];
}

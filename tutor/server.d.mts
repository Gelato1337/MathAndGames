import type { Server } from 'node:http';
export function createServer(provider: string, answer?: (req: unknown) => Promise<string>): Server;

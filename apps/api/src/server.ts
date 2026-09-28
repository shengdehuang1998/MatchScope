import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const matches = [
  { id: 'ars-che', league: '英超', homeTeam: '阿森纳', awayTeam: '切尔西', kickoffAt: '2026-09-28T20:00:00+08:00', analysisAt: '2026-09-28T19:00:00+08:00', status: 'scheduled' },
  { id: 'bar-atm', league: '西甲', homeTeam: '巴塞罗那', awayTeam: '马德里竞技', kickoffAt: '2026-09-28T22:00:00+08:00', analysisAt: '2026-09-28T21:00:00+08:00', status: 'published' }
];

app.get('/health', async () => ({ status: 'ok', service: 'match-insight-api' }));
app.get('/api/v1/matches', async () => ({ data: matches }));
app.get('/api/v1/records', async () => ({ data: matches.filter((match) => match.status === 'published') }));

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

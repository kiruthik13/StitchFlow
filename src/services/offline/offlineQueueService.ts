import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/apiClient';

export interface QueuedProductionEvent {
  kind: 'cutting' | 'stage';
  requestId: string;
  bundleId: string;
  stepId?: string;
  quantity: number;
  occurredAt: string;
  actorId: string;
}

export interface ReplayOutcome {
  requestId: string;
  status: 'confirmed' | 'conflict' | 'rejected' | 'retry';
  code?: string;
  result?: unknown;
}

export interface ReplaySummary {
  confirmed: number;
  conflicts: number;
  rejected: number;
  remaining: number;
}

const QUEUE_STORAGE_KEY = '@stitchflow_offline_production_queue_v1';

async function readQueue(): Promise<QueuedProductionEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedProductionEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: QueuedProductionEvent[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(events));
}

export async function enqueueProductionEvent(event: QueuedProductionEvent): Promise<number> {
  const current = await readQueue();
  const deduped = current.filter((item) => item.requestId !== event.requestId);
  deduped.push(event);
  await writeQueue(deduped);
  return deduped.length;
}

export async function getQueuedProductionEvents(actorId?: string): Promise<QueuedProductionEvent[]> {
  const all = await readQueue();
  return actorId ? all.filter((item) => item.actorId === actorId) : all;
}

export async function replayProductionQueue(actorId: string): Promise<ReplaySummary> {
  const all = await readQueue();
  const mine = all.filter((item) => item.actorId === actorId);
  if (!mine.length) {
    return { confirmed: 0, conflicts: 0, rejected: 0, remaining: 0 };
  }

  const others = all.filter((item) => item.actorId !== actorId);
  const batch = mine.slice(0, 25);
  const rest = mine.slice(25);

  const outcomes = await apiRequest<ReplayOutcome[]>('/sync/production', {
    method: 'POST',
    body: JSON.stringify({
      actorId,
      events: batch.map(({ kind, requestId, bundleId, stepId, quantity, occurredAt }) => ({
        kind,
        requestId,
        bundleId,
        ...(stepId ? { stepId } : {}),
        quantity,
        occurredAt,
      })),
    }),
  });

  const retryIds = new Set(outcomes.filter((o) => o.status === 'retry').map((o) => o.requestId));
  const retryEvents = batch.filter((ev) => retryIds.has(ev.requestId));
  const nextMine = [...retryEvents, ...rest];
  await writeQueue([...others, ...nextMine]);

  return {
    confirmed: outcomes.filter((o) => o.status === 'confirmed').length,
    conflicts: outcomes.filter((o) => o.status === 'conflict').length,
    rejected: outcomes.filter((o) => o.status === 'rejected').length,
    remaining: nextMine.length,
  };
}

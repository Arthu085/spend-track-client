import { z } from 'zod';

const sessionEventSchema = z.enum(['signed-in', 'signed-out']);

export type SessionEvent = z.infer<typeof sessionEventSchema>;

export const SESSION_CHANNEL_NAME = 'auth-session';

const channel =
  typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel(SESSION_CHANNEL_NAME);

export const broadcastSessionEvent = (event: SessionEvent) => {
  channel?.postMessage(event);
};

export const onSessionEvent = (
  listener: (event: SessionEvent) => void,
): (() => void) => {
  const handleMessage = ({ data }: MessageEvent<unknown>) => {
    const event = sessionEventSchema.safeParse(data);

    if (event.success) {
      listener(event.data);
    }
  };

  channel?.addEventListener('message', handleMessage);

  return () => channel?.removeEventListener('message', handleMessage);
};

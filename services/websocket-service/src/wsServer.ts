import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';

const userConnections = new Map<string, Set<WebSocket>>();
const contestConnections = new Map<string, Set<WebSocket>>();
const allConnections = new Set<WebSocket>();

export function setupWebSocketServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = requestUrl.searchParams.get('userId');
    const contestId = requestUrl.searchParams.get('contestId');

    allConnections.add(ws);

    if (userId) {
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(ws);
      console.log(`[WebSocket] Client connected for userId: ${userId}.`);
    }

    if (contestId) {
      if (!contestConnections.has(contestId)) {
        contestConnections.set(contestId, new Set());
      }
      contestConnections.get(contestId)!.add(ws);
      console.log(`[WebSocket] Client joined contest channel: ${contestId}.`);
    }

    // Send connection acknowledgment
    ws.send(JSON.stringify({ event: 'CONNECTED', userId, contestId, timestamp: new Date().toISOString() }));

    // Listen for client subscribe/unsubscribe messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SUBSCRIBE_CONTEST' && data.contestId) {
          if (!contestConnections.has(data.contestId)) {
            contestConnections.set(data.contestId, new Set());
          }
          contestConnections.get(data.contestId)!.add(ws);
          console.log(`[WebSocket] Socket subscribed to contest ${data.contestId}`);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      allConnections.delete(ws);

      if (userId && userConnections.has(userId)) {
        const userSockets = userConnections.get(userId)!;
        userSockets.delete(ws);
        if (userSockets.size === 0) userConnections.delete(userId);
      }

      contestConnections.forEach((sockets, cId) => {
        sockets.delete(ws);
        if (sockets.size === 0) contestConnections.delete(cId);
      });

      console.log(`[WebSocket] Client disconnected.`);
    });

    ws.on('error', (err) => console.error(`[WebSocket] Error:`, err));
  });

  console.log(`[WebSocket] Real-Time Gateway listening on ws://localhost:${port}`);
  return wss;
}

/**
 * Pushes real-time JSON message to all active WebSocket connections belonging to a specific userId.
 */
export function pushToUser(userId: string, payload: Record<string, unknown>): void {
  const sockets = userConnections.get(userId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  const messageStr = JSON.stringify(payload);
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

/**
 * Broadcasts real-time JSON message to all active WebSocket clients subscribed to a contest.
 */
export function broadcastToContest(contestId: string, payload: Record<string, unknown>): void {
  const messageStr = JSON.stringify(payload);
  const sockets = contestConnections.get(contestId);

  if (sockets && sockets.size > 0) {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  // Also send to all connected WebSocket clients as global fallback
  allConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });

  console.log(`[WebSocket] Broadcasted event '${payload.event}' to contest ${contestId}`);
}

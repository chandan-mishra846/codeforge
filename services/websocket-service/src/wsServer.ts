import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';

const userConnections = new Map<string, Set<WebSocket>>();

export function setupWebSocketServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = requestUrl.searchParams.get('userId');

    if (!userId) {
      console.warn('[WebSocket] Rejected connection attempt without userId.');
      ws.close(1008, 'userId query parameter is required');
      return;
    }

    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);

    console.log(`[WebSocket] Client connected for userId: ${userId}. Active clients for user: ${userConnections.get(userId)!.size}`);

    // Send connection acknowledgment
    ws.send(JSON.stringify({ event: 'CONNECTED', userId, timestamp: new Date().toISOString() }));

    ws.on('close', () => {
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
        }
      }
      console.log(`[WebSocket] Client disconnected for userId: ${userId}`);
    });

    ws.on('error', (err) => console.error(`[WebSocket] Error for userId ${userId}:`, err));
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
    console.log(`[WebSocket] No active clients connected for user ${userId}. Message buffered.`);
    return;
  }

  const messageStr = JSON.stringify(payload);
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });

  console.log(`[WebSocket] Streamed event '${payload.event}' to ${sockets.size} active connection(s) for user ${userId}`);
}

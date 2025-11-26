const express = require('express');
const {GameDig} = require('gamedig');
const {GameServers} = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

let serverStatusCache = [];
let lastCacheUpdate = 0;
const QUERY_INTERVAL = 5 * 1000;

async function queryServer(server) {
  const baseStatus = {
    id: server.id,
    name: server.name,
    ip: server.ip,
    port: server.port,
    type: server.type,
    online: false,
    players: {current: 0, max: 0},
    lastUpdated: new Date().toISOString(),
  };

  try {
    const startTime = Date.now();
    const state = await GameDig.query({
      type: server.type,
      host: server.ip,
      port: server.internalPort || server.port,
      socketTimeout: 1000,
      attemptTimeout: 1000,
      maxRetries: 1,
    });

    const ping = Date.now() - startTime;

    return {
      ...baseStatus,
      online: true,
      players: {
        current: state.players?.length || 0,
        max: state.maxplayers || 0,
        list: state.players?.map((player) => ({
          name: player.name || 'Unknown',
          raw: {
            score: player.raw?.score,
            time: player.raw?.time,
          }
        })) || [],
      },
      map: state.map || undefined,
      ping,
    };
  } catch (error) {
    console.error(`Error querying server ${server.name}:`, error.message);
    return {
      ...baseStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function queryAllServers() {
  if (GameServers.length === 0) {
    return [];
  }

  const promises = GameServers.map(server => queryServer(server));
  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const server = GameServers[index];
      return {
        id: server.id,
        name: server.name,
        ip: server.ip,
        port: server.port,
        type: server.type,
        online: false,
        players: {current: 0, max: 0},
        lastUpdated: new Date().toISOString(),
        error: 'Query failed',
      };
    }
  });
}

async function refreshCache() {
  console.log('Refreshing server status cache...');
  serverStatusCache = await queryAllServers();
  lastCacheUpdate = Date.now();
  console.log(`Cache updated at ${new Date(lastCacheUpdate).toISOString()}`);
}

function getCache() {
  return {
    servers: serverStatusCache,
    lastUpdated: new Date(lastCacheUpdate).toISOString(),
  };
}

function startPolling() {
  refreshCache();
  setInterval(refreshCache, QUERY_INTERVAL);
  console.log(`Server polling started with ${QUERY_INTERVAL / 1000}s interval`);
}

app.get('/', (req, res) => {
  res.json(getCache());
});

startPolling();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

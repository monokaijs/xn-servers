const express = require('express');
const cors = require('cors');
const {GameDig} = require('gamedig');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const serverCache = new Map();
const CACHE_TTL = 5 * 1000;

function getCacheKey(type, ip, port) {
  return `${type}:${ip}:${port}`;
}

async function queryServer(type, ip, port) {
  const cacheKey = getCacheKey(type, ip, port);
  const cached = serverCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const baseStatus = {
    type,
    ip,
    port,
    online: false,
    players: {current: 0, max: 0},
    lastUpdated: new Date().toISOString(),
  };

  try {
    console.log(`Querying ${type} at ${ip}:${port}...`);

    const startTime = Date.now();
    const state = await GameDig.query({
      type,
      host: ip,
      port,
      socketTimeout: 3000,
      attemptTimeout: 5000,
      maxRetries: 2,
      givenPortOnly: true,
    });

    const ping = Date.now() - startTime;

    const result = {
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

    serverCache.set(cacheKey, {data: result, timestamp: Date.now()});
    return result;
  } catch (error) {
    console.error(`Error querying server ${type} (${ip}:${port}):`, error.stack || error.message);
    const result = {
      ...baseStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    serverCache.set(cacheKey, {data: result, timestamp: Date.now()});
    return result;
  }
}

function parseAddresses(addressesParam) {
  if (!addressesParam) return [];

  return addressesParam.split(',').map(addr => {
    const parts = addr.trim().split(':');
    if (parts.length < 3) return null;
    const type = parts[0];
    const port = parseInt(parts[parts.length - 1], 10);
    const ip = parts.slice(1, -1).join(':');
    if (!type || !ip || isNaN(port)) return null;
    return {type, ip, port};
  }).filter(Boolean);
}

app.get('/', async (req, res) => {
  const {addresses} = req.query;

  if (!addresses) {
    return res.status(400).json({error: 'Missing addresses query parameter. Format: type:ip:port,type:ip:port,...'});
  }

  const servers = parseAddresses(addresses);

  if (servers.length === 0) {
    return res.status(400).json({error: 'Invalid addresses format. Format: type:ip:port,type:ip:port,...'});
  }

  const results = await Promise.all(
    servers.map(s => queryServer(s.type, s.ip, s.port))
  );

  res.json({servers: results});
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

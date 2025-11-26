const GameServers = [{
  id: 'server1',
  name: '[#1] Competitive',
  type: 'counterstrike2',
  ip: 'cs2.xomnghien.com',
  port: 27015,
  internalIp: 'cs_competitive',
  internalPort: 27015,
}, {
  id: 'server2',
  name: '[#2] Death Match',
  type: 'counterstrike2',
  ip: 'cs2.xomnghien.com',
  port: 27021,
  internalIp: 'cs2_death_match',
  internalPort: 27015,
}, {
  id: 'server3',
  name: '[#3] 1v1',
  type: 'counterstrike2',
  ip: 'cs2.xomnghien.com',
  port: 27025,
  internalIp: 'cs2_solo',
  internalPort: 27015,
}]

module.exports = {
  GameServers,
}
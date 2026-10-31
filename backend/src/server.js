const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./sockets');

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${env.port}`);
});

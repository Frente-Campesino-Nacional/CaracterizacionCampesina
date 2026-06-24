const os = require('os');
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

require(path.resolve(__dirname, '../../../scripts/fix-anymatch-read.cjs'));

function getLocalIPv4() {
  const nets = os.networkInterfaces();
  const ignored = ['loopback', 'vethernet', 'virtual', 'hyper-v', 'bluetooth', 'teredo'];

  for (const [name, addresses] of Object.entries(nets)) {
    const lower = name.toLowerCase();
    if (ignored.some((x) => lower.includes(x))) {
      continue;
    }

    for (const addr of addresses || []) {
      if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.254.')) {
        return addr.address;
      }
    }
  }

  return null;
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen({ port, host, exclusive: true });
  });
}

async function checkPortAvailable(port) {
  // On Windows, another process can bind only on IPv6 and still conflict later.
  const ipv4Free = await canListen(port, '0.0.0.0');
  const ipv6Free = await canListen(port, '::');
  return ipv4Free && ipv6Free;
}

async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await checkPortAvailable(port))) {
    port += 1;
  }
  return port;
}

async function main() {
  const ip = getLocalIPv4();
  if (!ip) {
    console.error('[expo-lan] No se pudo detectar una IP local IPv4 valida.');
    process.exit(1);
  }

  const requestedPort = Number.parseInt(process.env.EXPO_PORT || '8081', 10);
  const selectedPort = Number.isNaN(requestedPort) ? 8081 : requestedPort;
  const portAvailable = await checkPortAvailable(selectedPort);
  if (!portAvailable) {
    console.error(`[expo-lan] El puerto ${selectedPort} ya esta en uso. Cierra el proceso que lo ocupa o libera 8081 antes de iniciar Expo.`);
    process.exit(1);
  }
  const backendPort = Number.parseInt(process.env.EXPO_PUBLIC_API_PORT || '3008', 10);
  const backendApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || `http://${ip}:${backendPort}/api`;

  console.log(`[expo-lan] Usando IP local ${ip}`);
  console.log(`[expo-lan] Usando puerto ${selectedPort}`);
  console.log(`[expo-lan] API backend ${backendApiUrl}`);

  const expoCli = path.resolve(__dirname, '../../../node_modules/expo/bin/cli');
  const child = spawn(process.execPath, [expoCli, 'start', '--go', '--lan', '-c', '--port', String(selectedPort)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: ip,
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      EXPO_PUBLIC_API_BASE_URL: backendApiUrl,
    },
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error('[expo-lan] Error iniciando Expo:', error);
  process.exit(1);
});

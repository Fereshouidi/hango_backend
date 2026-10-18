const os = require('os');

/**
 * Returns a list of local IPv4 network addresses (e.g. LAN IPs)
 */
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    for (const iface of entries || []) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !iface.address.startsWith('169.254.')
      ) {
        addresses.push(iface.address);
      }
    }
  }

  return [...new Set(addresses)];
}

module.exports = {
  getLocalIPAddresses,
};

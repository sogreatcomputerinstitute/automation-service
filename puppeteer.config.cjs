const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Forces Puppeteer to download and look for Chrome right inside your project directory
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};

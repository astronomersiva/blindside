/* eslint-disable no-console */

const chalk = require('chalk');
const fs = require('fs');
const ora = require('ora');
const devices = require('puppeteer/DeviceDescriptors');
const compareImages = require('resemblejs/compareImages');

const { URL } = require('url');

const error = chalk.bold.red;
const warning = chalk.keyword('orange');
const info = chalk.cyan;

const slugify = (url, cookies) => {
  const cookiesStringified = JSON.stringify(cookies) || '';
  const toSlugify = `${url}-${cookiesStringified.substring(0, 50)}`;
  return toSlugify.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

module.exports = {
  /* eslint-disable no-await-in-loop */
  asyncForEach: async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  },
  /* eslint-enable no-await-in-loop */

  checkTmpDir: () => {
    if (!fs.existsSync('tmp')) {
      const spinner = ora('Creating tmp directory 📁').start();
      fs.mkdirSync('tmp');
      spinner.stopAndPersist({ symbol: '✅  ' });
    }
  },

  fileNamesGenerator: (pages) => {
    const fileNames = [];
    pages.forEach((pageObject) => {
      const { url, devices: deviceList = [] } = pageObject;
      const slug = slugify(url);
      const fileName = `${slug}.png`;
      fileNames.push(fileName);
      deviceList.forEach((device) => {
        const deviceName = device.name.split(' ').join('-');
        fileNames.push(`${deviceName}-${fileName}`);
      });
    });

    return fileNames;
  },

  getDeviceObjects(devicesToEmulate = []) {
    const deviceObjects = devicesToEmulate.map(device => devices[device]);

    return deviceObjects;
  },

  getDiff: async (file1, file2) => {
    const options = {
      output: {
        errorType: 'movementDifferenceIntensity',
        transparency: 0.5,
      },
    };
    /* eslint-disable no-param-reassign */
    file1 = fs.readFileSync(file1);
    file2 = fs.readFileSync(file2);
    const data = await compareImages(file1, file2, options);

    return data;
    /* eslint-enable no-param-reassign */
  },

  logError: (message) => {
    console.log(error(message));
  },

  logWarning: (message) => {
    console.log(warning(message));
  },

  logInfo: (message) => {
    console.log(info(message));
  },

  replaceProdWithDev: (url, developmentUrl, protocol = 'http') => {
    const devUrl = new URL(url);
    devUrl.host = developmentUrl;
    devUrl.protocol = protocol;

    return devUrl.href;
  },

  slugify,
};

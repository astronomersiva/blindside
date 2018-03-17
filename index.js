#!/usr/bin/env/node

require('dotenv').config();

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ora = require('ora');

const {
  asyncForEach,
  checkTmpDir,
  getDeviceObjects,
  getDiff,
  logInfo,
  logWarning,
  logError,
  replaceProdWithDev,
  slugify,
} = require('./utils');

const {
  PWD,
  DEBUG,
} = process.env;

const {
  developmentProtocol = 'http',
  developmentUrl,
  pages = [],
  pageGroups = [],
  cookies,
  devicesToEmulate,
  viewport,
  waitFor,
  puppeteerOptions = {},
} = require(path.join(PWD, 'blindside.js'));

const pagesToTest = [];

pages.forEach((page) => {
  pagesToTest.push({
    url: page,
    cookies,
    devicesToEmulate,
    viewport,
    waitFor,
  });
});

if (pageGroups) {
  pageGroups.forEach((pageGroup) => {
    const {
      devicesToEmulate,
      cookies,
      viewport,
      waitFor,
    } = pageGroup;

    pageGroup.urls.forEach((url) => {
      pagesToTest.push({
        url,
        devicesToEmulate,
        cookies,
        viewport,
        waitFor,
      });
    });
  });
}

Object.assign(puppeteerOptions, {
  args: ['--no-sandbox'],
});

if (DEBUG) {
  Object.assign(puppeteerOptions, {
    headless: false,
    slowMo: 250,
  });
}

const defaultWaitFor = {
  waitUntil: 'networkidle2',
  timeout: 0,
};

async function refreshPageAfterCookies(page, url, waitFor) {
  await page.reload(waitFor);
  await page.goto(url, waitFor);
  await page.reload(waitFor);
}

const command = process.argv[2];
checkTmpDir();

if (command === 'compareDevWithProd') {
  (async () => {
    const browser = await puppeteer.launch(puppeteerOptions);

    const screenshots = [];

    await asyncForEach(pagesToTest, async (pageObject) => {
      const page = await browser.newPage();
      let spinner;

      try {
        const {
          cookies,
          devicesToEmulate,
          url: prodPage,
          viewport,
          waitFor,
        } = pageObject;
        const deviceObjects = getDeviceObjects(devicesToEmulate);
        const devUrl = replaceProdWithDev(prodPage, developmentUrl, developmentProtocol);
        const slug = slugify(devUrl, cookies);

        page.on('pageerror', (pageError) => {
          logError(`${pageError} while emulating ${prodPage}`);
        });

        const devScreenshot = `tmp/dev-${slug}.png`;
        const prodScreenshot = `tmp/prod-${slug}.png`;

        if (viewport) {
          await page.setViewport(viewport);
        }

        spinner = ora(`Getting screenshots for ${prodPage} in dev and prod.`).start();
        await page.goto(devUrl, waitFor || defaultWaitFor);

        if (cookies) {
          page.setCookie(...cookies);
          await refreshPageAfterCookies(page, devUrl, waitFor || defaultWaitFor);
        }

        await page.screenshot({ path: devScreenshot, fullPage: true });

        await page.goto(prodPage, waitFor || defaultWaitFor);

        if (cookies) {
          page.setCookie(...cookies);
          await refreshPageAfterCookies(page, prodPage, waitFor || defaultWaitFor);
        }

        await page.screenshot({ path: prodScreenshot, fullPage: true });

        spinner.stop();

        screenshots.push({
          devScreenshot,
          prodScreenshot,
          page: prodPage,
          cookies,
        });

        await asyncForEach(deviceObjects, async (device) => {
          const deviceSpinner = ora(`Getting screenshots for ${prodPage} in dev and prod while emulating ${device.name}`).start();
          await page.emulate(device);
          const deviceDevScreenshot = `tmp/dev-${device.name.split(' ').join('-')}-${slug}.png`;
          const deviceProdScreenshot = `tmp/prod-${device.name.split(' ').join('-')}-${slug}.png`;

          await page.goto(devUrl, waitFor || defaultWaitFor);
          if (cookies) {
            page.setCookie(...cookies);
            await refreshPageAfterCookies(page, devUrl, waitFor || defaultWaitFor);
          }

          await page.screenshot({ path: deviceDevScreenshot, fullPage: true });

          await page.goto(prodPage, waitFor || defaultWaitFor);
          if (cookies) {
            page.setCookie(...cookies);
            await refreshPageAfterCookies(page, prodPage, waitFor || defaultWaitFor);
          }

          await page.screenshot({ path: deviceProdScreenshot, fullPage: true });

          deviceSpinner.stop();

          screenshots.push({
            devScreenshot: deviceDevScreenshot,
            prodScreenshot: deviceProdScreenshot,
            device: device.name,
            page: prodPage,
            cookies,
          });
        });

        asyncForEach(screenshots, async ({
          devScreenshot, prodScreenshot, page, device, cookies,
        }) => {
          const diff = await getDiff(devScreenshot, prodScreenshot);
          if (diff.rawMisMatchPercentage > 0) {
            let message = `\n⚠️   Mismatch found in ${page}`;
            if (device) {
              message = `${message} while emulating ${device}`;
            }
            logWarning(message);

            const slug = slugify(page, cookies);
            let fileName = `./tmp/diff-${slug}.png`;
            if (device) {
              fileName = `./tmp/diff-${slug}-${device.split(' ').join('-')}.png`;
            }

            fs.writeFileSync(fileName, diff.getBuffer());
            logInfo(`Diff stored in ${fileName}`);
          }
        });
      } catch ({ message }) {
        logError(`\n${message} while testing ${pageObject.url}`);
        spinner.stop();
      } finally {
        await page.close();
      }
    });

    await browser.close();
  })();
}

require('dotenv').config();
// Playwright configuration for UXOrbit Multi-Agent Testing Dashboard
const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 30000,
  retries: 2,
  workers: 2,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'WebKit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  globalSetup: undefined, // Placeholder for global setup
  globalTeardown: undefined, // Placeholder for global teardown
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  fullyParallel: true,
  expect: {
    timeout: 5000,
  },
};

module.exports = config;

import { chromium, Browser, BrowserContext, Page, Route } from 'playwright';
import { pino } from 'pino';

const logger = pino({ name: 'browser-pool' });

export class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  public async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((res) => setTimeout(res, 50));
      }
      if (this.browser && this.browser.isConnected()) {
        return this.browser;
      }
    }

    this.isInitializing = true;
    try {
      logger.info('🚀 Launching isolated Chromium render engine...');
      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

      this.browser = await chromium.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=medium',
          '--disable-extensions',
          '--disable-background-networking',
        ],
      });
      logger.info('✅ Chromium render engine ready.');
      return this.browser;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Creates an isolated, zero-network-leakage Page context for deterministic rendering.
   */
  public async createIsolatedPage(
    widthPx = 800,
    heightPx = 1200,
  ): Promise<{
    context: BrowserContext;
    page: Page;
    close: () => void;
  }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: widthPx, height: heightPx },
      deviceScaleFactor: 1,
      offline: true, // Network disabled
    });

    const page = await context.newPage();

    // Defensive: intercept and abort any outbound HTTP/HTTPS network calls (data: URIs allowed)
    await page.route('**', (route: Route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        route.continue();
      } else {
        logger.warn({ url }, '🛑 Blocked outbound network request during card render');
        route.abort('blockedbyclient');
      }
    });

    const close = async () => {
      try {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      } catch (err) {
        logger.error({ err }, 'Error closing isolated browser context');
      }
    };

    return { context, page, close };
  }

  public async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      logger.info('🛑 Chromium render engine stopped.');
    }
  }
}

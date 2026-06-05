const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';

class AgentBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isCDP = false;
  }

  async init() {
    if (this.browser) return;
    
    // ── Priority 1: Connect to your existing Chrome via CDP ──────────────────
    // This gives the agent access to all your signed-in sessions (Gmail, etc.)
    // Run launch_chrome_debug.bat first to start Chrome with --remote-debugging-port=9222
    try {
      this.browser = await chromium.connectOverCDP(CDP_URL);
      this.isCDP = true;
      console.log('[Browser] ✅ Connected to existing Chrome via CDP (signed-in sessions available).');
      
      // Use the first existing context (your logged-in profile)
      const contexts = this.browser.contexts();
      const context = contexts[0] || await this.browser.newContext();
      
      // Always open a FRESH tab so the agent starts clean.
      // We intentionally do NOT reuse existing tabs (they may be on localhost or have
      // stale state). A new tab still has access to all your signed-in cookies.
      this.page = await context.newPage();
      console.log('[Browser] Opened a fresh tab in your signed-in Chrome.');

    } catch (err) {
      // ── Fallback: launch a fresh Chromium if CDP is unavailable ──────────────
      console.warn('[Browser] ⚠️  CDP not available — launching fresh Chromium (no saved logins). Error:', err.message);
      console.warn('[Browser] TIP: Run launch_chrome_debug.bat first to use your signed-in Gmail/Google account.');
      this.isCDP = false;
      
      const { chromium: chromiumExtra } = require('playwright-extra');
      const stealth = require('puppeteer-extra-plugin-stealth')();
      chromiumExtra.use(stealth);

      // Run headless only on Render (RENDER env var is set automatically by Render)
      const isHeadless = process.env.RENDER === 'true' || process.env.HEADLESS === 'true';
      console.log(`[Browser] Launching Chromium (headless: ${isHeadless})...`);

      this.browser = await chromiumExtra.launch({ headless: isHeadless });
      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      });
      this.page = await context.newPage();
    }
  }

  async ensureInit() {
    if (!this.browser || !this.page) {
      await this.init();
    }
  }

  async goto(url) {
    await this.ensureInit();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async look() {
    await this.ensureInit();
    
    const elementsSummary = await this.page.evaluate(() => {
      let idCounter = 1;
      const elements = [];
      const interactables = document.querySelectorAll('button, input, select, textarea, a');
      
      interactables.forEach((el) => {
        if (el.offsetParent === null) return;
        
        const tagName = el.tagName.toLowerCase();
        let name = el.innerText || el.value || el.placeholder || el.name || '';
        name = name.trim().replace(/\n/g, ' ').substring(0, 50);
        
        if (!name && tagName === 'input') {
          name = el.type;
        }

        if (!name && el.getAttribute('aria-label')) {
          name = el.getAttribute('aria-label');
        }

        if (tagName === 'a' && !name) {
          name = el.href.substring(0, 30);
        }

        el.setAttribute('data-ai-id', idCounter);
        elements.push(`[${idCounter}] ${tagName}: '${name}'`);
        idCounter++;
      });
      
      return elements.join('\n');
    });
    
    return elementsSummary;
  }

  async click(id) {
    await this.ensureInit();
    const selector = `[data-ai-id="${id}"]`;
    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.click(selector, { force: true });
    await this.page.waitForTimeout(2000);
  }

  async type(id, text) {
    await this.ensureInit();
    const selector = `[data-ai-id="${id}"]`;
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.fill(selector, text);
  }

  async press(key) {
    await this.ensureInit();
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(1000);
  }

  async keyboard_type(text) {
    await this.ensureInit();
    await this.page.keyboard.type(text, { delay: 50 });
    await this.page.waitForTimeout(500);
  }

  async skipYouTubeAd() {
    if (!this.page) return false;
    try {
      // Try clicking 'Skip Ad' button if it exists
      const skipButton = await this.page.$('.ytp-skip-ad-button, .ytp-ad-skip-button, button.ytp-skip-ad-button');
      if (skipButton) {
        await skipButton.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
    } catch (e) {}
    return false;
  }

  async getPageText() {
    return await this.page.evaluate(() => document.body.innerText.substring(0, 2000));
  }

  /**
   * Expert Skill: ChatGPT Search
   * Navigates to ChatGPT and submits a query.
   */
  async chatgptSearch(query) {
    await this.ensureInit();
    await this.page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    
    const textareaSelector = 'textarea#prompt-textarea';
    await this.page.waitForSelector(textareaSelector, { timeout: 15000 });
    await this.page.fill(textareaSelector, query);
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Enter');
    
    return true;
  }

  /**
   * Expert Skill: Gemini Search
   * Navigates to Gemini and submits a query.
   */
  async geminiSearch(query) {
    await this.ensureInit();
    await this.page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded' });
    
    // Gemini often uses a contenteditable or a specific textarea
    const selectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder*="prompt"]',
      'textarea[placeholder*="Gemini"]',
      '.prompt-textarea'
    ];

    let found = false;
    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        await this.page.keyboard.type(query);
        await this.page.keyboard.press('Enter');
        found = true;
        break;
      } catch (e) {}
    }

    if (!found) {
      throw new Error("Could not find Gemini input box. Are you signed in?");
    }
    
    return true;
  }

  /**
   * Expert Skill: YouTube Search
   * Navigates to YouTube and searches with slow typing.
   */
  async youtubeSearch(query) {
    await this.ensureInit();
    await this.page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
    
    const searchSelector = 'input#search, input[name="search_query"]';
    await this.page.waitForSelector(searchSelector, { timeout: 15000 });
    await this.page.click(searchSelector);
    
    // Type slowly as requested (100ms per char)
    await this.page.keyboard.type(query, { delay: 100 });
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Enter');
    
    // Wait for results to load
    await this.page.waitForTimeout(3000);
    return true;
  }

  /**
   * Expert Skill: YouTube Play
   * Searches for a video and plays the first result.
   */
  async youtubePlay(query) {
    await this.ensureInit();
    await this.page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
    
    const searchSelector = 'input#search, input[name="search_query"]';
    await this.page.waitForSelector(searchSelector, { timeout: 15000 });
    await this.page.click(searchSelector);
    await this.page.fill(searchSelector, '');
    await this.page.keyboard.type(query, { delay: 100 });
    await this.page.keyboard.press('Enter');
    
    // Wait for the video results to appear
    const videoSelector = 'ytd-video-renderer #video-title, #contents ytd-video-renderer a#video-title';
    await this.page.waitForSelector(videoSelector, { timeout: 15000 });
    
    const firstVideo = this.page.locator(videoSelector).first();
    const videoCount = await this.page.locator(videoSelector).count();
    if (videoCount === 0) {
      throw new Error("No videos found for the query.");
    }

    await firstVideo.scrollIntoViewIfNeeded();
    try {
      await firstVideo.click({ timeout: 5000 });
    } catch (error) {
      await firstVideo.focus();
      await this.page.keyboard.press('Enter');
    }

    // Attempt to skip ads immediately
    await this.page.waitForTimeout(3000);
    await this.skipYouTubeAd();
    
    return true;
  }

  async sendWhatsAppMessage(phone, message) {
    await this.ensureInit();

    const cleanPhone = String(phone).replace(/[^\d]/g, '');
    if (!cleanPhone) {
      throw new Error('No valid phone number was provided for WhatsApp.');
    }

    const deeplink = `https://web.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(message)}`;
    await this.page.goto(deeplink, { waitUntil: 'domcontentloaded' });

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);

    const blockedText = await this.page.locator('body').innerText().catch(() => '');
    if (/use whatsapp on your computer|download it here|link a device/i.test(blockedText)) {
      throw new Error('WhatsApp Web is not ready in Chrome. Open web.whatsapp.com on the laptop and make sure the account is signed in.');
    }

    const sendSelectors = [
      'button[aria-label="Send"]',
      'button[aria-label*="Send"]',
      'span[data-icon="send"]',
      'div[role="button"] span[data-icon="send"]',
      'footer button span[data-icon="send"]',
    ];

    let clicked = false;
    for (const selector of sendSelectors) {
      const locator = this.page.locator(selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 7000 });
        await locator.click({ force: true });
        clicked = true;
        break;
      } catch (error) {}
    }

    if (!clicked) {
      const sendButtonLocator = this.page
        .locator('button, div[role="button"]')
        .filter({ has: this.page.locator('span[data-icon="send"]') })
        .first();
      try {
        await sendButtonLocator.waitFor({ state: 'visible', timeout: 5000 });
        await sendButtonLocator.click({ force: true });
        clicked = true;
      } catch (error) {}
    }

    if (!clicked) {
      throw new Error('Could not find the WhatsApp send button to click.');
    }

    await this.page.waitForTimeout(2500);
    return deeplink;
  }

  async lookDesktop() {
    // For desktop, we don't have interactive element IDs from HTML,
    // so we rely on the agent's visual analysis of the screenshot.
    return "Desktop view active. Use visual analysis of the screenshot to decide actions.";
  }

  /**
   * Captures a screenshot and saves it to the public folder.
   * Can capture either the browser page or the full desktop.
   * @param {string} filename - name of the file (without extension)
   * @param {boolean} fullDesktop - whether to capture the whole desktop
   * @returns {string} relative path to the saved file
   */
  async takeScreenshot(filename = 'current_screen', fullDesktop = false) {
    const path = `public/screenshots/${filename}.jpg`;
    
    if (fullDesktop) {
      const osControl = require('./os_control');
      await osControl.takeDesktopScreenshot(path);
    } else {
      await this.ensureInit();
      await this.page.screenshot({ path, type: 'jpeg', quality: 80 });
    }
    
    return `screenshots/${filename}.jpg`;
  }

  async close() {
    // If connected via CDP, just close the page (tab), not the whole browser
    if (this.page) {
      try { await this.page.close(); } catch (e) {}
      this.page = null;
    }
    // Only close the browser if we launched it ourselves
    if (this.browser && !this.isCDP) {
      try { await this.browser.close(); } catch (e) {}
      this.browser = null;
    }
  }
}

module.exports = AgentBrowser;

const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs/promises');
const path = require('path');
const execFilePromise = util.promisify(execFile);
const osControl = require('./os_control');

class TaskExecutor {
  constructor(emitUpdate, askHuman) {
    this.emitUpdate = emitUpdate;
    this.askHuman = askHuman;
    this.isCancelled = false;
  }

  loadWhatsAppContacts() {
    const contactsPath = path.join(__dirname, 'whatsapp_contacts.json');
    try {
      const raw = require(contactsPath);
      return raw && typeof raw === 'object' ? raw : {};
    } catch (error) {
      return {};
    }
  }

  findWhatsAppContact(contactName) {
    const contacts = this.loadWhatsAppContacts();
    const requested = String(contactName || '').trim().toLowerCase();
    const entries = Object.entries(contacts);

    const exact = entries.find(([name]) => name.toLowerCase() == requested);
    if (exact) {
      return { name: exact[0], phone: exact[1] };
    }

    const partial = entries.find(([name]) => name.toLowerCase().includes(requested));
    if (partial) {
      return { name: partial[0], phone: partial[1] };
    }

    const available = entries.map(([name]) => name).sort();
    throw new Error(
      available.length
        ? `Saved WhatsApp contact "${contactName}" was not found. Available contacts: ${available.join(', ')}.`
        : 'No saved WhatsApp contacts were found. Add entries to backend/whatsapp_contacts.json first.'
    );
  }

  emitEvent(kind, message, extra = {}) {
    this.emitUpdate({
      kind,
      message,
      ...extra,
    });
  }

  abort() {
    this.isCancelled = true;
  }

  async parseTask(task) {
    const runners = [
      ['python', ['nlp_processor.py', task]],
      ['py', ['-3', 'nlp_processor.py', task]],
      ['python3', ['nlp_processor.py', task]],
    ];

    let lastError = null;

    for (const [command, args] of runners) {
      try {
        const { stdout } = await execFilePromise(command, args, { cwd: __dirname });
        return JSON.parse(stdout);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to run NLP parser.');
  }

  async buildScreenshotDataUrl(relativePath) {
    const absolutePath = path.join(__dirname, 'public', relativePath);
    const imageBuffer = await fs.readFile(absolutePath);
    const extension = path.extname(relativePath).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  }

  async captureDesktop(browser, prefix) {
    const screenshotPath = await browser.takeScreenshot(`${prefix}_${Date.now()}`, true);
    const screenshotDataUrl = await this.buildScreenshotDataUrl(screenshotPath);
    this.emitEvent('screenshot', 'Captured a screenshot from the laptop.', {
      screenshotPath,
      screenshotPreviewUrl: screenshotDataUrl,
      screenshotDataUrl,
      keepOpen: true,
    });
    return screenshotPath;
  }

  async runLoop(browser, task) {
    this.isCancelled = false;
    this.emitEvent('step', 'Analyzing your command with the local parser...');

    try {
      const nlpResult = await this.parseTask(task);

      if (nlpResult.intent === 'unknown') {
        this.emitEvent('error', "I couldn't recognize that command with the local parser.");
        return 'unknown';
      }

      this.emitEvent('step', `Intent detected: ${nlpResult.intent}. Starting execution...`, {
        intent: nlpResult.intent,
      });

      switch (nlpResult.intent) {
        case 'chatgpt_search': {
          this.emitEvent('step', `Opening ChatGPT and searching for "${nlpResult.entities.value}".`);
          await osControl.chatgptAppSearch(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for ChatGPT results to render...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await this.captureDesktop(browser, 'chatgpt_app');
          this.emitEvent('result', 'ChatGPT results are on screen. The app stays open.');
          break;
        }

        case 'gemini_search': {
          this.emitEvent('step', `Opening Gemini and searching for "${nlpResult.entities.value}".`);
          await osControl.geminiAppSearch(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for Gemini to respond...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await this.captureDesktop(browser, 'gemini_app');
          this.emitEvent('result', 'Gemini is open with the requested response visible.');
          break;
        }

        case 'perplexity_search': {
          this.emitEvent('step', `Opening Perplexity and searching for "${nlpResult.entities.value}".`);
          await osControl.perplexityAppSearch(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for Perplexity to respond...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await this.captureDesktop(browser, 'perplexity_app');
          this.emitEvent('result', 'Perplexity is open with the requested response visible.');
          break;
        }

        case 'youtube_search': {
          this.emitEvent('step', `Searching YouTube for "${nlpResult.entities.value}" and opening the first result.`);
          await browser.youtubePlay(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for playback to stabilize...');
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await browser.skipYouTubeAd();
          await this.captureDesktop(browser, 'youtube_app');
          this.emitEvent('result', 'The first YouTube result is open and playback has started.');
          break;
        }

        case 'youtube_play': {
          this.emitEvent('step', `Playing "${nlpResult.entities.value}" on YouTube.`);
          await browser.youtubePlay(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for playback to stabilize...');
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await browser.skipYouTubeAd();
          await this.captureDesktop(browser, 'play_video');
          this.emitEvent('result', 'Playback started and the browser stays open.');
          break;
        }

        case 'claude_search': {
          this.emitEvent('step', `Opening Claude and searching for "${nlpResult.entities.value}".`);
          await osControl.claudeAppSearch(nlpResult.entities.value);
          this.emitEvent('step', 'Waiting for Claude to respond...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await this.captureDesktop(browser, 'claude_app');
          this.emitEvent('result', 'Claude is open with the requested response visible.');
          break;
        }

        case 'close_app': {
          this.emitEvent('step', 'Closing the currently active application window.');
          await osControl.closeActiveApp();
          this.emitEvent('result', 'The active application window was closed.');
          break;
        }

        case 'open_app': {
          this.emitEvent('step', `Opening "${nlpResult.entities.app_name}" on the laptop.`);
          await osControl.openApp(nlpResult.entities.command);
          this.emitEvent('result', `${nlpResult.entities.app_name} was launched.`);
          break;
        }

        case 'type_and_enter': {
          this.emitEvent('step', `Typing "${nlpResult.entities.value}" and pressing Enter.`);
          await osControl.typeGlobal(nlpResult.entities.value);
          await osControl.pressKeyGlobal('Enter');
          this.emitEvent('step', 'Waiting for the typed command to take effect...');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await this.captureDesktop(browser, 'type_enter');
          this.emitEvent('result', 'The command was executed.');
          break;
        }

        case 'whatsapp_send': {
          const contact = this.findWhatsAppContact(nlpResult.entities.contact_name);
          this.emitEvent(
            'step',
            `Opening WhatsApp Desktop for ${contact.name} using the saved number and preparing the message.`
          );
          await osControl.whatsappAppSend(contact.name, contact.phone, nlpResult.entities.message);
          this.emitEvent('step', 'The message was sent in WhatsApp Desktop.');
          await new Promise((resolve) => setTimeout(resolve, 2500));
          await this.captureDesktop(browser, 'whatsapp_send');
          this.emitEvent('result', `WhatsApp message sent to ${contact.name}.`);
          break;
        }

        case 'set_volume': {
          await osControl.setVolume(nlpResult.entities.level);
          this.emitEvent('result', `Volume set to ${nlpResult.entities.level}%.`);
          break;
        }

        case 'change_volume': {
          await osControl.changeVolume(nlpResult.entities.delta);
          this.emitEvent('result', `Volume changed by ${nlpResult.entities.delta > 0 ? '+' : ''}${nlpResult.entities.delta}.`);
          break;
        }

        case 'mute_volume': {
          await osControl.muteVolume();
          this.emitEvent('result', 'Volume mute was toggled.');
          break;
        }

        case 'set_brightness': {
          await osControl.setBrightness(nlpResult.entities.level);
          this.emitEvent('result', `Brightness set to ${nlpResult.entities.level}%.`);
          break;
        }

        case 'change_brightness': {
          const targetLevel = await osControl.changeBrightness(nlpResult.entities.delta);
          this.emitEvent('result', `Brightness changed to ${targetLevel}%.`);
          break;
        }

        case 'system_status': {
          const status = await osControl.getSystemStatus();
          this.emitEvent('result', `System status: ${status}`);
          break;
        }

        case 'system_time': {
          const status = await osControl.getTimeAndDate();
          this.emitEvent('result', status);
          break;
        }

        case 'take_screenshot': {
          await this.captureDesktop(browser, 'desktop');
          this.emitEvent('result', 'Desktop screenshot captured successfully.');
          break;
        }

        case 'show_desktop': {
          await osControl.showDesktop();
          this.emitEvent('result', 'Desktop is now visible.');
          break;
        }

        case 'restore_windows': {
          await osControl.restoreWindows();
          this.emitEvent('result', 'Minimized windows were restored.');
          break;
        }

        case 'lock_screen': {
          this.emitEvent('step', 'Locking the computer.');
          await osControl.lockScreen();
          break;
        }

        case 'shutdown_pc': {
          this.emitEvent('step', 'Shutting down the computer.');
          await osControl.shutdownComputer();
          break;
        }

        default: {
          this.emitEvent('error', `Intent "${nlpResult.intent}" is not implemented yet.`);
          return 'unknown';
        }
      }

      this.emitEvent('summary', 'Task completed successfully via your laptop automation backend.');
      return nlpResult.intent;
    } catch (error) {
      this.emitEvent('error', `Error processing task: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TaskExecutor;

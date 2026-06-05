const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');

class OSControl {
  async runPowerShell(command) {
    const tmpFile = path.join(__dirname, `temp_ps_${Date.now()}_${Math.floor(Math.random() * 1000)}.ps1`);
    fs.writeFileSync(tmpFile, command);
    const fullCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`;
    try {
      return await execPromise(fullCommand);
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch (_) {
      }
    }
  }

  async focusAndSendKeys(windowTitlePart, keys) {
    const cmd = `
      Add-Type -AssemblyName System.Windows.Forms;
      $obj = New-Object -ComObject WScript.Shell;
      $success = $obj.AppActivate("${windowTitlePart}");
      if (-not $success) {
        if ("${windowTitlePart}" -eq "Gemini") { $success = $obj.AppActivate("Google Gemini") }
      }
      if (-not $success) { throw "Window not found: ${windowTitlePart}" }
      Start-Sleep -Milliseconds 1000;
      [System.Windows.Forms.SendKeys]::SendWait('${keys}');
    `;
    return this.runPowerShell(cmd);
  }

  async typeGlobal(text) {
    const escapedForPS = text.replace(/"/g, '`"');
    const escapedForSendKeys = escapedForPS.replace(/([%+^~(){}])/g, '{$1}');
    const cmd = `
      $obj = New-Object -ComObject WScript.Shell;
      $obj.SendKeys("${escapedForSendKeys}");
    `;
    return this.runPowerShell(cmd);
  }

  async pressKeyGlobal(key) {
    const keyMap = {
      Enter: '{ENTER}',
      Tab: '{TAB}',
      Escape: '{ESC}',
      Backspace: '{BACKSPACE}',
      Delete: '{DELETE}',
      Space: ' ',
      ArrowUp: '{UP}',
      ArrowDown: '{DOWN}',
      ArrowLeft: '{LEFT}',
      ArrowRight: '{RIGHT}',
    };
    const mappedKey = keyMap[key] || key;
    return this.runPowerShell(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${mappedKey}")`);
  }

  async takeDesktopScreenshot(filePath) {
    const absolutePath = path.resolve(filePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const imageFormat = extension === '.png'
      ? '[System.Drawing.Imaging.ImageFormat]::Png'
      : '[System.Drawing.Imaging.ImageFormat]::Jpeg';
    const cmd = `
      Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
      $Screen = [System.Windows.Forms.Screen]::PrimaryScreen;
      $Bitmap = New-Object System.Drawing.Bitmap($Screen.Bounds.Width, $Screen.Bounds.Height);
      $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap);
      $Graphics.CopyFromScreen($Screen.Bounds.X, $Screen.Bounds.Y, 0, 0, $Bitmap.Size);
      $Bitmap.Save("${absolutePath}", ${imageFormat});
      $Graphics.Dispose();
      $Bitmap.Dispose();
    `;
    return this.runPowerShell(cmd);
  }

  async setBrightness(level) {
    const safeLevel = Math.max(0, Math.min(100, Number(level)));
    return this.runPowerShell(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${safeLevel})`);
  }

  async changeBrightness(delta) {
    const safeDelta = Number(delta);
    const cmd = `
      $current = (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness;
      $target = [Math]::Min(100, [Math]::Max(0, $current + ${safeDelta}));
      (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $target) | Out-Null;
      Write-Output $target;
    `;
    const { stdout } = await this.runPowerShell(cmd);
    return Number(stdout.trim());
  }

  async setVolume(level) {
    const safeLevel = Math.max(0, Math.min(100, Number(level)));
    const presses = Math.floor(safeLevel / 2);
    const cmd = `
      $obj = New-Object -ComObject WScript.Shell;
      for($i=0; $i -lt 50; $i++) { $obj.SendKeys([char]174) }
      for($i=0; $i -lt ${presses}; $i++) { $obj.SendKeys([char]175) }
    `;
    return this.runPowerShell(cmd);
  }

  async changeVolume(delta) {
    const safeDelta = Number(delta);
    const keyCode = safeDelta >= 0 ? 175 : 174;
    const presses = Math.max(1, Math.floor(Math.abs(safeDelta) / 2));
    const cmd = `
      $obj = New-Object -ComObject WScript.Shell;
      for($i=0; $i -lt ${presses}; $i++) { $obj.SendKeys([char]${keyCode}) }
    `;
    return this.runPowerShell(cmd);
  }

  async muteVolume() {
    return this.runPowerShell(`$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173)`);
  }

  async openApp(appName) {
    if (appName.startsWith('start ')) {
      return execPromise(appName);
    }
    return execPromise(`start "" "${appName}"`);
  }

  async closeActiveApp() {
    return this.runPowerShell(`$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys('%{F4}')`);
  }

  async showDesktop() {
    return this.runPowerShell(`(New-Object -ComObject Shell.Application).MinimizeAll()`);
  }

  async restoreWindows() {
    return this.runPowerShell(`(New-Object -ComObject Shell.Application).UndoMinimizeALL()`);
  }

  async lockScreen() {
    return execPromise('rundll32.exe user32.dll,LockWorkStation');
  }

  async shutdownComputer() {
    return execPromise('shutdown /s /t 0');
  }

  async clickWhatsAppSendButton() {
    const cmd = `
      Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeMouse {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")]
  public static extern IntPtr GetCursorPos(out POINT lpPoint);
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT {
    public int X;
    public int Y;
  }
  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@;
      $obj = New-Object -ComObject WScript.Shell;
      $activated = $obj.AppActivate("WhatsApp");
      if (-not $activated) { $activated = $obj.AppActivate("WhatsApp Desktop") }
      if (-not $activated) { throw "WhatsApp window not found." }
      Start-Sleep -Milliseconds 500;
      $process = Get-Process | Where-Object { $_.MainWindowTitle -like "*WhatsApp*" } | Sort-Object StartTime -Descending | Select-Object -First 1;
      if (-not $process) { throw "WhatsApp process not found." }
      $rect = New-Object NativeMouse+RECT;
      if (-not [NativeMouse]::GetWindowRect($process.MainWindowHandle, [ref]$rect)) {
        throw "Unable to read WhatsApp window bounds."
      }

      $originalPoint = New-Object NativeMouse+POINT;
      [NativeMouse]::GetCursorPos([ref]$originalPoint) | Out-Null;

      $windowWidth = [Math]::Max(200, $rect.Right - $rect.Left);
      $windowHeight = [Math]::Max(240, $rect.Bottom - $rect.Top);
      $targetX = $rect.Right - [Math]::Max(52, [Math]::Round($windowWidth * 0.055));
      $targetY = $rect.Bottom - [Math]::Max(56, [Math]::Round($windowHeight * 0.07));

      $offsets = @(
        @{ X = 0; Y = 0 },
        @{ X = -16; Y = 0 },
        @{ X = 16; Y = 0 },
        @{ X = 0; Y = -16 },
        @{ X = 0; Y = 16 },
        @{ X = -12; Y = -12 },
        @{ X = 12; Y = -12 },
        @{ X = -12; Y = 12 },
        @{ X = 12; Y = 12 }
      );

      foreach ($offset in $offsets) {
        $clickX = $targetX + $offset.X;
        $clickY = $targetY + $offset.Y;
        [NativeMouse]::SetCursorPos($clickX, $clickY) | Out-Null;
        Start-Sleep -Milliseconds 140;
        [NativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero);
        Start-Sleep -Milliseconds 60;
        [NativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero);
        Start-Sleep -Milliseconds 140;
      }

      [NativeMouse]::SetCursorPos($originalPoint.X, $originalPoint.Y) | Out-Null;
    `;
    return this.runPowerShell(cmd);
  }

  async whatsappAppSend(contact, phone, message) {
    const whatsappPath = String.raw`C:\Users\Manjunath\OneDrive\Desktop\WhatsApp.lnk`;
    const safeContact = String(contact)
      .replace(/"/g, '`"')
      .replace(/([%+^~(){}])/g, '{$1}');
    const safeMessage = String(message)
      .replace(/"/g, '`"')
      .replace(/([%+^~(){}])/g, '{$1}');
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!cleanPhone) {
      throw new Error(`No saved phone number was found for ${contact}.`);
    }

    await this.openApp(whatsappPath);

    const psCmd = `
      Add-Type -AssemblyName System.Windows.Forms;
      $obj = New-Object -ComObject WScript.Shell;
      Start-Process 'whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(String(message))}';
      $success = $false;
      for ($i = 0; $i -lt 25; $i++) {
        $success = $obj.AppActivate("WhatsApp");
        if (-not $success) { $success = $obj.AppActivate("WhatsApp Desktop") }
        if ($success) { break }
        Start-Sleep -Milliseconds 800;
      }
      if (-not $success) { throw "WhatsApp window not found." }
      Start-Sleep -Milliseconds 5000;
      $obj.AppActivate("WhatsApp") | Out-Null;
      Start-Sleep -Milliseconds 1200;
    `;
    await this.runPowerShell(psCmd);

    try {
      await this.clickWhatsAppSendButton();
      return true;
    } catch (error) {
      const fallbackCmd = `
        Add-Type -AssemblyName System.Windows.Forms;
        $obj = New-Object -ComObject WScript.Shell;
        $success = $obj.AppActivate("WhatsApp");
        if (-not $success) { $success = $obj.AppActivate("WhatsApp Desktop") }
        if (-not $success) { throw "WhatsApp window not found." }
        Start-Sleep -Milliseconds 700;
        [System.Windows.Forms.SendKeys]::SendWait('{ESC}');
        Start-Sleep -Milliseconds 300;
        [System.Windows.Forms.SendKeys]::SendWait('^n');
        Start-Sleep -Milliseconds 1200;
        [System.Windows.Forms.SendKeys]::SendWait("${safeContact}");
        Start-Sleep -Milliseconds 1800;
        [System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
        Start-Sleep -Milliseconds 1200;
        [System.Windows.Forms.SendKeys]::SendWait("^a");
        Start-Sleep -Milliseconds 200;
        [System.Windows.Forms.SendKeys]::SendWait("${safeMessage}");
        Start-Sleep -Milliseconds 1000;
      `;
      await this.runPowerShell(fallbackCmd);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return this.clickWhatsAppSendButton();
    }
  }

  async youtubeAppSearch(query) {
    const youtubePath = String.raw`C:\Users\Manjunath\OneDrive\Desktop\YouTube.lnk`;
    await this.openApp(youtubePath);
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const safeQuery = query.replace(/([%+^~(){}])/g, '{$1}');
    return this.focusAndSendKeys('YouTube', `{ESC}/${safeQuery}{ENTER}`);
  }

  async geminiAppSearch(query) {
    const geminiPath = String.raw`C:\Users\Manjunath\OneDrive\Desktop\Google Gemini.lnk`;
    await this.openApp(geminiPath);
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const safeQuery = query.replace(/([%+^~(){}])/g, '{$1}');
    return this.focusAndSendKeys('Gemini', `{ESC}${safeQuery}{ENTER}`);
  }

  async chatgptAppSearch(query) {
    await execPromise('start chrome --app=https://chatgpt.com');
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const safeQuery = query.replace(/([%+^~(){}])/g, '{$1}');
    return this.focusAndSendKeys('ChatGPT', `${safeQuery}{ENTER}`);
  }

  async claudeAppSearch(query) {
    const claudePath = String.raw`C:\Users\Manjunath\OneDrive\Desktop\Claude.lnk`;
    await this.openApp(claudePath);
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const safeQuery = query.replace(/([%+^~(){}])/g, '{$1}');
    return this.focusAndSendKeys('Claude', `${safeQuery}{ENTER}`);
  }

  async perplexityAppSearch(query) {
    const perplexityPath = String.raw`C:\Users\Manjunath\OneDrive\Desktop\Perplexity.lnk`;
    await this.openApp(perplexityPath);
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const safeQuery = query.replace(/([%+^~(){}])/g, '{$1}');
    return this.focusAndSendKeys('Perplexity', `${safeQuery}{ENTER}`);
  }

  async getSystemStatus() {
    const cmd = `
      $battery = Get-CimInstance -ClassName Win32_Battery;
      $cpu = Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage;
      $mem = Get-CimInstance Win32_OperatingSystem | Select-Object @{Name='Free';Expression={$_.FreePhysicalMemory}}, @{Name='Total';Expression={$_.TotalVisibleMemorySize}};
      $memUsage = [Math]::Round(($mem.Total - $mem.Free) / $mem.Total * 100, 2);
      $batteryText = if ($battery) { "$($battery.EstimatedChargeRemaining)% ($($battery.BatteryStatus))" } else { "Unavailable" };
      "Battery: $batteryText | CPU: $cpu% | RAM: $memUsage%"
    `;
    const { stdout } = await this.runPowerShell(cmd);
    return stdout.trim();
  }

  async getTimeAndDate() {
    const cmd = `Get-Date -Format "dddd, dd MMMM yyyy hh:mm:ss tt"`;
    const { stdout } = await this.runPowerShell(cmd);
    return `Current date and time: ${stdout.trim()}`;
  }
}

module.exports = new OSControl();

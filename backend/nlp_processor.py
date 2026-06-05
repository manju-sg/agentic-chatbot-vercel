import json
import re
import sys


APP_MAP = {
    "whatsapp": r"C:\Users\Manjunath\OneDrive\Desktop\WhatsApp.lnk",
    "spotify": "spotify:",
    "calculator": "calc",
    "calc": "calc",
    "notepad": "notepad",
    "chrome": "chrome",
    "perplexity": r"C:\Users\Manjunath\OneDrive\Desktop\Perplexity.lnk",
    "gemini": r"C:\Users\Manjunath\OneDrive\Desktop\Google Gemini.lnk",
    "chatgpt": "chrome --app=https://chatgpt.com",
    "youtube": r"C:\Users\Manjunath\OneDrive\Desktop\YouTube.lnk",
    "claude": r"C:\Users\Manjunath\OneDrive\Desktop\Claude.lnk",
    "codex": "chrome --app=https://codex.ai",
    "vscode": "code",
    "code": "code",
    "settings": "start ms-settings:",
    "file explorer": "explorer",
    "explorer": "explorer",
    "task manager": "taskmgr",
    "powershell": "powershell",
    "terminal": "wt",
    "command prompt": "cmd",
    "cmd": "cmd",
}


def make_result(intent, **entities):
    return {"intent": intent, "entities": entities}


def parse_intent(text):
    raw_text = text.strip()
    text = raw_text.lower()

    whatsapp_match = re.search(
        r"^(?:send\s+)?(?:a\s+)?whatsapp\s+(?:message\s+)?to\s+(.+?)\s+(?:saying|saying that|message|text)\s+(.+)$",
        raw_text,
        re.IGNORECASE,
    )
    if not whatsapp_match:
        whatsapp_match = re.search(
            r"^(?:send\s+)?(.+?)\s+(?:a\s+)?whatsapp\s+(?:message\s+)?(?:saying|message|text)\s+(.+)$",
            raw_text,
            re.IGNORECASE,
        )
    if whatsapp_match:
        contact_name = whatsapp_match.group(1).strip()
        message = whatsapp_match.group(2).strip().strip("\"'")
        if contact_name and message:
            return make_result("whatsapp_send", contact_name=contact_name, message=message)

    open_match = re.search(r"^(?:open|launch|start)\s+([\w\s]+)$", text)
    if open_match:
        app_name = open_match.group(1).strip()
        command = APP_MAP.get(app_name, app_name)
        return make_result("open_app", command=command, app_name=app_name.title())

    type_match = re.search(r"type\s+(.*)\s+(?:and\s+)?enter$", text)
    if not type_match:
        type_match = re.search(r"^type\s+(.*)$", text)
    if type_match:
        return make_result("type_and_enter", value=type_match.group(1).strip())

    gemini_match = re.search(r"(?:search\s+)?gemini\s+(?:for\s+|search\s+|ask\s+|about\s+|tell\s+me\s+)?(.+)", text)
    if not gemini_match:
        gemini_match = re.search(r"ask\s+gemini\s+(.*)", text)
    if gemini_match and gemini_match.group(1).strip():
        return make_result("gemini_search", value=gemini_match.group(1).strip())

    perplexity_match = re.search(r"(?:search\s+)?perplexity\s+(?:for\s+|search\s+|ask\s+|about\s+|tell\s+me\s+)?(.+)", text)
    if not perplexity_match:
        perplexity_match = re.search(r"ask\s+perplexity\s+(.*)", text)
    if perplexity_match and perplexity_match.group(1).strip():
        return make_result("perplexity_search", value=perplexity_match.group(1).strip())

    chatgpt_match = re.search(r"(?:search\s+)?chatgpt\s+(?:for\s+|search\s+|ask\s+|about\s+|tell\s+me\s+)?(.+)", text)
    if not chatgpt_match:
        chatgpt_match = re.search(r"ask\s+chatgpt\s+(.*)", text)
    if chatgpt_match and chatgpt_match.group(1).strip():
        return make_result("chatgpt_search", value=chatgpt_match.group(1).strip())

    claude_match = re.search(r"(?:search\s+)?claude\s+(?:for\s+|search\s+|ask\s+|about\s+|tell\s+me\s+)?(.+)", text)
    if not claude_match:
        claude_match = re.search(r"ask\s+claude\s+(.*)", text)
    if claude_match and claude_match.group(1).strip():
        return make_result("claude_search", value=claude_match.group(1).strip())

    play_match = re.search(r"play\s+(.*)\s+on\s+youtube$", text)
    if not play_match:
        play_match = re.search(r"youtube\s+play\s+(.*)$", text)
    if play_match:
        return make_result("youtube_play", value=play_match.group(1).strip())

    youtube_match = re.search(r"(?:search\s+for\s+)?(.*)\s+on\s+youtube$", text)
    if not youtube_match:
        youtube_match = re.search(r"youtube\s+(?:search\s+for\s+|ask\s+|tell\s+me\s+)?(.+)$", text)
    if youtube_match and youtube_match.group(1).strip():
        return make_result("youtube_search", value=youtube_match.group(1).strip())

    volume_match = re.search(r"(?:set|change|turn)\s+volume\s+to\s+(\d+)", text)
    if not volume_match:
        volume_match = re.search(r"^volume\s+(\d+)$", text)
    if volume_match:
        return make_result("set_volume", level=max(0, min(100, int(volume_match.group(1)))))

    if any(phrase in text for phrase in ["volume up", "increase volume", "raise volume", "turn volume up"]):
        return make_result("change_volume", delta=10)

    if any(phrase in text for phrase in ["volume down", "decrease volume", "lower volume", "turn volume down"]):
        return make_result("change_volume", delta=-10)

    if text in ["max volume", "maximum volume", "volume max"]:
        return make_result("set_volume", level=100)

    if text in ["min volume", "minimum volume", "volume min"]:
        return make_result("set_volume", level=0)

    if "mute" in text and "volume" in text:
        return make_result("mute_volume")

    brightness_match = re.search(r"(?:set|change|turn)\s+brightness\s+to\s+(\d+)", text)
    if not brightness_match:
        brightness_match = re.search(r"^brightness\s+(\d+)$", text)
    if brightness_match:
        return make_result("set_brightness", level=max(0, min(100, int(brightness_match.group(1)))))

    if any(phrase in text for phrase in ["brightness up", "increase brightness", "raise brightness", "turn brightness up"]):
        return make_result("change_brightness", delta=10)

    if any(phrase in text for phrase in ["brightness down", "decrease brightness", "lower brightness", "turn brightness down"]):
        return make_result("change_brightness", delta=-10)

    if text in ["max brightness", "maximum brightness", "brightness max"]:
        return make_result("set_brightness", level=100)

    if text in ["min brightness", "minimum brightness", "brightness min"]:
        return make_result("set_brightness", level=0)

    if any(phrase in text for phrase in ["system status", "pc status", "battery", "cpu", "ram usage", "memory usage"]):
        return make_result("system_status")

    if text in ["time", "date", "date and time", "current time", "what time is it"]:
        return make_result("system_time")

    if any(phrase in text for phrase in ["take screenshot", "take a screenshot", "capture screenshot", "capture screen", "screen shot"]):
        return make_result("take_screenshot")

    if any(phrase in text for phrase in ["minimize all", "show desktop", "desktop view"]):
        return make_result("show_desktop")

    if any(phrase in text for phrase in ["restore windows", "restore all windows", "undo minimize all"]):
        return make_result("restore_windows")

    if any(phrase in text for phrase in ["lock screen", "lock pc", "lock computer", "lock windows"]):
        return make_result("lock_screen")

    if any(phrase in text for phrase in ["shutdown", "shut down", "shutdown pc", "shutdown computer", "turn off pc", "turn off computer"]):
        return make_result("shutdown_pc")

    if text in [
        "close",
        "close it",
        "close app",
        "close youtube",
        "close gemini",
        "close chatgpt",
        "close chrome",
        "terminate app",
        "exit app",
    ]:
        return make_result("close_app")

    return make_result("unknown")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(make_result("unknown")))
        sys.exit(0)

    input_text = " ".join(sys.argv[1:])
    print(json.dumps(parse_intent(input_text)))

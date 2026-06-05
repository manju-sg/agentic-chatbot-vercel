# AGI (Autonomous GUI Intelligence)

## Overview

AGI, short for **Autonomous GUI Intelligence**, is a local-first agentic AI chatbot project that allows a user to control a Windows laptop through a modern chat interface.

Instead of behaving like a normal chatbot that only replies with text, AGI is designed to:

- understand natural-language commands,
- execute actions on the laptop,
- open desktop or browser apps,
- control system functions,
- capture screenshots,
- and report task progress back inside the chat UI.

The project combines a **remote frontend experience** with a **local execution backend**. This means a user can access the chat interface from another device, including mobile, while the real automation still runs on the laptop itself.

---

## Main Idea

The core idea behind AGI is simple:

> turn a chat interface into a live execution layer for GUI-based software and operating-system actions.

This makes AGI more than a conversational assistant. It behaves more like a digital operator that can receive a goal, perform actions in software, and show evidence of what happened.

---

## Project Goals

This project was built to achieve the following goals:

1. Provide a clean and modern chat interface for controlling a laptop.
2. Execute real desktop and browser tasks from natural-language prompts.
3. Keep execution local to the laptop instead of moving sensitive actions to the cloud.
4. Show users step-by-step updates and screenshots for trust and transparency.
5. Support both laptop and mobile access through a responsive frontend.

---

## Architecture

AGI is built with a split architecture:

### 1. Frontend

The frontend is the user-facing control surface.

It is responsible for:

- chat interaction,
- prompt entry,
- displaying task progress,
- showing screenshots,
- rendering assistant responses,
- and keeping the UI responsive on desktop and mobile.

### 2. Backend

The backend runs locally on the laptop and acts as the execution engine.

It is responsible for:

- receiving tasks from the frontend,
- parsing the user’s natural-language command,
- selecting the correct execution flow,
- controlling browser and desktop actions,
- capturing screenshots,
- and streaming task events back to the frontend.

### 3. Execution Layer

The execution layer contains the real automation logic.

It includes:

- browser automation for supported web tasks,
- PowerShell-based Windows automation,
- application launching,
- keyboard input,
- mouse-based interaction,
- desktop screenshots,
- and system actions such as brightness, volume, lock, and shutdown.

---

## Technology Stack

### Frontend

- **React 19**
- **Vite**
- **socket.io-client**
- **lucide-react**

### Backend

- **Node.js**
- **Express**
- **Socket.IO**
- **dotenv**

### Automation

- **Playwright**
- **Playwright Extra**
- **puppeteer-extra-plugin-stealth**
- **PowerShell**
- **Windows Shell / SendKeys / Win32 mouse interaction**

### Intent Parsing

- **Python**
- rule-based natural-language intent matching

---

## How It Works

The project follows this task flow:

1. The user sends a prompt from the chat interface.
2. The backend receives the task through Socket.IO.
3. A local parser identifies the user’s intent and entities.
4. The backend chooses the matching execution branch.
5. The system performs the action using browser automation or desktop automation.
6. The backend emits live events such as:
   - step
   - result
   - screenshot
   - error
   - summary
7. The frontend displays these updates in the conversation.
8. A screenshot may be captured and shown in the UI as evidence of execution.

---

## Current Features

AGI currently supports multiple categories of actions.

### App Launching

It can open desktop or linked apps such as:

- Chrome
- Gemini
- ChatGPT
- YouTube
- Claude
- Perplexity
- WhatsApp
- VSCode
- File Explorer
- Task Manager
- Settings
- PowerShell
- Terminal

### Browser and Content Actions

It can perform tasks such as:

- YouTube search
- YouTube playback
- ChatGPT search
- Gemini search
- Claude search
- Perplexity search

### Desktop and System Actions

It can:

- take screenshots,
- show desktop,
- restore windows,
- close the active app,
- set brightness,
- change brightness,
- set volume,
- change volume,
- mute volume,
- lock screen,
- and shut down the computer.

### Messaging Flow

The project also supports WhatsApp messaging workflows using saved contacts and desktop-app automation logic.

---

## Why This Project Is Agentic

AGI is agentic because it performs more than simple text generation.

It includes the key parts of an agent loop:

- **input understanding** through prompt parsing,
- **decision routing** through intent-based execution selection,
- **action** through browser and desktop automation,
- **observation** through screenshots and task feedback,
- **reporting** through live events in the UI.

This means AGI is operating on a GUI environment, not only generating answers.

---

## Product Value

From a product perspective, AGI demonstrates how conversational AI can move from:

- answering questions

to

- actually doing work on a machine.

This is useful because it creates a clearer bridge between AI and productivity.

Examples include:

- opening and controlling apps,
- running search tasks,
- changing device settings,
- interacting with installed software,
- and giving users visual proof of execution.

---

## Strengths of the Project

Some of the strongest parts of the project are:

- **local-first execution**, which keeps control on the laptop,
- **remote UI access**, which makes mobile use possible,
- **responsive chat interface** for desktop and phone,
- **live execution reporting** instead of vague completion messages,
- **screenshot support** for visibility,
- **support for signed-in desktop or browser sessions**,
- and **extensible architecture** with separate frontend, backend, parser, and execution layers.

---

## Current Challenges

Like most GUI automation systems, AGI depends on real desktop conditions.

That means some actions can be affected by:

- changing app layouts,
- focus issues,
- timing differences,
- tunnel behavior,
- screenshot rendering behavior,
- or window position differences.

This is especially relevant for desktop-app flows like WhatsApp, where visual position and interaction timing matter.

---

## Future Improvements

Possible next steps for AGI include:

- stronger screenshot reliability,
- better app-specific automation flows,
- authentication and access control,
- safer approval flows for risky commands,
- multi-step planning,
- memory for task history,
- scheduled or recurring tasks,
- and more supported applications.

---

## Summary

AGI (Autonomous GUI Intelligence) is a practical agentic AI system that combines:

- conversational control,
- local execution,
- GUI automation,
- realtime feedback,
- and modern presentation.

It is both a technical prototype and a strong demonstration of how AI assistants can evolve into action-taking desktop operators.

In short, AGI is a project about making AI **operate software**, not just talk about it.

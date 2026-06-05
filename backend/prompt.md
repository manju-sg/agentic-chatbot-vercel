# AgenticChatbot Laptop Backend Prompt Guide

These prompts are designed for the web chat frontend hosted on Vercel while the automation backend keeps running on your laptop.

## Suggested Prompts

1. `Open Spotify`
2. `Open Calculator`
3. `Open Notepad`
4. `Open Chrome`
5. `Open Gemini`
6. `Open ChatGPT`
7. `Open YouTube`
8. `Open Claude`
9. `Open Codex`
10. `Open VSCode`
11. `Open WhatsApp`
12. `Open Perplexity`
13. `Open Settings`
14. `Open File Explorer`
15. `Open Task Manager`
16. `Open PowerShell`
17. `Open Terminal`
18. `Open Command Prompt`
19. `YouTube play Rick Astley Never Gonna Give You Up`
20. `YouTube play Numb Linkin Park`
21. `YouTube play Interstellar soundtrack`
22. `YouTube play Lofi hip hop radio`
23. `YouTube search for latest AI news`
24. `YouTube search for Playwright tutorial`
25. `YouTube search for React project ideas`
26. `YouTube search for calm piano music`
27. `Search Gemini for summarize the benefits of exercise`
28. `Ask Gemini write a short leave request email`
29. `Gemini search explain quantum computing simply`
30. `Ask Gemini for a 7 day study plan`
31. `Ask ChatGPT write a polite follow up message`
32. `Search ChatGPT for how to prepare for interviews`
33. `ChatGPT search explain recursion with examples`
34. `Ask ChatGPT for beginner Python projects`
35. `Ask Claude write a professional reply to a client`
36. `Ask Perplexity summarize today's top AI trends`
37. `Type hello world and enter`
38. `Type weather tomorrow and enter`
39. `Type openai api pricing and enter`
40. `Type best books for startups and enter`
41. `Set volume to 20`
42. `Set volume to 50`
43. `Set volume to 80`
44. `Volume up`
45. `Volume down`
46. `Increase volume`
47. `Decrease volume`
48. `Max volume`
49. `Min volume`
50. `Mute volume`
51. `Set brightness to 20`
52. `Set brightness to 40`
53. `Set brightness to 60`
54. `Set brightness to 80`
55. `Brightness up`
56. `Brightness down`
57. `Increase brightness`
58. `Decrease brightness`
59. `Max brightness`
60. `Min brightness`
61. `System status`
62. `PC status`
63. `Battery`
64. `CPU`
65. `RAM usage`
66. `Date and time`
67. `Current time`
68. `Take screenshot`
69. `Capture screen`
70. `Show desktop`
71. `Minimize all`
72. `Restore windows`
73. `Restore all windows`
74. `Lock screen`
75. `Close`
76. `Close app`
77. `Close YouTube`
78. `Close Gemini`
79. `Close ChatGPT`
80. `Open Explorer`
81. `Open Task Manager`
82. `Open Settings`
83. `Send WhatsApp to Mom saying I will call you in 10 minutes`
84. `Send WhatsApp to Dad message Reached home safely`
85. `Send WhatsApp to Friend text Are we still meeting at 8 pm?`

## Advanced Prompt Ideas

1. `Open Chrome`
2. `Type openai api pricing and enter`
3. `Take screenshot`
4. `Open ChatGPT`
5. `Ask ChatGPT write a concise product launch announcement for a mobile automation assistant`
6. `Open Gemini`
7. `Ask Gemini summarize the top 5 features of Windows 11 for students`
8. `Open Claude`
9. `Ask Claude write a polished product announcement for a desktop automation assistant`
10. `Open Perplexity`
11. `Ask Perplexity explain MCP servers in simple terms`
12. `Open YouTube`
13. `YouTube search for Playwright browser automation tutorial`
14. `YouTube play deep focus music`
15. `Set brightness to 40`
16. `Set volume to 25`
17. `System status`
18. `Date and time`
19. `Show desktop`
20. `Restore windows`
21. `Open VSCode`
22. `Open PowerShell`
23. `Type ipconfig and enter`
24. `Take screenshot`
25. `Send WhatsApp to Mom saying Testing the laptop automation flow`

## Useful Multi-Step Demo Flows

1. `Open Chrome` then `Type github openai codex and enter`
2. `Open ChatGPT` then `Ask ChatGPT create a study plan for learning React in 14 days`
3. `Open Gemini` then `Ask Gemini explain how browser automation works in simple terms`
4. `Open Claude` then `Ask Claude summarize this meeting into 3 crisp bullets`
5. `Open Perplexity` then `Ask Perplexity compare ChatGPT and Claude for coding help`
6. `Open YouTube` then `YouTube search for Apple UI design inspiration`
7. `Set volume to 15` then `Play Interstellar soundtrack on YouTube`
8. `System status` then `Take screenshot`
9. `Send WhatsApp to Friend saying The remote control demo is working`

## Notes

- The frontend can be hosted publicly on Vercel, but the backend should keep running on your laptop.
- Point the frontend to your laptop backend using a secure tunnel URL with `VITE_BACKEND_URL`.
- `WhatsApp`, `Perplexity`, and `Claude` can launch through your saved desktop shortcuts instead of generic web tabs.
- `YouTube play ...` keeps the YouTube window open until you send a close command.
- `Gemini`, `ChatGPT`, and `YouTube search` capture one screenshot after the action.
- `Send WhatsApp to <saved contact> saying <message>` uses the saved number from `backend/whatsapp_contacts.json`, opens WhatsApp Web through a deep link, clicks the send button, and captures a screenshot.
- `Close` closes the currently active app window.
- The best demo prompts are ones that visibly change the screen, because the frontend can then show screenshots inline.

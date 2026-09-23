# Contest Polish v3 — changes from uploaded v2.1.0

- Preserved the six-room map, all existing pickups, puzzles, interactions, AI states, checkpoints, mobile actions and original art/audio approach.
- Progressive first-objective help, nearby action prompts, objective marker and clean elapsed-time HUD.
- Exact line/obstacle vision checks; clipped vision cone; text/icon/color awareness; festival-task pauses and state dialogue.
- Finer 20-unit A* grid fixes a tight passage route. Noise now matches its stated radius.
- Removed Mushak-switch invulnerability; safe mouse spawn and unrestricted switch-back; ordinary walls stay solid.
- Added one normal modak, making the Secret Modak optional while retaining all prior pickups.
- Visible Festival Box, diya and rangoli patterns, selected-sequence feedback, mistake noise and completion effects. Rangoli retry earns 100; first try earns 150.
- Distinct room flooring, rugs, garlands, decorative flowers, flickering diyas, furniture details and original story illustrations.
- Animated final-diya celebration, sequential lighting, arriving family, result breakdown, three challenges and anonymous local personal bests.
- Safe audio initialization; new footstep, switch, alert, puzzle and celebration cues.
- Accessible menu focus, reduced-motion behavior, persistent mobile Pause, 44px+ touch targets, cancellation/focus/orientation reset and 320/390px layouts.
- Timer penalties are included in completion time. Pause/modal actions cannot move, switch or hide the player.
- Expanded from 18 to 36 automated tests; added local-only browser QA fixtures, source/build packages and concise contest documentation.

The imported v2.1.0 project already used dependency-free Node scripts. This version retains that stack rather than the older local Phase 1 Vite setup.

- Optional Supabase shared leaderboard: validated RPC submission, RLS-protected reads, browser-safe configuration, offline fallback and setup documentation. No service-role key is shipped.

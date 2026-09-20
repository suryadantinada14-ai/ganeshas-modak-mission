# Features added in Festival Edition v2.1

## Presentation
- Skippable four-scene cinematic opening.
- Polished responsive HUD, awareness meter, objective panel and room labels.
- Procedural festival visuals: rangoli, diyas, banners, furniture, modaks, characters and glow/particle effects.
- Final Ganesh Chaturthi celebration and mission summary.

## Stealth and AI
- Maa Parvati five-state routine: CALM, SUSPICIOUS, ALERT, SEARCH, RETURN.
- Grid pathfinding lets Parvati navigate around walls/furniture and through intended doorways during patrol and pursuit.
- Vision range/cone, line of sight and obstacle occlusion.
- Noise system for running, bell, pot and puzzle mistakes.
- Hiding spots and checkpoint recovery after being caught.
- Caught consequence: 10-second time penalty and -50 score, never health/damage/death.

## Objectives and puzzles
- Five modak types/placements totaling two normal, special, golden and secret rewards.
- Flower, durva, diya and decoration collection objectives.
- Festival Box sequence puzzle (Diya → Flower → Durva).
- Diya direction puzzle (East → South → West → North).
- Rangoli pattern mini-game (Saffron → Pink → Green → Blue).
- Bell distraction strategy.

## Mushak
- Switchable Mushak character.
- Narrow-route traversal without phasing through ordinary walls.
- Tiny secret-passage lever.
- Secret modak route.

## Score and replay
- Eight-minute optional challenge clock that becomes free play at zero.
- Puzzle, festival, stealth, time and completion bonuses.
- Playful end ratings: Modak Master, Festival Hero, Puja Pro, Modak Novice.
- Local-only leaderboard using browser localStorage.

## Input and packaging
- Desktop: WASD/arrows, Shift, E, Space, Q, Tab, Esc.
- Mobile direction pad, Use, Run, Hide and character switch.
- Opt-in synthesized cues and a subtle festival rhythm; no external assets.
- Zero runtime/build dependencies.
- `npm test` and `npm run build` verified; 18 automated gameplay/UI contract checks pass.

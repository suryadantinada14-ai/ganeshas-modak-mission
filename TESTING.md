# Festival Edition verification

## Automated checks

Run:

```sh
npm test
npm run build
```

The automated tests cover project state, movement, run noise, Parvati suspicion, puzzle success/failure, rangoli objectives, Mushak switching, countdown timing, hiding, Mushak wall/gate collision, Parvati cross-room pathfinding, the real secret-lever interaction, full objective completion, required UI controls/imports, and mobile CSS visibility.

## Manual browser checklist

1. Start screen opens and the cinematic can advance or be skipped.
2. Keyboard and mobile controls move the selected character.
3. Running emits visible sound rings and can make Parvati suspicious.
4. Parvati transitions through calm/suspicious/alert/search/return and walls block line of sight.
5. Space/HIDE works only near marked hiding spots and not while actively chased.
6. Bell/pot interactions create distractions.
7. Festival Box sequence is Diya → Flower → Durva and unlocks the golden modak.
8. Diya sequence is East → South → West → North and unlocks the secret passage route.
9. Rangoli sequence is Saffron → Pink → Green → Blue and completes the rangoli objective.
10. Mushak can scout through narrow routes, trigger the tiny lever and collect the secret modak.
11. Collect 5 modaks, 3 flowers, 3 durva, 2 diyas, 3 decorations and complete rangoli to trigger celebration.
12. Being caught costs 10 seconds and 50 points, then returns Ganesha to the latest modak checkpoint with temporary grace.
13. Final screen shows rating, score breakdown, replay, leaderboard and main menu.
14. Local leaderboard stores only the entered display name, score, completion time and date.
15. Verify mobile sizing on a physical iPhone/Android device before contest presentation.

## Latest automated result

Verified in this build: **18/18 tests passing**. The dependency-free production build completes successfully, and the included development server returns both `index.html` and `src/main.js` with HTTP 200 responses. Automated Chromium navigation is blocked by the execution environment administrator policy, so a final physical-browser/mobile play-through remains recommended before contest presentation.

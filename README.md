# Ganesha’s Modak Mission
**Contest Polish v3 · Sneak. Solve. Celebrate.**

### Goal
Help prepare a Ganesh Chaturthi celebration in one festive home/pandal. Collect modaks and festival items, solve short puzzles, and use hiding and distractions while Maa Parvati tends to the preparations. Being caught only resets the checkpoint and adds a time/score penalty.

### Controls
Desktop: **WASD / arrows** move · **Shift** run · **E** interact · **Space** hide/leave cover · **Q** switch Ganesha/Mushak · **Tab** objectives · **Esc** pause/back. Menus support Tab, Shift+Tab and Enter.

Mobile: direction pad, **USE**, hold **RUN**, **HIDE**, **MUSHAK/GANESHA**, **OBJECTIVES**, and **Pause**. **Sound on/off** is optional.

### How to win
Collect any 5 of 6 modaks, 3 flowers, 3 durva, 2 diyas, 3 decorations, and complete the rangoli. The golden modak comes from the Festival Box; Mushak can retrieve the optional secret modak. The eight-minute festival clock becomes free play when it expires. Replay for under 5:00, no catches, or the secret.

### Technology
HTML, CSS, JavaScript ES modules, Canvas 2D and Web Audio. Node.js scripts serve and build the project. No runtime dependency is required. The default build uses local records; an optional Supabase configuration enables a shared leaderboard without accounts or unnecessary personal data.

### Assets
Original procedural Canvas drawings and synthesized audio; system fonts and emoji. No external game artwork or commercial music. Coding and artwork code were developed with AI assistance; confirm organizer permission for AI tools.

### Running locally
Requires Node.js 18+; no installation step is needed.
```sh
npm run dev
```
Open `http://localhost:5173`. Use a web server, not a `file://` URL.

### Build
```sh
npm run build
```
Upload the **contents** of `dist/` to any static host. Relative asset paths also support a subdirectory.

### Tests
```sh
npm test
```
See `TESTING.md` for evidence and remaining device checks. `npm run qa` generates local-only browser fixtures at `/tests/browser/qa.html`; these never enter `dist/`.

### Supabase shared leaderboard (optional)

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase-schema.sql`.
3. Copy `supabase-config.example.js` to `supabase-config.js`.
4. Set the project URL and publishable/anon key in `supabase-config.js`. Never use a service-role key in browser code.
5. Run `npm run build` and deploy the resulting `dist/` contents.

The game submits only validated result fields: score, completion time, catches, modak count, secret-found flag and festival-item count. If Supabase is unavailable, the result remains available in local browser storage.

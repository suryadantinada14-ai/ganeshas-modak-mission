# Judge explanation

**What is the main gameplay loop?**  
Explore a room, read Parvati’s awareness, collect an item or solve a puzzle, then move to the next preparation. Complete the checklist to celebrate and replay for a better result.

**How does Maa Parvati AI work?**  
Five states: calm festival patrol, suspicious investigation, alert following, search at the last known location, and return to her route. She pauses at preparation points. If Maa Parvati catches Ganesha, the stealth attempt ends immediately with GAME OVER; it is presented as a gentle, humorous discovery, never an attack.

**How does vision detection work?**  
Ganesha must be inside her 330-unit range and facing cone. The game checks whether the line between them crosses a wall or solid object. Awareness builds before an alert. The drawn cone also stops at obstacles.

**How does sound detection work?**  
Running, bells, pots and puzzle mistakes create sound events with different radii. If Parvati is within that radius, she moves toward that location. Sound can travel around rooms; walls block sight, not hearing.

**How does pathfinding work?**  
A small grid describes where Parvati fits. A* searches for a route around furniture and through doorways. Diagonal steps cannot cut blocked corners. Routes refresh as targets change.

**How does hiding work?**  
Press Space or HIDE near a marked screen, curtain or display. Break an active chase first. Ganesha cannot walk while hidden, and Parvati cannot see him there. Hidden Ganesha remains safe while Mushak scouts.

**How does Mushak switching work?**  
Q or the mobile button changes the controlled character and smoothly follows them with the camera. Mushak has a smaller collision radius and can use the designated little opening. Ordinary walls remain solid. Switch back anytime; exposed Ganesha is still detectable.

**How are puzzles connected to stealth?**  
The Festival Box uses diya, flower and durva symbols. The diya sequence opens a shortcut. Rangoli reproduces a color pattern. Wrong input creates noise for Parvati to investigate when play resumes. Choosing a pattern pauses movement and time for accessibility.

**How is scoring calculated?**  
Modaks: normal 10, special 25, golden 50, secret 100. Flowers/durva: 20 each; diyas: 25; decorations: 15. Box: 80; diya sequence: 90; rangoli: 150 first try or 100 after an error; secret lever: 75; first bell use: 30. Getting caught ends the current run immediately with GAME OVER. Finish adds 500 festival points, remaining festival-clock seconds, and 200 stealth points for no catches (otherwise max(0, 100 − 25 × catches)). Best score, time and fewest catches are stored only locally.

**What tools were used?**  
Plain JavaScript, HTML, CSS, Canvas and Web Audio. Node.js runs the server, build and tests. Git tracks source. Chromium was used for browser checks; Sites hosts the static game.

**What parts were built with AI assistance?**  
ChatGPT/Codex assisted the existing prototype and this pass: game logic, procedural rendering, UI/audio code, tests, debugging and documentation. The team should review the code and rehearse these explanations. Official rules allow coding assistants only if organizers permit them; approval is not verified here.

**How was Ganesha portrayed respectfully?**  
The story is affectionate family mischief followed by helping with puja preparations. No one attacks, injures, humiliates or mocks a deity. No weapons, blood, death or horror. Parvati smiles at the ending.

**How are assets permitted?**  
Artwork is drawn in Canvas and audio is synthesized from oscillators; no third-party game assets or commercial music were imported. Text uses system fonts and emoji. If the team adds assets, it must check their permissions separately.

**What testing was performed?**  
36 automated checks, including actual simulated movement through the full objective route, wall collision, all AI states, puzzle mistakes, records and reset behavior. Browser UI checks include narrow layouts and fixture-based puzzle/results screens. Physical phones and non-Chromium browsers still need a manual play-through. Fixtures are excluded from deployment and never send scores.

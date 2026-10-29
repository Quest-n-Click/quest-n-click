// Playwright playthrough of "Lou's Rounds" (games/routes, 4.6.0 "Routes"; scripts/e2e.mjs loads it). From the real
// title screen, on the world's clock as the page runs it:
//   - Lou is at his map: taking it is refused; talking to him holds him where he stands, the whole conversation long,
//     while Grandma goes on with her chores; he walks on once it ends;
//   - the pause menu freezes the world: its clock does not move while the menu is open;
//   - off screen, Lou leaves the office for the street and the kitchen while Pixel waits in the office;
//   - Pixel takes the cable while he is out;
//   - a reload and Continue in the middle of his rounds: the same step, the same place, the same clock;
//   - Grandma's mopping shuts the kitchen door: Lou waits in front of it, then goes in once it opens;
//   - the cable in the fuse box: the ending.
// Each check reads the engine (window.__game.engine), the taps are real; screenshots in E2E_OUT.

export async function run(h) {
  const { page } = h;
  const E = (fn, arg) => page.evaluate(fn, arg);
  const lou = () =>
    E(() => {
      const e = window.__game.engine;
      const room = e.state.where.neighbor;
      const a = e.state.actors[`${room}.neighbor`] ?? {};
      const st = e.state.scripts.rounds ?? {};
      return { room, x: a.x, y: a.y, step: st.step, wait: st.route?.wait, blocked: !!st.route?.blocked, world: e.state.world ?? 0 };
    });
  const until = (fn, arg, timeout = 40000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
  const fail = (msg) => {
    throw new Error(`routes: ${msg}`);
  };

  // New game: the intro's two lines, then the street.
  await page.locator('.overlay .bigbtn').first().tap();
  await until(() => window.__game?.engine?.state?.room === 'street');
  await h.waitIdle();
  await h.screenshot('street');

  // Into the office while Lou is still there.
  await h.play([{ verb: 'open', a: 'hall_door' }]);
  await until(() => window.__game.engine.state.room === 'hall');
  await h.waitIdle();
  const first = await lou();
  if (first.room !== 'hall') fail(`Lou left his office before Pixel came in (${JSON.stringify(first)})`);
  await h.play([{ verb: 'take', a: 'map' }]);
  if (await E(() => window.__game.engine.state.inventory.includes('cable'))) fail('the cable was taken under Lou’s nose');
  await h.screenshot('office-lou');

  // Talking holds him: from the click to the end of the conversation, he does not move; Grandma goes on.
  await h.verbById('talk');
  await h.target('neighbor');
  const held = await lou();
  const grandma0 = await E(() => JSON.stringify([window.__game.engine.state.actors['kitchen.grandma'], window.__game.engine.state.scripts.chores]));
  await page.locator('.side .choices .choice').first().waitFor({ timeout: 12000 });
  await page.waitForTimeout(1500);
  const during = await lou();
  if (during.x !== held.x || during.y !== held.y || during.step !== held.step || during.wait !== held.wait)
    fail(`Lou moved during the conversation: ${JSON.stringify(held)} → ${JSON.stringify(during)}`);
  if (during.world <= held.world) fail('the world stood still during the conversation');
  if ((await E(() => JSON.stringify([window.__game.engine.state.actors['kitchen.grandma'], window.__game.engine.state.scripts.chores]))) === grandma0)
    fail('Grandma stopped her chores while Pixel talked to Lou');
  await h.screenshot('talk-held');
  await page.locator('.side .choices .choice').last().tap();
  await h.waitIdle();

  // The pause menu freezes the world.
  await E(() => window.__game.pauseMenu());
  const paused = await lou();
  await page.waitForTimeout(1000);
  if ((await lou()).world !== paused.world) fail('the world ran while the pause menu was open');
  await h.screenshot('paused');
  await page.keyboard.press('Escape');
  await until((t) => (window.__game.engine.state.world ?? 0) > t, paused.world);

  // Off screen: he leaves; Pixel waits in the office and takes the cable.
  await until(() => window.__game.engine.state.where.neighbor !== 'hall');
  await h.screenshot('office-empty');
  await h.play([{ verb: 'take', a: 'map' }]);
  await h.waitIdle();
  if (!(await E(() => window.__game.engine.state.inventory.includes('cable')))) fail('no cable once Lou was out');
  await until(() => window.__game.engine.state.where.neighbor === 'kitchen');

  // A reload in the middle of his rounds: the autosave keeps his step, his place and the clock.
  await E(() => window.__game.engine.save());
  const saved = await lou();
  await page.reload();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
  await page.locator('.overlay .bigbtn').nth(1).tap();
  await until(() => !!window.__game.engine.state.room);
  const back = await E(() => {
    const e = window.__game.engine;
    const room = e.state.where.neighbor;
    const a = e.state.actors[`${room}.neighbor`] ?? {};
    return { room, x: a.x, y: a.y, step: e.state.scripts.rounds?.step, world: e.state.world ?? 0 };
  });
  if (back.room !== saved.room || back.step !== saved.step || back.world < saved.world)
    fail(`after Continue, Lou is ${JSON.stringify(back)}, saved ${JSON.stringify(saved)}`);
  await h.waitIdle();

  // The wet floor: Grandma mops (the scenario makes her mop now), the kitchen door shuts, Lou waits in front of it.
  await h.play([{ verb: 'open', a: 'out' }]);
  await until(() => window.__game.engine.state.room === 'street');
  await h.waitIdle();
  await E(() => window.__game.engine.script([{ suspendScript: 'chores' }, { set: 'mopping' }]));
  await until(() => window.__game.engine.state.scripts.rounds?.route?.blocked === true, undefined, 60000);
  const waiting = await lou();
  if (waiting.room !== 'street') fail(`Lou is held at the kitchen door but in ${waiting.room}`);
  await page.waitForTimeout(1000);
  const still = await lou();
  if (still.x !== waiting.x || still.room !== 'street') fail('Lou went through the shut door');
  await h.screenshot('door-shut');
  await E(() => window.__game.engine.script([{ unset: 'mopping' }, { resumeScript: 'chores' }]));
  await until(() => window.__game.engine.state.where.neighbor === 'kitchen');
  await h.screenshot('door-open');

  // The fuse box: the ending.
  await h.verbById('use');
  await h.target('cable');
  await h.target('fusebox');
  await h.waitIdle({ acceptEnding: true });
  for (let waited = 0; !(await h.ended()) && waited < 8000; waited += 100) await page.waitForTimeout(100);
  if (!(await h.ended())) fail('the ending was not reached');
  await h.screenshot('end');
  console.log('e2e: routes: held while talking, frozen by the menu, absent off screen, kept by Continue, held at a shut door, finished');
}

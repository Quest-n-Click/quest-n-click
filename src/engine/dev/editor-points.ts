// The editor's named points (4.6.0): the hero's entries and the points a route walks to (`Layout.points`), added and
// removed by name, dragged on the overlay like any handle. Out of editor.ts, which is capped (tests/file-size.test.ts).
import type { Pane } from 'tweakpane';
import type { Layout } from '../core/types';
import type { Handle } from './overlay';

export function pointsFolder(pane: Pane, L: Layout, changed: (h: Handle, final: boolean) => void, rebuild: () => void) {
  const f = pane.addFolder({ title: 'Entry and route points', expanded: false });
  const nu = { name: '' };
  f.addBinding(nu, 'name');
  f.addButton({ title: 'Add the entry point' }).on('click', () => {
    if (!nu.name) return;
    (L.entries ??= {})[nu.name] = [320, 360];
    changed({ t: 'entry', name: nu.name }, true);
  });
  // A route's point (RouteStep.walk): where a character walks to, by name; the routes never hold coordinates.
  f.addButton({ title: 'Add a route point' }).on('click', () => {
    if (!nu.name) return;
    (L.points ??= {})[nu.name] = [320, 360];
    changed({ t: 'entry', name: nu.name, set: 'points' }, true);
  });
  f.addButton({ title: 'Remove the route point' }).on('click', () => {
    if (!nu.name || !L.points?.[nu.name]) return;
    delete L.points[nu.name];
    if (!Object.keys(L.points).length) delete L.points;
    changed({ t: 'entry', name: nu.name, set: 'points' }, true);
    rebuild();
  });
}

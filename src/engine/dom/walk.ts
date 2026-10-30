// The navigation moved into the core (4.6.0 "Routes"): an NPC's route walks while its room is not shown, so the
// simulation and the view share one path finder. The player keeps importing it from here.
export { WalkArea, WalkTopology, type WalkStep } from '../core/nav/walk';

export const LOCKED: string[];
export function isLocked(name: string): boolean;
export function archiveEntries(tgz: string): string[];
export function shrinkwrapProblem(name: string, entries: readonly string[], npmVersion: string): string | undefined;
export function sbomLock(name: string, dir: string, engine: string): 'shrinkwrap' | 'root';

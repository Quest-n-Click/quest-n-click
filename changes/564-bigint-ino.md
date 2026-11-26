### Fixed

- **A Bridge on Windows notices a backup file swapped before it is read (next, #564)**: `readBounded` refuses a file
  swapped between its look and its open by comparing the two file ids, but a number `ino` is NTFS's 64-bit id rounded
  to a double, so on a disk with large enough ids two neighbouring files could share it and the swap went unseen (the
  release pull request's Windows job caught it on its test, #563). Both stats are now read as bigints, exact on every
  platform.

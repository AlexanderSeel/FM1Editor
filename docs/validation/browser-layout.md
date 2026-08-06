# Chrome and Edge responsive layout validation

Validated source commit: `08adce19fa97deb02eebd4365507dc9d17a43999`

- npm install: **SUCCESS**
- TypeScript typecheck: **SUCCESS**
- ESLint and JSX accessibility: **SUCCESS**
- Full Vitest suite: **SUCCESS**
- Production build: **SUCCESS**
- Transient Playwright install: **SUCCESS**
- Installed Chrome and Microsoft Edge layout smoke: **FAILURE**

Viewport matrix for each browser:

- desktop: 1440 × 900
- tablet: 820 × 1180
- narrow mobile: 390 × 844

Assertions cover horizontal page overflow, sticky desktop sidebar bounds, FM-1 bank-merge controls, and all 25 virtual-piano keys remaining inside their panel.

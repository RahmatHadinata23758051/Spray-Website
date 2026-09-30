const { execSync } = require('child_process');

const commits = [
  { msg: 'chore: initial setup and package dependencies', files: ['package.json', 'package-lock.json'] },
  { msg: 'chore: setup TypeScript configuration', files: ['tsconfig.json'] },
  { msg: 'chore: setup Vite build tool', files: ['vite.config.ts'] },
  { msg: 'chore: setup Vitest configuration', files: ['vitest.config.ts'] },
  { msg: 'chore: setup ESLint for code quality', files: ['eslint.config.js'] },
  { msg: 'chore: setup Playwright config', files: ['playwright.config.ts'] },
  { msg: 'chore: setup Tailwind CSS and PostCSS', files: ['tailwind.config.js', 'postcss.config.js'] },
  { msg: 'chore: add environment variables and gitignore', files: ['.env.example', '.gitignore'] },
  
  { msg: 'docs: add Product Requirements Document', files: ['docs/PRD.md'] },
  { msg: 'docs: establish design system', files: ['docs/DESIGN.md'] },
  { msg: 'docs: define system architecture', files: ['docs/ARCHITECTURE.md'] },
  { msg: 'docs: document analysis flow', files: ['docs/ANALYSIS_FLOW.md'] },
  { msg: 'docs: define UI flow', files: ['docs/UI_FLOW.md'] },
  { msg: 'docs: define mock data and references', files: ['docs/MOCK_DATA.md', 'docs/REFERENCES.md'] },
  { msg: 'docs: add handover and skills documentation', files: ['docs/HANDOVER.md', 'docs/SKILLS.md'] },
  { msg: 'docs: add project-level plans and README', files: ['README.md', 'PRODUCT.md', 'IMPLEMENTATION_PLAN.md', 'REDESIGN_PLAN.md', 'TASKS_ANALYSIS_V2.md', 'AGENTS.md'] },

  { msg: 'chore: add HTML entry point', files: ['index.html'] },
  { msg: 'chore: add public static assets', files: ['public/'] },
  { msg: 'feat(ui): add global stylesheets and typography', files: ['src/styles/'] },

  { msg: 'feat(domain): define core types', files: ['src/domain/types.ts'] },
  { msg: 'feat(domain): implement product schemas', files: ['src/domain/product.ts'] },
  { msg: 'feat(domain): implement test session domain logic', files: ['src/domain/testSession.ts'] },
  { msg: 'feat(domain): implement analysis algorithms and finalization', files: ['src/domain/analysis.ts'] },

  { msg: 'feat(data): add deterministic mock repository for spraybot tests', files: ['src/data/mockSpraybotRepository.ts'] },
  { msg: 'feat(data): add product and recipe repositories', files: ['src/data/productRepository.ts'] },

  { msg: 'feat(backend): setup Drizzle ORM config', files: ['drizzle.config.ts'] },
  { msg: 'feat(backend): implement database schemas and migrations', files: ['db/'] },
  { msg: 'feat(backend): implement Fastify auth and health check', files: ['server/'] },

  { msg: 'feat(ui): setup React application entry point', files: ['src/main.tsx'] },
  { msg: 'feat(ui): implement presentation components and app layout', files: ['src/presentation/'] },

  { msg: 'test(unit): add application and domain unit tests', files: ['src/__tests__/'] },
  { msg: 'test(e2e): add playwright end-to-end testing workflows', files: ['e2e/'] },

  { msg: 'chore: add automation scripts', files: ['scripts/'] },
  { msg: 'chore: configure agent environments and artifacts', files: ['.agents/', '.claude/', '.codex/', 'agent/', 'artifacts/', 'skills-lock.json', 'tmp-task-a-visual.mjs'] },

  { msg: 'chore: catch all remaining uncommitted files', files: ['.'] }
];

for (const commit of commits) {
  for (const file of commit.files) {
    try {
      execSync(`git add "${file}"`, { stdio: 'ignore' });
    } catch (e) {}
  }
  try {
    execSync(`git commit -m "${commit.msg}"`, { stdio: 'inherit' });
  } catch (e) {}
}

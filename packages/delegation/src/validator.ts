import { type Sandbox } from "./sandbox.js";

export interface ValidationResult {
  passed: boolean;
  testsRun: number;
  testsFailed: number;
  output: string;
  errors: string[];
}

export interface Validator {
  validate(sandbox: Sandbox, spec: { acceptanceCriteria: string[] }): Promise<ValidationResult>;
}

export function createValidator(): Validator {
  return {
    async validate(sandbox: Sandbox, spec: { acceptanceCriteria: string[] }): Promise<ValidationResult> {
      const errors: string[] = [];
      let totalRun = 0;
      let totalFailed = 0;
      let allOutput = "";

      // Step 1: Check if project has a test command
      const testResult = await sandbox.run("cat package.json 2>/dev/null | grep -A5 '\"test\"' || echo 'no-test-script'", { timeout: 5000 });
      const hasTestScript = testResult.stdout.includes("\"test\"");

      // Step 2: Run tests if available
      if (hasTestScript) {
        const result = await sandbox.run("npm test 2>&1 || pnpm test 2>&1 || yarn test 2>&1", { timeout: 300000 });
        allOutput += result.stdout + result.stderr;

        // Parse test results (common patterns)
        const passMatch = result.stdout.match(/(\d+)\s+pass(?:ed)?/i);
        const failMatch = result.stdout.match(/(\d+)\s+fail(?:ed)?/i);
        const testMatch = result.stdout.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed/i);

        if (testMatch) {
          totalRun = parseInt(testMatch[1]!) + parseInt(testMatch[2]!);
          totalFailed = parseInt(testMatch[2]!);
        } else {
          if (passMatch) totalRun += parseInt(passMatch[1]!);
          if (failMatch) totalFailed += parseInt(failMatch[1]!);
        }

        if (result.exitCode !== 0 && totalFailed === 0) {
          totalFailed = 1;
          errors.push(`Test suite exited with code ${result.exitCode}`);
        }
      } else {
        // No test script — check for other test runners
        const jestResult = await sandbox.run("npx jest --passWithNoTests 2>&1 || true", { timeout: 60000 });
        if (jestResult.stdout.includes("Tests:") || jestResult.stdout.includes("test Suites:")) {
          allOutput += jestResult.stdout;
          const failMatch = jestResult.stdout.match(/(\d+)\s+failed/);
          if (failMatch) totalFailed = parseInt(failMatch[1]!);
        }
      }

      // Step 3: Run type checking if available
      const typeResult = await sandbox.run("npx tsc --noEmit 2>&1 || true", { timeout: 60000 });
      if (typeResult.exitCode !== 0 && typeResult.stderr.includes("error TS")) {
        errors.push(`TypeScript errors found:\n${typeResult.stderr.slice(0, 500)}`);
      }

      // Step 4: Run linting if available
      const lintResult = await sandbox.run("npx eslint . 2>&1 || npx prettier --check . 2>&1 || true", { timeout: 30000 });
      if (lintResult.exitCode !== 0 && lintResult.stdout.includes("error")) {
        errors.push(`Lint errors found:\n${lintResult.stdout.slice(0, 500)}`);
      }

      // Step 5: Basic acceptance criteria checks
      for (const criterion of spec.acceptanceCriteria) {
        // Simple heuristic: check if any files were modified
        const gitStatus = await sandbox.run("git diff --stat HEAD 2>/dev/null || echo 'no-git'", { timeout: 5000 });
        if (gitStatus.stdout.includes("no-git") || gitStatus.stdout.trim() === "") {
          // No git changes detected — might not have implemented anything
          if (!gitStatus.stdout.includes("no-git")) {
            errors.push(`No file changes detected for criterion: "${criterion}"`);
          }
        }
      }

      return {
        passed: totalFailed === 0 && errors.length === 0,
        testsRun: totalRun,
        testsFailed: totalFailed,
        output: allOutput.slice(0, 5000),
        errors,
      };
    },
  };
}

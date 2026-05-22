import { $ } from "bun";
import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { writeFileSync, unlinkSync } from "node:fs";

const TEST_FILE = "cat/test_cat_file.txt";
const TEST_CONTENT = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`).join("\n");

describe("cat tool", () => {
  beforeAll(() => {
    writeFileSync(TEST_FILE, TEST_CONTENT + "\n");
  });

  afterAll(() => {
    try {
      unlinkSync(TEST_FILE);
    } catch (e) {}
  });

  test("should print full file content by default", async () => {
    const { stdout } = await $`bun cat/cat.ts ${TEST_FILE}`.quiet();
    expect(stdout.toString()).toBe(TEST_CONTENT + "\n");
  });

  test("should show line numbers with -n", async () => {
    const { stdout } = await $`bun cat/cat.ts -n ${TEST_FILE}`.quiet();
    const lines = stdout.toString().split("\n");
    expect(lines[0]).toMatch(/^\s+1  line 1$/);
    expect(lines[24]).toMatch(/^\s+25  line 25$/);
  });

  test("should handle --start and --end range", async () => {
    const { stdout } = await $`bun cat/cat.ts ${TEST_FILE} --start 10 --end 12`.quiet();
    expect(stdout.toString()).toBe("line 10\nline 11\nline 12\n");
  });

  test("should handle range with line numbers", async () => {
    const { stdout } = await $`bun cat/cat.ts -n ${TEST_FILE} --start 10 --end 12`.quiet();
    const output = stdout.toString();
    expect(output).toContain("    10  line 10\n");
    expect(output).toContain("    11  line 11\n");
    expect(output).toContain("    12  line 12\n");
  });

  test("should handle only --start", async () => {
    const { stdout } = await $`bun cat/cat.ts ${TEST_FILE} --start 23`.quiet();
    expect(stdout.toString()).toBe("line 23\nline 24\nline 25\n");
  });

  test("should handle only --end", async () => {
    const { stdout } = await $`bun cat/cat.ts ${TEST_FILE} --end 3`.quiet();
    expect(stdout.toString()).toBe("line 1\nline 2\nline 3\n");
  });
});

#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { encode as encodeMacro } from "../src/pap.ts" with { type: 'macro' };
import { encode } from "../src/pap.ts";
import { helpData as commonHelp, mergeHelp } from "../src/help.ts" with { type: 'macro' };
import { spawnSync } from "bun";

const args = process.argv.slice(2);
const helpAsciiAliases = ['-hasci', '--hasci', '--h', '--ha', '--ah', '--a'];
const isHumanHelp = helpAsciiAliases.some(a => args.includes(a));
const isHelp = args.includes('--help') || args.includes('-h') || isHumanHelp;
const isAsciiRequested = args.includes('--ascii') || args.includes('--a') || isHumanHelp;

const papHelp = encodeMacro(mergeHelp({
  command_desc: "Read and output file contents",
  flag: ["-n", "--start", "--end"],
  desc: [
    "Number all output lines",
    "Line number to start reading from",
    "Line number to stop reading at"
  ]
}));

/**
 * Help function for cat tool.
 */
export function help(decoder?: (pap: string) => void) {
  if (decoder) {
    decoder(papHelp);
  } else {
    process.stdout.write(papHelp + '\n');
  }
}


// 2. Main Tool Logic
export async function run(args: string[], decoder?: (pap: string) => void) {
  const isHumanHelp = args.includes('--h') || args.includes('--ha') || args.includes('-hasci') || args.includes('-hascii') || args.includes('--hasci') || args.includes('--hascii');

  if (args.includes('--help') || args.includes('-h') || isHumanHelp) {
    help(decoder);
    return;
  }

  const flags = {
    numbers: args.includes("-n"),
    ascii: args.includes('--ascii') || args.includes('--a') || isHumanHelp,
  };

  let startLine = 1;
  let endLine = Infinity;
  const startIdx = args.indexOf("--start");
  if (startIdx !== -1 && args[startIdx + 1]) startLine = parseInt(args[startIdx + 1]);
  const endIdx = args.indexOf("--end");
  if (endIdx !== -1 && args[endIdx + 1]) endLine = parseInt(args[endIdx + 1]);

  const files = args.filter((arg, i) => {
    if (arg === "-n" || arg === "--start" || arg === "--end" || arg === "--ascii" || arg === "--a") return false;
    if (i > 0 && (args[i - 1] === "--start" || args[i - 1] === "--end")) return false;
    if (arg.startsWith("-") && arg !== "-") return false;
    return true;
  });

  if (files.length === 0 && process.stdin.isTTY) {
    help(decoder);
    return;
  }

  let exitCode = 0;
  const allResults: any[] = [];
  const needsStructure = flags.numbers || (startLine > 1 || endLine !== Infinity);

  for (const path of (files.length > 0 ? files : ["-"])) {
    try {
      let content = (path === "-") ? await Bun.stdin.text() : await Bun.file(path).text();

      if (!needsStructure && !flags.ascii && !decoder) {
        process.stdout.write(content);
        if (!content.endsWith("\n") && content !== "") process.stdout.write("\n");
        continue;
      }

      const splitLines = content.split(/\r?\n/);
      for (let i = 0; i < splitLines.length; i++) {
        const lineNum = i + 1;
        if (lineNum >= startLine && lineNum <= endLine) {
          const line = splitLines[i];
          if (i === splitLines.length - 1 && line === "" && content.endsWith("\n")) break;
          allResults.push({ line: lineNum, content: line });
        }
      }
    } catch (e) {
      console.error(`cat: ${path}: ${(e as Error).message}`);
      exitCode = 1;
    }
  }

  if (allResults.length > 0 || needsStructure) {
    const papData = encode(allResults);
    if (flags.ascii && decoder) {
      decoder(papData);
    } else if (flags.ascii) {
      // Fallback for standalone: simple text with numbers
      allResults.forEach(r => {
        if (flags.numbers) process.stdout.write(`${r.line.toString().padStart(6, " ")}  ${r.content}\n`);
        else process.stdout.write(`${r.content}\n`);
      });
    } else {
      if (process.send) process.send(allResults, undefined, {}, () => process.exit(exitCode));
      else process.stdout.write(papData + '\n');
    }
  }
}

if (import.meta.main) {
  run(process.argv.slice(2));
}

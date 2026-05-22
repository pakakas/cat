#!/usr/bin/env bun
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const helpAsciiAliases = ['-hasci', '-hascii', '--hasci', '--hascii', '--h'];

// ANSI Colors
const B = (s: any) => `\x1b[1m${s}\x1b[22m`;
const G = (s: any) => `\x1b[32m${s}\x1b[39m`;
const Y = (s: any) => `\x1b[33m${s}\x1b[39m`;
const C = (s: any) => `\x1b[36m${s}\x1b[39m`;
const D = (s: any) => `\x1b[90m${s}\x1b[39m`;

function showHelp(isAscii: boolean) {
  const helpData: any = {
    README_FOR_HUMAN: "     USE THE --h FLAG FOR A BETTER EXPERIENCE     ",
    command: "cat",
    description: "Read and output file contents. Outputs JSON if metadata (like line numbers) is requested.",
    pos_arg_names: ["files"],
    pos_arg_descs: ["Files to read (use - for stdin)"],
    pos_arg_defaults: ["-"],
    opt_arg_flags: [["-n"], ["--start"], ["--end"], ["--h", "--help"]],
    opt_arg_descs: [
      "Number all output lines (outputs JSON by default)",
      "Line number to start reading from",
      "Line number to stop reading at",
      "Show this help message (use --h for colored output)"
    ]
  };

  if (isAscii) {
    console.log(`${B('Command:')} ${C(helpData.command)}`);
    console.log(`${helpData.description}\n`);
    console.log(`${B('Usage:')} cat [options] [files...]\n`);
    
    console.log(B("Positional Arguments:"));
    helpData.pos_arg_names.forEach((name, i) => {
      console.log(`  ${C(name.padEnd(15))} ${helpData.pos_arg_descs[i]} ${D(`(default: ${helpData.pos_arg_defaults[i]})`)}`);
    });

    console.log(B("\nOptional Flags:"));
    helpData.opt_arg_flags.forEach((flags, i) => {
      console.log(`  ${Y(flags.join(", ").padEnd(15))} ${helpData.opt_arg_descs[i]}`);
    });
  } else {
    process.stdout.write(JSON.stringify(helpData) + '   \n');
  }
}

const isHelp = args.includes('--help') || args.includes('-h') || helpAsciiAliases.some(a => args.includes(a));
const isAsciiRequested = args.includes('--ascii') || helpAsciiAliases.some(a => args.includes(a));

const flags = {
  numbers: args.includes("-n"),
  ascii: isAsciiRequested,
};

let startLine = 1;
let endLine = Infinity;

const startIdx = args.indexOf("--start");
if (startIdx !== -1 && args[startIdx + 1]) {
  startLine = parseInt(args[startIdx + 1]);
}

const endIdx = args.indexOf("--end");
if (endIdx !== -1 && args[endIdx + 1]) {
  endLine = parseInt(args[endIdx + 1]);
}

const files = args.filter((arg, i) => {
  if (arg === "-n" || arg === "--start" || arg === "--end" || arg === "--ascii" || helpAsciiAliases.includes(arg)) return false;
  if (i > 0 && (args[i - 1] === "--start" || args[i - 1] === "--end")) return false;
  if (arg.startsWith("-") && arg !== "-") return false;
  return true;
});

if (isHelp || (files.length === 0 && process.stdin.isTTY)) {
  showHelp(isAsciiRequested);
  process.exit(0);
}

let exitCode = 0;

async function processFiles(fileList: string[]) {
  const allResults: any[] = [];
  const needsStructure = flags.numbers || (startLine > 1 || endLine !== Infinity);

  for (const path of (fileList.length > 0 ? fileList : ["-"])) {
    try {
      let content = "";
      if (path === "-") {
         content = await Bun.stdin.text();
      } else {
        if (!existsSync(path)) {
          console.error(`cat: ${path}: No such file or directory`);
          exitCode = 1;
          continue;
        }
        content = await Bun.file(path).text();
      }

      // Optimization: if raw text is enough, just write it
      if (!needsStructure && !flags.ascii) {
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
          
          allResults.push({
            line: lineNum,
            content: line
          });
        }
      }
    } catch (e) {
      console.error(`cat: ${path}: ${(e as Error).message}`);
      exitCode = 1;
    }
  }

  if (allResults.length > 0 || needsStructure) {
    if (flags.ascii) {
      allResults.forEach(r => {
        if (flags.numbers) {
          process.stdout.write(`${r.line.toString().padStart(6, " ")}  ${r.content}\n`);
        } else {
          process.stdout.write(`${r.content}\n`);
        }
      });
    } else if (needsStructure) {
      // DoD Format for metadata-rich output
      const dod: any = {};
      if (allResults.length > 0) {
        const keys = Object.keys(allResults[0]);
        keys.forEach(k => {
          dod[k] = allResults.map(r => r[k]);
        });
      }
      process.stdout.write(JSON.stringify(dod) + '\n');
    }
  }
}

await processFiles(files);
process.exit(exitCode);

# @pakakas/cat

A cross-platform file reading tool designed for AI Agents, providing raw text output by default for maximum token efficiency.

## Nuanced Output Logic

Pakakas `cat` follows a smart output philosophy:
- **Raw Text**: Default behavior for pure file content (most token-efficient for AI).
- **DoD JSON**: Automatically used if metadata is requested (e.g., line numbers via `-n`) to provide structured data for AI.
- **Human ASCII**: Use `--a` or `--ascii` to get human-friendly text even when metadata is requested.

## Installation

```bash
bun add -g @pakakas/cat
```

## Usage

### AI Mode (Default)
```bash
# Outputs raw text
cat <file>

# Outputs DoD JSON (because it adds line numbers)
cat -n <file>
```

### Human Mode
```bash
# Outputs raw text with line numbers
cat -n --a <file>
# or
cat -n --ascii <file>

# Get colored, human-readable help
cat --h
```

## License
ISC

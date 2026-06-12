// ── ANSI escape helpers ───────────────────────────────────────────────────────

const R    = '\x1b[0m';   // reset
const BOLD = '\x1b[1m';
const DIM  = '\x1b[2m';

const fg = {
  gray:    '\x1b[90m',
  red:     '\x1b[91m',
  green:   '\x1b[92m',
  yellow:  '\x1b[93m',
  blue:    '\x1b[94m',
  magenta: '\x1b[95m',
  cyan:    '\x1b[96m',
  white:   '\x1b[97m',
} as const;

const bg = {
  blue:   '\x1b[44m',
  yellow: '\x1b[43m',
  red:    '\x1b[41m',
  gray:   '\x1b[100m',
  green:  '\x1b[42m',
} as const;

// Respect the NO_COLOR convention; also skip ANSI in non-TTY pipes
const USE_COLOR = process.stdout.isTTY && !process.env['NO_COLOR'];

const paint = (code: string, text: string) =>
  USE_COLOR ? `${code}${text}${R}` : text;

const bold    = (s: string) => paint(BOLD,        s);
const dim     = (s: string) => paint(DIM,         s);
const gray    = (s: string) => paint(fg.gray,     s);
const green   = (s: string) => paint(fg.green,    s);
const yellow  = (s: string) => paint(fg.yellow,   s);
const cyan    = (s: string) => paint(fg.cyan,     s);
const blue    = (s: string) => paint(fg.blue,     s);
const magenta = (s: string) => paint(fg.magenta,  s);
const white   = (s: string) => paint(fg.white,    s);

// ── Value formatting ──────────────────────────────────────────────────────────

const MAX_DEPTH = 4;
const TREE_INDENT = '   ';

type Primitive = string | number | boolean | null | undefined;

function isPrimitive(val: unknown): val is Primitive {
  return (
    val === null ||
    val === undefined ||
    (typeof val !== 'object' && typeof val !== 'function')
  );
}

function formatPrimitive(val: Primitive): string {
  if (val === null)           return dim('null');
  if (val === undefined)      return dim('undefined');
  if (typeof val === 'string')  return green(`'${val}'`);
  if (typeof val === 'number')  return yellow(String(val));
  if (typeof val === 'boolean') return cyan(String(val));
  return String(val);
}

function formatValue(val: unknown, depth = 0, baseIndent = ''): string {
  if (isPrimitive(val)) return formatPrimitive(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return dim('[]');
    // Flat array of primitives → compact inline
    if (val.every(isPrimitive)) {
      const items = val.map(formatPrimitive).join(dim(', '));
      return `${dim('[')} ${items} ${dim(']')}`;
    }
    // Mixed / nested → tree
    return formatEntries(
      val.map((v, i) => [String(i), v] as [string, unknown]),
      depth,
      baseIndent,
    );
  }

  if (typeof val === 'object' && val !== null) {
    if (depth >= MAX_DEPTH) return gray('{…}');
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return dim('{}');
    return formatEntries(entries, depth, baseIndent);
  }

  return String(val);
}

function formatEntries(
  entries: [string, unknown][],
  depth: number,
  baseIndent: string,
): string {
  const childIndent = baseIndent + TREE_INDENT;
  const lines = entries.map(([key, val], i) => {
    const isLast  = i === entries.length - 1;
    const branch  = dim(isLast ? '└─ ' : '├─ ');
    const keyPart = blue(key) + dim(':');
    const valStr  = formatValue(val, depth + 1, childIndent + TREE_INDENT);
    // If the formatted value itself starts with '\n' it already carries its own tree
    const sep = valStr.startsWith('\n') ? '' : ' ';
    return `${childIndent}${branch}${keyPart}${sep}${valStr}`;
  });
  return '\n' + lines.join('\n');
}

// ── Level badges ──────────────────────────────────────────────────────────────

type Level = 'info' | 'warn' | 'error' | 'debug';

const BADGE: Record<Level, string> = {
  info:  paint(`${BOLD}${bg.blue}`,   white(' INFO ') ),
  warn:  paint(`${BOLD}${bg.yellow}`, white(' WARN ') ),
  error: paint(`${BOLD}${bg.red}`,    white(' ERR  ') ),
  debug: paint(`${BOLD}${bg.gray}`,   white(' DBG  ') ),
};

// ── Logger ────────────────────────────────────────────────────────────────────

function timestamp(): string {
  return dim(new Date().toTimeString().slice(0, 8));
}

export class Logger {
  constructor(private readonly ns: string) {}

  private emit(level: Level, message: string, data?: unknown): void {
    const ns = magenta(this.ns);
    const header = `${timestamp()}  ${BADGE[level]}  ${ns}  ${bold(message)}`;

    if (data === undefined) {
      process.stdout.write(header + '\n');
      return;
    }

    if (isPrimitive(data)) {
      process.stdout.write(`${header}  ${formatPrimitive(data)}\n`);
      return;
    }

    const tree = formatValue(data, 0, '');
    process.stdout.write(header + tree + '\n');
  }

  info (msg: string, data?: unknown): void { this.emit('info',  msg, data); }
  warn (msg: string, data?: unknown): void { this.emit('warn',  msg, data); }
  error(msg: string, data?: unknown): void { this.emit('error', msg, data); }
  debug(msg: string, data?: unknown): void { this.emit('debug', msg, data); }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

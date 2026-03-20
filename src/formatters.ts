/**
 * Output formatters — JSON, table, and text modes.
 */
import chalk from 'chalk';
import { table as createTable, getBorderCharacters } from 'table';
import { config } from './config.js';

type OutputFormat = 'json' | 'table' | 'text';

export function getFormat(override?: string): OutputFormat {
  return (override || config.get('outputFormat')) as OutputFormat;
}

export function formatOutput(data: unknown, format?: string): string {
  const fmt = getFormat(format);
  switch (fmt) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'table':
      return formatTable(data);
    case 'text':
    default:
      return formatText(data);
  }
}

function formatTable(data: unknown): string {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const keys = Object.keys(data[0] as Record<string, unknown>);
    const header = keys.map(k => chalk.bold.cyan(k));
    const rows = data.map(row => {
      const r = row as Record<string, unknown>;
      return keys.map(k => truncate(String(r[k] ?? ''), 60));
    });
    return createTable([header, ...rows], {
      border: getBorderCharacters('norc'),
      columnDefault: { width: 20 },
    });
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const rows = Object.entries(obj).map(([k, v]) => [
      chalk.cyan(k),
      truncate(String(v ?? ''), 80),
    ]);
    return createTable(rows, {
      border: getBorderCharacters('void'),
      columnDefault: { paddingLeft: 1, paddingRight: 1 },
      drawHorizontalLine: () => false,
    });
  }
  return String(data);
}

function formatText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        const lines = Object.entries(obj)
          .map(([k, v]) => `  ${chalk.dim(k)}: ${v}`)
          .join('\n');
        return `${chalk.bold(`[${i + 1}]`)}\n${lines}`;
      }
      return `  ${item}`;
    }).join('\n\n');
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          return `${chalk.bold.cyan(k)}:\n${indent(JSON.stringify(v, null, 2), 2)}`;
        }
        return `${chalk.bold.cyan(k)}: ${v}`;
      })
      .join('\n');
  }
  return String(data);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function indent(str: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return str.split('\n').map(line => pad + line).join('\n');
}

export function printSuccess(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

export function printError(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}

export function printWarning(message: string): void {
  console.log(chalk.yellow('⚠') + ' ' + message);
}

export function printHeader(title: string): void {
  console.log(chalk.bold.red(`\n  ${title}`));
  console.log(chalk.dim('  ' + '─'.repeat(title.length + 4)));
}

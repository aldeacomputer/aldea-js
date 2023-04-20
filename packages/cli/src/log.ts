import { red, green } from 'kolorist'

/**
 * TODO
 */
export function log(...data: any[]): void {
  return console.log(...data)
}

/**
 * TODO
 */
export function err(...data: any[]): void {
  return log(red('  ✖'), ...data)
}

/**
 * TODO
 */
export function ok(...data: any[]): void {
  return log(green('  ✔'), ...data)
}


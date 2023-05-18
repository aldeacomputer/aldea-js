import { inspect } from 'util'
import { CompileError } from '@aldea/compiler'
import { Output } from '@aldea/sdk'
import { bold, red, green, lightGreen } from 'kolorist'
import columnify from 'columnify'

/**
 * Logs the given data to the terminal
 */
export function log(...data: any[]): void {
  console.log(...data)
}

/**
 * Logs the given data formatted as an error
 */
export function err(...data: any[]): void {
  log(red('  ✖'), ...data)
}

/**
 * Logs the given data formatted as a success message
 */
export function ok(...data: any[]): void {
  log(green('  ✔'), ...data)
}

/**
 * Logs the given data in columns
 */
export function cols(data: any[] | Record<string, any>): void {
  log(columnify(data, { showHeaders: false }))
}

/**
 * Logs the given error message and quits the process
 */
export async function logErrAndQuit(error: Error): Promise<never> {
  log()
  err(error.message)
  log()
  if (error instanceof CompileError) {
    log(error.stderr.toString())
  } else if ('response' in error) {
    // @ts-ignore
    await error.response.json().then(log)
  } else {
    log(error.stack)
  }
  log()
  process.exit(1)
}

/**
 * Logs the given Aldea Output instance in a table
 */
export function logOutput(output: Output): void {
  return cols({
    ID:       lightGreen(output.id),
    Origin:   lightGreen(output.origin.toString()),
    Location: lightGreen(output.location.toString()),
    Class:    lightGreen(output.classPtr.toString()),
    State:    bold(inspect(output.props, { colors: true })),
  })
}

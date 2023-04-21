import { inspect } from 'util'
import { Output } from '@aldea/sdk-js'
import { bold, red, green, lightGreen } from 'kolorist'
import columnify from 'columnify'

/**
 * TODO
 */
export function log(...data: any[]): void {
  console.log(...data)
}

/**
 * TODO
 */
export function err(...data: any[]): void {
  log(red('  ✖'), ...data)
}

/**
 * TODO
 */
export function ok(...data: any[]): void {
  log(green('  ✔'), ...data)
}

/**
 * TODO
 */
export function cols(data: any[] | Record<string, any>): void {
  log(columnify(data, { showHeaders: false }))
}

/**
 * TODO
 */
export async function logErrAndQuit(error: Error): Promise<never> {
  log()
  err(error.message)
  log()
  if ('response' in error) {
    // @ts-ignore
    await error.response.json().then(log)
  } else {
    log(error.stack)
  }
  log()
  process.exit()
}

/**
 * TODO
 */
export function logOutput(output: Output): void {
  return cols({
    ID:     lightGreen(output.id),
    Origin: lightGreen(output.origin.toString()),
    Class:  lightGreen(output.classPtr.toString()),
    State:  bold(inspect(output.props, { colors: true })),
  })
}

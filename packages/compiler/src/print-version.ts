import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
import { readFileSync } from 'fs';
import * as path from 'path';

export function printVersion () {
  const buffer = readFileSync(path.join(__dirname, '..', 'package.json'))
  const string = buffer.toString()
  const json = JSON.parse(string)
  console.log(`v${json.version}`)
}




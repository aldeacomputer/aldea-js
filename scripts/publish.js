/**
 * Custom publish script in use whilst changesets doesn't play nice with
 * yarn workspace versions
 * See issue: https://github.com/changesets/changesets/issues/432
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import semver from 'semver'

const workspaces = []

process.stdout.write(`\n`)

const rawWorkspaces = execSync('yarn workspaces list --json')
for (let line of rawWorkspaces.toString().trim().split('\n')) {
  const workspace = JSON.parse(line)
  const pkg = JSON.parse(readFileSync(resolve(workspace.location, 'package.json')))
  if (pkg.private) continue

  process.stdout.write(` - checking ${workspace.name} -`)
  const rawInfo = execSync(`npm info ${workspace.name} --json`)
  const info = JSON.parse(rawInfo.toString())
  const toPublish = semver.gt(pkg.version, info.version)
  process.stdout.write(`\t${toPublish ? 'publish' : 'ok'}\n`)
  if (toPublish) { workspaces.push(workspace) }
}

process.stdout.write(`\n`)

for (let workspace of workspaces) {
  console.log(` - publishing ${workspace.name}`)
  //execSync(`yarn workspace ${workspace.name} npm publish --access public`)
}
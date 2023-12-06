import './dist/compiler.bundle.js'

(async () => {
  try {
    const res = await compile(`export class Foo extends Jig {}`)
    console.log(res.stdout.toString())
  } catch(e) {
    console.log(e.stderr.toString())
  }
})()
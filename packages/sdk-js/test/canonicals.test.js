import test from 'ava'
import { mnemonicToSeed } from '@scure/bip39'
import { HDPrivKey, PrivKey, PubKey, Pointer, Tx, OpCode, base16 } from '../dist/index.js'

/**
 * This module tests canonical values and that can be tested accross different
 * Aldea implementations.
 */

const KEYS = {
  privkey: 'asec1f40sdqzmph3ec7uce9lu97zc2yadh7hs6ut2j37pryjf0zjgp45srd6f6z',
  pubkey: 'apub1ae6x0x0jrzw2z0dtk73knewry8f04sduw2g5gzquu4puvqfrl7jswd84n8',
  address: 'addr1x8xyadtsgfdrjw2dw6qzh269eqjtf5q5gj7zwm',
}

const HD_KEYS = {
  seed: 'air above edge runway time admit escape improve glad tissue burden scale',
  rootPriv: 'xsec1rr45d02ucg2vvjdkqcks0ssacmn28wpy29j7hg62sd9msu30p4fuf26scwxe7q0akxeqlz9axf8z29c0wfwqzndz7409mxrd504dnulh9ctuwmvysde7vu6djfzhe5htjcm5jd0tt2zvxr8mhhwmnc7kvc2zkhrp',
  rootPub: 'xpub17w04x3j25p83fw3cnmepta84p9qemwlgsm038kd7sw29gka00ll0wtshcakcfqmnuee5myj90nfwh93hfy67kk5ycvx0h0wah83avescn0wef',
  child: {
    path: 'm/1/2/3/4',
    priv: 'xsec1lphrwy4xk03rwpup20r6nw4433jsw8lltndgf9v44xwteq30p4f7k74v5h4sh2dmwz47smdtuq0a0mzg2rtlma2qv2gsctmyrl69uncplyuw36jh4fv7cnn0lfjut2xtcumsqp4cj7n69pswazyj5nzmxq4j432e',
    pub: 'xpub133ygulga7gfpgjjw6urysszncdcuj9y6pjhevx6jcgy5nhtjtursr7fcar4902jea38xl7n9ck5vh3ehqqrt39a852rqa6yf9fx9kvqed0k6y',
    addr: 'addr1cdhu52udrezjx9m6nc4rhsvzpanupu26ep0mgc',
  },
  hardChild: {
    path: 'm/1h/2h/3/4',
    priv: 'xsec1fprjr4p3764gr694lmm6q9c3weyyy9amc99qjehnvza457f0p4fawff56g6l8y5z2x4ehaq2sty3dl35asfxsrxu39zsaef4x78mxl983e4xms9x6z8nk9af8lhzaatxev3mx50q9sf574rum94g2qylgyldve9q',
    pub: 'xpub1nmxayj4rxd5dwj0943tqhzyu8k0twn5nr4644p29cryhlxs2xyq20rn2dhq2d5y08vt6j0lw9m6kdjerkdg7qtqnfa28ekt2s5qf7sgzstn7z',
    addr: 'addr1xq6jyxenxhgg56empx79ggmvfhxadgelcjwpln',
  }
}

const TX = {
  rawtx: '01000ea120a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701a220df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120da322675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c8552810100b1080000000063666f6fb21e010001001902bcd84054f8be00b23c9c1c30720e862d00082121d83c4ff3b2080200010063626172b30a000000000200636d756db4080000010063646164c1020100c2160200f8be00b23c9c1c30720e862d00082121d83c4ff3c2160300f8be00b23c9c1c30720e862d00082121d83c4ff3d1608168696e6465782e7473a168696e6465782e7473784a6578706f72742066756e6374696f6e2068656c6c6f576f726c64286d73673a20737472696e67293a20737472696e67207b2072657475726e206048656c6c6f20247b6d73677d2160207de160dcec284f6257490225aec9762c2b4f4683841fd76a8c67407ce58058019688f27c51945b3055e3b9c652bfddc6b2c696a9130b8159de1f9f1de31ac17693ff0fa19bb50358e253e3ded9910ce69088a327f701a4c85b7f444b6f4f6e63bbb961e260db7134476827db2c4c096b25e3fa67e2759e295108cb676f455e354d4c984ede577daeedc097296e6b894e5f6581234be085264262a30867aff04980000ab502a19bb50358e253e3ded9910ce69088a327f701a4c85b7f444b6f4f6e63bbb961',
  instructions: [
    [OpCode.IMPORT, base16.decode('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')],
    [OpCode.LOAD, base16.decode('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')],
    [OpCode.LOADBYORIGIN, base16.decode('675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c8552810100')],
    [OpCode.NEW, 0, 0, ['foo']],
    [OpCode.CALL, 1, 1, [700, base16.decode('f8be00b23c9c1c30720e862d00082121d83c4ff3')]],
    [OpCode.CALL, 2, 1, ['bar']],
    [OpCode.EXEC, 0, 0, 2, ['mum']],
    [OpCode.EXECFUNC, 0, 1, ['dad']],
    [OpCode.FUND, 1],
    [OpCode.LOCK, 2, base16.decode('f8be00b23c9c1c30720e862d00082121d83c4ff3')],
    [OpCode.LOCK, 3, base16.decode('f8be00b23c9c1c30720e862d00082121d83c4ff3')],
    [OpCode.DEPLOY, ['index.ts'], new Map([['index.ts', 'export function helloWorld(msg: string): string { return `Hello ${msg}!` }']])],
    [OpCode.SIGN, base16.decode('dcec284f6257490225aec9762c2b4f4683841fd76a8c67407ce58058019688f27c51945b3055e3b9c652bfddc6b2c696a9130b8159de1f9f1de31ac17693ff0f'), base16.decode('a19bb50358e253e3ded9910ce69088a327f701a4c85b7f444b6f4f6e63bbb961')],
    [OpCode.SIGNTO, base16.decode('db7134476827db2c4c096b25e3fa67e2759e295108cb676f455e354d4c984ede577daeedc097296e6b894e5f6581234be085264262a30867aff04980000ab502'), base16.decode('a19bb50358e253e3ded9910ce69088a327f701a4c85b7f444b6f4f6e63bbb961')],
  ]
}

test('Priv and pubkey and address serialisation', t => {
  const privKey = PrivKey.fromString(KEYS.privkey)
  const pubkey  = PubKey.fromString(KEYS.pubkey)

  t.is(privKey.toPubKey().toString(), KEYS.pubkey)
  t.is(privKey.toPubKey().toAddress().toString(), KEYS.address)
  t.is(pubkey.toAddress().toString(), KEYS.address)
})

test('HD Priv and PubKey derivation', async t => {
  const seed = await mnemonicToSeed(HD_KEYS.seed)
  const root = HDPrivKey.fromSeed(seed)

  t.is(root.toString(), HD_KEYS.rootPriv)
  t.is(root.toHDPubKey().toString(), HD_KEYS.rootPub)
  
  const child = root.derive(HD_KEYS.child.path)
  t.is(child.toString(), HD_KEYS.child.priv)
  t.is(child.toHDPubKey().toString(), HD_KEYS.child.pub)
  t.is(child.toPubKey().toAddress().toString(), HD_KEYS.child.addr)

  const hardChild = root.derive(HD_KEYS.hardChild.path)
  t.is(hardChild.toString(), HD_KEYS.hardChild.priv)
  t.is(hardChild.toHDPubKey().toString(), HD_KEYS.hardChild.pub)
  t.is(hardChild.toPubKey().toAddress().toString(), HD_KEYS.hardChild.addr)
})

test('Kitchen sink TX', t => {
  const tx = Tx.fromHex(TX.rawtx)

  t.is(tx.instructions.length, TX.instructions.length)
  t.is(tx.instructions[0].opcode, TX.instructions[0][0])
  t.deepEqual(tx.instructions[0].pkgId, TX.instructions[0][1])
  t.is(tx.instructions[1].opcode, TX.instructions[1][0])
  t.deepEqual(tx.instructions[1].outputId, TX.instructions[1][1])
  t.is(tx.instructions[2].opcode, TX.instructions[2][0])
  t.deepEqual(tx.instructions[2].origin, TX.instructions[2][1])
  t.is(tx.instructions[3].opcode, TX.instructions[3][0])
  t.is(tx.instructions[3].idx, TX.instructions[3][1])
  t.is(tx.instructions[3].exportIdx, TX.instructions[3][2])
  t.deepEqual(tx.instructions[3].args, TX.instructions[3][3])
  t.is(tx.instructions[4].opcode, TX.instructions[4][0])
  t.is(tx.instructions[4].idx, TX.instructions[4][1])
  t.is(tx.instructions[4].methodIdx, TX.instructions[4][2])
  t.deepEqual(tx.instructions[4].args, TX.instructions[4][3])
  t.is(tx.instructions[5].opcode, TX.instructions[5][0])
  t.is(tx.instructions[5].idx, TX.instructions[5][1])
  t.is(tx.instructions[5].methodIdx, TX.instructions[5][2])
  t.deepEqual(tx.instructions[5].args, TX.instructions[5][3])
  t.is(tx.instructions[6].opcode, TX.instructions[6][0])
  t.is(tx.instructions[6].idx, TX.instructions[6][1])
  t.is(tx.instructions[6].exportIdx, TX.instructions[6][2])
  t.is(tx.instructions[6].methodIdx, TX.instructions[6][3])
  t.deepEqual(tx.instructions[6].args, TX.instructions[6][4])
  t.is(tx.instructions[7].opcode, TX.instructions[7][0])
  t.is(tx.instructions[7].idx, TX.instructions[7][1])
  t.is(tx.instructions[7].exportIdx, TX.instructions[7][2])
  t.deepEqual(tx.instructions[7].args, TX.instructions[7][3])
  t.is(tx.instructions[8].opcode, TX.instructions[8][0])
  t.is(tx.instructions[8].idx, TX.instructions[8][1])
  t.is(tx.instructions[9].opcode, TX.instructions[9][0])
  t.is(tx.instructions[9].idx, TX.instructions[9][1])
  t.deepEqual(tx.instructions[9].pubkeyHash, TX.instructions[9][2])
  t.is(tx.instructions[10].opcode, TX.instructions[10][0])
  t.is(tx.instructions[10].idx, TX.instructions[10][1])
  t.deepEqual(tx.instructions[10].pubkeyHash, TX.instructions[10][2])
  t.is(tx.instructions[11].opcode, TX.instructions[11][0])
  t.deepEqual(tx.instructions[11].entry, TX.instructions[11][1])
  t.deepEqual(tx.instructions[11].code, TX.instructions[11][2])
  t.is(tx.instructions[12].opcode, TX.instructions[12][0])
  t.deepEqual(tx.instructions[12].sig, TX.instructions[12][1])
  t.deepEqual(tx.instructions[12].pubkey, TX.instructions[12][2])
  t.is(tx.instructions[13].opcode, TX.instructions[13][0])
  t.deepEqual(tx.instructions[13].sig, TX.instructions[13][1])
  t.deepEqual(tx.instructions[13].pubkey, TX.instructions[13][2])
})
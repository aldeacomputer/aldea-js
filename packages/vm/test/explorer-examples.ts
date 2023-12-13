export const GAME = `
/**
 * # Under Over Seven
 * 
 * Under Over Seven is a very simple dice game. The player tries to guess
 * whether the value of two rolled dice will be lower, higher or equal to seven.
 * 
 * if the player guesses correctly that the dice will be lower or higher than
 * seven, they are paid back at 1/1 (doubling their money). If the guess
 * correctly that the dice will be equal to seven they are paid back at 4/1.
 * Otherwise, the player loses their bet.
 * 
 * This code implements Under Over Seven on the Aldea Computer, with the \`House\`
 * and each \`Game\` implemented as public Jigs (smart contracts). Randomness of
 * the dice roll is implemented in a provably fair way by the player creating a
 * game instance, requiring the house to sign the origin with a known key, and
 * using the signature as a source of entropy.
 * @package
 */

import { canLock } from 'aldea/auth'

/**
 * House is a public Jig this is used to create new Game jigs.
 * 
 * When a house is instantiated, a party deposits a coin as the House balance
 * and declares it's public key. The instantiating party retains control of the
 * House jig through a ControlToken. This allows the balance to be withdrawn or
 * added to in the future.
 */
export class House extends Jig {
  ctrl: ControlToken;

  constructor(
    public balance: Coin,
    public pubkey: Uint8Array,
  ) {
    super()
    this.ctrl = new ControlToken()
    const housePKH = this.balance.$lock.getAddressOrFail()
    this.ctrl.$lock.changeToAddressLock(housePKH)
    this.balance.$lock.changeToJigLock()
    this.$lock.changeToPublicLock()
  }

  /**
   * A public method that is called by a player to instantiate a new Game.
   * 
   * The player must add a coin as their bet and the House adds 4 times the bet
   * (representing the maximum possible winnings) to the Game as it's own stake.
   */
  createGame(guess: i8, bet: Coin): Game {
    const stake = this.balance.send(bet.amount * 4)
    
    stake.$lock.unlock()
    return new Game(this, guess, bet, stake)
  }

  /**
   * Deposit additional coins to the House, which are merged into the House
   * balance.
   * 
   * Only the House controller can call this method.
   */
  deposit(coins: Coin[]): void {
    if (!canLock(this.ctrl)) {
      throw new Error('unauthorized to control House jig')
    }
    this.balance = this.balance.combine(coins)
  }

  /**
   * Withdraws the given number of motos from the House balance.
   * 
   * Only the House controller can call this method.
   */
  withdraw(motos: u64): Coin {
    if (!canLock(this.ctrl)) {
      throw new Error('unauthorized to control House jig')
    }
    const coin = this.balance.send(motos)
    return coin
  }

  /**
   * Withdraws the entire balance from the House.
   * 
   * Only the House controller can call this method.
   */
  close(): Coin {
    if (!canLock(this.ctrl)) {
      throw new Error('unauthorized to control House jig')
    }
    this.balance.$lock.unlock()
    this.ctrl.$lock.freeze()
    return this.balance
  }
}

/**
 * Game is a public jig that represents a single play of Under Over Seven.
 * 
 * The player must create the instance of Game through calling \`House.createGame()\`.
 * The player's bet and the House's stake are set on the Jig.
 * 
 * At this point the player would usually pass serialized of the Game Jig to
 * the House entity, where they would sign the origin and call the \`rollDice()\`
 * method and pass in the signature.
 */
export class Game extends Jig {
  ctrl: ControlToken;
  dice: StaticArray<u8> = new StaticArray(2);
  signature: Uint8Array = new Uint8Array(64);

  constructor(
    public house: House,
    public guess: i8,
    public bet: Coin,
    public stake: Coin,
  ) {
    if (!caller.is<House>(true)) {
      throw new Error('use House.createGame() to instantiate a game')
    }
    super()
    this.ctrl = new ControlToken()
    const userPKH = this.bet.$lock.getAddressOrFail()
    this.ctrl.$lock.changeToAddressLock(userPKH)
    this.bet.$lock.changeToJigLock()
    this.stake.$lock.changeToJigLock()
    this.$lock.changeToPublicLock()
  }

  /**
   * Provides entropy for the PRNG which is used to calculate the dice roll.
   * 
   * The given entropy must be a valid signature of the output origin against
   * the house pubkey. Implicitly therefore, only House can call this method.
   */
  rollDice(sig: Uint8Array): void {
    // todo - ideally we should be able to verify the sig against the house pubkey
    // eg: ed25519.verify(this.$output.origin, sig, this.house.pubkey)
    // todo - instead we'll check the tx is signed by house
    // if (!canLock(this.house.ctrl)) {
    //   throw new Error('unauthorized to control Game jig')
    // }
    this.signature = sig
    const prng = new PRNG(sig)
    this.dice[0] = Math.floor(prng.rand() * 6 + 1) as u8
    this.dice[1] = Math.floor(prng.rand() * 6 + 1) as u8
    this.handleResult()
  }

  // handles the result of the game
  // if player wins having guessed under or over, they recieve 1/1 of their bet.
  // if player wins having guess seven, they receive 4/1 of their bet.
  // otherwise, the bet and stake go back to house.
  private handleResult(): void {
    const score = this.dice[0] + this.dice[1]
    const userPKH = this.ctrl.$lock.getAddressOrFail()

    if (
      (score < 7 && this.guess === Guess.UNDER) ||
      (score > 7 && this.guess === Guess.OVER)
    ) {
      const winnings = this.stake.send(this.bet.amount)
      this.bet = this.bet.combine([winnings])
      this.bet.$lock.changeToAddressLock(userPKH)
      this.stake.$lock.unlock()
      this.house.deposit([this.stake])
    } else if (score == 7 && this.guess === Guess.SEVEN) {
      this.stake.$lock.unlock()
      this.bet = this.bet.combine([this.stake])
      this.bet.$lock.changeToAddressLock(userPKH)
    } else {
      this.stake.$lock.unlock()
      this.bet.$lock.unlock()
      this.house.deposit([this.stake, this.bet])
    }
  }
}

/**
 * ControlToken is a very simple Jig that is used to control access to methods
 * on public Jigs. If a transaction contains a signature from the key the token
 * is locked to, then access is implied.
 */
export class ControlToken extends Jig {}

enum Guess {
  UNDER = -1,
  SEVEN,
  OVER,
}

/**
 * Implementation of SFC-32 (Small Fast Counter) PRNG.
 * Passes the PractRand PRNG test suite.
 */
class PRNG {
  a: u32;
  b: u32;
  c: u32;
  d: u32;

  constructor(seed: Uint8Array) {
    if (seed.byteLength < 16) {
      throw new Error('PRNG seed must be at least 128 bits')
    }
    const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength)
    this.a = view.getUint32(0, true)
    this.b = view.getUint32(4, true)
    this.c = view.getUint32(8, true)
    this.d = view.getUint32(12, true)
  }

  rand(): f64 {
    this.a |= 0
    this.b |= 0
    this.c |= 0
    this.d |= 0

    const t = (this.a + this.b | 0) + this.d | 0
    this.d = this.d + 1 | 0
    this.a = this.b ^ this.b >>> 9
    this.b = this.c + (this.c << 3) | 0
    this.c = this.c << 21 | this.c >>> 11
    this.c = this.c + t | 0
    return (t >>> 0) / <f64>4294967296
  }
}
`

export const KITCHEN_SINK = `
/**
 * # Se madebit imperio et quantum
 *
 * ## Furtis tetenderat aventi repulso canos aras fuisses
 * 
 * Lorem markdownum tardis *ex claudere esse* addit motus non; naidas duobus viam
 * ratione Phoebus. Dolore effugere remugis, cibo in arcana Lycabas regia miserum
 * genitor **manifesta** fieres orbis pereat diro.
 * 
 * - Genus Lernae
 * - Flere quam certa venatrixque postquam ultor
 * - Tu grave properent care silet viso peraravit
 * - Ducebat auro quo nostro Atrides dare
 * - Me pro neque transit Aegides a comes
 * 
 * ## Puppes lata gaudia in Iuppiter spicis peto
 * 
 * Est fidem, et omnia, ante quae dempto cum petisti artes referentem et deusque
 * lacrimasque ignem. Ego et carere vires [procellae
 * bacchae](http://caeleste.io/dixerat-erat.html): fores fata undis, Achillea
 * Atlantiades pelle. Nam dextrae partu quadrupedes magis arserunt *generat sed*
 * volucrum principio diesque verti. Concipit in fratris bucina feroces videtur
 * leviore quas sic voluntas et tamen bracchia **excussum** vergit rivi; est
 * salutis. Metu erat dedignata, *socios miserisque hunc* tactumque, rector
 * parentum scitusque **et dumque** Aeacidae inposita Pindo quae *ipse*; in.
 * 
 * > Pretium Iole, hoc saxo oravit poterat calamo gravis icto longe metu una! Abit
 * > Elymumque Telethusa [viri Dianae](http://www.onus-dura.com/), huic quas
 * > conquesti aesculeae in quod antiqui terreat altior, opus. Et plus omnipotens
 * > dicta **hostia deusque**, plumis, colorum pervia ministri et dixi! Satis
 * > Athenas est novos honores moras, ante cum labant indue pulsant titulos
 * > postquam sacer carmine. Optima seu putes minor pectora, tardata *hostilique*
 * > pone; quis avos lampadibus conatur finem hic surgere questa.
 * 
 * ## Subito quod coniunx indignos commentaque verba
 * 
 * De tribuam vocem. Marisque erat.
 * 
 * ## Supplex deus terga ligno Arcas clarus stratis
 * 
 * Sinit mihi esse prohibet, tempore vernos, illa meque recondita collo? Tempore
 * haec. Artifices hospitis est, populusque primo arripit oculosque monedula Circe.
 * 
 * ## Mens Meleagros inter dextra siquis
 * 
 * Miles nec numina interea vestigia fiat vale, Atlantiades denique nondum; visa
 * dumque audit. Et cumulumque **forent mensas Phrygiae** in regis et iungat mihi
 * neque. Nec non spatium delapsa tamen Aesoniden optetis interceperit remis
 * remotos imbres, et Iovis, concedite. Vinclisque vocem.
 * 
 * \`\`\`
 * array += webComponentAnimated.spooling.terabyte(youtube_buffer_internic /
 *         keywords_cloud_and, 1);
 * if (driverPdfScreenshot.gibibyte_router_rpm(5 + saas_windows) !=
 *         css_art_path(97, multimedia_string_golden, 52)) {
 *     cleanPiconet += websiteSignatureWpa(dnsWaisClock + image);
 * }
 * var balance_cad = errorSessionRoot(smtp_dock_mbps, direct);
 * \`\`\`
 * 
 * Spernit data: tenentis fatiferum catulus quam, domos, et fuga cuspide vulnera
 * qui si quos? Sed est ripae adessent: tanta erat possent, visa. Arcus resolvit
 * confessa sed membris male te dixerat vestes regia coniecit cornibus Alemone
 * tamen. Mihi semper, est ab coloribus quid. Contento retexi, pedem puto vimque: o
 * marmora variusque **o** vertatur poterat.
 * @package
 */

/**
 * The kitchen sink is a class that has a field of every data type. Nice for testing.
 */
export class KitchenSink extends Jig {
  b1: bool;
  b2: bool;
  i1: i8;
  i2: i16;
  i3: i32;
  i4: i64;
  u1: u8;
  u2: u16;
  u3: u32;
  u4: u64;
  f1: f32;
  f2: f64;
  str: string;
  arr: string[];
  deepArr: string[][];
  sa: StaticArray<string>;
  deepSa: StaticArray<string[]>;
  set: Set<string>;
  deepSet: Set<string[]>;
  map: Map<string, string>;
  deepMap: Map<string, string[]>;
  ab: ArrayBuffer;
  ia1: Int8Array;
  ia2: Int16Array;
  ia3: Int32Array;
  ia4: Int64Array;
  ua1: Uint8Array;
  ua2: Uint16Array;
  ua3: Uint32Array;
  ua4: Uint64Array;
  fa1: Float32Array;
  fa2: Float64Array;
  obj: SomeObj;

  /**
   * Pass a coin to the constructor so it will be referenced.
   */
  constructor(public coin: Coin) {
    super()
    const str = 'Hello world! 😛'
    const arr = ['foo', 'bar', 'baz']

    this.b1 = true
    this.b2 = false
    this.i1 = -100
    this.i2 = -30000
    this.i3 = -2000000000
    this.i4 = -9000000000000000000
    this.u1 = 255
    this.u2 = 65000
    this.u3 = 4000000000
    this.u4 = 9000000000000000000
    this.f1 = 123.123123
    this.f2 = -123123.987654321
    this.str = str
    this.arr = arr
    this.deepArr = [arr, arr, arr]
    this.sa = StaticArray.fromArray(arr)
    this.deepSa = StaticArray.fromArray([arr, arr, arr])
    this.set = new Set<string>()
    this.deepSet = new Set<string[]>()
    this.map = new Map<string, string>()
    this.deepMap = new Map<string, string[]>()
    this.ab = new ArrayBuffer(32)
    this.ia1 = new Int8Array(4)
    this.ia2 = new Int16Array(4)
    this.ia3 = new Int32Array(4)
    this.ia4 = new Int64Array(4)
    this.ua1 = new Uint8Array(4)
    this.ua2 = new Uint16Array(4)
    this.ua3 = new Uint32Array(4)
    this.ua4 = new Uint64Array(4)
    this.fa1 = new Float32Array(4)
    this.fa2 = new Float64Array(4)
    this.obj = { foo: 'abcdefg', bar: 'xyz123abc', baz: true }
    
    for (let i = 0; i < 4; i++) {
      this.ia1[i] = (i+1) * 100
      this.ia2[i] = (i+1) * 100
      this.ia3[i] = (i+1) * 100
      this.ia4[i] = (i+1) * 100
      this.ua1[i] = (i+1) * 100
      this.ua2[i] = (i+1) * 100
      this.ua3[i] = (i+1) * 100
      this.ua4[i] = (i+1) * 100
      this.fa1[i] = (<f32>i+1) * 127.543
      this.fa2[i] = (<f64>i+1) * 127.543
    }

    this.set.add(str)
    this.deepSet.add(arr)
    this.map.set('test1', str)
    this.deepMap.set('test2', arr)
  }
}

/**
 * \`SomeObj\` is a plain object.
 */
export class SomeObj {
  foo: string;
  bar: string;
  baz: bool;
}

/**
 * Just some interface for testing purposes.
 */
export interface SomeInt {
  /** \`a\` is a string. Long and stringy. */
  a: string;
  /** \`b\` is a big ol \`u64\` integer. Can be a pretty large number TBF. */
  b: u64;

  /**
   * The \`perform()\` method is where or the magic happens. Should return a map
   * with some stuff in it.
   */
  perform(): Map<string, u64>;
}

/**
 * This is a damn nice function. Calling it with the correct arguments will
 * literraly return some magic.
 * 
 * ## Parameters
 * 
 * - \`int\` - any old class implementing \`SomeInt\`
 * 
 * ## Examples
 * 
 * \`\`\`
 * class Foo implements SomeInt {
 *   constructor(
 *     public a: string;
 *     public b: u64;
 *   ) {}
 * 
 *   perform(): Map<string, u64> {
 *     return new Map([[this.a, this.b]])
 *   }
 * }
 * \`\`\`
 */
export function magicFunc(int: SomeInt): Map<string, u64> {
  return int.perform()
}
`

export const SELL_OFFER = `
/**
 * A SellOffer is a public Jig with any other Jig locked to it. The offer can be
 * redeemed by another party sending a payment coin which matches the number of
 * motos demanded by the orignator of the offer.
 */
export class SellOffer extends Jig {
  xToken: CancelToken;

  constructor(
    public asset: Jig,
    public amount: u64,
    sellerPKH: ArrayBuffer,
  ) {
    super()
    this.xToken = new CancelToken()
    this.xToken.$lock.changeToAddressLock(sellerPKH)
    this.asset.$lock.changeToJigLock()
    this.$lock.changeToPublicLock()
  }

  /**
   * The offer can be redeemed by passing a Coin containing sufficient motos.
   * The Coin is sent to the offer originator and the Jig is sent to the caller
   * of this method.
   */
  redeem(payment: Coin): void {
    if (payment.amount < this.amount) {
      throw new Error('payment does not match offer')
    }

    const sellerPKH = this.xToken.$lock.getAddressOrFail()
    const buyerPKH = payment.$lock.getAddressOrFail()
    
    payment.$lock.changeToAddressLock(sellerPKH)
    this.asset.$lock.changeToAddressLock(buyerPKH)
    //this.$lock.freeze()
  }

  /**
   * The SellOffer can be cancelled by the originator simply by calling this
   * method with a valid signature. The cancel token can only be frozen if a
   * valid signature exists.
   */
  cancel(): void {
    const sellerPKH = this.xToken.$lock.getAddressOrFail()
    this.asset.$lock.changeToAddressLock(sellerPKH)
    this.xToken.$lock.freeze()
    //this.$lock.freeze()
  }
}

export class CancelToken extends Jig {}
`

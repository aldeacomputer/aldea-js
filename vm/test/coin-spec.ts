import {Storage, VM} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxBuilder} from "./tx-builder.js";
import {LockType} from "../vm/wasm-instance.js";
import {JigState} from "../vm/jig-state.js";
import {ExecutionError, PermissionError} from "../vm/errors.js";
import {ref} from "@aldea/sdk-js";

describe('Coin', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

  const otherUserPriv = AldeaCrypto.randomPrivateKey()
  const otherUserPub = AldeaCrypto.publicKeyFromPrivateKey(otherUserPriv)
  const otherUserAddr = otherUserPub.toAddress()

  const fundCost = 100

  let coin: JigState

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)
  })


  describe('#send', () => {
    let sentAmount: number
    let originalAmount: number

    describe('on successful scenarios', () => {

      beforeEach(() => {
        originalAmount = 1000
        sentAmount = 200
        coin = vm.mint(userAddr, originalAmount)
      })

      it('creates a new coin for the receiver with the indicated amount', async () => {
        const tx = new TxBuilder()
          .load(coin.id())
          .sign(userPriv)
          .fund(0)
          .call(0, 2, [sentAmount, otherUserAddr.hash])
          .lock(0, userAddr)
          .build()

        const execution = await vm.execTx(tx)

        const newCoinOutputIndex = 1
        const newCoinOutput = execution.outputs[newCoinOutputIndex]

        const newCoinAmount = newCoinOutput.parsedState()[0]
        expect(newCoinAmount).to.eql(sentAmount)
      })

      it('reduces the indicated amount in the original coin', async () => {
        const tx = new TxBuilder()
          .load(coin.id())
          .sign(userPriv)
          .fund(0)
          .call(0, 2, [sentAmount, otherUserAddr.hash])
          .lock(0, userAddr)
          .build()

        const execution = await vm.execTx(tx)

        const originalCoinIndex = 0
        const newCoinOutput = execution.outputs[originalCoinIndex]

        const originalCoinAmount = newCoinOutput.parsedState()[0]
        expect(originalCoinAmount).to.eql(originalAmount - sentAmount - fundCost)
      })

      describe('if the operation consumes all of the original coin', () => {

        beforeEach(() => {
          sentAmount = 900
          coin = vm.mint(userAddr, originalAmount)
        })

        it('freezes the original coin', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 2, [sentAmount, otherUserAddr.hash])
            .build()

          const execution = await vm.execTx(tx)

          const originalCoinIndex = 0
          const newCoinOutput = execution.outputs[originalCoinIndex]
          expect(newCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)
        })

      })
    })

    describe('on unsuccessful scenarios', () => {

      describe('like when the indicated amount is greater than the available amount of the coin', () => {

        beforeEach(() => {
          sentAmount = 2000
          originalAmount = 1000
          coin = vm.mint(userAddr, originalAmount)
        })

        it('fails properly', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 2, [sentAmount, otherUserAddr.hash])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
          } catch (e) {
            expect(e).to.be.instanceof(ExecutionError)
            const error = e as ExecutionError
            expect(error.message).to.eql('not enough coins')
            return
          }
          expect.fail('test should have failed')
        })

        it('does not change the state of any of the involved coins', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 2, [sentAmount, otherUserAddr.hash])
            .lock(0, userAddr)
            .build()

          let execution
          try {
            execution = await vm.execTx(tx)
          } catch (e) {
            if (!execution || !execution.outputs) return
            const originalCoinIndex = 0
            const otherCoinIndex = 1
            const newCoinOutput = execution.outputs[originalCoinIndex]
            const otherCoinOutput = execution.outputs[otherCoinIndex]

            const originalCoinAmount = newCoinOutput.parsedState()[0]
            const otherCoinAmount = otherCoinOutput.parsedState()[0]
            expect(originalCoinAmount).to.eql(originalCoinAmount)
            expect(otherCoinAmount).to.eql(0)
            return
          }
          expect.fail('test should have failed')
        })

      })
    })
  })

  describe('#merge', () => {
    let coin: JigState
    let otherCoin: JigState
    let originalAmount: number
    let otherCoinAmount: number

    beforeEach(() => {
      originalAmount = 1000
      otherCoinAmount = 200
      coin = vm.mint(userAddr, originalAmount)
      otherCoin = vm.mint(userAddr, otherCoinAmount)
    })

    describe('on successful scenarios', () => {

      it('adds the amount of the coin passed by parameter to the current coin', async () => {
        const tx = new TxBuilder()
          .load(coin.id())
          .load(otherCoin.id())
          .sign(userPriv)
          .fund(0)
          .call(0, 3, [ref(1)])
          .lock(0, userAddr)
          .build()

        const execution = await vm.execTx(tx)

        const originalCoinOutputIndex = 0
        const originalCoinOutput = execution.outputs[originalCoinOutputIndex]

        const originalCoinAmount = originalCoinOutput.parsedState()[0]
        expect(originalCoinAmount).to.eql(originalAmount + otherCoinAmount - fundCost)
      })

      it('destroys the passed coin after the operation', async () => {
        const tx = new TxBuilder()
          .load(coin.id())
          .load(otherCoin.id())
          .sign(userPriv)
          .fund(0)
          .call(0, 3, [ref(1)])
          .lock(0, userAddr)
          .build()

        const execution = await vm.execTx(tx)

        const otherCoinOutputIndex = 1
        const otherCoinOutput = execution.outputs[otherCoinOutputIndex]
        expect(otherCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)
      })
    })

    describe('on unsuccessful scenarios', () => {

      describe('like when the coins are from different owners', () => {
        let coin: JigState
        let otherCoin: JigState
        let originalAmount: number
        let otherCoinAmount: number

        beforeEach(() => {
          originalAmount = 1000
          otherCoinAmount = 200
          coin = vm.mint(userAddr, originalAmount)
          otherCoin = vm.mint(otherUserAddr, otherCoinAmount)
        })

        // TODO: This is kinda failing for the right reason, but not in the correct spot:
        //  it's failing for the lock change instead of failing in Coin#combineInto
        it('fails properly', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .load(otherCoin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 3, [ref(1)])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
          } catch (e) {
            expect(e).to.be.instanceof(PermissionError)
            const error = e as PermissionError
            expect(error.message).to.eql('lock cannot be changed')
            return
          }
          expect.fail('test should have failed')
        })

        it('does not modify the state of the coins involved', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .load(otherCoin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 3, [ref(1)])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
          } catch (e) {
            expect(storage.getTransaction(tx.id)).to.eql(undefined)
            return
          }
          expect.fail('test should have failed')
        })

      })

      describe('like when passed amount overflows the number type', () => {
        const maxU32Amount = 4294967295
        beforeEach(() => {
          coin = vm.mint(userAddr, maxU32Amount)
          otherCoin = vm.mint(otherUserAddr, 200)
        })

        it('fails properly', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .load(otherCoin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 3, [ref(1)])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
          } catch (e) {
            expect(e).to.be.instanceof(ExecutionError)
            const error = e as ExecutionError
            expect(error.message).to.eql('Overflow error')
            return
          }
          expect.fail('test should have failed')
        })

        it('does not modify the state of the coins involved', async () => {
          const tx = new TxBuilder()
            .load(coin.id())
            .load(otherCoin.id())
            .sign(userPriv)
            .fund(0)
            .call(0, 3, [ref(1)])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
          } catch (e) {
            expect(storage.getTransaction(tx.id)).to.eql(undefined)
            return
          }
          expect.fail('test should have failed')
        })

      })
    })
  })

})

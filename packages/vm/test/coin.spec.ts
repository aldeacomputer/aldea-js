import {Storage, StubClock, VM} from '../src/index.js'
import {expect} from 'chai'
import {TxBuilder} from "./tx-builder.js";
import {LockType} from "../src/wasm-instance.js";
import {JigState} from "../src/jig-state.js";
import {ExecutionError, PermissionError} from "../src/errors.js";
import {PrivKey, ref, Tx} from "@aldea/sdk-js";
import {ExecutionResult} from "../src/execution-result.js";
import moment from "moment";
import {compile} from "@aldea/compiler";

describe('Coin', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  const otherUserPriv = PrivKey.fromRandom()
  const otherUserPub = otherUserPriv.toPubKey()
  const otherUserAddr = otherUserPub.toAddress()

  let coin: JigState

  beforeEach(() => {
    storage = new Storage()
    const clock = new StubClock(moment())
    vm = new VM(storage, storage, clock, compile)
  })


  describe('#send', () => {
    let sentAmount: number
    let originalAmount: number
    const sendMethodIndex = 1

    const testSubject = async () : Promise<ExecutionResult> => {
      const tx = new TxBuilder()
        .load(coin.id())
        .sign(userPriv)
        .call(0, sendMethodIndex, [sentAmount, otherUserAddr.hash])
        .lock(2, userAddr)
        .fund(0)
        .build()

      return await vm.execTx(tx)
    }

    describe('on successful scenarios', () => {

      beforeEach(() => {
        originalAmount = 1000
        sentAmount = 200
        coin = vm.mint(userAddr, originalAmount)
      })


      it('creates a new coin for the receiver with the indicated motos amount', async () => {
        const execution = await testSubject()
        const newCoinOutputIndex = 1
        const newCoinOutput = execution.outputs[newCoinOutputIndex]

        const newCoinAmount = newCoinOutput.parsedState()[0]
        expect(newCoinAmount).to.eql(sentAmount)
      })

      it('reduces the motos amount in the original coin and freezes it', async () => {
        const execution = await testSubject()

        const originalCoinIndex = 0
        const originalCoinOutput = execution.outputs[originalCoinIndex]

        const originalCoinAmount = originalCoinOutput.parsedState()[0]
        expect(originalCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)
        expect(originalCoinAmount).to.eql(originalAmount - sentAmount)
      })

    })

    describe('on unsuccessful scenarios', () => {

      describe('like when the indicated motos amount is greater than the available motos amount of the coin', () => {

        beforeEach(() => {
          sentAmount = 2000
          originalAmount = 1000
          coin = vm.mint(userAddr, originalAmount)
        })

        it('fails properly', async () => {
          try {
            await testSubject()
          } catch (e) {
            expect(e).to.be.instanceof(ExecutionError)
            const error = e as ExecutionError
            expect(error.message).to.eql('not enough coins')
            return
          }
          expect.fail('test should have failed')
        })

        it('does not change the state of any of the involved coins', async () => {
          let execution
          try {
            execution = await testSubject()
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

  describe('#combine', () => {
    let coin: JigState
    let otherCoin: JigState
    let yetAnotherCoin: JigState
    let originalAmount: number
    let otherCoinAmount: number
    let yetAnotherCoinAmount: number
    const mergeMethodIndex = 2
    let tx: Tx

    beforeEach(() => {
      originalAmount = 1000
      otherCoinAmount = 200
      yetAnotherCoinAmount = 500
      coin = vm.mint(userAddr, originalAmount)
      otherCoin = vm.mint(userAddr, otherCoinAmount)
      yetAnotherCoin = vm.mint(userAddr, yetAnotherCoinAmount)
    })

    const testSubject = async () : Promise<ExecutionResult> => {
      tx = new TxBuilder()
        .load(coin.id())
        .load(otherCoin.id())
        .load(yetAnotherCoin.id())
        .sign(userPriv)
        .call(0, mergeMethodIndex, [[ref(1), ref(2)]])
        .fund(0)
        .build()

      return await vm.execTx(tx)
    }

    describe('on successful scenarios', () => {

      it('adds the motos amount of the coins passed by parameter to the current coin', async () => {
        const execution = await testSubject()

        const originalCoinOutputIndex = 0
        const originalCoinOutput = execution.outputs[originalCoinOutputIndex]

        const originalCoinAmount = originalCoinOutput.parsedState()[0]
        expect(originalCoinAmount).to.eql(originalAmount + otherCoinAmount + yetAnotherCoinAmount)
      })

      it('destroys the passed coins after the operation', async () => {
        const execution = await testSubject()

        const otherCoinOutputIndex = 1
        const otherCoinOutput = execution.outputs[otherCoinOutputIndex]
        expect(otherCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)

        const yetAnotherCoinOutputIndex = 2
        const yetAnotherCoinOutput = execution.outputs[yetAnotherCoinOutputIndex]
        expect(yetAnotherCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)
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

        const testSubject = async () : Promise<ExecutionResult> => {
          tx = new TxBuilder()
            .load(coin.id())
            .load(otherCoin.id())
            .sign(userPriv)
            .call(0, mergeMethodIndex, [[ref(1)]])
            .fund(0)
            .build()

          return await vm.execTx(tx)
        }

        // TODO: This is kinda failing for the right reason, but not in the correct spot:
        //  it's failing for the lock change instead of failing in Coin#combineInto
        it('fails properly', async () => {
          try {
            await testSubject()
          } catch (e) {
            expect(e).to.be.instanceof(PermissionError)
            const error = e as PermissionError
            expect(error.message).to.match(/jig .* is not allowed to exec "combineInto" called from .*/)
            return
          }
          expect.fail('test should have failed')
        })

        it('does not modify the state of the coins involved', async () => {
          try {
            await testSubject()
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

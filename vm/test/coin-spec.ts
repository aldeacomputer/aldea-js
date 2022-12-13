import {Storage, VM} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxBuilder} from "./tx-builder.js";
import {LockType} from "../vm/wasm-instance.js";
import {JigState} from "../vm/jig-state.js";
import {ExecutionError} from "../vm/errors.js";
import {TxExecution} from "../vm/tx-execution.js";
import {Tx} from "@aldea/sdk-js";

describe('Coin', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

  const otherUserPriv = AldeaCrypto.randomPrivateKey()
  const otherUserPub = AldeaCrypto.publicKeyFromPrivateKey(otherUserPriv)
  const otherUserAddr = userPub.toAddress()

  const fundCost = 100

  let coin: JigState

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)
  })


  describe('#send', () => {
    let sentAmount: number
    let originalAmount: number

    beforeEach(() => {
      coin = vm.mint(userAddr, originalAmount)
    })

    describe('on successful scenarios', () => {

      beforeEach(() => {
        originalAmount = 1000
        sentAmount = 200
      })

      it('creates a new coin for the receiver with the indicated amount', async () => {
        const tx = new TxBuilder()
          .loadByRef(coin.digest())
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
          .loadByRef(coin.digest())
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
        })

        it('freezes the original coin', async () => {
          const tx = new TxBuilder()
            .loadByRef(coin.digest())
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
        })

        it('fails properly', async () => {
          const tx = new TxBuilder()
            .loadByRef(coin.digest())
            .sign(userPriv)
            .fund(0)
            .call(0, 2, [sentAmount, otherUserAddr.hash])
            .lock(0, userAddr)
            .build()

          try {
            await vm.execTx(tx)
            expect.fail('test should have failed')
          } catch (e) {
            expect(e).to.be.instanceof(ExecutionError)
            const error = e as ExecutionError
            expect(error.message).to.eql('not enough coins')
            return
          }
        })

        it('does not change the state of any of the involved coins', async () => {
          const tx = new TxBuilder()
            .loadByRef(coin.digest())
            .sign(userPriv)
            .fund(0)
            .call(0, 2, [sentAmount, otherUserAddr.hash])
            .lock(0, userAddr)
            .build()

          let execution
          try {
            execution = await vm.execTx(tx)
            expect.fail('test should have failed')
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
          }

        })

      })
    })
  })

  describe('#merge', () => {
    let coin: JigState
    let otherCoin: JigState
    let originalAmount: number
    let otherCoinAmount: number
    let exec: TxExecution

    beforeEach(() => {
      const tx = new TxBuilder()
        .sign(userPriv)
        .build()
      exec = new TxExecution(tx, vm)
      exec.markAsFunded()

      originalAmount = 1000
      otherCoinAmount = 200
      coin = vm.mint(userAddr, originalAmount)
      otherCoin = vm.mint(userAddr, otherCoinAmount)
    })

    describe('on successful scenarios', () => {
      beforeEach(() => {

      })

      it('adds the amount of the coin passed by parameter to the current coin', async () => {
        const coinIndex = exec.loadJigByRef(coin.digest(), false)
        const otherCoinIndex = exec.loadJigByRef(otherCoin.digest(), false)
        const otherCoinRef = exec.getStatementResult(otherCoinIndex).asJig()
        exec.callInstanceMethodByIndex(coinIndex, 'merge', [otherCoinRef])
        exec.lockJigToUser(coinIndex, userAddr)
        exec.finalize()

        const originalCoinOutputIndex = 0
        const originalCoinOutput = exec.outputs[originalCoinOutputIndex]

        const originalCoinAmount = originalCoinOutput.parsedState()[0]
        expect(originalCoinAmount).to.eql(originalAmount + otherCoinAmount)
      })

      it('destroys the passed coin after the operation', async () => {
        const coinIndex = exec.loadJigByRef(coin.digest(), false)
        const otherCoinIndex = exec.loadJigByRef(otherCoin.digest(), false)
        const otherCoinRef = exec.getStatementResult(otherCoinIndex).asJig()
        exec.callInstanceMethodByIndex(coinIndex, 'merge', [otherCoinRef])
        exec.lockJigToUser(coinIndex, userAddr)
        exec.finalize()

        const otherCoinOutputIndex = 1
        const otherCoinOutput = exec.outputs[otherCoinOutputIndex]
        expect(otherCoinOutput.serializedLock.type).to.eql(LockType.FROZEN)
      })
    })

    describe('on unsuccessful scenarios', () => {

      describe('like when the coins are from different owners', () => {

        it('fails properly', async () => {

        })

        it('does not modify the state of the coins involved', async () => {

        })

      })

      describe('like when passed amount overflows the number type', () => {

        it('fails properly', async () => {

        })

        it('does not modify the state of the coins involved', async () => {

        })

      })
    })
  })

})

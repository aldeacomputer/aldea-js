import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/instructions/new-instruction.js'
import { CallInstruction } from '../vm/instructions/call-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LoadInstruction } from '../vm/instructions/load-instruction.js'
import { LiteralArg } from '../vm/literal-arg.js'
import { JigArg } from '../vm/jig-arg.js'

const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })

describe('execute txs', () => {
    let storage
    beforeEach(() => {
        storage = new Storage()
    })
    it('can create a sword and call a method', async () => {
        const tx = new Transaction('tx1')
        tx.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('excalibur')]))
        tx.add(new CallInstruction(0, 'sharp', []))

        const vm = new VM(storage)
        await vm.execTx(tx)
        const parsed = parse(storage.getJigState('tx1_0').stateBuf)
        expect(parsed.get(0)).to.eql('excalibur')
        expect(parsed.get(1)).to.eql(2)
    })

    it('can persist state of the sword', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('excalibur')]))
        tx1.add(new CallInstruction(0, 'sharp', []))

        const tx2 = new Transaction('tx1')
        tx2.add(new LoadInstruction('tx1_0'))
        tx2.add(new CallInstruction(0, 'sharp', []))

        const vm = new VM(storage)
        await vm.execTx(tx1)
        await vm.execTx(tx2)
        const parsed = parse(storage.getJigState('tx1_0').stateBuf)
        expect(parsed.get(0)).to.eql('excalibur')
        expect(parsed.get(1)).to.eql(3)
    })

    it('can create a fighter', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Eduardo')]))

        const vm = new VM(storage)
        await vm.execTx(tx1)
        const parsed = parse(storage.getJigState('tx1_0').stateBuf)
        expect(parsed.get(0)).to.eql('Eduardo')
    })

    it('a frighter fresly made stores null in its sword state', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Eduardo')]))

        const vm = new VM(storage)
        await vm.execTx(tx1)
        const parsed = parse(storage.getJigState('tx1_0').stateBuf)
        expect(parsed.get(2)).to.eql(null)
    })

    it('can equip a sword into a fighter', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('Masamune')]))
        tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Goro')]))

        const tx2 = new Transaction('tx2')
        tx2.add(new LoadInstruction('tx1_0'))
        tx2.add(new LoadInstruction('tx1_1'))
        tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))


        const vm = new VM(storage)
        await vm.execTx(tx1)
        await vm.execTx(tx2)
        const parsed2 = parse(storage.getJigState('tx2_1').stateBuf)
        expect(parsed2.get(2)).to.eql('tx1_0')
    })

    it ('can equip a sword into a fighter and then the fighter can be bring back into context with right attributes', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('Masamune')]))
        tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Goro')]))

        const tx2 = new Transaction('tx2')
        tx2.add(new LoadInstruction('tx1_0'))
        tx2.add(new LoadInstruction('tx1_1'))
        tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))


        const tx3 = new Transaction('tx3')
        tx3.add(new LoadInstruction('tx2_1'))
        tx3.add(new CallInstruction(0, 'sharpSword', []))


        const vm = new VM(storage)
        await vm.execTx(tx1)
        await vm.execTx(tx2)
        await vm.execTx(tx3)

        const parsedFighter = parse(storage.getJigState('tx3_0').stateBuf)
        expect(parsedFighter.get(1)).to.eql(99)
        expect(parsedFighter.get(2)).to.eql('tx1_0')

        const parsedSword = parse(storage.getJigState('tx3_1').stateBuf)
        expect(parsedSword.get(1)).to.eql(2)
    })

    it ('a fighter can attack another fighter', async () => {
        const tx1 = new Transaction('tx1')
        tx1.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('Masamune')]))
        tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Goro')]))

        const tx2 = new Transaction('tx2')
        tx2.add(new LoadInstruction('tx1_0'))
        tx2.add(new LoadInstruction('tx1_1'))
        tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))


        const tx3 = new Transaction('tx3')
        tx3.add(new LoadInstruction('tx2_1'))
        tx3.add(new CallInstruction(0, 'sharpSword', []))

        const tx4 = new Transaction('tx4')
        tx4.add(new LoadInstruction('tx3_0'))
        tx4.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Target')]))
        tx4.add(new CallInstruction(0, 'attack', [new JigArg(1)]))


        const vm = new VM(storage)
        await vm.execTx(tx1)
        await vm.execTx(tx2)
        await vm.execTx(tx3)
        const parsedSword = parse(storage.getJigState('tx3_1').stateBuf)
        expect(parsedSword.get(1)).to.eql(2)
        await vm.execTx(tx4)

        const parsedFighter = parse(storage.getJigState('tx4_1').stateBuf)
        expect(parsedFighter.get(1)).to.eql(97)
        expect(parsedFighter.get(2)).to.eql(null)
    })

    it.skip('40000 txs', async () => {
        let i = 10000
        while (i--) {
            const tx1 = new Transaction('tx1')
            tx1.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('Masamune')]))
            tx1.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Goro')]))

            const tx2 = new Transaction('tx2')
            tx2.add(new LoadInstruction('tx1_0'))
            tx2.add(new LoadInstruction('tx1_1'))
            tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))


            const tx3 = new Transaction('tx3')
            tx3.add(new LoadInstruction('tx2_1'))
            tx3.add(new CallInstruction(0, 'sharpSword', []))

            const tx4 = new Transaction('tx4')
            tx4.add(new LoadInstruction('tx3_0'))
            tx4.add(new NewInstruction('v1/fighter.wasm', [new LiteralArg('Target')]))
            tx4.add(new CallInstruction(0, 'attack', [new JigArg(1)]))


            const vm = new VM(storage)
            await vm.execTx(tx1)
            await vm.execTx(tx2)
            await vm.execTx(tx3)
            const parsedSword = parse(storage.getJigState('tx3_1').stateBuf)
            expect(parsedSword.get(1)).to.eql(2)
            await vm.execTx(tx4)

            const parsedFighter = parse(storage.getJigState('tx4_1').stateBuf)
            expect(parsedFighter.get(1)).to.eql(97)
            expect(parsedFighter.get(2)).to.eql(null)
        }
    })
})

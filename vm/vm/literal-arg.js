export class LiteralArg {
    constructor (literal) {
        this.literaL = literal
    }

    get (_context) {
        return this.literaL
    }
}
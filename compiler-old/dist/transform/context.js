import { Parser, } from 'assemblyscript';
import { ClassNode } from './nodes.js';
/**
 * Transform context
 */
export class TransformCtx {
    constructor(parser) {
        this.parser = parser;
        this.src = findUserSource(this.parser.sources);
        this.classNodes = collectClassNodes(this.src.statements, this);
    }
    get abstractClasses() {
        return this.classNodes.filter(n => n.isAbstract);
    }
    get complexClasses() {
        return this.classNodes.filter(n => n.isComplex);
    }
    get jigClasses() {
        return this.classNodes.filter(n => n.isJig);
    }
    get externalClasses() {
        return this.classNodes.filter(n => n.isExternal);
    }
    parse(code) {
        const parser = new Parser(this.parser.diagnostics);
        parser.parseFile(code, this.src.normalizedPath, true);
        return parser.sources[0];
    }
}
/**
 * Helpers
 */
// Find and return the user entry source
function findUserSource(sources) {
    const userSrc = sources.filter(s => {
        return s.sourceKind === 1 /* SourceKind.USER_ENTRY */ && /^(?!~lib).+/.test(s.internalPath);
    });
    if (!userSrc.length) {
        throw new Error('user entry not found');
    }
    if (userSrc.length > 1) {
        throw new Error('more than 1 user entry');
    }
    return userSrc[0];
}
// Collect all classes declared in the statement nodes
function collectClassNodes(nodes, ctx) {
    return nodes
        .filter(n => n.kind === 51 /* NodeKind.CLASSDECLARATION */)
        .map((n) => new ClassNode(n, ctx));
}

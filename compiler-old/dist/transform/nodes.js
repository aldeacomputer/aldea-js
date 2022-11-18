import { DecoratorKind, } from 'assemblyscript';
/**
 * Base node class
 */
export class BaseNode {
    constructor(node) {
        this.node = node;
        this.decorators = collectDecorators(node.decorators || []);
    }
    get isAmbiant() {
        return (this.node.flags & 32768 /* CommonFlags.AMBIENT */) === 32768 /* CommonFlags.AMBIENT */;
    }
    get isExported() {
        return (this.node.flags & 2 /* CommonFlags.EXPORT */) === 2 /* CommonFlags.EXPORT */;
    }
    get isPrivate() {
        return (this.node.flags & 512 /* CommonFlags.PRIVATE */) === 512 /* CommonFlags.PRIVATE */;
    }
    get isProtected() {
        return (this.node.flags & 1024 /* CommonFlags.PROTECTED */) === 1024 /* CommonFlags.PROTECTED */;
    }
}
/**
 * Class node
 */
export class ClassNode extends BaseNode {
    constructor(node, ctx) {
        super(node);
        this.ctx = ctx;
        this.name = node.name.text;
        this.iName = `$${node.name.text.toLowerCase()}`;
        this.fields = collectFields(node.members);
        this.methods = collectMethods(node.members);
    }
    get isAbstract() {
        return this.isAmbiant && !this.isExternal;
    }
    get isExternal() {
        return this.isAmbiant && this.decorators.some(d => d.name === 'jig');
    }
    get isComplex() {
        return !this.isAmbiant;
    }
    get isJig() {
        return this.isComplex && this.isExported;
    }
    get isSidekick() {
        return this.isComplex && !this.isExported;
    }
}
/**
 * Field node - can represent a instance property OR a method argument
 */
export class FieldNode extends BaseNode {
    constructor(node) {
        super(node);
        this.name = node.name.text;
        this.type = typeFromNode(node.type);
    }
}
/**
 * Method node - a class constructor, static, or instance method
 */
export class MethodNode extends BaseNode {
    constructor(node) {
        super(node);
        this.name = node.name.text;
        this.args = node.signature.parameters.map((n) => new FieldNode(n));
        this.rType = typeFromNode(node.signature.returnType);
    }
    get isConstructor() {
        return (this.node.flags & 524288 /* CommonFlags.CONSTRUCTOR */) === 524288 /* CommonFlags.CONSTRUCTOR */;
    }
    get isStatic() {
        return (this.node.flags & 32 /* CommonFlags.STATIC */) === 32 /* CommonFlags.STATIC */;
    }
}
/**
 * Helpers
 */
// Maps all AS Custom DecoratorNodes as simple Decorator types
function collectDecorators(nodes) {
    return nodes
        .filter(n => n.decoratorKind === DecoratorKind.CUSTOM)
        .map((n) => decoratorFromNode(n));
}
// Maps a single AS DecoratorNode to a simple Decorator type
function decoratorFromNode(node) {
    const name = node.name.text;
    const args = (node.args || [])
        .filter(a => a.kind === 16 /* NodeKind.LITERAL */)
        .filter(a => a.literalKind === 2 /* LiteralKind.STRING */)
        .map((a) => a.value);
    return { name, args };
}
// Collect all properties declared in the statement nodes
function collectFields(nodes) {
    return nodes
        .filter(n => n.kind === 54 /* NodeKind.FIELDDECLARATION */)
        .map((n) => new FieldNode(n));
}
// Collect all methods declared in the statement nodes
function collectMethods(nodes) {
    return nodes
        .filter(n => n.kind === 58 /* NodeKind.METHODDECLARATION */)
        .map((n) => new MethodNode(n));
}
// Maps a single AS NamedTypeNode to a simple Type type
function typeFromNode(node) {
    return {
        name: node.name.identifier.text,
        args: node.typeArguments?.map(n => typeFromNode(n))
    };
}

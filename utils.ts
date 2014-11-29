/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />

class Signal<T> {
    private handlers:{ (value?:T): void; }[] = [];

    add(handler:(value?:T) => void) {
        this.handlers.push(handler);
        return handler;
    }

    remove(handler:(value?:T) => void) {
        this.handlers = _.without(this.handlers, handler);
    }

    dispatch(value?:T) {
        this.handlers.forEach((handler) => {
            handler(value)
        });
    }
}

interface Encoding {
    decode(values:number[]):string;
    encode(data:string):Uint8Array;
}

declare class TextDecoder {
    constructor(name:string);
    decode(data:Uint8Array):string;
}

declare class TextEncoder {
    constructor(name:string);
    encode(data:string):Uint8Array;
}

class TextDecoderEncoding implements Encoding {
    constructor(private id:string) {
    }

    encode(data:string):Uint8Array {
        return new TextEncoder(this.id).encode(data);
    }

    decode(array:number[]) {
        return new TextDecoder(this.id).decode(new Uint8Array(array));
    }
}

class CType {
    static isPrint(value:Number) {
        if (value < 32) return false;
        if (value >= 0x7F && value <= 0xA0) return false;
        if (value == 0x2028) return false;
        if (value == 0x2029) return false;
        if (value == 0xFFFD) return false;
        return true;
    }

    static ensurePrintable(str:string) {
        return str.split('').map(char => CType.isPrint(char.charCodeAt(0)) ? char : '.').join('');
        //return String.fromCharCode.apply(null, str.split('').map(v => (v.charCodeAt(0) < 32) ? v : '.'));
        //return str;
    }
}

class HexImage {
    constructor(public data:ArrayBuffer) {
    }

    toHtml() {
        var blob = new Blob([this.data], {type: 'application/octet-binary'}); // pass a useful mime type here
        var url = URL.createObjectURL(blob);
        return '<span class="hexrgbsample" style="background-image:url(' + url + ');"></span>';
    }
}

class HexRgb {
    constructor(public red:number, public green:number, public blue:number) {
    }

    toHtml() {
        return '<span class="hexrgbsample" style="background:rgba(' + this.red + ', ' + this.green + ', ' + this.blue + ', 1.0);"></span> RGB(' + this.red + ', ' + this.green + ', ' + this.blue + ')';
    }
}

interface NumberDictionary<T> {
    [name: number]: T;
}

interface StringDictionary<T> {
    [name: string]: T;
}

function download(url:string, done: (data: Uint8Array) => void) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
        done(new Uint8Array(this.response));
    };

    xhr.send();
}

function unsigned_mod(value: number, count:number) {
    value %= 32;
    if (value < 0) value += count;
    return value;
}

function ror32(value: number, count:number) {
    count = unsigned_mod(count, 32);
    return value >>> count | value << (32 - count);
}
function ror16(value: number, count:number) {
    count = unsigned_mod(count, 16);
    return ((value >>> count) & 0xFFFF) | ((value << (16 - count)) & 0xFFFF);
}
function ror8(value: number, count:number) {
    count = unsigned_mod(count, 8);
    return ((value >>> count) & 0xFF) | ((value << (8 - count)) & 0xFF);
}

function htmlspecialchars(s:string) {
    s = String(s);
    return s.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function waitAsync(time:number) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time);
    });
}

function strpad_left(value:string, char:string, count:number) {
    return (Array(count).join(char) + value).slice(-count);
}

function strpad_right(value:string, char:string, count:number) {
    return (value + Array(count).join(char)).slice(count);
}


class MathUtils {
    static ceilMultiple(value:number, multiple:number) { return Math.ceil(value / multiple) * multiple; }
    static floorMultiple(value:number, multiple:number) { return Math.floor(value / multiple) * multiple; }
}

class BitUtils {
    static extract(value:number, offset:number, count:number) { return (value >>> offset) & this.mask(count); }
    static mask(count:number) { return (1 << count) - 1; }
}

class HuffmanNode {
    get isLeaf() { return this.len != 0; }
    constructor(public value:number, public len:number, public left:HuffmanNode, public right:HuffmanNode) { }
    static leaf(value:number, len:number) { return new HuffmanNode(value, len, null, null); }
    static internal(left:HuffmanNode, right:HuffmanNode) { return new HuffmanNode(-1, 0, left, right); }
}

interface BitReader {
    readBits(count:number):number;
}

class HuffmanTree {
    constructor(public root:HuffmanNode, public symbolLimit:number) {
    }

    readOne(reader:BitReader) {
        //console.log('-------------');
        var node = this.root;
        var bitcount = 0;
        var bitcode = 0;
        do {
            var bbit = reader.readBits(1);
            var bit = (bbit != 0);
            bitcode |= bbit << bitcount;
            bitcount++;
            //console.log('bit', bit);
            node = bit ? node.right : node.left;
            //console.info(node);
        } while (node && node.len == 0);
        if (!node) throw new Error("NODE = NULL");
        return {value: node.value, bitcode: bitcode, bitcount: bitcount};
    }

    static fromLengths(codeLengths:number[]) {
        var nodes:HuffmanNode[] = [];
        for (var i = Math.max.apply(null, codeLengths); i >= 1; i--) {  // Descend through positive code lengths
            var newNodes:HuffmanNode[] = [];

            // Add leaves for symbols with code length i
            for (var j = 0; j < codeLengths.length; j++) {
                if (codeLengths[j] == i) newNodes.push(HuffmanNode.leaf(j, i));
            }

            // Merge nodes from the previous deeper layer
            for (var j = 0; j < nodes.length; j += 2)
                newNodes.push(HuffmanNode.internal(nodes[j], nodes[j + 1]));

            nodes = newNodes;
            if (nodes.length % 2 != 0) {
                throw new Error("This canonical code does not represent a Huffman code tree");
            }
        }

        if (nodes.length != 2) {
            throw new Error("This canonical code does not represent a Huffman code tree");
        }

        return new HuffmanTree(HuffmanNode.internal(nodes[0], nodes[1]), codeLengths.length);

    }
}

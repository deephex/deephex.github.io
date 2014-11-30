/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
var Signal = (function () {
    function Signal() {
        this.handlers = [];
    }
    Signal.prototype.add = function (handler) {
        this.handlers.push(handler);
        return handler;
    };
    Signal.prototype.remove = function (handler) {
        this.handlers = _.without(this.handlers, handler);
    };
    Signal.prototype.dispatch = function (value) {
        this.handlers.forEach(function (handler) {
            handler(value);
        });
    };
    return Signal;
})();
var TextDecoderEncoding = (function () {
    function TextDecoderEncoding(id) {
        this.id = id;
    }
    TextDecoderEncoding.prototype.encode = function (data) {
        return new TextEncoder(this.id).encode(data);
    };
    TextDecoderEncoding.prototype.decode = function (array) {
        return new TextDecoder(this.id).decode(new Uint8Array(array));
    };
    return TextDecoderEncoding;
})();
var CType = (function () {
    function CType() {
    }
    CType.isPrint = function (value) {
        if (value < 32)
            return false;
        if (value >= 0x7F && value <= 0xA0)
            return false;
        if (value >= 0xAD)
            return false;
        if (value == 0x2028)
            return false;
        if (value == 0x2029)
            return false;
        if (value == 0xFFFD)
            return false;
        return true;
    };
    CType.ensurePrintable = function (str) {
        return str.split('').map(function (char) { return CType.isPrint(char.charCodeAt(0)) ? char : '.'; }).join('');
        //return String.fromCharCode.apply(null, str.split('').map(v => (v.charCodeAt(0) < 32) ? v : '.'));
        //return str;
    };
    return CType;
})();
var HexImage = (function () {
    function HexImage(data) {
        this.data = data;
    }
    HexImage.prototype.toHtml = function () {
        var blob = new Blob([this.data], { type: 'application/octet-binary' }); // pass a useful mime type here
        var url = URL.createObjectURL(blob);
        return '<span class="hexrgbsample" style="background-image:url(' + url + ');"></span>';
    };
    return HexImage;
})();
var HexRgb = (function () {
    function HexRgb(red, green, blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    HexRgb.prototype.toHtml = function () {
        return '<span class="hexrgbsample" style="background:rgba(' + this.red + ', ' + this.green + ', ' + this.blue + ', 1.0);"></span> RGB(' + this.red + ', ' + this.green + ', ' + this.blue + ')';
    };
    return HexRgb;
})();
function download(url, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (e) {
        done(new Uint8Array(this.response));
    };
    xhr.send();
}
function ror32(value, count) {
    count = MathUtils.modUnsigned(count, 32);
    return value >>> count | value << (32 - count);
}
function ror16(value, count) {
    count = MathUtils.modUnsigned(count, 16);
    return ((value >>> count) & 0xFFFF) | ((value << (16 - count)) & 0xFFFF);
}
function ror8(value, count) {
    count = MathUtils.modUnsigned(count, 8);
    return ((value >>> count) & 0xFF) | ((value << (8 - count)) & 0xFF);
}
function htmlspecialchars(s) {
    s = String(s);
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function waitAsync(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, time);
    });
}
function strpad_left(value, char, count) {
    return (Array(count).join(char) + value).slice(-count);
}
function strpad_right(value, char, count) {
    return (value + Array(count).join(char)).slice(count);
}
var MathUtils = (function () {
    function MathUtils() {
    }
    MathUtils.clamp = function (value, min, max) {
        return Math.min(Math.max(value, min), max);
    };
    MathUtils.ceilMultiple = function (value, multiple) {
        return Math.ceil(value / multiple) * multiple;
    };
    MathUtils.floorMultiple = function (value, multiple) {
        return Math.floor(value / multiple) * multiple;
    };
    MathUtils.modUnsigned = function (value, count) {
        value %= count;
        if (value < 0)
            value += count;
        return value;
    };
    return MathUtils;
})();
var BitUtils = (function () {
    function BitUtils() {
    }
    BitUtils.extract = function (value, offset, count) {
        return (value >>> offset) & this.mask(count);
    };
    BitUtils.mask = function (count) {
        return (1 << count) - 1;
    };
    return BitUtils;
})();
var HuffmanNode = (function () {
    function HuffmanNode(value, len, left, right) {
        this.value = value;
        this.len = len;
        this.left = left;
        this.right = right;
    }
    Object.defineProperty(HuffmanNode.prototype, "isLeaf", {
        get: function () {
            return this.len != 0;
        },
        enumerable: true,
        configurable: true
    });
    HuffmanNode.leaf = function (value, len) {
        return new HuffmanNode(value, len, null, null);
    };
    HuffmanNode.internal = function (left, right) {
        return new HuffmanNode(-1, 0, left, right);
    };
    return HuffmanNode;
})();
var ArrayBitReader = (function () {
    function ArrayBitReader(data) {
        this.data = data;
        this.offset = 0;
        this.bitdata = 0;
        this.bitsavailable = 0;
    }
    ArrayBitReader.prototype.alignbyte = function () {
        this.bitsavailable = 0;
    };
    Object.defineProperty(ArrayBitReader.prototype, "length", {
        get: function () {
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ArrayBitReader.prototype, "available", {
        get: function () {
            return this.length - this.offset;
        },
        enumerable: true,
        configurable: true
    });
    ArrayBitReader.prototype.u8 = function () {
        return this.data[this.offset++];
    };
    ArrayBitReader.prototype.u16 = function () {
        return this.u8() | (this.u8() << 8);
    };
    ArrayBitReader.prototype.readBits = function (bitcount) {
        while (bitcount > this.bitsavailable) {
            this.bitdata |= this.u8() << this.bitsavailable;
            this.bitsavailable += 8;
        }
        var readed = BitUtils.extract(this.bitdata, 0, bitcount);
        this.bitdata >>>= bitcount;
        this.bitsavailable -= bitcount;
        return readed;
    };
    return ArrayBitReader;
})();
var HuffmanTree = (function () {
    function HuffmanTree(root, symbolLimit) {
        this.root = root;
        this.symbolLimit = symbolLimit;
    }
    HuffmanTree.prototype.readOneAsync = function (reader) {
        var node = this.root;
        var bitcount = 0;
        var bitcode = 0;
        var processOneAsync = function () {
            return reader.readBitsAsync(1).then(function (bbit) {
                var bit = (bbit != 0);
                bitcode |= bbit << bitcount;
                bitcount++;
                //console.log('bit', bit);
                node = bit ? node.right : node.left;
                //console.info(node);
                if (node && node.len == 0) {
                    return processOneAsync();
                }
                else {
                    if (!node)
                        throw new Error("NODE = NULL");
                    return { value: node.value, bitcode: bitcode, bitcount: bitcount };
                }
            });
        };
        return processOneAsync();
    };
    HuffmanTree.prototype.readOne = function (reader) {
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
        } while (node && node.len == 0);
        if (!node)
            throw new Error("NODE = NULL");
        return { value: node.value, bitcode: bitcode, bitcount: bitcount };
    };
    HuffmanTree.prototype.readOneValue = function (reader) {
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
        } while (node && node.len == 0);
        if (!node)
            throw new Error("NODE = NULL");
        return node.value;
    };
    HuffmanTree.fromLengths = function (codeLengths) {
        var nodes = [];
        for (var i = Math.max.apply(null, codeLengths); i >= 1; i--) {
            var newNodes = [];
            for (var j = 0; j < codeLengths.length; j++) {
                if (codeLengths[j] == i)
                    newNodes.push(HuffmanNode.leaf(j, i));
            }
            for (var j = 0; j < nodes.length; j += 2) {
                newNodes.push(HuffmanNode.internal(nodes[j], nodes[j + 1]));
            }
            nodes = newNodes;
            if (nodes.length % 2 != 0)
                throw new Error("This canonical code does not represent a Huffman code tree");
        }
        if (nodes.length != 2)
            throw new Error("This canonical code does not represent a Huffman code tree");
        return new HuffmanTree(HuffmanNode.internal(nodes[0], nodes[1]), codeLengths.length);
    };
    return HuffmanTree;
})();
var Inflater = (function () {
    function Inflater() {
    }
    Inflater.inflateZlib = function (data) {
        return this.inflateZlibBitReader(new ArrayBitReader(data));
    };
    Inflater.inflateRaw = function (data) {
        return this.inflateRawBitReader(new ArrayBitReader(data));
    };
    Inflater.inflateZlibBitReader = function (reader) {
        var compressionMethod = reader.readBits(4);
        if (compressionMethod != 8)
            throw new Error("Invalid zlib stream");
        var windowSize = 1 << (reader.readBits(4) + 8);
        var fcheck = reader.readBits(5);
        var hasDict = reader.readBits(1);
        var flevel = reader.readBits(2);
        if (hasDict)
            throw new Error("Not implemented HAS DICT");
        this.inflateRawBitReader(reader);
    };
    Inflater.inflateRawBitReader = function (reader) {
        // https://www.ietf.org/rfc/rfc1951.txt
        if (!Inflater.fixedtree) {
            var lengths0 = new Array(287);
            for (var n = 0; n <= 143; n++)
                lengths0[n] = 8;
            for (var n = 144; n <= 255; n++)
                lengths0[n] = 9;
            for (var n = 256; n <= 279; n++)
                lengths0[n] = 7;
            for (var n = 280; n <= 287; n++)
                lengths0[n] = 8;
            Inflater.fixedtree = HuffmanTree.fromLengths(lengths0);
            Inflater.fixeddist = HuffmanTree.fromLengths(Array.apply(null, new Array(32)).map(Number.prototype.valueOf, 5));
        }
        var fixedtree = Inflater.fixedtree;
        var fixeddist = Inflater.fixeddist;
        var infos_lz = Inflater.infos_lz;
        var infos_lz2 = Inflater.infos_lz2;
        var out = [];
        var lastBlock = false;
        while (!lastBlock) {
            lastBlock = reader.readBits(1) != 0;
            var btype = reader.readBits(2);
            console.log(lastBlock);
            console.log(btype);
            switch (btype) {
                case 0:
                    reader.alignbyte();
                    var len = reader.u16();
                    var nlen = reader.u16();
                    if (len != ~nlen)
                        throw new Error("Invalid file: len != ~nlen");
                    for (var n = 0; n < len; n++)
                        out.push(reader.u8() | 0);
                    break;
                case 1:
                case 2:
                    if (btype == 1) {
                        var tree = fixedtree;
                        var dist = fixeddist;
                    }
                    else {
                        var HCLENPOS = Inflater.HCLENPOS;
                        var HLIT = reader.readBits(5) + 257; // hlit  + 257
                        var HDIST = reader.readBits(5) + 1; // hdist +   1
                        var HCLEN = reader.readBits(4) + 4; // hclen +   4
                        var codeLenCodeLen = Array.apply(null, new Array(19)).map(function (v, n) {
                            return 0;
                        });
                        for (var i = 0; i < HCLEN; i++)
                            codeLenCodeLen[HCLENPOS[i]] = reader.readBits(3);
                        //console.info(codeLenCodeLen);
                        var codeLen = HuffmanTree.fromLengths(codeLenCodeLen);
                        var lengths = Array.apply(null, new Array(HLIT + HDIST));
                        var n = 0;
                        for (; n < HLIT + HDIST;) {
                            var value = codeLen.readOneValue(reader);
                            var len = 1;
                            if (value < 16) {
                                len = 1;
                            }
                            else if (value == 16) {
                                value = lengths[n - 1];
                                len = reader.readBits(2) + 3;
                            }
                            else if (value == 17) {
                                value = 0;
                                len = reader.readBits(3) + 3;
                            }
                            else if (value == 18) {
                                value = 0;
                                len = reader.readBits(7) + 11;
                            }
                            else {
                                throw new Error("Invalid");
                            }
                            for (var c = 0; c < len; c++)
                                lengths[n++] = value;
                        }
                        tree = HuffmanTree.fromLengths(lengths.slice(0, HLIT));
                        dist = HuffmanTree.fromLengths(lengths.slice(HLIT, lengths.length));
                    }
                    var completed = false;
                    while (!completed && reader.available > 0) {
                        var value = tree.readOneValue(reader);
                        if (value < 256) {
                            console.info(value);
                            out.push(value | 0);
                        }
                        else if (value == 256) {
                            completed = true;
                        }
                        else {
                            var lengthInfo = infos_lz[value];
                            var lengthExtra = reader.readBits(lengthInfo.extra);
                            var length = lengthInfo.offset + lengthExtra;
                            var distanceData = dist.readOneValue(reader);
                            var distanceInfo = infos_lz2[distanceData];
                            var distanceExtra = reader.readBits(distanceInfo.extra);
                            var distance = distanceInfo.offset + distanceExtra;
                            for (var n = 0; n < length; n++)
                                out.push(out[out.length - distance] | 0);
                        }
                    }
                    break;
                case 3:
                    throw new Error("invalid bit");
                    break;
            }
        }
        return new Uint8Array(out);
    };
    Inflater.infos_lz = {
        257: { extra: 0, offset: 3 },
        258: { extra: 0, offset: 4 },
        259: { extra: 0, offset: 5 },
        260: { extra: 0, offset: 6 },
        261: { extra: 0, offset: 7 },
        262: { extra: 0, offset: 8 },
        263: { extra: 0, offset: 9 },
        264: { extra: 0, offset: 10 },
        265: { extra: 1, offset: 11 },
        266: { extra: 1, offset: 13 },
        267: { extra: 1, offset: 15 },
        268: { extra: 1, offset: 17 },
        269: { extra: 2, offset: 19 },
        270: { extra: 2, offset: 23 },
        271: { extra: 2, offset: 27 },
        272: { extra: 2, offset: 31 },
        273: { extra: 3, offset: 35 },
        274: { extra: 3, offset: 43 },
        275: { extra: 3, offset: 51 },
        276: { extra: 3, offset: 59 },
        277: { extra: 4, offset: 67 },
        278: { extra: 4, offset: 83 },
        279: { extra: 4, offset: 99 },
        280: { extra: 4, offset: 115 },
        281: { extra: 5, offset: 131 },
        282: { extra: 5, offset: 163 },
        283: { extra: 5, offset: 195 },
        284: { extra: 5, offset: 227 },
        285: { extra: 0, offset: 258 }
    };
    Inflater.infos_lz2 = {
        0: { extra: 0, offset: 1 },
        1: { extra: 0, offset: 2 },
        2: { extra: 0, offset: 3 },
        3: { extra: 0, offset: 4 },
        4: { extra: 1, offset: 5 },
        5: { extra: 1, offset: 7 },
        6: { extra: 2, offset: 9 },
        7: { extra: 2, offset: 13 },
        8: { extra: 3, offset: 17 },
        9: { extra: 3, offset: 25 },
        10: { extra: 4, offset: 33 },
        11: { extra: 4, offset: 49 },
        12: { extra: 5, offset: 65 },
        13: { extra: 5, offset: 97 },
        14: { extra: 6, offset: 129 },
        15: { extra: 6, offset: 193 },
        16: { extra: 7, offset: 257 },
        17: { extra: 7, offset: 385 },
        18: { extra: 8, offset: 513 },
        19: { extra: 8, offset: 769 },
        20: { extra: 9, offset: 1025 },
        21: { extra: 9, offset: 1537 },
        22: { extra: 10, offset: 2049 },
        23: { extra: 10, offset: 3073 },
        24: { extra: 11, offset: 4097 },
        25: { extra: 11, offset: 6145 },
        26: { extra: 12, offset: 8193 },
        27: { extra: 12, offset: 12289 },
        28: { extra: 13, offset: 16385 },
        29: { extra: 13, offset: 24577 }
    };
    Inflater.HCLENPOS = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    return Inflater;
})();
function async(callback) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return _spawn(callback, args);
    };
}
function spawn(generatorFunction) {
    return _spawn(generatorFunction, []);
}
function _spawn(generatorFunction, args) {
    var first = true;
    return new Promise(function (resolve, reject) {
        try {
            var iterator = generatorFunction.apply(null, args);
        }
        catch (e) {
            console.error(e);
            reject(e);
        }
        var next = function (first, sendValue, sendException) {
            try {
                var result;
                if (first) {
                    result = iterator.next();
                }
                else if (sendException) {
                    result = iterator.throw(sendException);
                }
                else {
                    result = iterator.next(sendValue);
                }
                if (result.done) {
                    return resolve(result.value);
                }
                else if (!result.value || result.value.then === undefined) {
                    console.error("Invalid result: '" + result.value + "'");
                    return reject(new Error("Invalid result: '" + result.value + "'"));
                }
                else {
                    result.value.then((function (value) { return next(false, value, undefined); }), (function (error) { return next(false, undefined, error); }));
                }
            }
            catch (e) {
                console.error(e);
                return reject(e);
            }
            return undefined;
        };
        next(true, undefined, undefined);
    });
}
//# sourceMappingURL=utils.js.map
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
    HuffmanTree.fromLengths = function (codeLengths) {
        var nodes = [];
        for (var i = Math.max.apply(null, codeLengths); i >= 1; i--) {
            var newNodes = [];
            for (var j = 0; j < codeLengths.length; j++) {
                if (codeLengths[j] == i)
                    newNodes.push(HuffmanNode.leaf(j, i));
            }
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
    };
    return HuffmanTree;
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
                    return reject(new Error("Invalid result: '" + result.value + "'"));
                }
                else {
                    result.value.then((function (value) { return next(false, value, undefined); }), (function (error) { return next(false, undefined, error); }));
                }
            }
            catch (e) {
                return reject(e);
            }
            return undefined;
        };
        next(true, undefined, undefined);
    });
}
//# sourceMappingURL=utils.js.map
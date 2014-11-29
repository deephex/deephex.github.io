///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
// http://www.gzip.org/zlib/rfc-deflate.html
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
//var tree = HuffmanTree.fromLengths([3, 3, 3, 3, 3, 2, 4, 4]);
//console.log(tree);
AnalyzerMapperPlugins.register('DEFLATE', function (m) {
    m.node.name = 'deflate';
    var lengths0 = new Array(287);
    for (var n = 0; n <= 143; n++)
        lengths0[n] = 8;
    for (var n = 144; n <= 255; n++)
        lengths0[n] = 9;
    for (var n = 256; n <= 279; n++)
        lengths0[n] = 7;
    for (var n = 280; n <= 287; n++)
        lengths0[n] = 8;
    var fixedtree = HuffmanTree.fromLengths(lengths0);
    var fixeddist = HuffmanTree.fromLengths(Array.apply(null, new Array(32)).map(Number.prototype.valueOf, 5));
    //var extrabits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var infos_lz = {
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
    var infos_lz2 = {
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
    //console.log(fixedtree.nodes);
    //m.u8('data');
    var out = [];
    var lastBlock = false;
    while (!lastBlock) {
        m.struct('chunk', function () {
            lastBlock = m.bits('bfinal', 1, BoolRepresenter) != 0;
            var btype = m.bits('btype', 2, EnumRepresenter({
                0: 'uncompressed',
                1: 'compressed_fixed',
                2: 'compressed_dynamic'
            }));
            switch (btype) {
                case 0:
                    m.alignbyte();
                    var len = m.u16('len');
                    var nlen = m.u16('negated_len');
                    if (len != ~nlen)
                        throw new Error("Invalid file: len != ~nlen");
                    m.subs('content', len);
                    break;
                case 1:
                case 2:
                    if (btype == 1) {
                        var tree = fixedtree;
                        var dist = fixeddist;
                    }
                    else {
                        throw new Error("unsupported btype=2!");
                    }
                    var completed = false;
                    while (!completed && m.available > 0) {
                        m.tvalueOffset(function () {
                            var vv = tree.readOne(m);
                            var bitcount = vv.bitcount;
                            var value = vv.value;
                            var type = 'bits[' + bitcount + ']';
                            if (value < 256) {
                                out.push(value);
                                m.tvalue('literal', type, value, CharRepresenter);
                            }
                            else if (value == 256) {
                                completed = true;
                                m.tvalue('end', type, value, CharRepresenter);
                            }
                            else {
                                m.struct('lz', function () {
                                    var lengthInfo = infos_lz[value];
                                    var lengthExtra = m.readBits(lengthInfo.extra);
                                    var length = lengthInfo.offset + lengthExtra;
                                    var distanceData = dist.readOne(m).value;
                                    var distanceInfo = infos_lz2[distanceData];
                                    var distanceExtra = m.readBits(distanceInfo.extra);
                                    var distance = distanceInfo.offset + distanceExtra;
                                    //m.tvalue('distanceData', type, distanceData);
                                    //m.tvalue('distanceInfo.extra', type, distanceInfo.extra);
                                    //m.tvalue('distanceExtraa', type, distanceExtra);
                                    var lzchunk = [];
                                    for (var n = 0; n < length; n++) {
                                        var vz = out[out.length - distance];
                                        out.push(vz);
                                        lzchunk.push(vz);
                                    }
                                    m.tvalue('length', type, length);
                                    m.tvalue('distance', type, distance);
                                    return new HexChunk(lzchunk);
                                }, false);
                            }
                        });
                    }
                    break;
                case 3:
                    throw new Error("invalid bit");
                    break;
            }
        });
    }
    m.value = new HexChunk(out);
});
//# sourceMappingURL=deflate.js.map
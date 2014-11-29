///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />

// http://www.gzip.org/zlib/rfc-deflate.html

class HuffmanNode {
    get isLeaf() {
        return this.len != 0;
    }

    constructor(public value:number, public len:number, public left:HuffmanNode, public right:HuffmanNode) {
    }

    static leaf(value:number, len:number) {
        return new HuffmanNode(value, len, null, null);
    }

    static internal(left:HuffmanNode, right:HuffmanNode) {
        return new HuffmanNode(-1, 0, left, right);
    }
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

    /*
     static fromLengths(codeLengths:number[]) {
     var MAX_BITS = 15;
     //var max_code = 288;
     var max_code = codeLengths.length;
     var bl_count = new Int32Array(MAX_BITS);
     var next_code = new Int32Array(MAX_BITS);
     var tree:HuffmanNode[] = new Array(max_code + 1);
     tree[max_code] = new HuffmanNode(max_code, 0);
     for (var n = 0; n < max_code; n++) tree[n] = new HuffmanNode(n, codeLengths[n]);

     // 1) Count the number of codes for each code length. Let bl_count[N] be the number of codes of length N, N >= 1.
     codeLengths.forEach(length => {
     bl_count[length]++;
     });

     // 2) Find the numerical value of the smallest code for each code length
     var code = 0;
     bl_count[0] = 0;
     for (var bits = 1; bits <= MAX_BITS; bits++) {
     code = (code + bl_count[bits - 1]) << 1;
     next_code[bits] = code;
     }

     // 3) Assign numerical values to all codes, using consecutive values for all codes of the same length with the base values determined at step 2. Codes that are never used (which have a bit length of zero) must not be assigned a value.
     for (var n = 0; n <= max_code; n++) {
     var len = tree[n].len;
     if (len != 0) {
     tree[n].code = next_code[len];
     next_code[len]++;
     }
     }
     console.info(tree.map(i => i.code));

     // 4) Construct tree
     var root = new HuffmanNode(-1, 0);
     for (var n = 0; n <= max_code; n++) {
     var currentnode = tree[n];
     var len = currentnode.len;
     if (len > 0) {
     var node = root;
     var code = currentnode.code;
     for (; len > 1; code >>= 1, len--) {
     if ((code & 1) != 0) {
     if (!node.right) node.right = new HuffmanNode(-1, 0);
     node = node.right;
     } else {
     if (!node.left) node.left = new HuffmanNode(-1, 0);
     node = node.left;
     }
     }
     if ((code & 1) != 0) {
     node.right = currentnode;
     } else {
     node.left = currentnode;
     }
     }
     }

     //console.log(tree);
     //console.log(root);

     return new HuffmanTree(root, tree);
     }
     */
}

//var tree = HuffmanTree.fromLengths([3, 3, 3, 3, 3, 2, 4, 4]);
//console.log(tree);

AnalyzerMapperPlugins.register('DEFLATE', (m:AnalyzerMapper) => {
    m.node.name = 'deflate';
    var lengths0 = new Array(287);
    for (var n = 0; n <= 143; n++) lengths0[n] = 8;
    for (var n = 144; n <= 255; n++) lengths0[n] = 9;
    for (var n = 256; n <= 279; n++) lengths0[n] = 7;
    for (var n = 280; n <= 287; n++) lengths0[n] = 8;
    var fixedtree = HuffmanTree.fromLengths(lengths0);
    var fixeddist = HuffmanTree.fromLengths(Array.apply(null, new Array(32)).map(Number.prototype.valueOf, 5));


    //var extrabits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var infos_lz = {
        257: {extra: 0, offset: 3},
        258: {extra: 0, offset: 4},
        259: {extra: 0, offset: 5},
        260: {extra: 0, offset: 6},
        261: {extra: 0, offset: 7},
        262: {extra: 0, offset: 8},
        263: {extra: 0, offset: 9},
        264: {extra: 0, offset: 10},
        265: {extra: 1, offset: 11},
        266: {extra: 1, offset: 13},
        267: {extra: 1, offset: 15},
        268: {extra: 1, offset: 17},
        269: {extra: 2, offset: 19},
        270: {extra: 2, offset: 23},
        271: {extra: 2, offset: 27},
        272: {extra: 2, offset: 31},
        273: {extra: 3, offset: 35},
        274: {extra: 3, offset: 43},
        275: {extra: 3, offset: 51},
        276: {extra: 3, offset: 59},
        277: {extra: 4, offset: 67},
        278: {extra: 4, offset: 83},
        279: {extra: 4, offset: 99},
        280: {extra: 4, offset: 115},
        281: {extra: 5, offset: 131},
        282: {extra: 5, offset: 163},
        283: {extra: 5, offset: 195},
        284: {extra: 5, offset: 227},
        285: {extra: 0, offset: 258}
    };
    var infos_lz2 = {
        0: {extra: 0, offset: 1},
        1: {extra: 0, offset: 2},
        2: {extra: 0, offset: 3},
        3: {extra: 0, offset: 4},
        4: {extra: 1, offset: 5},
        5: {extra: 1, offset: 7},
        6: {extra: 2, offset: 9},
        7: {extra: 2, offset: 13},
        8: {extra: 3, offset: 17},
        9: {extra: 3, offset: 25},
        10: {extra: 4, offset: 33},
        11: {extra: 4, offset: 49},
        12: {extra: 5, offset: 65},
        13: {extra: 5, offset: 97},
        14: {extra: 6, offset: 129},
        15: {extra: 6, offset: 193},
        16: {extra: 7, offset: 257},
        17: {extra: 7, offset: 385},
        18: {extra: 8, offset: 513},
        19: {extra: 8, offset: 769},
        20: {extra: 9, offset: 1025},
        21: {extra: 9, offset: 1537},
        22: {extra: 10, offset: 2049},
        23: {extra: 10, offset: 3073},
        24: {extra: 11, offset: 4097},
        25: {extra: 11, offset: 6145},
        26: {extra: 12, offset: 8193},
        27: {extra: 12, offset: 12289},
        28: {extra: 13, offset: 16385},
        29: {extra: 13, offset: 24577}
    };

    //console.log(fixedtree.nodes);

    //m.u8('data');
    var out = [];
    var lastBlock = false;

    while (!lastBlock) {
        m.struct('chunk', () => {
            lastBlock = m.bits('bfinal', 1, BoolRepresenter) != 0;
            var btype = m.bits('btype', 2, EnumRepresenter({
                0: 'uncompressed',
                1: 'compressed_fixed',
                2: 'compressed_dynamic'
            }));
            switch (btype) {
                case 0: // uncompressed
                    m.alignbyte();
                    var len = m.u16('len');
                    var nlen = m.u16('negated_len');
                    if (len != ~nlen) throw new Error("Invalid file: len != ~nlen");
                    m.subs('content', len);
                    break;
                case 1: // uncompressed fixed
                case 2: // uncompressed dynamic
                    if (btype == 1) {
                        var tree = fixedtree;
                        var dist = fixeddist;
                    } else {
                        throw new Error("unsupported btype=2!");
                    }
                    var completed = false;
                    while (!completed && m.available > 0) {
                        m.tvalueOffset(() => {
                            var vv = tree.readOne(m);
                            var bitcount = vv.bitcount;
                            var value = vv.value;

                            var type = 'bits[' + bitcount + ']';

                            if (value < 256) {
                                out.push(value);
                                m.tvalue('literal', type, value, CharRepresenter);
                            } else if (value == 256) {
                                completed = true;
                                m.tvalue('end', type, value, CharRepresenter);
                            } else {
                                m.struct('lz', () => {
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
                case 3: // invalid
                    throw new Error("invalid bit");
                    break;
            }
        });
    }


    m.value = new HexChunk(out);
});

// https://github.com/nayuki/DEFLATE/blob/master/src/nayuki/deflate/Decompressor.java

/*
 00 - no compression
 01 - compressed with fixed Huffman codes
 10 - compressed with dynamic Huffman codes
 11 - reserved (error)
 */
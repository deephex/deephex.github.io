///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
// http://www.gzip.org/zlib/rfc-deflate.html
AnalyzerMapperPlugins.register(
    'zlib',
    function (data) {
        return 0.1;
    },
    async(function*(m, type) {
        // https://www.ietf.org/rfc/rfc1950.txt
        m.node.name = 'zlib';
        var hasDict = false;
        yield(m.struct('CMF', async(function*() {
            yield(m.bits('compression_method', 4, EnumRepresenter({
                8: 'deflate',
                15: 'reserved'
            })));
            yield(m.bits('window_size', 4, new ValueRepresenter(function (v) {
                return ((1 << (v + 8)) / 1024) + 'KB';
            })));
        })));
        yield(m.struct('FLG', async(function*() {
            yield(m.bits('fcheck', 5, BinRepresenter));
            hasDict = yield(m.bitBool('fdic'));
            yield(m.bits('flevel', 2, EnumRepresenter({ 0: 'fastest', 1: 'fast', 2: 'default', 3: 'maximum' })));
        })));
        if (hasDict) throw new Error("Not supported feed dict");
        var chunk = yield(m.chunk('data', m.available, new AnalyzerType('deflate', type.arguments)));
        m.value = chunk.value;
    })
);
AnalyzerMapperPlugins.register(
    'gzip',
    function (data) {
        return ((data.getUint8(0) == 0x1F) && (data.getUint8(1) == 0x8B)) ? 1 : 0;
    },
    async(function*(m, type) {
        // https://www.ietf.org/rfc/rfc1952.txt
        m.node.name = 'gzip';
        var ID1 = yield(m.u8('ID1'));
        var ID2 = yield(m.u8('ID2'));
        yield(m.u8('compression_method', EnumRepresenter({
            0: 'reserved', 1: 'reserved', 2: 'reserved', 3: 'reserved',
            4: 'reserved', 5: 'reserved', 6: 'reserved', 7: 'reserved',
            8: 'deflate',
        })));

        var ftext = false;
        var fhcrc = false;
        var fextra = false;
        var fname = false;
        var fcomment = false;

        yield(m.struct('FLG', async(function*() {
            ftext = yield(m.bitBool('ftext'));
            fhcrc = yield(m.bitBool('fhcrc'));
            fextra = yield(m.bitBool('fextra'));
            fname = yield(m.bitBool('fname'));
            fcomment = yield(m.bitBool('fcomment'));
            yield(m.bitBool('reserved'));
            yield(m.bitBool('reserved'));
            yield(m.bitBool('reserved'));
        })));

        var MTIME = yield(m.u32('MTIME'));
        var XFL = yield(m.u8('XFL'));
        var OS = yield(m.u8('OS'));

        if (fextra) {
            var XLEN = yield(m.u16('XLEN'));
            var EXTRA = yield(m.chunk('EXTRA', XLEN));
        }

        if (fname) {
            var name = yield(m.strz('name'));
        }

        if (fcomment) {
            var comment = yield(m.strz('comment'));
        }

        if (fhcrc) {
            var CRC16 = yield(m.u16('CRC16'));
        }

        var chunk = yield(m.chunk('data', m.available - 8, new AnalyzerType('deflate', type.arguments)));
        var CRC32 = yield(m.u32('CRC32'));
        var size = yield(m.u32('size'));
    })
);
AnalyzerMapperPlugins.register(
    'deflate',
    function (data) {
        return 0.1;
    },
    async(function*(m, type) {
        // https://www.ietf.org/rfc/rfc1951.txt
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
            yield(m.struct('chunk', async(function*() {
                var yvalue = yield(m.bits('bfinal', 1, BoolRepresenter));
                lastBlock = yvalue != 0;
                var btype = yield(m.bits('btype', 2, EnumRepresenter({
                    0: 'uncompressed',
                    1: 'compressed_fixed',
                    2: 'compressed_dynamic'
                })));
                switch (btype) {
                    case 0:
                        yield(m.alignbyte());
                        var len = yield(m.u16('len'));
                        var nlen = yield(m.u16('negated_len'));
                        if (len != ~nlen) throw new Error("Invalid file: len != ~nlen");
                        yield(m.subs('content', len));
                        break;
                    case 1:
                    case 2:
                        yield(m.struct('parts', async(function*() {
                            if (btype == 1) {
                                var tree = fixedtree;
                                var dist = fixeddist;
                            } else {
                                var HCLENPOS = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
                                var _HLIT = yield(m.readBitsAsync(5)); // hlit  + 257
                                var _HDIST = yield(m.readBitsAsync(5)); // hdist +   1
                                var _HCLEN = yield(m.readBitsAsync(4)); // hclen +   4

                                var HLIT = _HLIT + 257; // hlit  + 257
                                var HDIST = _HDIST + 1; // hdist +   1
                                var HCLEN = _HCLEN + 4; // hclen +   4

                                var codeLenCodeLen = Array.apply(null, new Array(19)).map(function (v, n) { return 0; });
                                for (var i = 0; i < HCLEN; i++) codeLenCodeLen[HCLENPOS[i]] = yield(m.readBitsAsync(3));
                                //console.info(codeLenCodeLen);
                                var codeLen = HuffmanTree.fromLengths(codeLenCodeLen);
                                var lengths = Array.apply(null, new Array(HLIT + HDIST));
                                var n = 0;
                                for (; n < HLIT + HDIST;) {
                                    var sym = yield(codeLen.readOneAsync(m));
                                    var value = sym.value;
                                    var len = 1;
                                    if (value < 16) {
                                        len = 1;
                                    } else if (value == 16) {
                                        value = lengths[n - 1];
                                        len = yield(m.readBitsAsync(2));
                                        len += 3;
                                    } else if (value == 17) {
                                        value = 0;
                                        len = yield(m.readBitsAsync(3));
                                        len += 3;
                                    } else if (value == 18) {
                                        value = 0;
                                        len = yield(m.readBitsAsync(7));
                                        len += 11;
                                    } else {
                                        throw new Error("Invalid");
                                    }
                                    for (var c = 0; c < len; c++) lengths[n++] = value;
                                }
                                tree = HuffmanTree.fromLengths(lengths.slice(0, HLIT));
                                dist = HuffmanTree.fromLengths(lengths.slice(HLIT, lengths.length));
                            }
                            var completed = false;
                            while (!completed && m.available > 0) {
                                yield(m.tvalueOffsetAsync(async(function*() {
                                    var vv = yield(tree.readOneAsync(m));
                                    var bitcount = vv.bitcount;
                                    var value = vv.value;
                                    var type = 'bits[' + bitcount + ']';
                                    if (value < 256) {
                                        out.push(value);
                                        m.tvalue('literal', type, value, CharRepresenter);
                                    }  else if (value == 256) {
                                        completed = true;
                                        m.tvalue('end', type, value, CharRepresenter);
                                    }  else {
                                        yield(m.structNoExpand('lz', async(function*() {
                                            var lengthInfo = infos_lz[value];
                                            var lengthExtra = yield(m.readBitsAsync(lengthInfo.extra));
                                            var length = lengthInfo.offset + lengthExtra;

                                            var distanceDataSymbol = yield(dist.readOneAsync(m));
                                            var distanceData = distanceDataSymbol.value;
                                            var distanceInfo = infos_lz2[distanceData];
                                            var distanceExtra = yield(m.readBitsAsync(distanceInfo.extra));
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
                                            return new HexChunk(new ArrayHexSource(new Uint8Array(lzchunk)), new AnalyzerType('binary'));
                                        })));
                                    }
                                })));
                            }
                        })));
                        break;
                    case 3:
                        throw new Error("invalid bit");
                        break;
                }
            })));
        }
        m.value = new HexChunk(new ArrayHexSource(new Uint8Array(out)), type.arguments ? new AnalyzerType(type.arguments[0], type.arguments.slice(1)) : null);
    })
);

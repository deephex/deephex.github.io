///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
// http://www.gzip.org/zlib/rfc-deflate.html

var CIsoStream = (function () {
    /**
     *
     * @param source HexSource
     * @param totalBytes Number
     * @param blockSize Number
     * @param numberOfBlocks Number
     * @constructor
     */
    function CIsoStream(source, totalBytes, blockSize, numberOfBlocks) {
        this.source = source;
        this.length = totalBytes;
        this.blockSize = blockSize;
        this.numberOfBlocks = numberOfBlocks;
    }

    /**
     *
     * @param offset Number
     * @param wantedSize Number
     * @param outbuffer Uint8Array
     * @returns {Promise<number>}
     */
    CIsoStream.prototype.readAsync = function (offset, wantedSize, outbuffer) {
        var _this = this;
        var sectorStart = Math.floor(offset / _this.blockSize);
        var sectorEnd = Math.floor((offset + wantedSize - 1) / _this.blockSize);
        var offsetInSector = offset % _this.blockSize;
        var rangeInfoData = new Uint8Array(8);
        var chunks = new Uint32Array(rangeInfoData.buffer);

        if (sectorEnd != sectorStart) {
            var sectorsToRead = [];
            for (var n = sectorStart; n <= sectorEnd; n++) sectorsToRead.push(n);
            var promise = Promise.resolve(0);
            var writeoffset = 0;
            var tempBuffer = new Uint8Array(_this.blockSize);
            console.log('--------------', sectorStart, sectorEnd);
            var toreadstart = offset;
            var lefttoread = wantedSize;
            sectorsToRead.forEach(function(sector, index) {
                console.log('sector read: ' + sector);
                promise = promise.then(function(readed) {
                    if (readed >= wantedSize) return readed;

                    var toreadendIdeally = toreadstart + lefttoread;
                    var toreadendSector = MathUtils.ceilMultiple(toreadstart, _this.blockSize);
                    var toreadEnd = Math.min(toreadendIdeally, toreadendSector);
                    var toreadSize = toreadEnd - toreadstart;

                    return this.readAsync(toreadstart, toreadSize, tempBuffer).then(function(readed) {
                        for (var n = 0; n < readed; n++) outbuffer[writeoffset + n] = tempBuffer[n];
                        writeoffset += readed;
                        return writeoffset;
                    });
                });
            });
            return promise;
        }

        return _this.source.readAsync(24 + sectorStart * 4, 8, rangeInfoData).then(function(readed1) {
            var start = chunks[0] & 0x7FFFFFFF;
            var end = chunks[1] & 0x7FFFFFFF;
            var compressedLength = end - start;
            var compressed = (chunks[0] >>> 31) == 0;
            var compressedBuffer = new Uint8Array(compressedLength);
            return _this.source.readAsync(start, compressedLength, compressedBuffer).then(function(readed2) {
                var uncompressedBuffer = compressed ? Inflater.inflateRaw(compressedBuffer) : compressedBuffer;
                //console.log(start, end, compressedLength, compressed);
                var readSize = Math.min(uncompressedBuffer.length, wantedSize);
                for (var n = 0; n < readSize; n++) outbuffer[n] = uncompressedBuffer[n + offsetInSector];
                return readSize;
            });
        });
    };

    //readAsync(offset:number, size:number, buffer:Uint8Array):Promise<number>;
    CIsoStream.prototype.toString = function () {
        return this.source + ':' + this.length;
    };
    return CIsoStream;
})();

AnalyzerMapperPlugins.register(
    'ciso',
    function (data) {
        return (String.fromCharCode(data.getInt8(0), data.getInt8(1), data.getInt8(2), data.getInt8(3)) == 'CISO') ? 1 : 0;
    },
    async(function*(m, type) {
        /** @var m AnalyzerMapper */
        yield(m.str('magic', 4));
        yield(m.u32('headerSize'));
        var totalBytes = yield(m.u32('totalBytes_low'));
        yield(m.u32('totalBytes_high'));
        var blockSize = yield(m.u32('blockSize'));
        yield(m.u8('version'));
        yield(m.u8('pad'));
        yield(m.u16('reserved'));
        var numberOfBlocks = Math.floor(totalBytes / blockSize);
        yield(m.chunk('blocks', numberOfBlocks * 4));

        m.value = new HexChunk(new CIsoStream(m.source, totalBytes, blockSize, numberOfBlocks), new AnalyzerType('iso'));
        //m.value = new HexChunk(new BufferedSource(new CIsoStream(m.source, totalBytes, blockSize, numberOfBlocks)), new AnalyzerType('iso'));
    })
);

AnalyzerMapperPlugins.register(
    'iso',
    function (data) {
        if (data.getInt8(0x8000) != 1) return 0;
        if (String.fromCharCode(data.getInt8(0x8001), data.getInt8(0x8002)) != 'CD') return 0;
        return 1;
    },
    async(function*(m, type) {
        /** @var m AnalyzerMapper */
        m.position = 0x8000;
        yield(m.u8('id', EnumRepresenter({
            0x00: "BootRecord",
            0xFF: "VolumePartitionSetTerminator",
            0x01: "PrimaryVolumeDescriptor",
            0x02: "SupplementaryVolumeDescriptor",
            0x03: "VolumePartitionDescriptor"
        })));
        yield(m.str('magic', 5));
        yield(m.u8('version'));
        yield(m.u8('pad'));
        yield(m.str('systemId', 0x20));
        yield(m.str('volumeId', 0x20));
        yield(m.str('pad', 8));
        yield(m.u32_le('volumeSpaceSize_le'));
        yield(m.u32_be('volumeSpaceSize_be'));
        yield(m.str('pad', 8 * 4));
        yield(m.u32('volumeSetSize', HexRepresenter));
        yield(m.u32('volumeSequenceNumber', HexRepresenter));
        yield(m.u16_le('logicalBlockSize_le'));
        yield(m.u16_be('logicalBlockSize_be'));

        yield(m.u32_le('pathTableSize_le'));
        yield(m.u32_be('pathTableSize_be'));

        yield(m.u32('typeLPathTable'));
        yield(m.u32('optType1PathTable'));
        yield(m.u32('typeMPathTable'));
        yield(m.u32('optTypeMPathTable'));

        var readDirectoryRecordAsync = async(function*() {
            yield(m.structNoExpand('directoryRecord', async(function*() {
                yield(m.u8('length'));
                yield(m.u8('extendedAttributeLength'));
                yield(m.u32_le('extent_le'));
                yield(m.u32_be('extent_be'));
                yield(m.u32_le('size_le'));
                yield(m.u32_be('size_be'));

                yield(m.structNoExpand('date', async(function*() {
                    var year = yield(m.u8('year', new ValueRepresenter(function (v) {
                        return 1900 + v;
                    })));
                    var month = yield(m.u8('month'));
                    var day = yield(m.u8('day'));
                    var hour = yield(m.u8('hour'));
                    var minute = yield(m.u8('minute'));
                    var second = yield(m.u8('second'));
                    var offset = yield(m.u8('offset'));
                    return (1900 + year) + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + '+' + offset;
                })));

                yield(m.u8('flags'));
                yield(m.u8('fileUnitSize'));
                yield(m.u8('interleave'));

                yield(m.u16_le('volumeSequenceNumber'));
                yield(m.u16_be('volumeSequenceNumber'));

                var nameLength = yield(m.u8('nameLength'));
                yield(m.str('name', nameLength));
            })));
        });

        yield(readDirectoryRecordAsync());


        // { _pad4: UInt8 },

        yield(m.str('volumeSetId', 0x80));
        yield(m.str('publisherId', 0x80));
        yield(m.str('preparerId', 0x80));
        yield(m.str('applicationId', 0x80));
        yield(m.str('copyrightFileId', 37));
        yield(m.str('abstractFileId', 37));
        yield(m.str('bibliographicFileId', 37));

        yield(m.str('creationDate', 17));
        yield(m.str('modificationDate', 17));
        yield(m.str('expirationDate', 17));
        yield(m.str('effectiveDate', 17));

        /*
         { fileStructureVersion: UInt8 },
         { pad5: UInt8 },
         { pad6: StructArray<number>(UInt8, 0x200) },
         { pad7: StructArray<number>(UInt8, 653) },
         */
    })
);

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
            0x00 : "BootRecord",
            0xFF : "VolumePartitionSetTerminator",
            0x01 : "PrimaryVolumeDescriptor",
            0x02 : "SupplementaryVolumeDescriptor",
            0x03 : "VolumePartitionDescriptor"
        })));
        yield(m.str('magic', 5));
        yield(m.u8('version'));
        yield(m.u8('pad'));
        yield(m.str('systemId', 0x20));
        yield(m.str('volumeId', 0x20));
        yield(m.str('pad', 8));
        yield(m.u32_le('volumeSpaceSize_le'));
        yield(m.u32_be('volumeSpaceSize_be'));
        yield(m.str('pad',  8 * 4));
        yield(m.u32('volumeSetSize'));
        yield(m.u32('volumeSequenceNumber'));
        yield(m.u16_le('logicalBlockSize_le'));
        yield(m.u16_be('logicalBlockSize_be'));

        yield(m.u32_le('pathTableSize_le'));
        yield(m.u32_be('pathTableSize_be'));

        yield(m.u32('typeLPathTable'));
        yield(m.u32('optType1PathTable'));
        yield(m.u32('typeMPathTable'));
        yield(m.u32('optTypeMPathTable'));

        yield(m.structNoExpand('directoryRecord', async(function*(){
            yield(m.u8('length'));
            yield(m.u8('extendedAttributeLength'));
            yield(m.u32_le('extent_le'));
            yield(m.u32_be('extent_be'));
            yield(m.u32_le('size_le'));
            yield(m.u32_be('size_be'));

            yield(m.structNoExpand('date', async(function*() {
                var year = yield(m.u8('year', new ValueRepresenter(function(v) { return 1900 + v; })));
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

///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />

var DOS_TIME_ValueRepresenter = new ValueRepresenter(function (dostime) {
    var hour = (dostime >>> 11) & 0x1f;
    var min = (dostime >>> 5) & 0x3f;
    var sec = ((dostime >>> 0) & 0x1f) << 1;
    return strpad_left(String(hour), '0', 2) + ':' + strpad_left(String(min), '0', 2) + ':' + strpad_left(String(sec), '0', 2);
});
var DOS_DATE_ValueRepresenter = new ValueRepresenter(function (dostime) {
    var year = (dostime >>> 9) + 1980;
    var month = ((dostime >>> 5) & 0x0f) - 1;
    var day = (dostime >>> 0) & 0x1f;
    return strpad_left(String(day), '0', 2) + '/' + strpad_left(String(month), '0', 2) + '/' + strpad_left(String(year), '0', 4);
});

AnalyzerMapperPlugins.register(
    'ZIP',
    function (data) {
        return (String.fromCharCode(data.getUint8(0), data.getUint8(1)) == 'PK') ? 1 : 0;
    },
    async(function*(m, type) {
        m.node.name = 'zip';
        m.little = true;
        var entrycount = 0;
        var CompressionMethodEnumValues = {
            0: 'stored',
            1: 'shrunk',
            2: 'factor1',
            3: 'factor2',
            4: 'factor3',
            5: 'factor4',
            6: 'imploded',
            7: 'tokeniginzg',
            8: 'deflate',
            9: 'deflate64',
            10: 'ibm_terse_old',
            11: 'reserved_11',
            12: 'bzip2',
            13: 'reserved_13',
            14: 'lzma',
            15: 'reserved_15',
            16: 'reserved_16',
            17: 'reserved_17',
            18: 'ibm_terse_new',
            19: 'ibm_lz77',
            97: 'wavpack',
            98: 'ppmd'
        };
        var CompressionMethodEnum = EnumRepresenter(CompressionMethodEnumValues);
        while (m.available > 0) {
            yield(m.structNoExpand('entry', async(function*(node) {
                var magic = yield(m.str('magic', 2));
                //alert(magic);
                if (magic != 'PK') throw new Error("Not a zip file");
                var type = yield(m.u16('type', EnumRepresenter({
                    0x0201: 'central_directory',
                    0x0403: 'local_file_header',
                    0x0605: 'end_of_central_diretory'
                }, true)));
                switch (type) {
                    case 0x0201:
                        node.name = 'file_header';
                        yield(m.u16('version_used'));
                        yield(m.u16('version_extract'));
                        yield(m.u16('flags'));
                        yield(m.u16('compression_method', CompressionMethodEnum));
                        yield(m.u16('file_time', DOS_TIME_ValueRepresenter));
                        yield(m.u16('file_date', DOS_DATE_ValueRepresenter));
                        yield(m.u32('crc32', HexRepresenter));
                        var compressed_size = yield(m.u32('compressed_size'));
                        yield(m.u32('uncompressed_size'));
                        var filename_length = yield(m.u16('filename_length'));
                        var extrafield_length = yield(m.u16('extrafield_length'));
                        var comment_length = yield(m.u16('comment_length'));
                        var disk_number_start = yield(m.u16('disk_number_start'));
                        var internal_file_attributes = yield(m.u16('internal_file_attributes'));
                        var external_file_attributes = yield(m.u32('external_file_attributes'));
                        var relative_offset_local_header = yield(m.u32('relative_offset_local_header'));
                        var filename = yield(m.str('filename', filename_length));
                        yield(m.subs('extra', extrafield_length));
                        yield(m.str('comment', comment_length));
                        return filename;
                        break;
                    case 0x0403:
                        node.name = 'local_file_header';
                        entrycount++;
                        yield(m.u16('version_extract'));
                        yield(m.u16('flags'));
                        var compression_method = yield(m.u16('compression_method', CompressionMethodEnum));
                        yield(m.u16('file_time', DOS_TIME_ValueRepresenter));
                        yield(m.u16('file_date', DOS_DATE_ValueRepresenter));
                        yield(m.u32('crc32', HexRepresenter));
                        var compressed_size = yield(m.u32('compressed_size'));
                        yield(m.u32('uncompressed_size'));
                        var filename_length = yield(m.u16('filename_length'));
                        var extrafield_length = yield(m.u16('extrafield_length'));
                        var filename = yield(m.str('filename', filename_length));
                        yield(m.subs('extra', extrafield_length));
                        yield(m.chunk('content', compressed_size, new AnalyzerType(CompressionMethodEnumValues[compression_method], ['autodetect'])));
                        return filename;
                        break;
                    case 0x0605:
                        node.name = 'end_of_central';
                        yield(m.u16('number_of_this_disk'));
                        yield(m.u16('start_disk'));
                        yield(m.u16('total_disks'));
                        yield(m.u16('total_entries'));
                        yield(m.u32('size_central_directory'));
                        yield(m.u32('start_central'));
                        var comment_length = yield(m.u16('comment_length'));
                        yield(m.str('comment', comment_length));
                        break;
                    default:
                        throw new Error("Unknown type " + type);
                }
            })));
        }
        m.node.value = 'files:' + entrycount;
    })
);

/*
var func = async(function*() {
    console.log('a');
    yield waitAsync(1000);
    console.log('b');
    return 3;
});

func().then(function(result) {
    console.log(result)
});
    */
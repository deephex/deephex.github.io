///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
AnalyzerMapperPlugins.register(
    'swf',
    function (data) {
        var magic = String.fromCharCode(data.getInt8(0), data.getInt8(1), data.getInt8(2));
        return ['FWS', 'CWS', 'ZWS'].indexOf(magic) >= 0;
    },
    async(function*(m, type) {
        yield m.str('magic', 3);
        yield m.u8('version');
        yield m.u32('length');
        yield m.chunk('compressed_data', m.available, new AnalyzerType('zlib', ['swf_content']));
    })
);

AnalyzerMapperPlugins.register(
    'swf_content',
    function (data) {
        return 0.1;
    },
    async(function*(m, type) {
        var nbits = yield m.bits('nbits', 5);
        yield m.bits('xmin', nbits);
        yield m.bits('xmax', nbits);
        yield m.bits('ymin', nbits);
        yield m.bits('ymax', nbits);
    })
);

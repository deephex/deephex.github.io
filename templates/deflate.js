///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
AnalyzerMapperPlugins.register('DEFLATE', function (m) {
    //m.u8('data');
    var bfinal = m.bits('bfinal', 1);
    var btype = m.bits('btype', 2);
    /*
    switch (btype) {
        case 0: // uncompressed
            m.alignbyte();
            var len = m.u16('len');
            var nlen = m.u16('negated_len');
            if (len != ~nlen) throw new Error("Invalid file: len != ~nlen");
            m.subs('content', len);
            break;
        case 1: // uncompressed
            break;
    }
    */
});
//# sourceMappingURL=deflate.js.map
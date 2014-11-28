///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
AnalyzerMapperPlugins.register('PNG', function (m) {
    m.little = false;
    m.str('magic', 8);
    function chunk() {
        m.struct('chunk', function () {
            var size = m.u32('size');
            var type = m.str('type', 4);
            var mcontent = m.subs('content', size);
            switch (type) {
                case 'IHDR':
                    mcontent.u32('size');
                    mcontent.u32('height');
                    mcontent.u8('bits');
                    mcontent.u8('color_type');
                    mcontent.u8('compression');
                    mcontent.u8('filter');
                    mcontent.u8('interlace');
                    break;
            }
            m.u32('crc');
            return 'type:' + type + ',size:' + size;
        });
    }
    while (m.available > 0) {
        chunk();
    }
});
//# sourceMappingURL=png.js.map
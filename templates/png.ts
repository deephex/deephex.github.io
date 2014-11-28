///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />


AnalyzerMapperPlugins.register('PNG', (m:AnalyzerMapper) => {
    m.little = false;
    m.str('magic', 8);

    function chunk() {
        m.struct('chunk', () => {
            var size = m.u32('size');
            var type = m.str('type', 4);
            m.subs('content', size, m => {
                switch (type) {
                    case 'IHDR':
                        var width = m.u32('width');
                        var height = m.u32('height');
                        m.u8('bits');
                        m.u8('color_type');
                        m.u8('compression');
                        m.u8('filter');
                        m.u8('interlace');
                        return width + 'x' + height;
                        break;
                    case 'tEXt':
                        m.strz('key');
                        m.strz('value');
                        break;
                }
            });
            m.u32('crc');
            return 'type:' + type + ',size:' + size;
        });
    }
    while (m.available > 0) {
        chunk();
    }
});
///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
AnalyzerMapperPlugins.register('PNG', function (m) {
    m.name = 'png';
    m.value = new HexImage(m.data.buffer);
    m.little = false;
    m.str('magic', 8);
    function chunk() {
        m.struct('chunk', function () {
            var size = m.u32('size');
            var type = m.str('type', 4);
            m.subs('content', size, function (m) {
                switch (type) {
                    case 'IHDR':
                        m.name = 'header';
                        var width = m.u32('width');
                        var height = m.u32('height');
                        m.u8('bits');
                        m.u8('color_type', ValueRepresenter.enum({
                            0: 'grayscale',
                            2: 'rgb',
                            3: 'palette',
                            4: 'grasycale_alpha',
                            6: 'rgba'
                        }));
                        m.u8('compression', ValueRepresenter.enum({ 0: 'zlib' }));
                        m.u8('filter');
                        m.u8('interlace');
                        return width + 'x' + height;
                        break;
                    case 'pHYs':
                        var ppux = m.u32('ppux');
                        var ppuy = m.u32('ppuy');
                        m.u8('unit');
                        return ppux + 'x' + ppuy;
                        break;
                    case 'tRNS':
                        var alphaCount = 0;
                        while (m.available > 0) {
                            m.u8('alpha[' + alphaCount + ']');
                            alphaCount++;
                        }
                        break;
                    case 'sBIT':
                        var bitcount = 0;
                        while (m.available > 0) {
                            m.u8('v[' + bitcount + ']');
                            bitcount++;
                        }
                        break;
                    case 'IDAT':
                        m.chunk('content', m.available, 'zlib_deflate');
                        break;
                    case 'PLTE':
                        var colorCount = 0;
                        while (m.available > 0) {
                            m.struct('color[' + colorCount + ']', function () {
                                var r = m.u8('red');
                                var g = m.u8('green');
                                var b = m.u8('blue');
                                return new HexRgb(r, g, b);
                            }, false);
                            colorCount++;
                        }
                        return 'colors(' + colorCount + ')';
                    case 'tEXt':
                        m.strz('key');
                        m.strz('value');
                        break;
                }
            });
            m.u32('crc', HexRepresenter);
            return 'type:' + type + ',size:' + size;
        });
    }
    while (m.available > 0) {
        chunk();
    }
});
//# sourceMappingURL=png.js.map
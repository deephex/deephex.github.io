///<reference path="../editor.ts" />
///<reference path="../utils.ts" />
///<reference path="../tools.ts" />
///<reference path="../analyzer.ts" />
var PNG;
(function (PNG) {
    var Info = (function () {
        function Info(width, height) {
            this.width = width;
            this.height = height;
        }
        Info.prototype.toString = function () {
            return this.width + 'x' + this.height;
        };
        return Info;
    })();
    PNG.Info = Info;
})(PNG || (PNG = {}));
AnalyzerMapperPlugins.register('png_idat', function (data) {
    return 0;
}, function (m, type) {
    var info = type.arguments[0];
    for (var row = 0; row < info.height; row++) {
        m.structNoExpand('row', function () {
            m.u8('type', EnumRepresenter({
                0: 'none',
                1: 'sub',
                2: 'up',
                3: 'average',
                4: 'paeth'
            }));
            var values = [];
            m.struct('data', function () {
                for (var column = 0; column < info.width; column++) {
                    var v = m.bits('c', 4);
                    values.push(v);
                }
            });
            return values.join(',');
        });
    }
});
AnalyzerMapperPlugins.register('png', function (data) {
    if (data.getUint8(0) != 0x89)
        return 0;
    if (String.fromCharCode(data.getUint8(1), data.getUint8(2), data.getUint8(3)) != 'PNG')
        return 0;
    return 1;
}, function (m, type) {
    m.name = 'png';
    m.value = new HexImage(m.data.buffer);
    m.little = false;
    m.str('magic', 8);
    var info = new PNG.Info(0, 0);
    function chunk() {
        m.struct('chunk', function () {
            var size = m.u32('size');
            var type = m.str('type', 4);
            m.subs('content', size, function (m) {
                switch (type) {
                    case 'IHDR':
                        m.name = 'header';
                        info.width = m.u32('width');
                        info.height = m.u32('height');
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
                        return info.toString();
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
                        m.chunk('content', m.available, new AnalyzerType('zlib', ['png_idat', info]));
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
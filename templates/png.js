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

AnalyzerMapperPlugins.register(
    'png_idat',
    function (data) {
        return 0;
    },
    async(function*(m, type) {
        var info = type.arguments[0];
        for (var row = 0; row < info.height; row++) {
            yield(m.structNoExpand('row', async(function*() {
                yield(m.u8('type', EnumRepresenter({
                    0: 'none',
                    1: 'sub',
                    2: 'up',
                    3: 'average',
                    4: 'paeth'
                })));
                var values = [];
                yield(m.struct('data', async(function*() {
                    for (var column = 0; column < info.width; column++) {
                        var v = yield(m.bits('c', 4));
                        values.push(v);
                    }
                })));
                return values.join(',');
            })));
        }
    })
);
AnalyzerMapperPlugins.register(
    'png',
    function (data) {
        if (data.getUint8(0) != 0x89) return 0;
        return (String.fromCharCode(data.getUint8(1), data.getUint8(2), data.getUint8(3)) == 'PNG') ? 1 : 0;
    },
    async(function*(m, type) {
        m.name = 'png';
        m.value = new HexImage(m.data.buffer);
        m.little = false;
        yield(m.str('magic', 8));
        var info = new PNG.Info(0, 0);
        var chunkAsync = async(function*() {
            yield(m.struct('chunk', async(function*() {
                var size = yield(m.u32('size'));
                var type = yield(m.str('type', 4));
                yield(m.subs('content', size, async(function*(m) {
                    switch (type) {
                        case 'IHDR':
                            m.name = 'header';
                            info.width = yield(m.u32('width'));
                            info.height = yield(m.u32('height'));
                            yield(m.u8('bits'));
                            yield(m.u8('color_type', ValueRepresenter.enum({
                                0: 'grayscale',
                                2: 'rgb',
                                3: 'palette',
                                4: 'grasycale_alpha',
                                6: 'rgba'
                            })));
                            yield(m.u8('compression', ValueRepresenter.enum({ 0: 'zlib' })));
                            yield(m.u8('filter'));
                            yield(m.u8('interlace'));
                            return info.toString();
                            break;
                        case 'pHYs':
                            var ppux = yield(m.u32('ppux'));
                            var ppuy = yield(m.u32('ppuy'));
                            yield(m.u8('unit'));
                            return ppux + 'x' + ppuy;
                            break;
                        case 'tRNS':
                            var alphaCount = 0;
                            while (m.available > 0) {
                                yield(m.u8('alpha[' + alphaCount + ']'));
                                alphaCount++;
                            }
                            break;
                        case 'sBIT':
                            var bitcount = 0;
                            while (m.available > 0) {
                                yield(m.u8('v[' + bitcount + ']'));
                                bitcount++;
                            }
                            break;
                        case 'IDAT':
                            yield(m.chunk('content', m.available, new AnalyzerType('zlib', ['png_idat', info])));
                            break;
                        case 'PLTE':
                            var colorCount = 0;
                            while (m.available > 0) {
                                yield m.structNoExpand('color[' + colorCount + ']', async(function*() {
                                    var r = yield(m.u8('red'));
                                    var g = yield(m.u8('green'));
                                    var b = yield(m.u8('blue'));
                                    return new HexRgb(r, g, b);
                                }));
                                colorCount++;
                            }
                            return 'colors(' + colorCount + ')';
                        case 'tEXt':
                            yield(m.strz('key'));
                            yield(m.strz('value'));
                            break;
                    }
                })));
                yield(m.u32('crc', HexRepresenter));
                return 'type:' + type + ',size:' + size;
            })));
        });
        while (m.available > 0) {
            yield(chunkAsync());
        }
    })
);

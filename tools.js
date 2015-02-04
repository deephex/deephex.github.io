/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./utils.ts" />
/// <reference path="./editor.ts" />
/// <reference path="./analyzer.ts" />
var HexTools = (function () {
    function HexTools(element, outputelement, editor) {
        var _this = this;
        this.element = element;
        this.outputelement = outputelement;
        this.editor = editor;
        this.bitCount = 8;
        this.little = true;
        $(element).append($('<select>' + ['utf-8', 'ascii', 'utf-16', 'shift-jis'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select>').change(function (e) {
            editor.encoder = new TextDecoderEncoding($(e.target).val());
        }));
        $(element).append($('<select>' + ['8-bit', '16-bit', '32-bit'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select>').change(function (e) {
            _this.bitCount = parseInt($(e.target).val());
            //console.log(this.bits);
        }));
        $(document).on('dragover', function (e) {
            $(editor.element).addClass('drag');
            return false;
        });
        $(document).on('dragend', function (e) {
            $(editor.element).removeClass('drag');
            return false;
        });
        document.ondrop = function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(editor.element).removeClass('drag');
            var file = e.dataTransfer.files[0];
            editor.source = new BufferedSource(new FileSource(file));
            $(outputelement).html('');
            _this.analyze(new AnalyzerType('autodetect'));
            return false;
        };
        $(element).append($('<select>' + ['', 'autodetect', 'gzip', 'png', 'zip', 'swf', 'deflate', 'zlib'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select>').change(function (e) {
            var value = $(e.target).val();
            _this.analyze(new AnalyzerType(value));
            $(e.target).val('');
        }));
        $(element).append($('<select>' + ['little-endian', 'big-endian'].map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select>').change(function (e) {
            _this.little = (('' + $(e.target).val()).indexOf('little') >= 0);
        }));
        $(document).on('copy', function (e) {
            _this.copy();
            if (window.clipboardData) {
                window.clipboardData.setData("Text", "My clipboard data");
            }
            e.stopPropagation();
            e.preventDefault();
        });
        $(document).on('paste', function (e) {
            var clipbardData = e.originalEvent.clipboardData.getData('text/plain');
            //console.log(clipbardData);
            _this.paste(clipbardData);
            e.stopPropagation();
            e.preventDefault();
        });
        editor.addHotkeys(['shift+0'], function () {
            _this.zero();
        });
        editor.addHotkeys(['cmd+i'], function () {
            _this.invert();
        });
        editor.addHotkeys(['cmd+a'], function () {
            _this.selectAll();
        });
        editor.addHotkeys(['t'], function () {
            _this.text();
        });
        editor.addHotkeys(['r'], function () {
            _this.random();
        });
        editor.addHotkeys(['minus'], function () {
            _this.increment(-1);
        });
        editor.addHotkeys(['plus'], function () {
            _this.increment(1);
        });
        editor.addHotkeys(['backspace'], function () {
            _this.zero();
        });
        $(element).append($('<input type="button" value="invert (cmd+i)" />').click(function () {
            _this.invert();
        }));
        $(element).append($('<input type="button" value="decrement (-)" />').click(function () {
            _this.increment(-1);
        }));
        $(element).append($('<input type="button" value="increment (+)" />').click(function () {
            _this.increment(1);
        }));
        $(element).append($('<input type="button" value="rotate left" />').click(function () {
            _this.rotate(-1);
        }));
        $(element).append($('<input type="button" value="rotate right" />').click(function () {
            _this.rotate(+1);
        }));
        $(element).append($('<input type="button" value="create scale" />').click(function () {
            _this.createScale(1, 0);
        }));
        $(element).append($('<input type="button" value="random (r)" />').click(function () {
            _this.random();
        }));
        $(element).append($('<input type="button" value="zero (backspace)" />').click(function () {
            _this.zero();
        }));
        $(element).append($('<input type="button" value="select all" />').click(function () {
            _this.selectAll();
        }));
        $(element).append($('<input type="button" value="text (t)" />').click(function () {
            _this.text();
        }));
        $(element).append($('<input type="button" value="str_rot13" />').click(function () {
            _this.rot13();
        }));
        $(element).append($('<input type="button" value="upper" />').click(function () {
            _this.upper();
        }));
        $(element).append($('<input type="button" value="lower" />').click(function () {
            _this.lower();
        }));
        $(element).append($('<input type="button" value="output_as_hex" />').click(function () {
            _this.outputHex();
        }));
        $(element).append($('<input type="button" value="output_as_c" />').click(function () {
            _this.outputC();
        }));
        $(element).append($('<br />'));
        $(element).append($('<input type="button" value="load small png" />').click(function () {
            _this.loadSmallPngWithLotOfChunks();
        }));
        $(element).append($('<input type="button" value="load zip file" />').click(function () {
            _this.loadZipFile();
        }));
        $(element).append($('<input type="button" value="load medium png" />').click(function () {
            _this.loadMediumPng();
        }));
        $(element).append($('<input type="button" value="load deflate1" />').click(function () {
            _this.loadDeflate1();
        }));
        $(element).append($('<input type="button" value="load deflate2" />').click(function () {
            _this.loadDeflate2();
        }));
        $(element).append($('<input type="button" value="load deflate3" />').click(function () {
            _this.loadDeflate3();
        }));
        var info = $('<div>-</div>');
        $(element).append(info);
        editor.onMove.add(function () {
            var cursor = editor.cursor;
            info.text('column:' + cursor.column + ",cell:" + cursor.row + ',offset:' + cursor.viewoffset + ",selection=" + cursor.selection.length);
        });
        editor.update();
    }
    Object.defineProperty(HexTools.prototype, "byteCount", {
        get: function () {
            return this.bitCount / 8;
        },
        enumerable: true,
        configurable: true
    });
    HexTools.prototype.paste = function (data) {
    };
    HexTools.prototype.copy = function () {
    };
    HexTools.prototype._loadsample = function (name, type) {
        var _this = this;
        download(name, function (data) {
            _this.editor.setData(data);
            _this.analyze(type);
        });
    };
    HexTools.prototype.analyze = function (type) {
        AnalyzerMapperPlugins.runAsync(type, this.editor).then(function (result) {
            console.log(result.node);
            if (result.error)
                console.error(result.error);
            $('#hexoutput').html('');
            $('#hexoutput').append(result.element);
        });
    };
    HexTools.prototype.loadSmallPngWithLotOfChunks = function () {
        this._loadsample('check.png', new AnalyzerType('png'));
    };
    HexTools.prototype.loadZipFile = function () {
        this._loadsample('zipfile.zip', new AnalyzerType('zip'));
    };
    HexTools.prototype.loadMediumPng = function () {
        this._loadsample('scratch.png', new AnalyzerType('png'));
    };
    HexTools.prototype.loadDeflate1 = function () {
        this._loadsample('test.deflate', new AnalyzerType('deflate'));
    };
    HexTools.prototype.loadDeflate2 = function () {
        this._loadsample('test2.deflate', new AnalyzerType('deflate'));
    };
    HexTools.prototype.loadDeflate3 = function () {
        this._loadsample('test3.deflate', new AnalyzerType('deflate'));
    };
    HexTools.prototype.outputHex = function () {
        var _this = this;
        var out = '';
        this.editor.cursor.selection.iterateByteOffsets(function (offset) {
            out += ('00' + _this.editor.getByteAt(offset).toString(16)).slice(-2);
        });
        $(this.outputelement).text(out);
    };
    HexTools.prototype.outputC = function () {
        var _this = this;
        var parts = [];
        this.editor.cursor.selection.iterateByteOffsets(function (offset) {
            parts.push('0x' + ('00' + _this.editor.getByteAt(offset).toString(16)).slice(-2));
        });
        $(this.outputelement).text('unsigned char data[' + parts.length + '] = {\n\t' + array_chunks(parts, 16).map(function (items) { return items.join(', ') + ','; }).join('\n\t').replace(/,$/, '') + '\n};');
    };
    HexTools.prototype.lower = function () {
        this.iterateSelection(function (c) {
            return String.fromCharCode(c).toLowerCase().charCodeAt(0);
        });
    };
    HexTools.prototype.upper = function () {
        this.iterateSelection(function (c) {
            return String.fromCharCode(c).toUpperCase().charCodeAt(0);
        });
    };
    HexTools.prototype.rot13 = function () {
        this.iterateSelection(function (c) {
            if (c >= 'a'.charCodeAt(0) && c <= 'm'.charCodeAt(0) || c >= 'A'.charCodeAt(0) && c <= 'M'.charCodeAt(0)) {
                return c + 13;
            }
            else if (c >= 'n'.charCodeAt(0) && c <= 'z'.charCodeAt(0) || c >= 'N'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) {
                return c - 13;
            }
            else {
                return c;
            }
        });
    };
    HexTools.prototype.text = function () {
        var text = prompt('Text to write');
        if (!text)
            return;
        var offset = 0;
        var data = this.editor.encoder.encode(text);
        this.iterateSelection(function (value) {
            if (offset >= data.length)
                return undefined;
            return data[offset++];
        });
    };
    HexTools.prototype.selectAll = function () {
        if (this.editor.cursor.selection.isAll) {
            this.editor.cursor.selection.none();
        }
        else {
            this.editor.cursor.selection.all();
        }
    };
    HexTools.prototype.createScale = function (add, multiply) {
        var first = undefined;
        this.iterateSelection(function (value) {
            if (first === undefined) {
                first = value;
            }
            else {
                first += add;
                add += multiply;
            }
            return first;
        });
    };
    HexTools.prototype.readInt = function (bytes, littleEndian) {
        var out = 0;
        if (littleEndian)
            bytes = bytes.reverse();
        for (var n = 0; n < bytes.length; n++) {
            out <<= 8;
            out |= bytes[n] & 0xFF;
        }
        return out;
    };
    HexTools.prototype.createInt = function (value, byteCount, littleEndian) {
        var out = [];
        for (var n = 0; n < byteCount; n++) {
            out.push(value & 0xFF);
            value >>>= 8;
        }
        if (!littleEndian)
            out = out.reverse();
        return out;
    };
    HexTools.prototype.iterateSelection = function (processor) {
        var _this = this;
        var offsets = [];
        this.editor.cursor.selection2.iterateByteOffsets(function (offset) {
            if (offsets.length < _this.byteCount) {
                offsets.push(offset);
            }
            if (offsets.length == _this.byteCount) {
                var value = _this.readInt(offsets.map(function (offset) { return _this.editor.getByteAt(offset); }), _this.little);
                var result = processor(value);
                if (result !== undefined) {
                    _this.createInt(result, offsets.length, _this.little).forEach(function (v, index) {
                        _this.editor.setByteAt(offsets[index], v);
                    });
                }
                offsets.length = 0;
            }
        });
    };
    HexTools.prototype.rotate = function (count) {
        var _this = this;
        this.iterateSelection(function (value) {
            switch (_this.byteCount) {
                default:
                case 1:
                    return ror8(value, (count | 0));
                    break;
                case 2:
                    return ror16(value, (count | 0));
                    break;
                case 4:
                    return ror32(value, (count | 0));
                    break;
            }
        });
    };
    HexTools.prototype.random = function () {
        var _this = this;
        var randomData = new Uint8Array(this.editor.cursor.selection.length);
        window.crypto.getRandomValues(randomData);
        var view = new DataView(randomData.buffer);
        var offset = 0;
        this.iterateSelection(function (value) {
            var value = 0;
            switch (_this.byteCount) {
                default:
                case 1:
                    value = view.getInt8(offset);
                    break;
                case 2:
                    value = view.getInt16(offset);
                    break;
                case 4:
                    value = view.getInt32(offset);
                    break;
            }
            offset += _this.byteCount;
            return value;
        });
    };
    HexTools.prototype.increment = function (count) {
        this.iterateSelection(function (value) { return value + (count | 0); });
    };
    HexTools.prototype.invert = function () {
        this.iterateSelection(function (value) { return ~value; });
    };
    HexTools.prototype.zero = function () {
        this.iterateSelection(function (value) { return 0; });
    };
    return HexTools;
})();
//# sourceMappingURL=tools.js.map
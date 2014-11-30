/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./utils.ts" />
/// <reference path="./editor.ts" />
/// <reference path="./analyzer.ts" />
/// <reference path="./templates/png.ts" />

class HexTools {
    bitCount = 8;
    little = true;

    get byteCount() { return this.bitCount / 8; }

    constructor(private element:HTMLElement, private outputelement:HTMLElement, private editor:HexEditor) {
        $(element).append($('<select>' + ['utf-8', 'ascii', 'utf-16', 'shift-jis'].map(v => '<option>' + v + '</option>').join('') + '</select>').change((e) => {
            editor.encoder = new TextDecoderEncoding($(e.target).val());
        }));
        $(element).append($('<select>' + ['8-bit', '16-bit', '32-bit'].map(v => '<option>' + v + '</option>').join('') + '</select>').change((e) => {
            this.bitCount = parseInt($(e.target).val());
            //console.log(this.bits);
        }));
        $(document).on('dragover', e => {
            $(editor.element).addClass('drag');
            return false;
        });

        $(document).on('dragend', e => {
            $(editor.element).removeClass('drag');
            return false;
        });

        document.ondrop = (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();

            $(editor.element).removeClass('drag');

            var file = (<DragEvent>e).dataTransfer.files[0];
            var reader = new FileReader();
            reader.onload = (event) => {
                $(outputelement).html('');
                editor.setData(new Uint8Array((<any>event.target).result));
                this.analyze(new AnalyzerType('autodetect'));
            };
            console.log(file);
            reader.readAsArrayBuffer(file);

            return false;
        };

        $(element).append($('<select>' + ['', 'autodetect', 'png', 'zip', 'swf', 'deflate', 'zlib'].map(v => '<option>' + v + '</option>').join('') + '</select>').change((e) => {
            var value = $(e.target).val();
            this.analyze(new AnalyzerType(value));
            $(e.target).val('');
        }));
        $(element).append($('<select>' + ['little-endian', 'big-endian'].map(v => '<option>' + v + '</option>').join('') + '</select>').change((e) => {
            this.little = (('' + $(e.target).val()).indexOf('little') >= 0);
        }));
        $(document).on('copy', e => {
            this.copy();
            if (window.clipboardData) {
                window.clipboardData.setData ("Text", "My clipboard data");
            }
            e.stopPropagation();
            e.preventDefault();
        });
        $(document).on('paste', e => {
            var clipbardData = (<any>e.originalEvent).clipboardData.getData('text/plain');
            //console.log(clipbardData);
            this.paste(clipbardData);
            e.stopPropagation();
            e.preventDefault();
        });
        editor.addHotkeys(['shift+0'], () => { this.zero(); });
        editor.addHotkeys(['cmd+i'], () => { this.invert(); });
        editor.addHotkeys(['cmd+a'], () => { this.selectAll(); });
        editor.addHotkeys(['t'], () => { this.text(); });
        editor.addHotkeys(['r'], () => { this.random(); });
        editor.addHotkeys(['minus'], () => { this.increment(-1); });
        editor.addHotkeys(['plus'], () => { this.increment(1); });
        editor.addHotkeys(['backspace'], () => { this.zero(); });
        $(element).append($('<input type="button" value="invert (cmd+i)" />').click(() => { this.invert(); }));
        $(element).append($('<input type="button" value="decrement (-)" />').click(() => { this.increment(-1); }));
        $(element).append($('<input type="button" value="increment (+)" />').click(() => { this.increment(1); }));
        $(element).append($('<input type="button" value="rotate left" />').click(() => { this.rotate(-1); }));
        $(element).append($('<input type="button" value="rotate right" />').click(() => { this.rotate(+1); }));
        $(element).append($('<input type="button" value="create scale" />').click(() => { this.createScale(1, 0); }));
        $(element).append($('<input type="button" value="random (r)" />').click(() => { this.random(); }));
        $(element).append($('<input type="button" value="zero (backspace)" />').click(() => { this.zero(); }));
        $(element).append($('<input type="button" value="select all" />').click(() => { this.selectAll(); }));
        $(element).append($('<input type="button" value="text (t)" />').click(() => { this.text(); }));
        $(element).append($('<input type="button" value="str_rot13" />').click(() => { this.rot13(); }));
        $(element).append($('<input type="button" value="upper" />').click(() => { this.upper(); }));
        $(element).append($('<input type="button" value="lower" />').click(() => { this.lower(); }));
        $(element).append($('<input type="button" value="output_as_hex" />').click(() => { this.outputHex(); }));
        $(element).append($('<input type="button" value="output_as_c" />').click(() => { this.outputC(); }));
        $(element).append($('<br />'));
        $(element).append($('<input type="button" value="load small png" />').click(() => { this.loadSmallPngWithLotOfChunks(); }));
        $(element).append($('<input type="button" value="load zip file" />').click(() => { this.loadZipFile(); }));
        $(element).append($('<input type="button" value="load medium png" />').click(() => { this.loadMediumPng(); }));
        $(element).append($('<input type="button" value="load deflate1" />').click(() => { this.loadDeflate1(); }));
        $(element).append($('<input type="button" value="load deflate2" />').click(() => { this.loadDeflate2(); }));
        $(element).append($('<input type="button" value="load deflate3" />').click(() => { this.loadDeflate3(); }));
        var info = $('<div>-</div>');
        $(element).append(info);
        editor.onMove.add(() => {
            var cursor = editor.cursor;
            info.text('column:' + cursor.column + ",cell:" + cursor.row + ',offset:' + cursor.viewoffset + ",selection=" + cursor.selection.length);
        });
        editor.update();
    }

    paste(data: any) {

    }

    copy() {

    }

    private _loadsample(name:string, type:AnalyzerType) {
        download(name, (data) => {
            this.editor.setData(data);
            this.analyze(type);
        });
    }

    analyze(type:AnalyzerType) {
        AnalyzerMapperPlugins.runAsync(type, this.editor).then(result => {
            console.log(result.node);
            if (result.error) console.error(result.error);
            $('#hexoutput').html('');
            $('#hexoutput').append(result.element);
        });
    }

    loadSmallPngWithLotOfChunks() { this._loadsample('check.png', new AnalyzerType('png')); }
    loadZipFile() { this._loadsample('zipfile.zip', new AnalyzerType('zip')); }
    loadMediumPng() { this._loadsample('scratch.png', new AnalyzerType('png')); }
    loadDeflate1() { this._loadsample('test.deflate', new AnalyzerType('deflate')); }
    loadDeflate2() { this._loadsample('test2.deflate', new AnalyzerType('deflate')); }
    loadDeflate3() { this._loadsample('test3.deflate', new AnalyzerType('deflate')); }

    outputHex() {
        var out = '';
        this.editor.cursor.selection.iterateByteOffsets(offset => {
            out += ('00' + this.editor.getByteAt(offset).toString(16)).slice(-2);
        });
        $(this.outputelement).text(out);
    }

    outputC() {
        var parts = [];
        this.editor.cursor.selection.iterateByteOffsets(offset => {
            parts.push('0x' + ('00' + this.editor.getByteAt(offset).toString(16)).slice(-2));
        });
        $(this.outputelement).text(
            'unsigned char data[' + parts.length + '] = {\n\t' +
            array_chunks(parts, 16).map(items => items.join(', ') + ',').join('\n\t').replace(/,$/, '') +
            '\n};'
        );
    }

    lower() {
        this.iterateSelection(c => { return String.fromCharCode(c).toLowerCase().charCodeAt(0); });
    }

    upper() {
        this.iterateSelection(c => { return String.fromCharCode(c).toUpperCase().charCodeAt(0); });
    }

    rot13() {
        this.iterateSelection(c => {
            if (c >= 'a'.charCodeAt(0) && c <= 'm'.charCodeAt(0) || c >= 'A'.charCodeAt(0) && c <= 'M'.charCodeAt(0)) {
                return c + 13
            } else if (c >= 'n'.charCodeAt(0) && c <= 'z'.charCodeAt(0) || c >= 'N'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) {
                return c - 13
            } else {
                return c;
            }
        });
    }

    text() {
        var text = prompt('Text to write');
        if (!text) return;
        var offset = 0;
        var data = this.editor.encoder.encode(text);

        this.iterateSelection(value => {
            if (offset >= data.length) return undefined;
            return data[offset++];
        });
    }

    selectAll() {
        if (this.editor.cursor.selection.isAll) {
            this.editor.cursor.selection.none();
        } else {
            this.editor.cursor.selection.all();
        }
    }

    createScale(add: number, multiply: number) {
        var first = undefined;
        this.iterateSelection(value => {
            if (first === undefined) {
                first = value;
            } else {
                first += add;
                add += multiply;
            }
            return first;
        });
    }

    private readInt(bytes: number[], littleEndian:boolean) {
        var out:number = 0;

        if (littleEndian) bytes = bytes.reverse();

        for (var n = 0; n < bytes.length; n++) {
            out <<= 8;
            out |= bytes[n] & 0xFF;
        }

        return out;
    }

    private createInt(value: number, byteCount:number, littleEndian:boolean) {
        var out = [];
        for (var n = 0; n < byteCount; n++) {
            out.push(value & 0xFF);
            value >>>= 8;
        }
        if (!littleEndian) out = out.reverse();
        return out;
    }

    private iterateSelection(processor: (value: number) => number) {
        var offsets = [];
        this.editor.cursor.selection2.iterateByteOffsets(offset => {
            if (offsets.length < this.byteCount) {
                offsets.push(offset);
            }

            if (offsets.length == this.byteCount) {
                var value = this.readInt(offsets.map(offset => this.editor.getByteAt(offset)), this.little)
                var result = processor(value);
                if (result !== undefined) {
                    this.createInt(result, offsets.length, this.little).forEach((v, index) => {
                        this.editor.setByteAt(offsets[index], v);
                    });
                }
                offsets.length = 0;
            }
        });
    }

    rotate(count: number) {
        this.iterateSelection(value => {
            switch (this.byteCount) {
                default:
                case 1: return ror8(value, (count | 0)); break;
                case 2: return ror16(value, (count | 0)); break;
                case 4: return ror32(value, (count | 0)); break;
            }
        });
    }

    random() {
        var randomData = new Uint8Array(this.editor.cursor.selection.length);
        (<any>window).crypto.getRandomValues(randomData);
        var view = new DataView(randomData.buffer);
        var offset = 0;
        this.iterateSelection(value => {
            var value = 0;
            switch (this.byteCount) {
                default:
                case 1: value = view.getInt8(offset); break;
                case 2: value = view.getInt16(offset); break;
                case 4: value = view.getInt32(offset); break;
            }
            offset += this.byteCount;
            return value;
        });
    }

    increment(count: number) {
        this.iterateSelection(value => value + (count | 0));
    }

    invert() {
        this.iterateSelection(value => ~value);
    }

    zero() {
        this.iterateSelection(value => 0);
    }
}




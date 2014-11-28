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
        $(element).append($('<select>' + ['little-endian', 'big-endian'].map(v => '<option>' + v + '</option>').join('') + '</select>').change((e) => {
            this.little = (('' + $(e.target).val()).indexOf('little') >= 0);
        }));
        editor.addHotkeys(['shift+0'], () => { this.zero(); });
        editor.addHotkeys(['cmd+i'], () => { this.invert(); });
        editor.addHotkeys(['cmd+a'], () => { this.selectAll(); });
        editor.addHotkeys(['minus'], () => { this.increment(-1); });
        editor.addHotkeys(['plus'], () => { this.increment(1); });
        editor.addHotkeys(['backspace'], () => { this.zero(); });
        $(element).append($('<input type="button" value="invert" />').click(() => { this.invert(); }));
        $(element).append($('<input type="button" value="decrement" />').click(() => { this.increment(-1); }));
        $(element).append($('<input type="button" value="increment" />').click(() => { this.increment(1); }));
        $(element).append($('<input type="button" value="rotate left" />').click(() => { this.rotate(-1); }));
        $(element).append($('<input type="button" value="rotate right" />').click(() => { this.rotate(+1); }));
        $(element).append($('<input type="button" value="create scale" />').click(() => { this.createScale(1, 0); }));
        $(element).append($('<input type="button" value="random" />').click(() => { this.random(); }));
        $(element).append($('<input type="button" value="zero" />').click(() => { this.zero(); }));
        $(element).append($('<input type="button" value="select all" />').click(() => { this.selectAll(); }));
        $(element).append($('<input type="button" value="text" />').click(() => { this.text(); }));
        $(element).append($('<input type="button" value="str_rot13" />').click(() => { this.rot13(); }));
        $(element).append($('<input type="button" value="output_as_hex" />').click(() => { this.outputHex(); }));
        $(element).append($('<input type="button" value="output_as_c" />').click(() => { this.outputC(); }));
        $(element).append($('<input type="button" value="hash" />').click(() => { this.hash(); }));
        $(element).append($('<input type="button" value="analyze" />').click(() => { this.analyze(); }));
        $(element).append($('<input type="button" value="load sample" />').click(() => { this.loadsample(); }));
        var info = $('<div>-</div>');
        $(element).append(info);
        editor.onMove.add(() => {
            var cursor = editor.cursor;
            info.text('column:' + cursor.column + ",cell:" + cursor.row + ',offset:' + cursor.viewoffset + ",selection=" + cursor.selection.length);
        });
        editor.update();
    }

    loadsample() {
        download('check.png', (data) => {
            this.editor.setData(data);
            AnalyzerMapperPlugins.runAsync('PNG', this.editor).then(result => {
                console.log(result.node);
                if (result.error) console.error(result.error);
                $('#hexoutput').html('');
                $('#hexoutput').append(result.element);
            });
        });
    }

    hash() {
    }

    analyze() {
    }

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

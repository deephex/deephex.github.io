/// <reference path="./editor.ts" />
/// <reference path="./utils.ts" />

class AnalyzerMapperElement {
    constructor(public name:string, public type:string, public offset = 0, public bitoffset = 0, public bitcount = 0, public value = null, public representer?: ValueRepresenter) {
    }

    getValueHtmlString(editor:HexEditor) {
        if (this.value && this.value.toHtml) {
            return this.value.toHtml(editor);
        } else if (this.representer) {
            return this.representer.represent(this.value);
        } else {
            return htmlspecialchars(this.value);
        }
    }
}

class HexChunk {
    constructor(public data:number[], public type:string = 'autodetect2') {
    }

    toHtml(editor:HexEditor) {
        var item = $('<span>');
        item.append($('<span class="itemlink">[LOAD]</span>').click(e => {
            e.stopPropagation();
            e.preventDefault();
            //alert(1);
            editor.setData(new Uint8Array(this.data));
            AnalyzerMapperPlugins.runAsync(this.type, editor);
            return false;
        }));
        //item.append('HexChunk[' + this.data.length + '](' + CType.ensurePrintable(String.fromCharCode.apply(null, this.data)) + ')');
        item.append('HexChunk[' + this.data.length + '](' + this.type + ')');
        return item;
    }
}

class ValueRepresenter {
    constructor(public represent: (value:number) => string) {
    }

    static enum(map:NumberDictionary<string>, hex = false) {
        return new ValueRepresenter((value) => {
            var name = map[value] || 'unknown';
            return name + '(' + (hex ? ('0x' + value.toString(16)) : String(value)) + ')';
        });
    }
}

function EnumRepresenter(map:NumberDictionary<string>, hex = false) {
    return ValueRepresenter.enum(map, hex);
}

var BoolRepresenter = new ValueRepresenter((value:number) => {
    return (value ? 'true' : 'false') + ' (' + value + ')';
});

var HexRepresenter = new ValueRepresenter((value:number) => {
    return '0x' + ('00000000' + value.toString(16)).slice(-8).toUpperCase();
});

var ErrorRepresenter = new ValueRepresenter((value:any) => {
    return '<span style="color:red;">' + value + '</span>';
});

var CharRepresenter = new ValueRepresenter((value:number) => {
    return '0x' + ('0000' + value.toString(16)).slice(-4).toUpperCase() + " ('" + String.fromCharCode(value) + "')";
});

var BinRepresenter = new ValueRepresenter((value:number) => {
    return '0b' + ('00000000' + value.toString(2)).slice(-8).toUpperCase();
});

class AnalyzerMapperNode extends AnalyzerMapperElement {
    elements: AnalyzerMapperElement[] = [];
    expanded:boolean = true;

    constructor(name:string, public parent: AnalyzerMapperNode, private soffset: number = 0, private scount: number = 0) {
        super(name, 'struct');
    }

    get hasElements() { return this.elements.length > 0; }
    get first() { return this.elements[0]; }
    get last() { return this.elements[this.elements.length - 1]; }

    get offset() {
        if (!this.hasElements) return this.soffset;
        return this.first.offset;
    }
    get bitoffset() {
        if (!this.hasElements) return 0;
        return this.first.bitoffset;
    }
    get bitcount() {
        if (!this.scount) return 0;
        return (this.last.offset - this.offset) * 8 + this.last.bitcount;
    }
}

class AnalyzerMapperPlugins {
    static templates: StringDictionary<(mapper:AnalyzerMapper) => void> = {};

    static register(name:string, callback:(mapper:AnalyzerMapper) => void) {
        AnalyzerMapperPlugins.templates[name.toLowerCase()] = callback;
    }

    static runAsync(name: string, editor:HexEditor) {
        return editor.getDataAsync().then(data => {
            name = String(name).toLowerCase();
            var mapper = new AnalyzerMapper(new DataView(data.buffer));
            var e:any;
            var template = AnalyzerMapperPlugins.templates[name];
            try {
                if (!template) throw new Error("Can't find template '" + name + "'");
                template(mapper);
            } catch (_e) {
                mapper.node.elements.push(new AnalyzerMapperElement('error', 'error', 0, 0, 0, _e, ErrorRepresenter));
                console.error(_e);
                e = _e;
            }
            return new AnalyzerMapperRendererResult(
                new AnalyzerMapperRenderer(editor).html(mapper.node),
                mapper.node,
                editor,
                mapper,
                e
            );
        });
    }
}

class AnalyzerMapper {
    offset = 0;
    bitsoffset = 0;
    bitdata = 0;
    bitsavailable = 0;
    little = true;

    constructor(public data:DataView, public node:AnalyzerMapperNode = null, public addoffset = 0) {
        if (this.node == null) this.node = new AnalyzerMapperNode("root", null, addoffset, data.byteLength);
    }

    get available() { return this.length - this.offset; }
    get length() { return this.data.byteLength; }

    private _read<T>(name:string, type:string, bytecount: number, read: (offset: number) => T, representer?: ValueRepresenter):T {
        var value = read(this.offset);
        var element = new AnalyzerMapperElement(name, type, this.addoffset + this.offset, 0, 8 * bytecount, value, representer);
        this.node.elements.push(element);
        this.offset += bytecount;
        return value;
    }

    readByte() {
        if (this.available < 0) throw new Error("No more data available");
        return this.data.getUint8(this.offset++);
    }

    readBits(bitcount:number) {
        if (bitcount == 0) return 0;
        while (this.bitsavailable < bitcount) {
            this.bitsoffset = this.offset;
            this.bitdata |= this.readByte() << this.bitsavailable;
            this.bitsavailable += 8;
        }
        var readed = BitUtils.extract(this.bitdata, 0, bitcount);
        this.bitdata >>>= bitcount;
        this.bitsavailable -= bitcount;
        return readed;
    }

    readBytes(count:number) {
        var out = [];
        for (var n = 0; n < count; n++) out.push(this.readByte());
        return out;
    }

    bits(name: string, bitcount:number, representer?: ValueRepresenter) {
        var offset = this.bitsoffset;
        var value = this.readBits(bitcount);
        var element = new AnalyzerMapperElement(name, 'bits[' + bitcount + ']', this.addoffset + this.offset, 0, MathUtils.ceilMultiple(bitcount, 8), value, representer);
        this.node.elements.push(element);
        return value;
    }

    alignbyte() {
        this.bitsavailable = 0;
        this.bitdata = 0;
    }

    set name(v:string) { this.node.name = v; }
    set value(v:any) { this.node.value = v; }

    get globaloffset() { return this.addoffset + this.offset; }

    u8(name:string, representer?: ValueRepresenter) { return this._read(name, 'u8', 1, offset => this.data.getUint8(offset), representer); }
    u16(name:string, representer?: ValueRepresenter) { return this._read(name, 'u16', 2, offset => this.data.getUint16(offset, this.little), representer); }
    u32(name:string, representer?: ValueRepresenter) { return this._read(name, 'u32', 4, offset => this.data.getUint32(offset, this.little), representer); }
    str(name:string, count:number, encoding:string = 'ascii') {
        var textData = new Uint8Array(count);
        for (var n = 0; n < count; n++) textData[n] = this.data.getUint8(this.offset + n);
        var value = new TextDecoder(encoding).decode(textData);
        this.node.elements.push(new AnalyzerMapperElement(name, 'u8[' + count + ']', this.globaloffset, 0, 8 * count, value));
        this.offset += count;
        return value;
    }
    strz(name:string, encoding:string = 'ascii') {
        var count = 0;
        for (var n = 0; n < this.available; n++) {
            count++;
            if (this.data.getUint8(this.offset + n) == 0) break;
        }
        return this.str(name, count, encoding);
    }
    subs(name:string, count:number, callback?: (mapper:AnalyzerMapper) => void) {
        var value = <ArrayBuffer>((<any>this.data.buffer).slice(this.offset, this.offset + count));
        var subsnode = new AnalyzerMapperNode(name, this.node, this.offset, count);
        var mapper = new AnalyzerMapper(new DataView(value), subsnode, this.offset);
        mapper.little = this.little;
        this.node.elements.push(subsnode);
        this.offset += count;
        if (callback) {
            var result = callback(mapper);
            mapper.node.value = result;
        }
        return mapper;
    }
    chunk(name:string, count:number, type:string = 'autodetect3', representer?: ValueRepresenter) {
        var element = new AnalyzerMapperElement(name, 'chunk', this.globaloffset, 0, count * 8, null, representer);
        element.value = new HexChunk(this.readBytes(count), type);
        this.node.elements.push(element);
        return element;
    }

    struct(name:string, callback: (node?:AnalyzerMapperNode) => void, expanded:boolean = true) {
        var parentnode = this.node;
        var groupnode = this.node = new AnalyzerMapperNode(name, this.node);
        var value = callback(groupnode);
        groupnode.value = value;
        groupnode.expanded = expanded;
        this.node = parentnode;
        this.node.elements.push(groupnode);
    }

    toffset = 0;

    tvalueOffset<T>(callback: () => void) {
        var old = this.toffset;
        this.toffset = this.offset;
        callback();
        this.toffset = old;
    }

    tvalue<T>(name:string, type:string, value:T, representer?: ValueRepresenter) {
        this.node.elements.push(new AnalyzerMapperElement(
            name, type, this.toffset,
            0, (this.offset - this.toffset) * 8,
            value, representer
        ));
        this.toffset = this.offset;
    }
}

class AnalyzerMapperRendererResult {
    constructor(public element:HTMLElement, public node:AnalyzerMapperElement, public editor:HexEditor, public mapper:AnalyzerMapper, public error:any) {

    }
}

class AnalyzerMapperRenderer {
    constructor(private editor:HexEditor) {

    }

    html(element:AnalyzerMapperElement) {
        var source = this.editor.source;
        var e = $('<div class="treeelement">');
        var title = $('<div class="treetitle">');
        var type = $('<span class="treetitletype">').text(element.type);
        var name = $('<span class="treetitlename">').text(element.name);
        var value = $('<span class="treetitlevalue">').append(element.getValueHtmlString(this.editor));
        title.append(type, name, value);
        e.append(title);

        title.mouseover(e => {
            if (this.editor.source != source) return;
            this.editor.cursor.selection.makeSelection(element.offset, element.bitcount / 8);
            this.editor.ensureViewVisibleRange(element.offset);
        });

        if (element instanceof AnalyzerMapperNode) {
            var node = (<AnalyzerMapperNode>element);
            if (node.elements.length > 0) {
                title.addClass('treehaschildren');
                var childs = $('<div class="treechildren">');
                title.addClass(node.expanded ? 'expanded' : 'unexpanded');
                childs.addClass(node.expanded ? 'expanded' : 'unexpanded');
                node.elements.forEach(e => {
                    childs.append(this.html(e));
                });
                title.click(e => {
                    var expanded = title.hasClass('expanded');
                    title.toggleClass('expanded', !expanded);
                    childs.toggleClass('expanded', !expanded);

                    title.toggleClass('unexpanded', expanded);
                    childs.toggleClass('unexpanded', expanded);
                });
                e.append(childs);
            } else {
                title.addClass('treenohaschildren');
            }
        } else {
            title.addClass('treenohaschildren');
            title.click(e => {
                var newvalue = prompt("new value", element.value);
                if (newvalue) {

                }
            });
        }
        return e.get(0);
    }
}



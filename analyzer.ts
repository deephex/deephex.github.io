/// <reference path="./editor.ts" />
/// <reference path="./utils.ts" />

class AnalyzerMapperElement {
    constructor(public name:string, public type:string, public offset = 0, public bitoffset = 0, public bitcount = 0, public value = null) {
    }
}

class AnalyzerMapperNode extends AnalyzerMapperElement {
    elements: AnalyzerMapperElement[] = [];

    constructor(name:string, public parent: AnalyzerMapperNode) {
        super(name, 'struct');
    }

    get first() { return this.elements[0]; }
    get last() { return this.elements[this.elements.length - 1]; }

    get offset() { return this.first.offset; }
    get bitoffset() { return this.first.bitoffset; }
    get bitcount() { return (this.last.offset - this.offset) * 8 + this.last.bitcount; }
}

interface StringDictionary<T> {
    [name: string]: T;
}

class AnalyzerMapperPlugins {
    static templates: StringDictionary<(mapper:AnalyzerMapper) => void> = {};

    static register(name:string, callback:(mapper:AnalyzerMapper) => void) {
        AnalyzerMapperPlugins.templates[name] = callback;
    }

    static runAsync(name: string, editor:HexEditor) {
        return editor.getDataAsync().then(data => {
            var mapper = new AnalyzerMapper(new DataView(data.buffer));
            var e:any;
            try {
                AnalyzerMapperPlugins.templates[name](mapper);
            } catch (_e) {
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
    bitoffset = 0;
    little = true;

    constructor(private data:DataView, public node:AnalyzerMapperNode = null, public addoffset = 0) {
        if (this.node == null) this.node = new AnalyzerMapperNode("root", null);
    }

    get available() { return this.length - this.offset; }
    get length() { return this.data.byteLength; }

    private _read<T>(name:string, type:string, bytecount: number, read: (offset: number) => T):T {
        var value = read(this.offset);
        this.node.elements.push(new AnalyzerMapperElement(name, type, this.addoffset + this.offset, 0, 8 * bytecount, value));
        this.offset += bytecount;
        return value;
    }

    u8(name:string) { return this._read(name, 'u8', 1, offset => this.data.getUint8(offset)); }
    u16(name:string) { return this._read(name, 'u16', 2, offset => this.data.getUint16(offset, this.little)); }
    u32(name:string) { return this._read(name, 'u32', 4, offset => this.data.getUint32(offset, this.little)); }
    str(name:string, count:number, encoding:string = 'ascii') {
        var textData = new Uint8Array(count);
        for (var n = 0; n < count; n++) textData[n] = this.data.getUint8(this.offset + n);
        var value = new TextDecoder(encoding).decode(textData);
        this.node.elements.push(new AnalyzerMapperElement(name, 'u8[' + count + ']', this.addoffset + this.offset, 0, 8 * count, value));
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
        var subsnode = new AnalyzerMapperNode(name, this.node);
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

    struct(name:string, callback: () => void) {
        var parentnode = this.node;
        var groupnode = this.node = new AnalyzerMapperNode(name, this.node);
        var value = callback();
        groupnode.value = value;
        this.node = parentnode;
        this.node.elements.push(groupnode);
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
        var e = $('<div class="treeelement">');
        var title = $('<div class="treetitle expanded">');
        var type = $('<span class="treetitletype">').text(element.type);
        var name = $('<span class="treetitlename">').text(element.name);
        var value = $('<span class="treetitlevalue">').text(element.value);
        title.append(type, name, value);
        e.append(title);

        title.mouseover(e => {
            this.editor.cursor.selection.makeSelection(element.offset, element.bitcount / 8);
        });

        if (element instanceof AnalyzerMapperNode) {
            var node = (<AnalyzerMapperNode>element);
            if (node.elements.length > 0) {
                title.addClass('treehaschildren');
                var childs = $('<div class="treechildren expanded">');
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
            }
        } else {
            title.click(e => {
                var newvalue = prompt("new value", element.value);
                if (newvalue) {

                }
            });
        }
        return e.get(0);
    }
}



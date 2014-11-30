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

class AnalyzerType {
    constructor(public name:string, public arguments?:any[]) {
        if (!this.name) this.name = 'autodetect';
        if (!this.arguments) this.arguments = [];
    }

    toString() { return this.arguments.length ? (this.name + ':' + this.arguments.join(',')) : this.name; }
}

class HexChunk {
    constructor(public source:HexSource, public type?:AnalyzerType) {
        if (!this.type) this.type = new AnalyzerType('autodetect');
    }

    toHtml(editor:HexEditor) {
        var item = $('<span>');
        item.append($('<span class="itemlink">[LOAD]</span>').click(e => {
            e.stopPropagation();
            e.preventDefault();
            //alert(1);
            editor.source = this.source;
            AnalyzerMapperPlugins.runAsync(this.type, editor).then(result => {
                console.log(result.node);
                if (result.error) console.error(result.error);
                $('#hexoutput').html('');
                $('#hexoutput').append(result.element);
            });
            return false;
        }));
        //item.append('HexChunk[' + this.data.length + '](' + CType.ensurePrintable(String.fromCharCode.apply(null, this.data)) + ')');
        item.append('HexChunk[' + this.source.length + '](' + this.type + ')');
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
        if (!this.hasElements) return this.scount * 8;
        return (this.last.offset - this.offset) * 8 + this.last.bitcount;
    }
}

class AnalyzerMapperPlugin {
    constructor(public name:string, public detect:(data:DataView) => number, public analyzeAsync:(mapper:AnalyzerMapper, type:AnalyzerType) => Promise<any>) {
    }
}

class AnalyzerMapperPlugins {
    static templates: StringDictionary<AnalyzerMapperPlugin> = {};

    static registerPlugin(plugin:AnalyzerMapperPlugin) {
        var name = plugin.name = String(plugin.name).toLowerCase();
        console.log('registered plugin', name.toLowerCase(), plugin);
        this.templates[name.toLowerCase()] = plugin;
    }

    static register(name:string, detect:(data:DataView) => number, analyzeAsync:(mapper:AnalyzerMapper, type:AnalyzerType) => Promise<any>) {
        return this.registerPlugin(new AnalyzerMapperPlugin(name, detect, analyzeAsync));
    }

    static runAsync(type: AnalyzerType, editor:HexEditor) {
        console.info('AnalyzerMapperPlugins.runAsync()');
        var data = new Uint8Array(0x9000);
        return editor.source.readAsync(0, 0x9000, data).then(readed => {
            type.name = String(type.name).toLowerCase();

            if (type.name == 'autodetect') {
                try {
                    var dataview = new DataView(data.buffer);
                    var items = _.sortBy(_.values(AnalyzerMapperPlugins.templates).map((v, k) => {
                        return { name: v.name, priority: v.detect(dataview) };
                    }), v => v.priority).reverse();

                    console.log(JSON.stringify(items));

                    var item = items[0];
                    type.name = item.name;
                    //items.sort(v => v.priority)
                } catch (e) {
                    console.error(e);
                }
            }

            console.info('detected type:', type);

            return type;
        }).then(type => {
            //console.log('aaaaaaaaa');
            var e:any;
            var name = type.name;
            var mapper = new AnalyzerMapper(editor.source);

            var template = <AnalyzerMapperPlugin>AnalyzerMapperPlugins.templates[name];

            if (!template) {
                console.error("Can't find template '" + name + "'");
                throw new Error("Can't find template '" + name + "'");
            }
            mapper.value = type;

            return template.analyzeAsync(mapper, type).then(value => {

            }, _e => {
                mapper.node.elements.push(new AnalyzerMapperElement('error', 'error', 0, 0, 0, _e, ErrorRepresenter));
                console.error(_e);
                e = _e;
            }).then(result => {
                return new AnalyzerMapperRendererResult(
                    new AnalyzerMapperRenderer(editor).html(mapper.node),
                    mapper.node,
                    editor,
                    mapper,
                    e
                );
            })
        });
    }
}

class AnalyzerMapper {
    offset = 0;
    bitsoffset = 0;
    bitdata = 0;
    bitsavailable = 0;
    little = true;
    data:AsyncDataView;

    constructor(public source:HexSource, public node:AnalyzerMapperNode = null, public addoffset = 0) {
        this.data = new AsyncDataView(source);
        if (this.node == null) this.node = new AnalyzerMapperNode("root", null, addoffset, this.data.length);
    }

    get available() { return this.length - this.offset; }
    get length() { return this.data.length; }

    private _readAsync<T>(name:string, type:string, bytecount: number, readAsync: (offset: number) => Promise<T>, representer?: ValueRepresenter):Promise<T> {
        var offset = this.offset;
        this.offset += bytecount;
        return readAsync(offset).then(value => {
            var element = new AnalyzerMapperElement(name, type, this.addoffset + offset, 0, 8 * bytecount, value, representer);
            this.node.elements.push(element);
            return value;
        });
    }

    get position() { return this.offset; }
    set position(value:number) { this.offset = value; }

    readByte() {
        if (this.available < 0) throw new Error("No more data available");
        return this.data.getUint8Async(this.offset++);
    }

    readBitsAsync(bitcount:number) {
        if (bitcount == 0) return Promise.resolve(0);
        var bytestofeed = 0;
        if (this.bitsavailable < bitcount) {
            bytestofeed = Math.ceil((bitcount - this.bitsavailable) / 8);
        }

        return this.readBytes(bytestofeed).then(feed => {
            feed.forEach(byte => {
                this.bitsoffset = this.offset;
                this.bitdata |= byte << this.bitsavailable;
                this.bitsavailable += 8;
            });

            var readed = BitUtils.extract(this.bitdata, 0, bitcount);
            this.bitdata >>>= bitcount;
            this.bitsavailable -= bitcount;
            return readed;
        });
    }

    readBytes(count:number) {
        if (count == 0) return Promise.resolve([]);
        var offset = this.offset;
        this.offset += count;
        return this.data.getUint8ArrayAsync(offset, count);
    }

    bits(name: string, bitcount:number, representer?: ValueRepresenter) {
        var offset = this.bitsoffset;
        return this.readBitsAsync(bitcount).then(value => {
            var element = new AnalyzerMapperElement(name, 'bits[' + bitcount + ']', this.addoffset + offset, 0, MathUtils.ceilMultiple(bitcount, 8), value, representer);
            this.node.elements.push(element);
            return value;
        });
    }

    bitBool(name: string) {
        return this.bits(name, 1, BoolRepresenter).then(value => {
            return value != 0;
        });
    }

    alignbyte() {
        this.bitsavailable = 0;
        this.bitdata = 0;
    }

    set name(v:string) { this.node.name = v; }
    set value(v:any) { this.node.value = v; }

    get globaloffset() { return this.addoffset + this.offset; }

    u8(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u8', 1, offset => this.data.getUint8Async(offset), representer); }

    u16(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u16', 2, offset => this.data.getUint16Async(offset, this.little), representer); }
    u16_le(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u16_le', 2, offset => this.data.getUint16Async(offset, true), representer); }
    u16_be(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u16_be', 2, offset => this.data.getUint16Async(offset, false), representer); }

    u32(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u32', 4, offset => this.data.getUint32Async(offset, this.little), representer); }
    u32_le(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u32_le', 4, offset => this.data.getUint32Async(offset, true), representer); }
    u32_be(name:string, representer?: ValueRepresenter) { return this._readAsync(name, 'u32_be', 4, offset => this.data.getUint32Async(offset, false), representer); }
    str(name:string, count:number, encoding:string = 'ascii') {
        return this.data.getUint8ArrayAsync(this.offset, count).then(values => {
            var textData = new Uint8Array(values);
            var value = new TextDecoder(encoding).decode(textData);
            this.node.elements.push(new AnalyzerMapperElement(name, 'u8[' + count + ']', this.globaloffset, 0, 8 * count, value));
            this.offset += count;
            return value;
        });
    }
    strz(name:string, encoding:string = 'ascii') {
        var count = 0;
        var loopAsync = () => {
            if (count >= this.available) return Promise.resolve(this.str(name, count, encoding));

            return this.data.getUint8Async(this.offset + count).then(value => {
                count++;

                if (value != 0) {
                    return loopAsync();
                } else {
                    return this.str(name, count, encoding);
                }
            });
        };
        return loopAsync().then(result => {
            return result;
        });
    }
    subs<T>(name:string, count:number, callbackAsync?: (mapper:AnalyzerMapper) => Promise<T>) {
        var sourceSlice = new HexSourceSlice(this.source, this.offset, this.offset + count);

        var subsnode = new AnalyzerMapperNode(name, this.node, this.offset, count);
        var mapper = new AnalyzerMapper(sourceSlice, subsnode, this.offset);
        mapper.little = this.little;
        this.offset += count;
        this.node.elements.push(subsnode);
        if (callbackAsync) {
            return callbackAsync(mapper).then(result => {
                mapper.node.value = result;
                return mapper;
            });
        } else {
            return Promise.resolve(mapper);
        }
    }

    readSlice(count:number) {
        var offset = this.offset;
        this.offset += count;
        return this.data.getSliceAsync(offset, count);
    }

    chunk(name:string, count:number, type:AnalyzerType = null, representer?: ValueRepresenter) {
        var element = new AnalyzerMapperElement(name, 'chunk', this.globaloffset, 0, count * 8, null, representer);

        return this.readSlice(count).then(data => {
            element.value = new HexChunk(data, type);
            this.node.elements.push(element);
            return element;
        })
    }

    struct(name:string, callbackAsync: (node?:AnalyzerMapperNode) => Promise<any>, expanded:boolean = true) {
        var parentnode = this.node;
        var groupnode = this.node = new AnalyzerMapperNode(name, this.node);
        var restore = () => {
            groupnode.expanded = expanded;
            this.node = parentnode;
            this.node.elements.push(groupnode);
        };
        return callbackAsync(groupnode).then(value => {
            groupnode.value = value;
            restore();
            return value;
        }, error => {
            groupnode.value = null;
            restore();
            throw(error);
        })
    }

    structNoExpand(name:string, callbackAsync: (node?:AnalyzerMapperNode) => Promise<any>) {
        return this.struct(name, callbackAsync, false);
    }

    toffset = 0;

    tvalueOffsetAsync<T>(callbackAsync: () => Promise<any>) {
        var old = this.toffset;
        this.toffset = this.offset;
        var restore = () => {
            this.toffset = old;
        };
        return callbackAsync().then(() => {
            restore();
        }, error => {
            restore();
            throw(error);
        })
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
            var start = element.offset;
            var end = start + element.bitcount / 8;
            //console.info(element, element.offset, element.bitcount / 8);
            this.editor.cursor.selection.makeSelection(start, end - start);
            this.editor.ensureViewVisibleRange(start, end - 1);
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
                    window.getSelection().removeAllRanges();
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



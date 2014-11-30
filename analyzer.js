/// <reference path="./editor.ts" />
/// <reference path="./utils.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var AnalyzerMapperElement = (function () {
    function AnalyzerMapperElement(name, type, offset, bitoffset, bitcount, value, representer) {
        if (offset === void 0) { offset = 0; }
        if (bitoffset === void 0) { bitoffset = 0; }
        if (bitcount === void 0) { bitcount = 0; }
        if (value === void 0) { value = null; }
        this.name = name;
        this.type = type;
        this.offset = offset;
        this.bitoffset = bitoffset;
        this.bitcount = bitcount;
        this.value = value;
        this.representer = representer;
    }
    AnalyzerMapperElement.prototype.getValueHtmlString = function (editor) {
        if (this.value && this.value.toHtml) {
            return this.value.toHtml(editor);
        }
        else if (this.representer) {
            return this.representer.represent(this.value);
        }
        else {
            return htmlspecialchars(this.value);
        }
    };
    return AnalyzerMapperElement;
})();
var AnalyzerType = (function () {
    function AnalyzerType(name, arguments) {
        this.name = name;
        this.arguments = arguments;
        if (!this.name)
            this.name = 'autodetect';
        if (!this.arguments)
            this.arguments = [];
    }
    AnalyzerType.prototype.toString = function () {
        return this.arguments.length ? (this.name + ':' + this.arguments.join(',')) : this.name;
    };
    return AnalyzerType;
})();
var HexChunk = (function () {
    function HexChunk(data, type) {
        this.data = data;
        this.type = type;
        if (!this.type)
            this.type = new AnalyzerType('autodetect');
    }
    HexChunk.prototype.toHtml = function (editor) {
        var _this = this;
        var item = $('<span>');
        item.append($('<span class="itemlink">[LOAD]</span>').click(function (e) {
            e.stopPropagation();
            e.preventDefault();
            //alert(1);
            editor.setData(new Uint8Array(_this.data));
            AnalyzerMapperPlugins.runAsync(_this.type, editor).then(function (result) {
                console.log(result.node);
                if (result.error)
                    console.error(result.error);
                $('#hexoutput').html('');
                $('#hexoutput').append(result.element);
            });
            return false;
        }));
        //item.append('HexChunk[' + this.data.length + '](' + CType.ensurePrintable(String.fromCharCode.apply(null, this.data)) + ')');
        item.append('HexChunk[' + this.data.length + '](' + this.type + ')');
        return item;
    };
    return HexChunk;
})();
var ValueRepresenter = (function () {
    function ValueRepresenter(represent) {
        this.represent = represent;
    }
    ValueRepresenter.enum = function (map, hex) {
        if (hex === void 0) { hex = false; }
        return new ValueRepresenter(function (value) {
            var name = map[value] || 'unknown';
            return name + '(' + (hex ? ('0x' + value.toString(16)) : String(value)) + ')';
        });
    };
    return ValueRepresenter;
})();
function EnumRepresenter(map, hex) {
    if (hex === void 0) { hex = false; }
    return ValueRepresenter.enum(map, hex);
}
var BoolRepresenter = new ValueRepresenter(function (value) {
    return (value ? 'true' : 'false') + ' (' + value + ')';
});
var HexRepresenter = new ValueRepresenter(function (value) {
    return '0x' + ('00000000' + value.toString(16)).slice(-8).toUpperCase();
});
var ErrorRepresenter = new ValueRepresenter(function (value) {
    return '<span style="color:red;">' + value + '</span>';
});
var CharRepresenter = new ValueRepresenter(function (value) {
    return '0x' + ('0000' + value.toString(16)).slice(-4).toUpperCase() + " ('" + String.fromCharCode(value) + "')";
});
var BinRepresenter = new ValueRepresenter(function (value) {
    return '0b' + ('00000000' + value.toString(2)).slice(-8).toUpperCase();
});
var AnalyzerMapperNode = (function (_super) {
    __extends(AnalyzerMapperNode, _super);
    function AnalyzerMapperNode(name, parent, soffset, scount) {
        if (soffset === void 0) { soffset = 0; }
        if (scount === void 0) { scount = 0; }
        _super.call(this, name, 'struct');
        this.parent = parent;
        this.soffset = soffset;
        this.scount = scount;
        this.elements = [];
        this.expanded = true;
    }
    Object.defineProperty(AnalyzerMapperNode.prototype, "hasElements", {
        get: function () {
            return this.elements.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapperNode.prototype, "first", {
        get: function () {
            return this.elements[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapperNode.prototype, "last", {
        get: function () {
            return this.elements[this.elements.length - 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapperNode.prototype, "offset", {
        get: function () {
            if (!this.hasElements)
                return this.soffset;
            return this.first.offset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapperNode.prototype, "bitoffset", {
        get: function () {
            if (!this.hasElements)
                return 0;
            return this.first.bitoffset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapperNode.prototype, "bitcount", {
        get: function () {
            if (!this.scount)
                return 0;
            return (this.last.offset - this.offset) * 8 + this.last.bitcount;
        },
        enumerable: true,
        configurable: true
    });
    return AnalyzerMapperNode;
})(AnalyzerMapperElement);
var AnalyzerMapperPlugin = (function () {
    function AnalyzerMapperPlugin(name, detect, analyze) {
        this.name = name;
        this.detect = detect;
        this.analyze = analyze;
    }
    return AnalyzerMapperPlugin;
})();
var AnalyzerMapperPlugins = (function () {
    function AnalyzerMapperPlugins() {
    }
    AnalyzerMapperPlugins.registerPlugin = function (plugin) {
        var name = plugin.name = String(plugin.name).toLowerCase();
        console.log('registered plugin', name.toLowerCase(), plugin);
        this.templates[name.toLowerCase()] = plugin;
    };
    AnalyzerMapperPlugins.register = function (name, detect, analyze) {
        return this.registerPlugin(new AnalyzerMapperPlugin(name, detect, analyze));
    };
    AnalyzerMapperPlugins.runAsync = function (type, editor) {
        return editor.getDataAsync().then(function (data) {
            var name = type.name;
            name = String(name).toLowerCase();
            var dataview = new DataView(data.buffer);
            var mapper = new AnalyzerMapper(dataview);
            var e;
            if (name == 'autodetect') {
                try {
                    var items = _.sortBy(_.values(AnalyzerMapperPlugins.templates).map(function (v, k) {
                        return { name: v.name, priority: v.detect(dataview) };
                    }), function (v) { return v.priority; }).reverse();
                    console.log(JSON.stringify(items));
                    var item = items[0];
                    name = item.name;
                    type.name = name;
                }
                catch (e) {
                    console.error(e);
                }
            }
            var template = AnalyzerMapperPlugins.templates[name];
            try {
                if (!template)
                    throw new Error("Can't find template '" + name + "'");
                mapper.value = type;
                template.analyze(mapper, type);
            }
            catch (_e) {
                mapper.node.elements.push(new AnalyzerMapperElement('error', 'error', 0, 0, 0, _e, ErrorRepresenter));
                console.error(_e);
                e = _e;
            }
            return new AnalyzerMapperRendererResult(new AnalyzerMapperRenderer(editor).html(mapper.node), mapper.node, editor, mapper, e);
        });
    };
    AnalyzerMapperPlugins.templates = {};
    return AnalyzerMapperPlugins;
})();
var AnalyzerMapper = (function () {
    function AnalyzerMapper(data, node, addoffset) {
        if (node === void 0) { node = null; }
        if (addoffset === void 0) { addoffset = 0; }
        this.data = data;
        this.node = node;
        this.addoffset = addoffset;
        this.offset = 0;
        this.bitsoffset = 0;
        this.bitdata = 0;
        this.bitsavailable = 0;
        this.little = true;
        this.toffset = 0;
        if (this.node == null)
            this.node = new AnalyzerMapperNode("root", null, addoffset, data.byteLength);
    }
    Object.defineProperty(AnalyzerMapper.prototype, "available", {
        get: function () {
            return this.length - this.offset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapper.prototype, "length", {
        get: function () {
            return this.data.byteLength;
        },
        enumerable: true,
        configurable: true
    });
    AnalyzerMapper.prototype._read = function (name, type, bytecount, read, representer) {
        var value = read(this.offset);
        var element = new AnalyzerMapperElement(name, type, this.addoffset + this.offset, 0, 8 * bytecount, value, representer);
        this.node.elements.push(element);
        this.offset += bytecount;
        return value;
    };
    AnalyzerMapper.prototype.readByte = function () {
        if (this.available < 0)
            throw new Error("No more data available");
        return this.data.getUint8(this.offset++);
    };
    AnalyzerMapper.prototype.readBits = function (bitcount) {
        if (bitcount == 0)
            return 0;
        while (this.bitsavailable < bitcount) {
            this.bitsoffset = this.offset;
            this.bitdata |= this.readByte() << this.bitsavailable;
            this.bitsavailable += 8;
        }
        var readed = BitUtils.extract(this.bitdata, 0, bitcount);
        this.bitdata >>>= bitcount;
        this.bitsavailable -= bitcount;
        return readed;
    };
    AnalyzerMapper.prototype.readBytes = function (count) {
        var out = [];
        for (var n = 0; n < count; n++)
            out.push(this.readByte());
        return out;
    };
    AnalyzerMapper.prototype.bits = function (name, bitcount, representer) {
        var offset = this.bitsoffset;
        var value = this.readBits(bitcount);
        var element = new AnalyzerMapperElement(name, 'bits[' + bitcount + ']', this.addoffset + this.offset, 0, MathUtils.ceilMultiple(bitcount, 8), value, representer);
        this.node.elements.push(element);
        return value;
    };
    AnalyzerMapper.prototype.alignbyte = function () {
        this.bitsavailable = 0;
        this.bitdata = 0;
    };
    Object.defineProperty(AnalyzerMapper.prototype, "name", {
        set: function (v) {
            this.node.name = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapper.prototype, "value", {
        set: function (v) {
            this.node.value = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnalyzerMapper.prototype, "globaloffset", {
        get: function () {
            return this.addoffset + this.offset;
        },
        enumerable: true,
        configurable: true
    });
    AnalyzerMapper.prototype.u8 = function (name, representer) {
        var _this = this;
        return this._read(name, 'u8', 1, function (offset) { return _this.data.getUint8(offset); }, representer);
    };
    AnalyzerMapper.prototype.u16 = function (name, representer) {
        var _this = this;
        return this._read(name, 'u16', 2, function (offset) { return _this.data.getUint16(offset, _this.little); }, representer);
    };
    AnalyzerMapper.prototype.u32 = function (name, representer) {
        var _this = this;
        return this._read(name, 'u32', 4, function (offset) { return _this.data.getUint32(offset, _this.little); }, representer);
    };
    AnalyzerMapper.prototype.str = function (name, count, encoding) {
        if (encoding === void 0) { encoding = 'ascii'; }
        var textData = new Uint8Array(count);
        for (var n = 0; n < count; n++)
            textData[n] = this.data.getUint8(this.offset + n);
        var value = new TextDecoder(encoding).decode(textData);
        this.node.elements.push(new AnalyzerMapperElement(name, 'u8[' + count + ']', this.globaloffset, 0, 8 * count, value));
        this.offset += count;
        return value;
    };
    AnalyzerMapper.prototype.strz = function (name, encoding) {
        if (encoding === void 0) { encoding = 'ascii'; }
        var count = 0;
        for (var n = 0; n < this.available; n++) {
            count++;
            if (this.data.getUint8(this.offset + n) == 0)
                break;
        }
        return this.str(name, count, encoding);
    };
    AnalyzerMapper.prototype.subs = function (name, count, callback) {
        var value = (this.data.buffer.slice(this.offset, this.offset + count));
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
    };
    AnalyzerMapper.prototype.chunk = function (name, count, type, representer) {
        if (type === void 0) { type = null; }
        var element = new AnalyzerMapperElement(name, 'chunk', this.globaloffset, 0, count * 8, null, representer);
        element.value = new HexChunk(this.readBytes(count), type);
        this.node.elements.push(element);
        return element;
    };
    AnalyzerMapper.prototype.struct = function (name, callback, expanded) {
        if (expanded === void 0) { expanded = true; }
        var parentnode = this.node;
        var groupnode = this.node = new AnalyzerMapperNode(name, this.node);
        try {
            var value = callback(groupnode);
        }
        finally {
            groupnode.value = value;
            groupnode.expanded = expanded;
            this.node = parentnode;
            this.node.elements.push(groupnode);
        }
    };
    AnalyzerMapper.prototype.structNoExpand = function (name, callback) {
        return this.struct(name, callback, false);
    };
    AnalyzerMapper.prototype.tvalueOffset = function (callback) {
        var old = this.toffset;
        this.toffset = this.offset;
        try {
            callback();
        }
        finally {
            this.toffset = old;
        }
    };
    AnalyzerMapper.prototype.tvalue = function (name, type, value, representer) {
        this.node.elements.push(new AnalyzerMapperElement(name, type, this.toffset, 0, (this.offset - this.toffset) * 8, value, representer));
        this.toffset = this.offset;
    };
    return AnalyzerMapper;
})();
var AnalyzerMapperRendererResult = (function () {
    function AnalyzerMapperRendererResult(element, node, editor, mapper, error) {
        this.element = element;
        this.node = node;
        this.editor = editor;
        this.mapper = mapper;
        this.error = error;
    }
    return AnalyzerMapperRendererResult;
})();
var AnalyzerMapperRenderer = (function () {
    function AnalyzerMapperRenderer(editor) {
        this.editor = editor;
    }
    AnalyzerMapperRenderer.prototype.html = function (element) {
        var _this = this;
        var source = this.editor.source;
        var e = $('<div class="treeelement">');
        var title = $('<div class="treetitle">');
        var type = $('<span class="treetitletype">').text(element.type);
        var name = $('<span class="treetitlename">').text(element.name);
        var value = $('<span class="treetitlevalue">').append(element.getValueHtmlString(this.editor));
        title.append(type, name, value);
        e.append(title);
        title.mouseover(function (e) {
            if (_this.editor.source != source)
                return;
            _this.editor.cursor.selection.makeSelection(element.offset, element.bitcount / 8);
            _this.editor.ensureViewVisibleRange(element.offset);
        });
        if (element instanceof AnalyzerMapperNode) {
            var node = element;
            if (node.elements.length > 0) {
                title.addClass('treehaschildren');
                var childs = $('<div class="treechildren">');
                title.addClass(node.expanded ? 'expanded' : 'unexpanded');
                childs.addClass(node.expanded ? 'expanded' : 'unexpanded');
                node.elements.forEach(function (e) {
                    childs.append(_this.html(e));
                });
                title.click(function (e) {
                    window.getSelection().removeAllRanges();
                    var expanded = title.hasClass('expanded');
                    title.toggleClass('expanded', !expanded);
                    childs.toggleClass('expanded', !expanded);
                    title.toggleClass('unexpanded', expanded);
                    childs.toggleClass('unexpanded', expanded);
                });
                e.append(childs);
            }
            else {
                title.addClass('treenohaschildren');
            }
        }
        else {
            title.addClass('treenohaschildren');
            title.click(function (e) {
                var newvalue = prompt("new value", element.value);
                if (newvalue) {
                }
            });
        }
        return e.get(0);
    };
    return AnalyzerMapperRenderer;
})();
//# sourceMappingURL=analyzer.js.map
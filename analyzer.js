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
    function HexChunk(source, type) {
        this.source = source;
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
            editor.source = _this.source;
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
        item.append('HexChunk[' + this.source.length + '](' + this.type + ')');
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
            if (!this.hasElements)
                return this.scount * 8;
            return (this.last.offset - this.offset) * 8 + this.last.bitcount;
        },
        enumerable: true,
        configurable: true
    });
    return AnalyzerMapperNode;
})(AnalyzerMapperElement);
var AnalyzerMapperPlugin = (function () {
    function AnalyzerMapperPlugin(name, detect, analyzeAsync) {
        this.name = name;
        this.detect = detect;
        this.analyzeAsync = analyzeAsync;
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
    AnalyzerMapperPlugins.register = function (name, detect, analyzeAsync) {
        return this.registerPlugin(new AnalyzerMapperPlugin(name, detect, analyzeAsync));
    };
    AnalyzerMapperPlugins.runAsync = function (type, editor) {
        console.info('AnalyzerMapperPlugins.runAsync()');
        return editor.source.readAsync(0, 0x9000).then(function (data) {
            type.name = String(type.name).toLowerCase();
            if (type.name == 'autodetect') {
                try {
                    var dataview = new DataView(data.buffer);
                    var items = _.sortBy(_.values(AnalyzerMapperPlugins.templates).map(function (v, k) {
                        return { name: v.name, priority: v.detect(dataview) };
                    }), function (v) { return v.priority; }).reverse();
                    console.log(JSON.stringify(items));
                    var item = items[0];
                    type.name = item.name;
                }
                catch (e) {
                    console.error(e);
                }
            }
            console.info('detected type:', type);
            return type;
        }).then(function (type) {
            //console.log('aaaaaaaaa');
            var e;
            var name = type.name;
            var mapper = new AnalyzerMapper(editor.source);
            var template = AnalyzerMapperPlugins.templates[name];
            if (!template) {
                console.error("Can't find template '" + name + "'");
                throw new Error("Can't find template '" + name + "'");
            }
            mapper.value = type;
            return template.analyzeAsync(mapper, type).then(function (value) {
            }, function (_e) {
                mapper.node.elements.push(new AnalyzerMapperElement('error', 'error', 0, 0, 0, _e, ErrorRepresenter));
                console.error(_e);
                e = _e;
            }).then(function (result) {
                return new AnalyzerMapperRendererResult(new AnalyzerMapperRenderer(editor).html(mapper.node), mapper.node, editor, mapper, e);
            });
        });
    };
    AnalyzerMapperPlugins.templates = {};
    return AnalyzerMapperPlugins;
})();
var AnalyzerMapper = (function () {
    function AnalyzerMapper(dataSource, node, addoffset) {
        if (node === void 0) { node = null; }
        if (addoffset === void 0) { addoffset = 0; }
        this.dataSource = dataSource;
        this.node = node;
        this.addoffset = addoffset;
        this.offset = 0;
        this.bitsoffset = 0;
        this.bitdata = 0;
        this.bitsavailable = 0;
        this.little = true;
        this.toffset = 0;
        this.data = new AsyncDataView(dataSource);
        if (this.node == null)
            this.node = new AnalyzerMapperNode("root", null, addoffset, this.data.length);
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
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    AnalyzerMapper.prototype._readAsync = function (name, type, bytecount, readAsync, representer) {
        var _this = this;
        var offset = this.offset;
        this.offset += bytecount;
        return readAsync(offset).then(function (value) {
            var element = new AnalyzerMapperElement(name, type, _this.addoffset + offset, 0, 8 * bytecount, value, representer);
            _this.node.elements.push(element);
            return value;
        });
    };
    Object.defineProperty(AnalyzerMapper.prototype, "position", {
        get: function () {
            return this.offset;
        },
        set: function (value) {
            this.offset = value;
        },
        enumerable: true,
        configurable: true
    });
    AnalyzerMapper.prototype.readByte = function () {
        if (this.available < 0)
            throw new Error("No more data available");
        return this.data.getUint8Async(this.offset++);
    };
    AnalyzerMapper.prototype.readBitsAsync = function (bitcount) {
        var _this = this;
        if (bitcount == 0)
            return Promise.resolve(0);
        var bytestofeed = 0;
        if (this.bitsavailable < bitcount) {
            bytestofeed = Math.ceil((bitcount - this.bitsavailable) / 8);
        }
        return this.readBytes(bytestofeed).then(function (feed) {
            feed.forEach(function (byte) {
                _this.bitsoffset = _this.offset;
                _this.bitdata |= byte << _this.bitsavailable;
                _this.bitsavailable += 8;
            });
            var readed = BitUtils.extract(_this.bitdata, 0, bitcount);
            _this.bitdata >>>= bitcount;
            _this.bitsavailable -= bitcount;
            return readed;
        });
    };
    AnalyzerMapper.prototype.readBytes = function (count) {
        if (count == 0)
            return Promise.resolve([]);
        var offset = this.offset;
        this.offset += count;
        return this.data.getUint8ArrayAsync(offset, count);
    };
    AnalyzerMapper.prototype.bits = function (name, bitcount, representer) {
        var _this = this;
        var offset = this.bitsoffset;
        return this.readBitsAsync(bitcount).then(function (value) {
            var element = new AnalyzerMapperElement(name, 'bits[' + bitcount + ']', _this.addoffset + offset, 0, MathUtils.ceilMultiple(bitcount, 8), value, representer);
            _this.node.elements.push(element);
            return value;
        });
    };
    AnalyzerMapper.prototype.bitBool = function (name) {
        return this.bits(name, 1, BoolRepresenter).then(function (value) {
            return value != 0;
        });
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
        return this._readAsync(name, 'u8', 1, function (offset) { return _this.data.getUint8Async(offset); }, representer);
    };
    AnalyzerMapper.prototype.u16 = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u16', 2, function (offset) { return _this.data.getUint16Async(offset, _this.little); }, representer);
    };
    AnalyzerMapper.prototype.u16_le = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u16_le', 2, function (offset) { return _this.data.getUint16Async(offset, true); }, representer);
    };
    AnalyzerMapper.prototype.u16_be = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u16_be', 2, function (offset) { return _this.data.getUint16Async(offset, false); }, representer);
    };
    AnalyzerMapper.prototype.u32 = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u32', 4, function (offset) { return _this.data.getUint32Async(offset, _this.little); }, representer);
    };
    AnalyzerMapper.prototype.u32_le = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u32_le', 4, function (offset) { return _this.data.getUint32Async(offset, true); }, representer);
    };
    AnalyzerMapper.prototype.u32_be = function (name, representer) {
        var _this = this;
        return this._readAsync(name, 'u32_be', 4, function (offset) { return _this.data.getUint32Async(offset, false); }, representer);
    };
    AnalyzerMapper.prototype.str = function (name, count, encoding) {
        var _this = this;
        if (encoding === void 0) { encoding = 'ascii'; }
        return this.data.getUint8ArrayAsync(this.offset, count).then(function (values) {
            var textData = new Uint8Array(values);
            var value = new TextDecoder(encoding).decode(textData);
            _this.node.elements.push(new AnalyzerMapperElement(name, 'u8[' + count + ']', _this.globaloffset, 0, 8 * count, value));
            _this.offset += count;
            return value;
        });
    };
    AnalyzerMapper.prototype.strz = function (name, encoding) {
        var _this = this;
        if (encoding === void 0) { encoding = 'ascii'; }
        var count = 0;
        var loopAsync = function () {
            if (count >= _this.available)
                return Promise.resolve(_this.str(name, count, encoding));
            return _this.data.getUint8Async(_this.offset + count).then(function (value) {
                count++;
                if (value != 0) {
                    return loopAsync();
                }
                else {
                    return _this.str(name, count, encoding);
                }
            });
        };
        return loopAsync().then(function (result) {
            return result;
        });
    };
    AnalyzerMapper.prototype.subs = function (name, count, callbackAsync) {
        var sourceSlice = new HexSourceSlice(this.dataSource, this.offset, this.offset + count);
        var subsnode = new AnalyzerMapperNode(name, this.node, this.offset, count);
        var mapper = new AnalyzerMapper(sourceSlice, subsnode, this.offset);
        mapper.little = this.little;
        this.offset += count;
        this.node.elements.push(subsnode);
        if (callbackAsync) {
            return callbackAsync(mapper).then(function (result) {
                mapper.node.value = result;
                return mapper;
            });
        }
        else {
            return Promise.resolve(mapper);
        }
    };
    AnalyzerMapper.prototype.readSlice = function (count) {
        var offset = this.offset;
        this.offset += count;
        return this.data.getSliceAsync(offset, count);
    };
    AnalyzerMapper.prototype.chunk = function (name, count, type, representer) {
        var _this = this;
        if (type === void 0) { type = null; }
        var element = new AnalyzerMapperElement(name, 'chunk', this.globaloffset, 0, count * 8, null, representer);
        return this.readSlice(count).then(function (data) {
            element.value = new HexChunk(data, type);
            _this.node.elements.push(element);
            return element;
        });
    };
    AnalyzerMapper.prototype.struct = function (name, callbackAsync, expanded) {
        var _this = this;
        if (expanded === void 0) { expanded = true; }
        var parentnode = this.node;
        var groupnode = this.node = new AnalyzerMapperNode(name, this.node);
        var restore = function () {
            groupnode.expanded = expanded;
            _this.node = parentnode;
            _this.node.elements.push(groupnode);
        };
        return callbackAsync(groupnode).then(function (value) {
            groupnode.value = value;
            restore();
            return value;
        }, function (error) {
            groupnode.value = null;
            restore();
            throw (error);
        });
    };
    AnalyzerMapper.prototype.structNoExpand = function (name, callbackAsync) {
        return this.struct(name, callbackAsync, false);
    };
    AnalyzerMapper.prototype.tvalueOffsetAsync = function (callbackAsync) {
        var _this = this;
        var old = this.toffset;
        this.toffset = this.offset;
        var restore = function () {
            _this.toffset = old;
        };
        return callbackAsync().then(function () {
            restore();
        }, function (error) {
            restore();
            throw (error);
        });
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
            var start = element.offset;
            var end = start + element.bitcount / 8;
            //console.info(element, element.offset, element.bitcount / 8);
            _this.editor.cursor.selection.makeSelection(start, end - start);
            _this.editor.ensureViewVisibleRange(start, end - 1);
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
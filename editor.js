/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
/// <reference path="./utils.ts" />
var HexColumn = (function () {
    function HexColumn(editor, value) {
        this.editor = editor;
        this.value = value;
    }
    Object.defineProperty(HexColumn.prototype, "prev", {
        get: function () {
            return this.isFirst ? null : this.editor.columns[this.value - 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexColumn.prototype, "next", {
        get: function () {
            return this.isLast ? null : this.editor.columns[this.value + 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexColumn.prototype, "prevCyclic", {
        get: function () {
            return this.editor.columns[MathUtils.modUnsigned(this.value - 1, this.editor.columnCount)];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexColumn.prototype, "nextCyclic", {
        get: function () {
            return this.editor.columns[MathUtils.modUnsigned(this.value + 1, this.editor.columnCount)];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexColumn.prototype, "isFirst", {
        get: function () {
            return this.value == 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexColumn.prototype, "isLast", {
        get: function () {
            return this.value == this.editor.columnCount - 1;
        },
        enumerable: true,
        configurable: true
    });
    return HexColumn;
})();
var HexCell = (function () {
    function HexCell(row, column) {
        var _this = this;
        this.row = row;
        this.column = column;
        this._value = 0;
        this.viewoffset = 0;
        this._enabled = false;
        this._selected = false;
        this.elementHex = $('<span class="byte">  </span>').get(0);
        this.elementChar = $('<span class="char"> </span>').get(0);
        this.viewoffset = this.row.value * this.row.editor.columnCount + this.column.value;
        $(this.elementHex).click(function (e) {
            if (!_this.enabled)
                return;
            _this.row.editor.onCellClick.dispatch(_this);
        });
        $(this.elementHex).mousedown(function (e) {
            if (!_this.enabled)
                return;
            if (e.which == 1) {
                e.preventDefault();
                _this.row.editor.onCellDown.dispatch(_this);
            }
        });
        $(this.elementHex).mousemove(function (e) {
            if (!_this.enabled)
                return;
            if (e.which == 1) {
                e.preventDefault();
                _this.row.editor.onCellMove.dispatch(_this);
            }
        });
        $(this.elementHex).mouseup(function (e) {
            if (!_this.enabled)
                return;
            if (e.which == 1) {
                e.preventDefault();
                _this.row.editor.onCellUp.dispatch(_this);
            }
        });
    }
    Object.defineProperty(HexCell.prototype, "globaloffset", {
        get: function () {
            return this.row.editor.offset + this.viewoffset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "enabled", {
        get: function () {
            return this._enabled;
        },
        set: function (value) {
            if (this._enabled == value)
                return;
            this._enabled = value;
            this.updateValue();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (value) {
            if (this._value == value)
                return;
            value = (value >>> 0) & 0xFF;
            if (this._value == value)
                return;
            this._value = value;
            this.updateValue();
        },
        enumerable: true,
        configurable: true
    });
    HexCell.prototype.updateValue = function () {
        $(this.elementHex).add(this.elementChar).toggleClass('enabled', this._enabled);
        $(this.elementHex).add(this.elementChar).toggleClass('disabled', !this._enabled);
        if (this._enabled) {
            this.elementHex.innerText = ('00' + this._value.toString(16)).slice(-2).toUpperCase();
            this.elementChar.innerText = CType.isPrint(this._value) ? String.fromCharCode(this._value) : '.';
        }
        else {
            this.elementHex.innerText = '  ';
            this.elementChar.innerText = ' ';
        }
        this.row.editor.dirty();
    };
    Object.defineProperty(HexCell.prototype, "editor", {
        get: function () {
            return this.row.editor;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "up", {
        get: function () {
            return this.row.isFirst ? null : this.editor.getCell(this.column.value, this.row.value - 1);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "down", {
        get: function () {
            return this.row.isLast ? null : this.editor.getCell(this.column.value, this.row.value + 1);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "left", {
        get: function () {
            return this.column.isFirst ? null : this.editor.getCell(this.column.value - 1, this.row.value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "right", {
        get: function () {
            return this.column.isLast ? null : this.editor.getCell(this.column.value + 1, this.row.value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "prev", {
        get: function () {
            return this.column.isFirst ? this.editor.getCell(this.editor.columnCount - 1, this.row.value - 1) : this.editor.getCell(this.column.value - 1, this.row.value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "next", {
        get: function () {
            return this.column.isLast ? this.editor.getCell(0, this.row.value + 1) : this.editor.getCell(this.column.value + 1, this.row.value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCell.prototype, "selected", {
        get: function () {
            return this._selected;
        },
        set: function (value) {
            if (this._selected == value)
                return;
            this._selected = value;
            $(this.elementHex).toggleClass('selected', value);
            $(this.elementChar).toggleClass('selected', value);
        },
        enumerable: true,
        configurable: true
    });
    return HexCell;
})();
var HexRowHead = (function () {
    function HexRowHead(row) {
        this.row = row;
        this._enabled = false;
        this.element = $('<span class="head"></span>').get(0);
        this.value = 0;
    }
    Object.defineProperty(HexRowHead.prototype, "enabled", {
        get: function () {
            return this._enabled;
        },
        set: function (value) {
            if (this._enabled == value)
                return;
            this._enabled = value;
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRowHead.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (value) {
            if (this._value == value)
                return;
            this._value = value;
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    HexRowHead.prototype.update = function () {
        if (this._enabled) {
            this.element.innerText = ('00000000' + this._value.toString(16)).slice(-8).toUpperCase();
        }
        else {
            this.element.innerText = '        ';
        }
    };
    return HexRowHead;
})();
var HexTextRow = (function () {
    function HexTextRow(row) {
        this.row = row;
        this.element = $('<span class="textcolumn">').get(0);
    }
    HexTextRow.prototype.update = function () {
        var values = this.row.cells.map(function (item) { return item.value; });
        this.element.innerText = CType.ensurePrintable(this.row.editor.encoder.decode(values));
    };
    return HexTextRow;
})();
var HexRow = (function () {
    function HexRow(editor, value, columns, html) {
        var _this = this;
        this.editor = editor;
        this.value = value;
        this.html = html;
        this.cells = [];
        this.head = new HexRowHead(this);
        this.text = new HexTextRow(this);
        var hexcolumn = $('<span class="hexcolumn">');
        var charcolumn = $('<span class="charcolumn">');
        columns.forEach(function (column) {
            var cell = new HexCell(_this, column);
            _this.cells[column.value] = cell;
            hexcolumn.append(cell.elementHex);
            charcolumn.append(cell.elementChar);
        });
        $(this.html).append(this.head.element);
        $(this.html).append(hexcolumn);
        $(this.html).append(charcolumn);
        $(this.html).append(this.text.element);
    }
    Object.defineProperty(HexRow.prototype, "firstCell", {
        get: function () {
            return this.cells[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "lastCell", {
        get: function () {
            return this.cells[this.cells.length - 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "prev", {
        get: function () {
            return this.isFirst ? null : this.editor.rows[this.value - 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "next", {
        get: function () {
            return this.isLast ? null : this.editor.rows[this.value + 1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "prevCyclic", {
        get: function () {
            return this.editor.rows[MathUtils.modUnsigned(this.value - 1, this.editor.rowCount)];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "nextCyclic", {
        get: function () {
            return this.editor.rows[MathUtils.modUnsigned(this.value + 1, this.editor.rowCount)];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "isFirst", {
        get: function () {
            return this.value == 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "isLast", {
        get: function () {
            return this.value == this.editor.rowCount - 1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexRow.prototype, "enabled", {
        get: function () {
            return this._enabled;
        },
        set: function (value) {
            this._enabled = value;
        },
        enumerable: true,
        configurable: true
    });
    HexRow.create = function (container, row, columns) {
        return new HexRow(container, row, columns, $('<div class="hexrow" />').get(0));
    };
    return HexRow;
})();
var HexCursor = (function () {
    function HexCursor(editor) {
        this.editor = editor;
        this.selection = new HexSelection(editor);
        this.element = $('<div class="cursor"><span class="cursorinner"></span></div>').get(0);
        $(editor.element).append(this.element);
    }
    Object.defineProperty(HexCursor.prototype, "nibble", {
        get: function () {
            return this._nibble;
        },
        set: function (value) {
            this._nibble = value;
            $(this.element).toggleClass('nibble', value);
        },
        enumerable: true,
        configurable: true
    });
    HexCursor.prototype.moveBy = function (dx, dy) {
        this.moveTo(this.column + dx, this.row + dy);
    };
    HexCursor.prototype.moveLeft = function () {
        this.moveToCell(this.cell.prev);
    };
    HexCursor.prototype.moveRight = function () {
        this.moveToCell(this.cell.next);
    };
    HexCursor.prototype.moveUp = function () {
        if (this.cell.row.isFirst) {
            this.editor.moveViewBy(-this.editor.columnCount);
        }
        else {
            this.moveToCell(this.cell.up);
        }
    };
    HexCursor.prototype.moveDown = function () {
        if (this.cell.row.isLast) {
            this.editor.moveViewBy(+this.editor.columnCount);
        }
        else {
            this.moveToCell(this.cell.down);
        }
    };
    HexCursor.prototype.moveNext = function () {
        this.moveToCell(this.cell.next);
    };
    HexCursor.prototype.moveTo = function (column, row) {
        this.moveToCell(this.editor.getCell(column, row));
    };
    Object.defineProperty(HexCursor.prototype, "column", {
        get: function () {
            return this.cell.column.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "row", {
        get: function () {
            return this.cell.row.value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "viewoffset", {
        get: function () {
            return this.cell.viewoffset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "globaloffset", {
        get: function () {
            return this.cell.globaloffset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "selection2", {
        get: function () {
            return this.selection.isEmpty ? new HexSelection(this.editor, this.globaloffset, this.globaloffset + 1) : this.selection;
        },
        enumerable: true,
        configurable: true
    });
    HexCursor.prototype.moveToCell = function (cell) {
        if (this.cell && !cell.enabled)
            return;
        if (!cell)
            return;
        if (cell == this.cell)
            return;
        var oldcell = this.cell;
        this.cell = cell;
        this.updateInternal(oldcell, cell);
        this.nibble = false;
    };
    HexCursor.prototype.update = function () {
        this.updateInternal(this.cell, this.cell);
    };
    HexCursor.prototype.updateInternal = function (oldcell, newcell) {
        if (oldcell && oldcell != newcell) {
            $(oldcell.elementHex).removeClass('over');
            $(oldcell.elementChar).removeClass('over');
        }
        $(this.element).offset($(newcell.elementHex).position());
        if (oldcell != newcell) {
            $(newcell.elementHex).addClass('over');
            $(newcell.elementChar).addClass('over');
        }
    };
    return HexCursor;
})();
var HexSelection = (function () {
    function HexSelection(editor, _start, _end) {
        if (_start === void 0) { _start = 0; }
        if (_end === void 0) { _end = 0; }
        this.editor = editor;
        this._start = _start;
        this._end = _end;
    }
    HexSelection.prototype.makeSelection = function (offset, size) {
        this._start = offset;
        this._end = offset + size;
        this.editor.onSelectionChanged.dispatch();
    };
    HexSelection.prototype.none = function () {
        this.start = 0;
        this.end = 0;
    };
    HexSelection.prototype.all = function () {
        this.start = 0;
        this.end = this.editor.length;
    };
    Object.defineProperty(HexSelection.prototype, "start", {
        get: function () {
            return this._start;
        },
        set: function (value) {
            this._start = value;
            this.editor.onSelectionChanged.dispatch();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "end", {
        get: function () {
            return this._end;
        },
        set: function (value) {
            this._end = value;
            this.editor.onSelectionChanged.dispatch();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "isEmpty", {
        get: function () {
            return this.length == 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "isAll", {
        get: function () {
            return this.length == this.editor.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "length", {
        get: function () {
            return this.high - this.low;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "low", {
        get: function () {
            return Math.min(this.start, this.end);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexSelection.prototype, "high", {
        get: function () {
            return Math.max(this.start, this.end);
        },
        enumerable: true,
        configurable: true
    });
    HexSelection.prototype.contains = function (offset) {
        return offset >= this.low && offset < this.high;
    };
    HexSelection.prototype.iterateByteOffsets = function (callback) {
        var low = this.low;
        var high = this.high;
        for (var n = low; n < high; n++) {
            callback(n);
        }
    };
    return HexSelection;
})();
var HexSourceSlice = (function () {
    function HexSourceSlice(parent, start, end, name) {
        if (name === void 0) { name = null; }
        this.parent = parent;
        this.start = start;
        this.end = end;
        this.name = name;
        if (name == null)
            this.name = this.parent.name;
        this.start = MathUtils.clamp(this.start, 0, parent.length);
        this.end = MathUtils.clamp(this.end, 0, parent.length);
    }
    Object.defineProperty(HexSourceSlice.prototype, "length", {
        get: function () {
            return this.end - this.start;
        },
        enumerable: true,
        configurable: true
    });
    HexSourceSlice.prototype.readAsync = function (offset, size, buffer) {
        var start = MathUtils.clamp(offset, 0, this.length);
        var end = MathUtils.clamp(offset + size, 0, this.length);
        return this.parent.readAsync(this.start + start, (end - start), buffer);
    };
    return HexSourceSlice;
})();
var AsyncDataView = (function () {
    function AsyncDataView(source) {
        this.source = source;
        this.buffer = new Uint8Array(32);
        this.dataview = new DataView(this.buffer.buffer);
    }
    Object.defineProperty(AsyncDataView.prototype, "length", {
        get: function () {
            return this.source.length;
        },
        enumerable: true,
        configurable: true
    });
    AsyncDataView.prototype.getUint8ArrayAsync = function (offset, count) {
        var buffer = new Uint8Array(count);
        return this.source.readAsync(offset, count, buffer).then(function (readcount) {
            var out = [];
            for (var n = 0; n < readcount; n++)
                out.push(buffer[n]);
            return out;
        });
    };
    AsyncDataView.prototype.getUint8Async = function (offset) {
        var _this = this;
        return this.source.readAsync(offset, 1, this.buffer).then(function (readcount) { return _this.dataview.getUint8(0); });
    };
    AsyncDataView.prototype.getUint16Async = function (offset, little) {
        var _this = this;
        return this.source.readAsync(offset, 2, this.buffer).then(function (readcount) { return _this.dataview.getUint16(0, little); });
    };
    AsyncDataView.prototype.getUint32Async = function (offset, little) {
        var _this = this;
        return this.source.readAsync(offset, 4, this.buffer).then(function (readcount) { return _this.dataview.getUint32(0, little); });
    };
    AsyncDataView.prototype.getSliceAsync = function (offset, count, filename) {
        if (filename === void 0) { filename = 'unknown.bin'; }
        return Promise.resolve(new HexSourceSlice(this.source, offset, offset + count, filename));
    };
    return AsyncDataView;
})();
var ArrayHexSource = (function () {
    function ArrayHexSource(data, delay, name) {
        if (delay === void 0) { delay = 100; }
        if (name === void 0) { name = "hexarray.bin"; }
        this.data = data;
        this.delay = delay;
        this.name = name;
    }
    Object.defineProperty(ArrayHexSource.prototype, "length", {
        get: function () {
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    ArrayHexSource.prototype.readAsync = function (offset, size, buffer) {
        var size2 = Math.max(0, Math.min(size, this.length - offset));
        for (var n = 0; n < size2; n++)
            buffer[n] = this.data[offset + n];
        return Promise.resolve(size2);
    };
    return ArrayHexSource;
})();
var FileSource = (function () {
    function FileSource(file) {
        this.file = file;
    }
    Object.defineProperty(FileSource.prototype, "name", {
        get: function () {
            return this.file.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileSource.prototype, "length", {
        get: function () {
            return this.file.size;
        },
        enumerable: true,
        configurable: true
    });
    FileSource.prototype.readAsync = function (offset, size, buffer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (event) {
                var arraybuffer = event.target.result;
                var indata = new Uint8Array(arraybuffer);
                for (var n = 0; n < indata.length; n++)
                    buffer[n] = indata[n];
                resolve(indata.length);
            };
            reader.readAsArrayBuffer(_this.file.slice(offset, offset + size));
        });
    };
    return FileSource;
})();
var BufferedSource = (function () {
    function BufferedSource(parent) {
        this.parent = parent;
        this.cachedStart = 0;
        this.cachedEnd = 0;
    }
    Object.defineProperty(BufferedSource.prototype, "name", {
        get: function () {
            return this.parent.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferedSource.prototype, "length", {
        get: function () {
            return this.parent.length;
        },
        enumerable: true,
        configurable: true
    });
    BufferedSource.prototype.readAsync = function (offset, size, buffer) {
        var _this = this;
        //return this.parent.readAsync(offset, size, buffer);
        var start = offset;
        var end = offset + size;
        //console.log('cache', this.cachedStart, this.cachedEnd);
        if (start >= this.cachedStart && end <= this.cachedEnd) {
            for (var n = 0; n < size; n++)
                buffer[n] = this.cachedData[(start - this.cachedStart) + n];
            //console.log('cached!');
            return Promise.resolve(size);
        }
        else {
            //console.log('cache miss!');
            var readStart = MathUtils.floorMultiple(offset, 0x1000);
            var readEnd = Math.max(end, readStart + 0x1000);
            var data = new Uint8Array(readEnd - readStart);
            return this.parent.readAsync(readStart, readEnd - readStart, data).then(function (readcount) {
                _this.cachedStart = readStart;
                _this.cachedEnd = readEnd;
                _this.cachedData = data;
                return _this.readAsync(offset, size, buffer); // retry with cached data!
            });
        }
        //console.log(offset, size);
    };
    return BufferedSource;
})();
var HexEditor = (function () {
    function HexEditor(element) {
        var _this = this;
        this.element = element;
        this.rows = [];
        this.onCellClick = new Signal();
        this.onCellDown = new Signal();
        this.onCellMove = new Signal();
        this.onCellUp = new Signal();
        this.onSourceChanged = new Signal();
        this.onSelectionChanged = new Signal();
        this._source = new ArrayHexSource(new Uint8Array(1024));
        this._encoder = new TextDecoderEncoding('utf-8');
        this.onMove = new Signal();
        this.offset = 0;
        this.columns = [];
        this._dirty = false;
        this._dirtyExec = -1;
        this.hotkeys = [];
        this.cursor = new HexCursor(this);
        for (var n = 0; n < 16; n++) {
            this.columns[n] = new HexColumn(this, n);
        }
        for (var n = 0; n < 32; n++) {
            var row = HexRow.create(this, n, this.columns);
            this.rows[n] = row;
            $(element).append(row.html);
        }
        //var lastCell = this.rows[0].charcells[0];
        this.onSelectionChanged.add(function () {
            _this.updateSelection();
        });
        this.rows[0].cells[0].value = 1;
        this.cursor.moveToCell(this.rows[0].cells[0]);
        this.onCellClick.add(function (e) {
            _this.cursor.moveToCell(e);
        });
        this.onCellDown.add(function (e) {
            _this.cursor.selection.start = e.globaloffset;
            _this.cursor.selection.end = e.globaloffset;
            _this.updateSelection();
            _this.onMove.dispatch();
        });
        this.onCellMove.add(function (e) {
            _this.cursor.selection.end = e.globaloffset;
            _this.cursor.moveToCell(e);
            _this.updateSelection();
            _this.onMove.dispatch();
        });
        this.onCellUp.add(function (e) {
        });
        $(element).mousedown(function (e) { return e.preventDefault(); });
        $(element).mousemove(function (e) { return e.preventDefault(); });
        var selecting = false;
        var startedSelection = false;
        var pressingCmd = false;
        var deltaWheel = 0;
        $(element).on('wheel', function (e) {
            var ee = e.originalEvent;
            deltaWheel += ee.deltaY;
            var deltaWheelInt = Math.floor(deltaWheel / 10);
            if (Math.abs(deltaWheelInt) >= 1) {
                _this.moveViewBy(deltaWheelInt * _this.columnCount);
                deltaWheel = 0;
            }
            e.preventDefault();
        });
        //element.ondrop = (e:Event) => { };
        $(document).keydown(function (e) {
            switch (e.keyCode) {
                case 9:
                    e.preventDefault();
                    break;
                case 91:
                    pressingCmd = true;
                    break;
                case 16:
                    selecting = true;
                    startedSelection = true;
                    e.preventDefault();
                    break;
                case 37:
                case 38:
                case 39:
                case 40:
                    if (startedSelection) {
                        _this.cursor.selection.start = _this.cursor.globaloffset;
                        startedSelection = false;
                    }
                    switch (e.keyCode) {
                        case 37:
                            _this.cursor.moveLeft();
                            break;
                        case 38:
                            _this.cursor.moveUp();
                            break;
                        case 39:
                            _this.cursor.moveRight();
                            break;
                        case 40:
                            _this.cursor.moveDown();
                            break;
                    }
                    if (selecting) {
                        _this.cursor.selection.end = _this.cursor.globaloffset;
                    }
                    if (!selecting)
                        _this.cursor.selection.none();
                    _this.updateSelection();
                    e.preventDefault();
                    _this.onMove.dispatch();
                    break;
            }
            _this.hotkeys.forEach(function (hotkey) {
                if (hotkey.check(e, pressingCmd)) {
                    hotkey.event();
                    e.preventDefault();
                }
            });
        });
        $(document).keyup(function (e) {
            switch (e.keyCode) {
                case 91:
                    pressingCmd = false;
                    break;
                case 16:
                    selecting = false;
                    startedSelection = false;
                    e.preventDefault();
                    break;
            }
        });
        /*
        var pressing = false;
        $(document).mousedown((e:JQueryMouseEventObject) => {
            if (e.which == 1) pressing = true;
        });

        $(document).mouseup((e:JQueryMouseEventObject) => {
            if (e.which == 1) pressing = false;
        });

        $(document).mousemove((e:JQueryMouseEventObject) => {
            //console.log(e);
        });
        */
        $(document).keypress(function (e) {
            //console.log(e);
            var hexchars = '0123456789abcdefABCDEF';
            var char = String.fromCharCode(e.charCode);
            if (hexchars.indexOf(char) >= 0) {
                var cursor = _this.cursor;
                var cell = cursor.cell;
                if (cursor.nibble) {
                    cursor.nibble = false;
                    cell.value &= ~0x0F;
                    cell.value |= parseInt(char, 16) << 0;
                    cursor.moveNext();
                }
                else {
                    cell.value &= ~0xF0;
                    cell.value |= parseInt(char, 16) << 4;
                    cursor.nibble = true;
                }
                cell.row.text.update();
                _this.onMove.dispatch();
            }
            _this.hotkeys.forEach(function (hotkey) {
                if (hotkey.check(e, pressingCmd)) {
                    hotkey.event();
                    e.preventDefault();
                }
            });
        });
    }
    HexEditor.prototype.getCell = function (column, row) {
        //console.log(column, row);
        return this.rows[row].cells[column];
    };
    HexEditor.prototype.setData = function (data) {
        this.source = new ArrayHexSource(data);
    };
    Object.defineProperty(HexEditor.prototype, "source", {
        get: function () {
            return this._source;
        },
        set: function (value) {
            this._source = value;
            this.offset = 0;
            this.updateCellsAsync();
            this.onSourceChanged.dispatch();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexEditor.prototype, "visiblerange", {
        get: function () {
            return new HexSelection(this, this.offset, this.offset + this.columnCount * this.rows.length);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexEditor.prototype, "rowCount", {
        get: function () {
            return this.rows.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexEditor.prototype, "totalbytesinview", {
        get: function () {
            return this.columnCount * this.rowCount;
        },
        enumerable: true,
        configurable: true
    });
    HexEditor.prototype.ensureViewVisibleRange = function (globaloffset, globaloffsetend) {
        if (!this.visiblerange.contains(globaloffset)) {
            //this.offset
            if (globaloffset >= this.offset) {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset - this.totalbytesinview + this.columnCount, this.columnCount));
            }
            else {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset, this.columnCount));
            }
        }
        if (!this.visiblerange.contains(globaloffsetend)) {
            this.moveViewTo(MathUtils.floorMultiple(globaloffset, this.columnCount));
        }
    };
    HexEditor.prototype.moveViewBy = function (doffset) {
        this.moveViewTo(this.offset + doffset);
    };
    HexEditor.prototype.moveViewTo = function (expectedOffset) {
        var realOffset = MathUtils.clamp(expectedOffset, 0, MathUtils.floorMultiple(this.length - this.columnCount, this.columnCount));
        //console.log("offset move: ", expectedOffset, realOffset);
        this.offset = realOffset;
        this.updateCellsAsync();
    };
    HexEditor.prototype.updateCellsAsync = function () {
        var _this = this;
        var source = this._source;
        var databuffer = new Uint8Array(this.columnCount * this.rows.length);
        return source.readAsync(this.offset, databuffer.length, databuffer).then(function (readcount) {
            var data = databuffer;
            _this.rows.forEach(function (row, index) {
                row.head.value = _this.offset + index * 16;
                row.enabled = row.head.enabled = ((index * 16) < readcount);
                row.cells.forEach(function (cell, offset) {
                    if (cell.viewoffset < readcount) {
                        cell.value = data[cell.viewoffset];
                        cell.enabled = true;
                    }
                    else {
                        cell.value = 0;
                        cell.enabled = false;
                    }
                    //this.setByteAt(cell.globaloffset, );
                });
            });
        });
    };
    HexEditor.prototype.localToGlobal = function (localoffset) {
        return this.offset + localoffset;
    };
    HexEditor.prototype.globalToLocal = function (globaloffset) {
        return globaloffset - this.offset;
    };
    Object.defineProperty(HexEditor.prototype, "length", {
        get: function () {
            return this.source.length;
        },
        enumerable: true,
        configurable: true
    });
    HexEditor.prototype.getCell2 = function (globaloffset) {
        var offset = globaloffset - this.offset;
        return this.getCell(Math.floor(offset % this.columnCount), Math.floor(offset / this.columnCount));
    };
    HexEditor.prototype.getByteAt = function (globaloffset) {
        return this.getCell2(globaloffset).value;
    };
    HexEditor.prototype.setByteAt = function (globaloffset, value) {
        this.getCell2(globaloffset).value = value;
    };
    HexEditor.prototype.update = function () {
        this.cursor.update();
        this.updateSelection();
        this.rows.forEach(function (row, index) {
            row.text.update();
        });
    };
    HexEditor.prototype.updateSelection = function () {
        var cursor = this.cursor;
        var selection = cursor.selection;
        this.rows.forEach(function (row) {
            row.cells.forEach(function (cell) {
                cell.selected = selection ? selection.contains(cell.globaloffset) : false;
            });
        });
    };
    Object.defineProperty(HexEditor.prototype, "encoder", {
        get: function () {
            return this._encoder;
        },
        set: function (encoding) {
            this._encoder = encoding;
            this.rows.forEach(function (row) { return row.text.update(); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexEditor.prototype, "columnCount", {
        get: function () {
            return this.columns.length;
        },
        enumerable: true,
        configurable: true
    });
    HexEditor.prototype.dirty = function () {
        var _this = this;
        this._dirty = true;
        if (this._dirtyExec == -1) {
            this._dirtyExec = setTimeout(function () {
                _this._dirtyExec = -1;
                _this.update();
            }, 0);
        }
    };
    HexEditor.prototype.addHotkey = function (key, event) {
        var parts = key.split('+');
        this.hotkeys.push(new Hotkey(parts, event));
    };
    HexEditor.prototype.addHotkeys = function (keys, event) {
        var _this = this;
        keys.forEach(function (key) { return _this.addHotkey(key, event); });
    };
    return HexEditor;
})();
var Hotkey = (function () {
    function Hotkey(parts, event) {
        this.parts = parts;
        this.event = event;
    }
    Hotkey.prototype.check = function (e, pressingCmd) {
        var char = String.fromCharCode(e.charCode).toLowerCase();
        var keyCode = e.keyCode;
        for (var n = 0; n < this.parts.length; n++) {
            var part = this.parts[n].toLowerCase();
            switch (part) {
                case 'cmd':
                    if (!pressingCmd)
                        return false;
                    break;
                case 'ctrl':
                    if (!e.ctrlKey)
                        return false;
                    break;
                case 'shift':
                    if (!e.shiftKey)
                        return false;
                    break;
                case 'alt':
                    if (!e.altKey)
                        return false;
                    break;
                case 'plus':
                    if (char != '+')
                        return false;
                    break;
                case 'minus':
                    if (char != '-')
                        return false;
                    break;
                case 'backspace':
                    if (keyCode != 8)
                        return false;
                    break;
                default:
                    if (char != part)
                        return false;
                    break;
            }
        }
        return true;
    };
    return Hotkey;
})();
function array_chunks(array, chunkSize) {
    return [].concat.apply([], array.map(function (elem, i) {
        return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
    }));
}
//# sourceMappingURL=editor.js.map
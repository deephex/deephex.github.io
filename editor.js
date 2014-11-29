/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
/// <reference path="./utils.ts" />
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
        this.viewoffset = this.row.row * this.row.editor.columnCount + this.column;
        $(this.elementHex).click(function (e) {
            _this.row.editor.onCellClick.dispatch(_this);
        });
        $(this.elementHex).mousedown(function (e) {
            if (e.which == 1) {
                e.preventDefault();
                _this.row.editor.onCellDown.dispatch(_this);
            }
        });
        $(this.elementHex).mousemove(function (e) {
            if (e.which == 1) {
                e.preventDefault();
                _this.row.editor.onCellMove.dispatch(_this);
            }
        });
        $(this.elementHex).mouseup(function (e) {
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
var HexTextColumn = (function () {
    function HexTextColumn(row) {
        this.row = row;
        this.element = $('<span class="textcolumn">').get(0);
    }
    HexTextColumn.prototype.update = function () {
        var values = this.row.cells.map(function (item) { return item.value; });
        this.element.innerText = CType.ensurePrintable(this.row.editor.encoder.decode(values));
    };
    return HexTextColumn;
})();
var HexRow = (function () {
    function HexRow(editor, row, columns, html) {
        this.editor = editor;
        this.row = row;
        this.html = html;
        this.cells = [];
        this.head = new HexRowHead(this);
        this.text = new HexTextColumn(this);
        var hexcolumn = $('<span class="hexcolumn">');
        var charcolumn = $('<span class="charcolumn">');
        for (var column = 0; column < columns; column++) {
            var cell = new HexCell(this, column);
            this.cells[column] = cell;
            hexcolumn.append(cell.elementHex);
            charcolumn.append(cell.elementChar);
        }
        $(this.html).append(this.head.element);
        $(this.html).append(hexcolumn);
        $(this.html).append(charcolumn);
        $(this.html).append(this.text.element);
    }
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
        if (this.isInFirstColumn) {
            this.moveTo(this.editor.columnCount - 1, this.row - 1);
        }
        else {
            this.moveBy(-1, 0);
        }
    };
    HexCursor.prototype.moveRight = function () {
        if (this.isInLastColumn) {
            this.moveTo(0, this.row + 1);
        }
        else {
            this.moveBy(+1, 0);
        }
    };
    HexCursor.prototype.moveUp = function () {
        if (this.isInFirstRow) {
            this.editor.moveViewBy(-this.editor.columnCount);
        }
        else {
            this.moveBy(0, -1);
        }
    };
    HexCursor.prototype.moveDown = function () {
        if (this.isInLastRow) {
            this.editor.moveViewBy(+this.editor.columnCount);
        }
        else {
            this.moveBy(0, +1);
        }
    };
    Object.defineProperty(HexCursor.prototype, "isInFirstColumn", {
        get: function () {
            return this.column == 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "isInFirstRow", {
        get: function () {
            return this.row == 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "isInLastColumn", {
        get: function () {
            return this.column == this.editor.columnCount - 1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "isInLastRow", {
        get: function () {
            return this.row == this.editor.rows.length - 1;
        },
        enumerable: true,
        configurable: true
    });
    HexCursor.prototype.moveNext = function () {
        if (this.isInLastColumn) {
            this.moveTo(0, this.row + 1);
        }
        else {
            this.moveTo(this.column + 1, this.row);
        }
    };
    HexCursor.prototype.moveTo = function (column, row) {
        this.moveToHex(this.editor.getCell(column, row));
    };
    Object.defineProperty(HexCursor.prototype, "column", {
        get: function () {
            return this.cell.column;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexCursor.prototype, "row", {
        get: function () {
            return this.cell.row.row;
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
    HexCursor.prototype.moveToHex = function (cell) {
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
var ArrayHexSource = (function () {
    function ArrayHexSource(data, delay) {
        if (delay === void 0) { delay = 100; }
        this.data = data;
        this.delay = delay;
    }
    Object.defineProperty(ArrayHexSource.prototype, "length", {
        get: function () {
            return this.data.length;
        },
        enumerable: true,
        configurable: true
    });
    ArrayHexSource.prototype.readAsync = function (offset, size) {
        var size2 = Math.max(0, Math.min(size, this.length - offset));
        //console.warn(offset, size, this.length, size2);
        var out = new Uint8Array(size2);
        for (var n = 0; n < out.length; n++)
            out[n] = this.data[offset + n];
        //return waitAsync(3000).then(() => { return out; });
        return Promise.resolve(out);
    };
    return ArrayHexSource;
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
        this.onSelectionChanged = new Signal();
        this._source = new ArrayHexSource(new Uint8Array(1024));
        this._encoder = new TextDecoderEncoding('utf-8');
        this.onMove = new Signal();
        this.offset = 0;
        this.columnCount = 16;
        this._dirty = false;
        this._dirtyExec = -1;
        this.hotkeys = [];
        this.cursor = new HexCursor(this);
        for (var n = 0; n < 32; n++) {
            var row = HexRow.create(this, n, this.columnCount);
            this.rows[n] = row;
            $(element).append(row.html);
        }
        //var lastCell = this.rows[0].charcells[0];
        this.onSelectionChanged.add(function () {
            _this.updateSelection();
        });
        this.rows[0].cells[0].value = 1;
        this.cursor.moveToHex(this.rows[0].cells[0]);
        this.onCellClick.add(function (e) {
            _this.cursor.moveToHex(e);
        });
        this.onCellDown.add(function (e) {
            _this.cursor.selection.start = e.globaloffset;
            _this.cursor.selection.end = e.globaloffset;
            _this.updateSelection();
            _this.onMove.dispatch();
        });
        this.onCellMove.add(function (e) {
            _this.cursor.selection.end = e.globaloffset;
            _this.cursor.moveToHex(e);
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
    Object.defineProperty(HexEditor.prototype, "rowsCount", {
        get: function () {
            return this.rows.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HexEditor.prototype, "totalbytesinview", {
        get: function () {
            return this.columnCount * this.rowsCount;
        },
        enumerable: true,
        configurable: true
    });
    HexEditor.prototype.ensureViewVisibleRange = function (globaloffset) {
        if (!this.visiblerange.contains(globaloffset)) {
            //this.offset
            if (this.offset < globaloffset) {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset - this.totalbytesinview + this.columnCount, this.columnCount));
            }
            else {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset, this.columnCount));
            }
        }
    };
    HexEditor.prototype.moveViewBy = function (doffset) {
        this.moveViewTo(this.offset + doffset);
    };
    HexEditor.prototype.moveViewTo = function (offset) {
        offset = Math.max(0, offset);
        this.offset = offset;
        this.updateCellsAsync();
    };
    HexEditor.prototype.updateCellsAsync = function () {
        var _this = this;
        var source = this._source;
        return source.readAsync(this.offset, this.columnCount * this.rows.length).then(function (data) {
            _this.rows.forEach(function (row, index) {
                row.head.value = _this.offset + index * 16;
                row.head.enabled = ((index * 16) < data.length);
                row.cells.forEach(function (cell, offset) {
                    if (cell.viewoffset < data.length) {
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
    HexEditor.prototype.getDataAsync = function () {
        return this._source.readAsync(0, this.source.length);
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
    HexEditor.convert = function (element) {
        return new HexEditor(element);
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
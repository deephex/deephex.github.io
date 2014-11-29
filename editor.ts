/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
/// <reference path="./utils.ts" />

class HexCell {
    elementHex:HTMLElement;
    elementChar:HTMLElement;
    private _value = 0;
    viewoffset = 0;

    get globaloffset() { return this.row.editor.offset + this.viewoffset; }

    constructor(public row:HexRow, public column:number) {
        this.elementHex = $('<span class="byte">00</span>').get(0);
        this.elementChar = $('<span class="char">.</span>').get(0);
        this.viewoffset = this.row.row * this.row.editor.columns + this.column;
        $(this.elementHex).click((e) => {
            this.row.editor.onCellClick.dispatch(this);
        });
        $(this.elementHex).mousedown((e) => {
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellDown.dispatch(this);
            }
        });
        $(this.elementHex).mousemove((e) => {
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellMove.dispatch(this);
            }
        });
        $(this.elementHex).mouseup((e) => {
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellUp.dispatch(this);
            }
        });
    }

    set value(value:number) {
        if (this._value == value) return;
        value = (value >>> 0) & 0xFF;
        if (this._value == value) return;

        this._value = value;
        this.elementHex.innerText = ('00' + value.toString(16)).slice(-2).toUpperCase();
        this.elementChar.innerText = CType.isPrint(value) ? String.fromCharCode(value) : '.';
        this.row.editor.dirty();
    }

    get value() {
        return this._value;
    }

    private _selected = false;
    set selected(value:boolean) {
        if (this._selected == value) return;
        this._selected = value;
        $(this.elementHex).toggleClass('selected', value);
        $(this.elementChar).toggleClass('selected', value);
    }

    get selected() {
        return this._selected;
    }
}

class HexRowHead {
    private _value:number;
    element:HTMLElement;

    constructor(public row:HexRow) {
        this.element = $('<span class="head"></span>').get(0);
        this.value = 0;
    }

    set value(value:number) {
        this._value = value;
        this.element.innerText = ('00000000' + value.toString(16)).slice(-8).toUpperCase();
    }

    get value() {
        return this._value;
    }
}

class HexTextColumn {
    element = $('<span class="textcolumn">').get(0);

    constructor(public row:HexRow) {
    }

    update() {
        var values = this.row.cells.map(item => item.value);
        this.element.innerText = CType.ensurePrintable(this.row.editor.encoder.decode(values));
    }
}

class HexRow {
    cells:HexCell[] = [];
    head:HexRowHead;
    text:HexTextColumn;

    constructor(public editor:HexEditor, public row:number, columns:number, public html:HTMLElement) {
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

    static create(container:HexEditor, row:number, columns:number) {
        return new HexRow(container, row, columns, $('<div class="hexrow" />').get(0));
    }
}

class HexCursor {
    element:HTMLElement;
    cell:HexCell;
    private _nibble:boolean;
    selection: HexSelection;

    constructor(public editor:HexEditor) {
        this.selection = new HexSelection(editor);
        this.element = $('<div class="cursor"><span class="cursorinner"></span></div>').get(0);
        $(editor.element).append(this.element);
    }

    set nibble(value:boolean) {
        this._nibble = value;
        $(this.element).toggleClass('nibble', value);
    }

    get nibble() {
        return this._nibble;
    }

    moveBy(dx:number, dy:number) {
        this.moveTo(this.column + dx, this.row + dy);
    }

    moveLeft() {
        if (this.isInFirstColumn) {
            this.moveTo(this.editor.columns - 1, this.row - 1);
        } else {
            this.moveBy(-1, 0);
        }
    }
    moveRight() {
        if (this.isInLastColumn) {
            this.moveTo(0, this.row + 1);
        } else {
            this.moveBy(+1, 0);
        }
    }
    moveUp() {
        if (this.isInFirstRow) {
            this.editor.moveViewBy(-this.editor.columns);
        } else {
            this.moveBy(0, -1);
        }
    }
    moveDown() {
        if (this.isInLastRow) {
            this.editor.moveViewBy(+this.editor.columns);
        } else {
            this.moveBy(0, +1);
        }
    }

    get isInFirstColumn() { return this.column == 0; }
    get isInFirstRow() { return this.row == 0; }
    get isInLastColumn() { return this.column == this.editor.columns - 1; }
    get isInLastRow() { return this.row == this.editor.rows.length - 1; }

    moveNext() {
        if (this.isInLastColumn) {
            this.moveTo(0, this.row + 1);
        } else {
            this.moveTo(this.column + 1, this.row);
        }
    }

    moveTo(column:number, row:number) {
        this.moveToHex(this.editor.getCell(column, row));
    }

    get column() { return this.cell.column; }
    get row() { return this.cell.row.row; }
    get viewoffset() { return this.cell.viewoffset; }
    get globaloffset() { return this.cell.globaloffset; }

    get selection2() {
        return this.selection.isEmpty ? new HexSelection(this.editor, this.globaloffset, this.globaloffset + 1) : this.selection;
    }

    moveToHex(cell:HexCell) {
        if (!cell) return;
        if (cell == this.cell) return;
        var oldcell = this.cell;
        this.cell = cell;
        this.updateInternal(oldcell, cell);
        this.nibble = false;
    }

    update() {
        this.updateInternal(this.cell, this.cell);
    }

    private updateInternal(oldcell:HexCell, newcell:HexCell) {
        if (oldcell && oldcell != newcell) {
            $(oldcell.elementHex).removeClass('over');
            $(oldcell.elementChar).removeClass('over');
        }
        $(this.element).offset($(newcell.elementHex).position());

        if (oldcell != newcell) {
            $(newcell.elementHex).addClass('over');
            $(newcell.elementChar).addClass('over');
        }
    }
}

class HexSelection {
    constructor(public editor:HexEditor, private _start: number = 0, private _end: number = 0) {

    }

    makeSelection(offset:number, size:number) {
        this._start = offset;
        this._end = offset + size;
        this.editor.onSelectionChanged.dispatch();
    }

    none() { this.start = 0; this.end = 0; }
    all() { this.start = 0; this.end = this.editor.length; }

    get start() { return this._start; }
    get end() { return this._end; }

    set start(value: number) { this._start = value; this.editor.onSelectionChanged.dispatch(); }
    set end(value: number) { this._end = value; this.editor.onSelectionChanged.dispatch(); }

    get isEmpty() { return this.length == 0; }
    get isAll() { return this.length == this.editor.length; }

    get length() { return this.high - this.low; }

    get low() { return Math.min(this.start, this.end); }
    get high() { return Math.max(this.start, this.end); }

    contains(offset: number) { return offset >= this.low && offset < this.high; }

    iterateByteOffsets(callback: (offset: number) => void) {
        var low = this.low;
        var high = this.high;
        for (var n = low; n < high; n++) {
            callback(n);
        }
    }
}

interface HexSource {
    length: number;
    readAsync(offset:number, size:number):Promise<Uint8Array>;
}

class ArrayHexSource implements HexSource {
    constructor(public data:Uint8Array, private delay = 100) {
    }

    get length() {
        return this.data.length;
    }

    readAsync(offset:number, size:number) {
        var out = new Uint8Array(size);
        for (var n = 0; n < size; n++) out[n] = this.data[offset + n];
        //return waitAsync(3000).then(() => { return out; });
        return Promise.resolve(out);
    }
}

class HexEditor {
    public rows:HexRow[] = [];

    cursor:HexCursor;
    onCellClick = new Signal<HexCell>();
    onCellDown = new Signal<HexCell>();
    onCellMove = new Signal<HexCell>();
    onCellUp = new Signal<HexCell>();
    onSelectionChanged = new Signal();
    private _source:HexSource = new ArrayHexSource(new Uint8Array(1024));
    private _encoder:Encoding = new TextDecoderEncoding('utf-8');
    onMove = new Signal();

    getCell(column:number, row:number) {
        //console.log(column, row);
        return this.rows[row].cells[column];
    }

    setData(data: Uint8Array) {
        this.source = new ArrayHexSource(data);
    }

    get source() { return this._source; }
    set source(value:HexSource) {
        this._source = value;
        this.offset = 0;
        this.updateCellsAsync();
    }

    offset = 0;

    get visiblerange() {
        return new HexSelection(this, this.offset, this.offset + this.columns * this.rows.length);
    }

    ensureViewVisibleRange(globaloffset:number) {
        if (!this.visiblerange.contains(globaloffset)) {
            this.moveViewTo(Math.floor(globaloffset / this.columns) * this.columns);
        }
    }

    moveViewBy(doffset:number) {
        this.moveViewTo(this.offset + doffset);
    }

    moveViewTo(offset:number) {
        offset = Math.max(0, offset);
        this.offset = offset;
        this.updateCellsAsync();
    }

    updateCellsAsync() {
        var source = this._source;
        return source.readAsync(this.offset, source.length).then((data) => {
            this.rows.forEach((row, index) => {
                row.head.value = this.offset + index * 16;
            });

            for (var n = 0; n < data.length; n++) {
                this.setByteAt(this.localToGlobal(n), data[n]);
            }
        });
    }

    localToGlobal(localoffset:number) {
        return this.offset + localoffset;
    }

    globalToLocal(globaloffset:number) {
        return globaloffset - this.offset;
    }

    getDataAsync() {
        return this._source.readAsync(0, this.source.length);
    }

    get length() { return this.source.length; }

    getCell2(globaloffset:number) {
        var offset = globaloffset - this.offset;
        return this.getCell(
            Math.floor(offset % this.columns),
            Math.floor(offset / this.columns)
        );
    }

    getByteAt(globaloffset:number) {
        return this.getCell2(globaloffset).value;
    }

    setByteAt(globaloffset:number, value:number) {
        this.getCell2(globaloffset).value = value;
    }

    update() {
        this.cursor.update();
        this.updateSelection();
        this.rows.forEach((row, index) => {
            row.text.update();
        });
    }

    private updateSelection() {
        var cursor = this.cursor;
        var selection = cursor.selection;
        this.rows.forEach(row => {
            row.cells.forEach(cell => {
                cell.selected = selection ? selection.contains(cell.globaloffset) : false;
            });
        })
    }

    set encoder(encoding:Encoding) {
        this._encoder = encoding;
        this.rows.forEach(row => row.text.update());
    }

    get encoder() {
        return this._encoder;
    }

    columns = 16;

    constructor(public element:HTMLElement) {
        this.cursor = new HexCursor(this);

        for (var n = 0; n < 32; n++) {
            var row = HexRow.create(this, n, this.columns);
            this.rows[n] = row;
            $(element).append(row.html);
        }

        //var lastCell = this.rows[0].charcells[0];

        this.onSelectionChanged.add(() => {
            this.updateSelection();
        });
        this.rows[0].cells[0].value = 1;
        this.cursor.moveToHex(this.rows[0].cells[0]);

        this.onCellClick.add((e) => {
            this.cursor.moveToHex(e);
        });

        this.onCellDown.add((e) => {
            this.cursor.selection.start = e.globaloffset;
            this.cursor.selection.end = e.globaloffset;
            this.updateSelection();
            this.onMove.dispatch();
        });

        this.onCellMove.add((e) => {
            this.cursor.selection.end = e.globaloffset;
            this.cursor.moveToHex(e);
            this.updateSelection();
            this.onMove.dispatch();
        });

        this.onCellUp.add((e) => {
        });

        $(element).mousedown(e => e.preventDefault());
        $(element).mousemove(e => e.preventDefault());

        var selecting = false;
        var startedSelection = false;
        var pressingCmd = false;

        var deltaWheel = 0;
        $(element).on('wheel', (e:Event) => {
            var ee = (<any>e).originalEvent;
            deltaWheel += ee.deltaY;
            var deltaWheelInt = Math.floor(deltaWheel / 10);
            if (Math.abs(deltaWheelInt) >= 1) {
                this.moveViewBy(deltaWheelInt * this.columns);
                deltaWheel = 0;
            }
            e.preventDefault();
        });

        $(document).keydown(e => {
            //console.log(e);
            switch (e.keyCode) {
                case 9: e.preventDefault(); break; // TAB
                case 91: pressingCmd = true; break;
                case 16: // SHIFT
                    selecting = true;
                    startedSelection = true;
                    e.preventDefault();
                    break;
                case 37:
                case 38:
                case 39:
                case 40: // LEFT, TOP, RIGHT, BOTTOM
                    if (startedSelection) {
                        this.cursor.selection.start = this.cursor.globaloffset;
                        startedSelection = false;
                    }
                    switch (e.keyCode) {
                        case 37: this.cursor.moveLeft(); break;
                        case 38: this.cursor.moveUp(); break;
                        case 39: this.cursor.moveRight(); break;
                        case 40: this.cursor.moveDown(); break;
                    }
                    if (selecting) {
                        this.cursor.selection.end = this.cursor.globaloffset;
                    }
                    if (!selecting) this.cursor.selection.none();
                    this.updateSelection();
                    e.preventDefault();
                    this.onMove.dispatch();
                    break;
            }

            this.hotkeys.forEach(hotkey => {
                if (hotkey.check(e, pressingCmd)) {
                    hotkey.event();
                    e.preventDefault();
                }
            });
        });

        $(document).keyup((e:KeyboardEvent) => {
            switch (e.keyCode) {
                case 91: pressingCmd = false; break;
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

        $(document).keypress(e => {
            //console.log(e);
            var hexchars = '0123456789abcdefABCDEF';
            var char = String.fromCharCode(e.charCode);
            if (hexchars.indexOf(char) >= 0) {
                var cursor = this.cursor;
                var cell = cursor.cell;
                if (cursor.nibble) {
                    cursor.nibble = false;
                    cell.value &= ~0x0F;
                    cell.value |= parseInt(char, 16) << 0;
                    cursor.moveNext();
                } else {
                    cell.value &= ~0xF0;
                    cell.value |= parseInt(char, 16) << 4;
                    cursor.nibble = true;
                }
                cell.row.text.update();
                this.onMove.dispatch();
            }

            this.hotkeys.forEach(hotkey => {
                if (hotkey.check(e, pressingCmd)) {
                    hotkey.event();
                    e.preventDefault();
                }
            });
        });
    }

    private _dirty = false;
    private _dirtyExec = -1;

    dirty() {
        this._dirty = true;
        if (this._dirtyExec == -1) {
            this._dirtyExec = setTimeout(() => {
                this._dirtyExec = -1;
                this.update();
            }, 0);
        }
    }

    hotkeys: Hotkey[] = [];

    addHotkey(key:string, event: () => void) {
        var parts = key.split('+');
        this.hotkeys.push(new Hotkey(parts, event));
    }

    addHotkeys(keys:string[], event: () => void) {
        keys.forEach(key => this.addHotkey(key, event));
    }

    static convert(element:HTMLElement) {
        return new HexEditor(element);
    }
}

class Hotkey {
    constructor(public parts: string[], public event: () => void) {
    }

    check(e:JQueryKeyEventObject, pressingCmd:boolean) {
        var char = String.fromCharCode(e.charCode).toLowerCase();
        var keyCode = e.keyCode;
        for (var n = 0; n < this.parts.length; n++) {
            var part = this.parts[n].toLowerCase();
            switch (part) {
                case 'cmd': if (!pressingCmd) return false; break;
                case 'ctrl': if (!e.ctrlKey) return false; break;
                case 'shift': if (!e.shiftKey) return false; break;
                case 'alt': if (!e.altKey) return false; break;
                case 'plus': if (char != '+') return false; break;
                case 'minus': if (char != '-') return false; break;
                case 'backspace':
                    if (keyCode != 8) return false; break;
                default: if (char != part) return false; break;
            }
        }
        return true;
    }
}

function array_chunks<T>(array: T[], chunkSize:number):T[][] {
    return [].concat.apply([],
        array.map(function(elem,i) {
            return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
        })
    );
}

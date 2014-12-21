/// <reference path="./jquery.d.ts" />
/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
/// <reference path="./utils.ts" />

class HexColumn {
    constructor(public editor:HexEditor, public value:number) {

    }

    get prev() { return this.isFirst ? null : this.editor.columns[this.value - 1]; }
    get next() { return this.isLast ? null : this.editor.columns[this.value + 1]; }

    get prevCyclic() { return this.editor.columns[MathUtils.modUnsigned(this.value - 1, this.editor.columnCount)]; }
    get nextCyclic() { return this.editor.columns[MathUtils.modUnsigned(this.value + 1, this.editor.columnCount)]; }

    get isFirst() { return this.value == 0; }
    get isLast() { return this.value == this.editor.columnCount - 1; }
}

class HexCell {
    elementHex:HTMLElement;
    elementChar:HTMLElement;
    private _value = 0;
    viewoffset = 0;

    get globaloffset() { return this.row.editor.offset + this.viewoffset; }

    constructor(public row:HexRow, public column:HexColumn) {
        this.elementHex = $('<span class="byte">  </span>').get(0);
        this.elementChar = $('<span class="char"> </span>').get(0);
        this.viewoffset = this.row.value * this.row.editor.columnCount + this.column.value;
        $(this.elementHex).click((e) => {
            if (!this.enabled) return;
            this.row.editor.onCellClick.dispatch(this);
        });
        $(this.elementHex).mousedown((e) => {
            if (!this.enabled) return;
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellDown.dispatch(this);
            }
        });
        $(this.elementHex).mousemove((e) => {
            if (!this.enabled) return;
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellMove.dispatch(this);
            }
        });
        $(this.elementHex).mouseup((e) => {
            if (!this.enabled) return;
            if (e.which == 1) {
                e.preventDefault();
                this.row.editor.onCellUp.dispatch(this);
            }
        });
    }

    private _enabled = false;

    set enabled(value:boolean) {
        if (this._enabled == value) return;
        this._enabled = value;
        this.updateValue();
    }

    get enabled() {
        return this._enabled;
    }

    set value(value:number) {
        if (this._value == value) return;
        value = (value >>> 0) & 0xFF;
        if (this._value == value) return;

        this._value = value;
        this.updateValue();
    }

    private updateValue() {
        $(this.elementHex).add(this.elementChar).toggleClass('enabled', this._enabled);
        $(this.elementHex).add(this.elementChar).toggleClass('disabled', !this._enabled);
        if (this._enabled) {
            this.elementHex.innerText = ('00' + this._value.toString(16)).slice(-2).toUpperCase();
            this.elementChar.innerText = CType.isPrint(this._value) ? String.fromCharCode(this._value) : '.';
        } else {
            this.elementHex.innerText = '  ';
            this.elementChar.innerText = ' ';
        }
        this.row.editor.dirty();
    }

    get value() { return this._value; }
    get editor() { return this.row.editor; }

    get up() { return this.row.isFirst ? null : this.editor.getCell(this.column.value, this.row.value - 1); }
    get down() { return this.row.isLast ? null : this.editor.getCell(this.column.value, this.row.value + 1); }
    get left() { return this.column.isFirst ? null : this.editor.getCell(this.column.value - 1, this.row.value); }
    get right() { return this.column.isLast ? null : this.editor.getCell(this.column.value + 1, this.row.value); }

    get prev() { return this.column.isFirst ? this.editor.getCell(this.editor.columnCount - 1, this.row.value - 1) : this.editor.getCell(this.column.value - 1, this.row.value); }
    get next() { return this.column.isLast ? this.editor.getCell(0, this.row.value + 1) : this.editor.getCell(this.column.value + 1, this.row.value); }

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

    _enabled = false;

    set enabled(value:boolean) {
        if (this._enabled == value) return;
        this._enabled = value;
        this.update();
    }
    get enabled() { return this._enabled; }

    set value(value:number) {
        if (this._value == value) return;
        this._value = value;
        this.update();
    }

    get value() {
        return this._value;
    }

    private update() {
        if (this._enabled) {
            this.element.innerText = ('00000000' + this._value.toString(16)).slice(-8).toUpperCase();
        } else {
            this.element.innerText = '        ';
        }
    }
}

class HexTextRow {
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
    text:HexTextRow;

    constructor(public editor:HexEditor, public value:number, columns:HexColumn[], public html:HTMLElement) {
        this.head = new HexRowHead(this);
        this.text = new HexTextRow(this);
        var hexcolumn = $('<span class="hexcolumn">');
        var charcolumn = $('<span class="charcolumn">');
        columns.forEach(column => {
            var cell = new HexCell(this, column);
            this.cells[column.value] = cell;
            hexcolumn.append(cell.elementHex);
            charcolumn.append(cell.elementChar);
        });
        $(this.html).append(this.head.element);
        $(this.html).append(hexcolumn);
        $(this.html).append(charcolumn);
        $(this.html).append(this.text.element);
    }

    get firstCell() { return this.cells[0]; }
    get lastCell() { return this.cells[this.cells.length - 1]; }

    get prev() { return this.isFirst ? null : this.editor.rows[this.value - 1]; }
    get next() { return this.isLast ? null : this.editor.rows[this.value + 1]; }

    get prevCyclic() { return this.editor.rows[MathUtils.modUnsigned(this.value - 1, this.editor.rowCount)]; }
    get nextCyclic() { return this.editor.rows[MathUtils.modUnsigned(this.value + 1, this.editor.rowCount)]; }

    get isFirst() { return this.value == 0; }
    get isLast() { return this.value == this.editor.rowCount - 1; }

    private _enabled:boolean;

    set enabled(value:boolean) { this._enabled = value; }
    get enabled() { return this._enabled; }

    static create(container:HexEditor, row:number, columns:HexColumn[]) {
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

    moveLeft() { this.moveToCell(this.cell.prev); }
    moveRight() { this.moveToCell(this.cell.next); }
    moveUp() {
        if (this.cell.row.isFirst) {
            this.editor.moveViewBy(-this.editor.columnCount);
        } else {
            this.moveToCell(this.cell.up);
        }
    }
    moveDown() {
        if (this.cell.row.isLast) {
            this.editor.moveViewBy(+this.editor.columnCount);
        } else {
            this.moveToCell(this.cell.down);
        }
    }

    moveNext() {
        this.moveToCell(this.cell.next);
    }

    moveTo(column:number, row:number) {
        this.moveToCell(this.editor.getCell(column, row));
    }

    get column() { return this.cell.column.value; }
    get row() { return this.cell.row.value; }
    get viewoffset() { return this.cell.viewoffset; }
    get globaloffset() { return this.cell.globaloffset; }

    get selection2() {
        return this.selection.isEmpty ? new HexSelection(this.editor, this.globaloffset, this.globaloffset + 1) : this.selection;
    }

    moveToCell(cell:HexCell) {
        if (this.cell && !cell.enabled) return;
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
    name: string;
    readAsync(offset:number, size:number, buffer:Uint8Array):Promise<number>;
}

class HexSourceSlice implements HexSource {
    constructor(public parent:HexSource, public start:number, public end:number, public name:string = null) {
        if (name == null) this.name = this.parent.name;
        this.start = MathUtils.clamp(this.start, 0, parent.length);
        this.end = MathUtils.clamp(this.end, 0, parent.length)
    }

    get length():number { return this.end - this.start; }

    readAsync(offset:number, size:number, buffer:Uint8Array) {
        var start = MathUtils.clamp(offset, 0, this.length);
        var end = MathUtils.clamp(offset + size, 0, this.length);
        return this.parent.readAsync(this.start + start, (end - start), buffer);
    }
}

class AsyncDataView {
    private buffer:Uint8Array;
    private dataview:DataView;

    constructor(public source:HexSource) {
        this.buffer = new Uint8Array(32);
        this.dataview = new DataView(this.buffer.buffer);
    }

    get length() { return this.source.length; }

    getUint8ArrayAsync(offset:number, count:number) {
        var buffer = new Uint8Array(count);
        return this.source.readAsync(offset, count, buffer).then(readcount => {
            var out = [];
            for (var n = 0; n < readcount; n++) out.push(buffer[n]);
            return out;
        });
    }
    getUint8Async(offset:number) {
        return this.source.readAsync(offset, 1, this.buffer).then(readcount => this.dataview.getUint8(0));
    }
    getUint16Async(offset:number, little?:boolean) {
        return this.source.readAsync(offset, 2, this.buffer).then(readcount => this.dataview.getUint16(0, little));
    }
    getUint32Async(offset:number, little?:boolean) {
        return this.source.readAsync(offset, 4, this.buffer).then(readcount => this.dataview.getUint32(0, little));
    }
    getSliceAsync(offset:number, count:number, filename:string = 'unknown.bin') {
        return Promise.resolve(new HexSourceSlice(this.source, offset, offset + count, filename));
    }
}

class ArrayHexSource implements HexSource {
    constructor(public data:Uint8Array, private delay = 100, public name = "hexarray.bin") {
    }

    get length() {
        return this.data.length;
    }

    readAsync(offset:number, size:number, buffer:Uint8Array) {
        var size2 = Math.max(0, Math.min(size, this.length - offset));
        for (var n = 0; n < size2; n++) buffer[n] = this.data[offset + n];
        return Promise.resolve(size2);
    }
}

class FileSource implements HexSource {
    constructor(public file:File) {
    }

    get name() { return this.file.name; }

    get length() { return this.file.size; }

    readAsync(offset:number, size:number, buffer:Uint8Array) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = (event) => {
                var arraybuffer = (<any>event.target).result;
                var indata = new Uint8Array(arraybuffer);
                for (var n = 0; n < indata.length; n++) buffer[n] = indata[n];
                resolve(indata.length);
            };
            reader.readAsArrayBuffer(this.file.slice(offset, offset + size));
        });
    }
}

class BufferedSource implements HexSource {
    constructor(public parent:HexSource) {
    }

    get name() { return this.parent.name; }
    get length() { return this.parent.length; }

    cachedData:Uint8Array;
    cachedStart = 0;
    cachedEnd = 0;

    readAsync(offset:number, size:number, buffer:Uint8Array) {
        //return this.parent.readAsync(offset, size, buffer);
        var start = offset;
        var end = offset + size;
        //console.log('cache', this.cachedStart, this.cachedEnd);
        if (start >= this.cachedStart && end <= this.cachedEnd) {
            for (var n = 0; n < size; n++) buffer[n] = this.cachedData[(start - this.cachedStart) + n];
            //console.log('cached!');
            return Promise.resolve(size);
        } else {
            //console.log('cache miss!');
            var readStart = MathUtils.floorMultiple(offset, 0x1000);
            var readEnd = Math.max(end, readStart + 0x1000);
            var data = new Uint8Array(readEnd - readStart);
            return this.parent.readAsync(readStart, readEnd - readStart, data).then(readcount => {
                this.cachedStart = readStart;
                this.cachedEnd = readEnd;
                this.cachedData = data;
                return this.readAsync(offset, size, buffer); // retry with cached data!
            });
        }
        //console.log(offset, size);
    }
}

class HexEditor {
    public rows:HexRow[] = [];

    cursor:HexCursor;
    onCellClick = new Signal<HexCell>();
    onCellDown = new Signal<HexCell>();
    onCellMove = new Signal<HexCell>();
    onCellUp = new Signal<HexCell>();
    onSourceChanged = new Signal();
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
        this.onSourceChanged.dispatch();
    }

    offset = 0;

    get visiblerange() {
        return new HexSelection(this, this.offset, this.offset + this.columnCount * this.rows.length);
    }

    get rowCount() { return this.rows.length; }

    get totalbytesinview() {
        return this.columnCount * this.rowCount;
    }

    ensureViewVisibleRange(globaloffset:number, globaloffsetend:number) {
        if (!this.visiblerange.contains(globaloffset)) {
            //this.offset
            if (globaloffset >= this.offset) {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset - this.totalbytesinview + this.columnCount, this.columnCount));
            } else {
                this.moveViewTo(MathUtils.floorMultiple(globaloffset, this.columnCount));
            }
        }
        if (!this.visiblerange.contains(globaloffsetend)) {
            this.moveViewTo(MathUtils.floorMultiple(globaloffset, this.columnCount));
        }
    }

    moveViewBy(doffset:number) {
        this.moveViewTo(this.offset + doffset);
    }

    moveViewTo(expectedOffset:number) {
        var realOffset = MathUtils.clamp(expectedOffset, 0, MathUtils.floorMultiple(this.length - this.columnCount, this.columnCount));
        //console.log("offset move: ", expectedOffset, realOffset);
        this.offset = realOffset;
        this.updateCellsAsync();
    }

    updateCellsAsync() {
        var source = this._source;
        var databuffer = new Uint8Array(this.columnCount * this.rows.length);
        return source.readAsync(this.offset, databuffer.length, databuffer).then(readcount => {
            var data = databuffer;
            this.rows.forEach((row, index) => {
                row.head.value = this.offset + index * 16;
                row.enabled = row.head.enabled = ((index * 16) < readcount);
                row.cells.forEach((cell, offset) => {
                    if (cell.viewoffset < readcount) {
                        cell.value = data[cell.viewoffset];
                        cell.enabled = true;
                    } else {
                        cell.value = 0;
                        cell.enabled = false;
                    }
                    //this.setByteAt(cell.globaloffset, );
                });
            });
        });
    }

    localToGlobal(localoffset:number) {
        return this.offset + localoffset;
    }

    globalToLocal(globaloffset:number) {
        return globaloffset - this.offset;
    }

    get length() { return this.source.length; }

    getCell2(globaloffset:number) {
        var offset = globaloffset - this.offset;
        return this.getCell(
            Math.floor(offset % this.columnCount),
            Math.floor(offset / this.columnCount)
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

    get columnCount() { return this.columns.length; }
    columns:HexColumn[] = [];

    constructor(public element:HTMLElement) {
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

        this.onSelectionChanged.add(() => {
            this.updateSelection();
        });
        this.rows[0].cells[0].value = 1;
        this.cursor.moveToCell(this.rows[0].cells[0]);

        this.onCellClick.add((e) => {
            this.cursor.moveToCell(e);
        });

        this.onCellDown.add((e) => {
            this.cursor.selection.start = e.globaloffset;
            this.cursor.selection.end = e.globaloffset;
            this.updateSelection();
            this.onMove.dispatch();
        });

        this.onCellMove.add((e) => {
            this.cursor.selection.end = e.globaloffset;
            this.cursor.moveToCell(e);
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
                this.moveViewBy(deltaWheelInt * this.columnCount);
                deltaWheel = 0;
            }
            e.preventDefault();
        });


        //element.ondrop = (e:Event) => { };

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

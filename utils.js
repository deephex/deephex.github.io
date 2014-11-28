/// <reference path="./underscore.d.ts" />
/// <reference path="./es6-promise.d.ts" />
var Signal = (function () {
    function Signal() {
        this.handlers = [];
    }
    Signal.prototype.add = function (handler) {
        this.handlers.push(handler);
        return handler;
    };
    Signal.prototype.remove = function (handler) {
        this.handlers = _.without(this.handlers, handler);
    };
    Signal.prototype.dispatch = function (value) {
        this.handlers.forEach(function (handler) {
            handler(value);
        });
    };
    return Signal;
})();
var TextDecoderEncoding = (function () {
    function TextDecoderEncoding(id) {
        this.id = id;
    }
    TextDecoderEncoding.prototype.encode = function (data) {
        return new TextEncoder(this.id).encode(data);
    };
    TextDecoderEncoding.prototype.decode = function (array) {
        return new TextDecoder(this.id).decode(new Uint8Array(array));
    };
    return TextDecoderEncoding;
})();
var CType = (function () {
    function CType() {
    }
    CType.isPrint = function (value) {
        if (value < 32)
            return false;
        return true;
    };
    CType.ensurePrintable = function (str) {
        //return String.fromCharCode.apply(null, str.split('').map(v => (v.charCodeAt(0) < 32) ? v : '.'));
        return str;
    };
    return CType;
})();
var HexRgb = (function () {
    function HexRgb(red, green, blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    HexRgb.prototype.toHtml = function () {
        return '<span class="hexrgbsample" style="background:rgba(' + this.red + ', ' + this.green + ', ' + this.blue + ', 1.0);"></span> RGB(' + this.red + ', ' + this.green + ', ' + this.blue + ')';
    };
    return HexRgb;
})();
function download(url, done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (e) {
        done(new Uint8Array(this.response));
    };
    xhr.send();
}
function unsigned_mod(value, count) {
    value %= 32;
    if (value < 0)
        value += count;
    return value;
}
function ror32(value, count) {
    count = unsigned_mod(count, 32);
    return value >>> count | value << (32 - count);
}
function ror16(value, count) {
    count = unsigned_mod(count, 16);
    return ((value >>> count) & 0xFFFF) | ((value << (16 - count)) & 0xFFFF);
}
function ror8(value, count) {
    count = unsigned_mod(count, 8);
    return ((value >>> count) & 0xFF) | ((value << (8 - count)) & 0xFF);
}
function htmlspecialchars(s) {
    s = String(s);
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function waitAsync(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, time);
    });
}
//# sourceMappingURL=utils.js.map
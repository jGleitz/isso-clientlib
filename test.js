"use strict";
var A = (function () {
    function A() {
    }
    return A;
}());
var B = (function () {
    function B() {
    }
    return B;
}());
var default_1 = (function () {
    function default_1() {
    }
    default_1.prototype.wrong = function () {
        if (this.field instanceof A) {
            return this.field.prop;
        }
        return 0;
    };
    return default_1;
}());
exports.__esModule = true;
exports["default"] = default_1;

(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MarkDown", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
var VERIFY  = global["WebModule"]["verify"]  || false;
var VERBOSE = global["WebModule"]["verbose"] || false;

// --- define / local variables ----------------------------
var BLOCK_QUOTE         = /^>( *)/;
var CODE_BLOCK          = /^```/;
var DISC_LIST           = /^[\*\+\-] /;
var DEC_LIST            = /^([0-9]+)\. /;
var HEADING             = /^(#{1,6})/;
var TABLE               = /^\|/;
var HR                  = /^---/;

var TYPE_BLOCK_QUOTE    = ">";
var TYPE_CODE_BLOCK     = "`";
var TYPE_DISC_LIST      = "-";
var TYPE_DEC_LIST       = "0";
var TYPE_HEADING        = "#";
var TYPE_TABLE          = "|";
var TYPE_HR             = "H";
var TYPE_OTHER          = "";

// --- class / interfaces ----------------------------------
var MarkDown = {
    "parse":        MarkDown_parse,     // MarkDown.parse(source:MarkDownTextString):MarkDownNodeTreeObject
//    "build":        MarkDown_build,     // MarkDown.build(tree:MarkDownNodeTreeObject):MarkDownTextString
    "normalize":    MarkDown_normalize, // MarkDown.normalize(source:MarkDownTextString):MarkDownTextString
    "repository":  "https://github.com/uupaa/MarkDown.js",
};

// --- implements ------------------------------------------
function MarkDown_parse(source) { // @arg MarkDownTextString
                                  // @ret MarkDownNodeTreeObject
//{@dev
    if (VERIFY) {
        $valid($type(source, "String"), MarkDown_parse, "source");
    }
//}@dev

    var root = new MarkDownRoot();
    var blocks = _filterBlock( _splitBlock( _normalize(source) ) );

    for (var i = 0, iz = blocks.length; i < iz; ++i) {
        _processBlockNode(root, blocks[i]);
    }
    return root.toJSON();
}

function _processBlockNode(parentNode, block) {
    // TODO: cosmetic
    var node   = null;
    var indent = _getIndent(block[0]);
    var type   = _getBlockType( _trimIndent(block[0], indent) );
    var inline = null;

    if (type === TYPE_HEADING) {
        node = parentNode.addNode(
                new MarkDownHeading( HEADING.exec(block[0])[1].length ) );
        inline = block[0].replace(HEADING, "");
        _processBlockNode( node, _filterBlock( _splitBlock(inline) ) );
    } else if (type === TYPE_TABLE) {
        node = parentNode.addNode( new MarkDownTable(block) );
    } else if (type === TYPE_DISC_LIST) {
        node = parentNode.addNode( new MarkDownDiscList() );
        for (var i = 0, iz = block.length; i < iz; ++i) {
            inline = block[i].slice(indent);
            if (DISC_LIST.test(inline)) {
                inline = inline.slice(2);
            }
            _processBlockNode( node, _filterBlock( _splitBlock( inline ) ) );
        }
    } else if (type === TYPE_DEC_LIST) {
        node = parentNode.addNode( new MarkDownDecList() );
        for (var i = 0, iz = block.length; i < iz; ++i) {
            inline = block[i].slice(indent);
            if (DEC_LIST.test(inline)) {
                var digits = DEC_LIST.exec(inline)[0].length;
                inline = inline.slice(digits);
            }
            _processBlockNode( node, _filterBlock( _splitBlock( inline ) ) );
        }
    } else if (type === TYPE_BLOCK_QUOTE) {
        node = parentNode.addNode( new MarkDownBlockQuote() );
        var trimWidth = BLOCK_QUOTE.exec(block[0])[0].length;
        var newBlock = [];
        for (var i = 0, iz = block.length; i < iz; ++i) {
            inline = block[i].slice(trimWidth);
            newBlock.push(inline);
        }
        _processBlockNode( node, _filterBlock( _splitBlock( newBlock.join("") ) ) );
    } else if (type === TYPE_CODE_BLOCK) {
        parentNode.addNode( new MarkDownCodeBlock( block[0].slice(indent + 3), block.slice(1, -1) ) );
    } else if (type === TYPE_HR) {
        node = parentNode.addNode( new MarkDownHorizontalRule() );
    } else { // paragraph
        node = parentNode.addNode( new MarkDownParagraph() );

        _processInlineNode(node, block.join(""));
    }
}

function _processInlineNode(parentNode, line) {
    if (!line) { return; }
    var view   = { source: line, cursor: 0 };
    var bold   = -1; // **bold** or __bold__
    var italic = -1; // *italic* or _italic_
    var strike = -1; // ~~strike~~
    var buffer = [];
    var node = null;
    var b = " ";
    var c = " ";
    var d = " ";
    var b_sp = false;
    var c_sp = false;
    var d_sp = false;
    var b_as = false;
    var c_as = false;
    var d_as = false;

    while (view.cursor < view.source.length) {
        b = c;
        c = d;
        d = _readChar(view);
        b_sp = b === " " || b === "\n";
        c_sp = c === " " || c === "\n";
        d_sp = d === " " || d === "\n";
        b_as = b === "*" || b === "_";
        c_as = c === "*" || c === "_";
        d_as = d === "*" || d === "_";

        if ( b === " " && c === " " && d === "\n" ) { // "line break(sp)(sp)\n" -> "line break<br>"
            _addTextNode(parentNode, buffer.slice(0, -2));
            parentNode.addNode( new MarkDownLineBreak() );
            buffer.length = 0;
        } else if ( italic < 0 && b_sp && c_as && !d_as ) { // begin " *italic* "
            _addTextNode(parentNode, buffer.slice(0, -1));
            italic = view.cursor - 1;
        } else if ( italic > 0 && !b_as && c_as && d_sp ) { // end   " *italic* " -> "<i>italic</i>"
            node = parentNode.addNode( new MarkDownItalic() );
            _processInlineNode(node, view.source.slice(italic, view.cursor - 2));
            buffer.length = 0;
            italic = -1;
        } else if ( bold < 0 && b_sp && c_as && d_as ) { // begin " **bold** "
            _addTextNode(parentNode, buffer.slice(0, -2));
            bold = view.cursor;
        } else if ( bold > 0 && b_as && c_as && d_sp ) { // end   " **bold** " -> "<bold>bold</bold>"
            node = parentNode.addNode( new MarkDownBold() );
            _processInlineNode(node, view.source.slice(bold, view.cursor - 3));
            buffer.length = 0;
            bold = -1;
        } else if ( strike < 0 && b_sp && c === "~" && d === "~" ) { // begin " ~~strike~~ "
            _addTextNode(parentNode, buffer.slice(0, -2));
            strike = view.cursor;
        } else if ( strike > 0 && b === "~" && c === "~" && d_sp ) { // end   " ~~strike~~ " -> "<strike>strike</strike>"
            node = parentNode.addNode( new MarkDownStrike() );
            _processInlineNode(node, view.source.slice(strike, view.cursor - 3));
            buffer.length = 0;
            strike = -1;
        } else if ( d === "`" ) { // "`code`" -> "<code>code</code>"
            _addTextNode(parentNode, buffer.slice(0, -1));
            buffer.length = 0;
            _processBackQuoteNode(parentNode, view);
        } else {
            buffer.push(d);
        }
    }
    _addTextNode(parentNode, buffer);

    function _addTextNode(parentNode, buffer) {
        if (buffer.length) {
            parentNode.addNode( new MarkDownText( buffer.join("") ) );
            buffer.length = 0;
        }
    }
}

function _processBackQuoteNode(parentNode, view) {
    var textStart = view.cursor;
    var textEnd   = view.cursor;

    while (view.cursor < view.source.length) {
        var a = view.source[view.cursor++];
        if (a === "`") {
            textEnd = view.cursor - 1;
            break;
        }
    }

    var code = view.source.slice(textStart, textEnd);

    parentNode.
        addNode( new MarkDownBackQuote() ).
            addNode( new MarkDownText( code ) );
}

// ===  normalize ==========================================
function MarkDown_normalize(source) { // @arg MarkDownTextString
                                      // @ret MarkDownTextString
    return _buildBlock(
                _filterBlock(
                    _splitBlock(
                        _normalize(source))));
}

function _normalize(source) {
    return _horizontalRule(
                _heading(
                    _lineBreak(source)));

    function _lineBreak(source) { // @arg String - " a \r\n b \r c \n"
                                  // @ret String - " a \n b \n c \n"
        return source.replace(/(\r\n|\r|\n)/g, "\n");
    }

    function _heading(source) { // @arg String - "HeadeingTitle\n=========\n", "SubHeadeingTitle\n---------\n"
                                // @ret String - "# HeadeingTitle\n", "## HeadeingTitle\n"
        return (source + "\n").replace(/^([^\n]+)\n(=){3,}\n/gm, "# $1\n").
                               replace(/^([^\n]+)\n(-){3,}\n/gm, "## $1\n").trim() + "\n";
    }

    function _horizontalRule(source) { // @arg String - "* * *", "***", "- - -", "-------"
                                       // @ret String - "---"
        return (source + "\n").replace(/^([\*\-] ?){3,}\n/gm, "---\n").trim() + "\n";
    }
}

function _splitBlock(source) {
    var view   = { source: source, cursor: 0, lastCursor: 0 };
    var result = [[]];
    var cursor = 0;

    var line   = "";
    var type   = "";
    var indent = 0;
    var last   = { type: "", indent: 0 };

    while (view.cursor < view.source.length) {
        line   = _readLine(view);
        type   = _getBlockType(line);
        indent = _getIndent(line);

        if (_isNewBlock(line))      { result[++cursor] = []; } // new block
        if (last.indent !== indent) { last.indent = indent;  }
        if (last.type   !== type)   { last.type   = type;    }
        result[cursor].push(line);
    }
    return result;

    function _isNewBlock(line) {
        return (indent !== last.indent) ||  // change indent -> new block
               (type   !== last.type)   ||  // change type   -> new block
               /^---/.test(line)        ||  // ---           -> new block
               /^#/.test(line);             // # Heading     -> new block
    }
}

function _getBlockType(line) {
    switch (true) {
    case /^\n$/.test(line):     return TYPE_OTHER;
    case HEADING.test(line):    return TYPE_HEADING;
    case DISC_LIST.test(line):  return TYPE_DISC_LIST;
    case DEC_LIST.test(line):   return TYPE_DEC_LIST;
    case TABLE.test(line):      return TYPE_TABLE;
    case BLOCK_QUOTE.test(line):return TYPE_BLOCK_QUOTE;
    case CODE_BLOCK.test(line): return TYPE_CODE_BLOCK;
    case HR.test(line):         return TYPE_HR;
    }
    return TYPE_OTHER;
}

function _filterBlock(blocks) { // @arg Array
                                // @ret Array
    var result = [];

    for (var i = 0, iz = blocks.length; i < iz; ++i) {
        if (_isSeriesBlankLines(blocks[i])) { // ["\n", .. "\n"]
            // skip
        } else {
            result.push(blocks[i]);
        }
    }
    return result;

    function _isSeriesBlankLines(blocks) {
        for (var i = 0, iz = blocks.length; i < iz; ++i) {
            if (blocks[i] !== "\n") {
                return false;
            }
        }
        return true;
    }
}

function _buildBlock(blocks) { // @arg Array
                               // @ret MarkDownTextString
    var result = [];

    for (var i = 0, iz = blocks.length; i < iz; ++i) {
        var block = blocks[i].join("").replace(/\n+$/, "\n");

        if (blocks[i].length > 1) {
            block = "\n" + block + "\n";
        }
        result.push(block);
    }
    return result.join("");
}

function _readLine(view) { // @arg Object - { source, cursor, lastCursor }
                           // @ret String
    var line = "";

    if (view.cursor < view.source.length) {
        var pos = view.source.indexOf("\n", view.cursor);

        if (pos >= 0) {
            line = view.source.slice(view.cursor, pos + 1); // include tail "\n"
            view.lastCursor = view.cursor;
            view.cursor = pos + 1;
        } else {
            line = view.source.slice(view.cursor);
            view.lastCursor = view.cursor;
            view.cursor = view.source.length;
        }
    }
    return line;
}

function _readChar(view) { // @arg Object - { source, cursor }
                           // @ret String
    if (view.cursor < view.source.length) {
        return view.source[view.cursor++] || "";
    }
    return "";
}

function _getIndent(line) {
    var r = /^ */.exec(line);
    return r[0].length;
}

function _hasIndent(line,     // @arg String
                    indent) { // @arg UINT8 = 0 - indent % 4 === 0
    return ((_getIndent(line) / 4) | 0) * 4 === indent;
}

function _trimIndent(line,     // @arg String
                     indent) { // @arg UINT8 = 0 - indent % 4 === 0
    return _hasIndent(line, indent) ? line.slice(indent)
                                    : line;
}

// === MarkDownNode ========================================
function MarkDownNode(nodeType) {
    this._properties = ["type", "node"];
    this._type = nodeType || "node";
    this._node = [];
}
MarkDownNode["prototype"] = Object.create(MarkDownNode, {
    "constructor": { "value": MarkDownNode },
    "addNode":     { "value": MarkDownNode_addNode }, // MarkDownNode#addNode(node:MarkDownNode):MarkDownNode
    "toJSON":      { "value": MarkDownNode_toJSON  },
});

function MarkDownNode_addNode(node) { // @arg MarkDownNode
                                      // @ret MarkDownNode
    this._node.push(node);
    return node;
}

function MarkDownNode_toJSON() { // @ret Object
    var result = {};
    var that = this;

    this._properties.forEach(function(name) {
        result[name] = that["_" + name];
    });

    if (this._node) {
        for (var i = 0, iz = this._node.length; i < iz; ++i) {
            result["node"][i] = this._node[i].toJSON();
        }
    }
    return result;
}

// === MarkDownRoot ========================================
function MarkDownRoot() {
    MarkDownNode.apply(this, ["markdown"]);
}
MarkDownRoot["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownRoot },
});

// === MarkDownHeading =====================================
function MarkDownHeading(level) { // @arg HeadingLevelNumber = 1 - "#"(1) - "######"(6)
    MarkDownNode.apply(this, ["heading"]);
    this._properties = ["type", "level", "node"];
    this._level = level || 1;
}
MarkDownHeading["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownHeading },
    "level": {
        "get": function()  { return this._level; },
        "set": function(v) { this._level = v;    }
    }
});

// === MarkDownHorizontalRule ==============================
function MarkDownHorizontalRule() {
    MarkDownNode.apply(this, ["hr"]);
    this._properties = ["type"];
}
MarkDownHorizontalRule["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownHorizontalRule },
});

// === MarkDownTable =======================================
function MarkDownTable(block) { // @arg block = []
    MarkDownNode.apply(this, ["table"]);
    this._properties = ["type", "block"];
    this._block = block || []; // TBD:
}
MarkDownTable["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownTable },
});

// === MarkDownDiscList ====================================
function MarkDownDiscList() {
    MarkDownNode.apply(this, ["disc_list"]);
}
MarkDownDiscList["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownDiscList },
});

// === MarkDownDecList =====================================
function MarkDownDecList() {
    MarkDownNode.apply(this, ["dec_list"]);
}
MarkDownDecList["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownDecList },
});

// === MarkDownBlockQuote ====================================
function MarkDownBlockQuote() {
    MarkDownNode.apply(this, ["block_quote"]);
}
MarkDownBlockQuote["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownBlockQuote },
});

// === MarkDownCodeBlock ====================================
function MarkDownCodeBlock(syntax, code) {
    MarkDownNode.apply(this, ["code_block"]);
    this._properties = ["type", "syntax", "code"];
    this._syntax = (syntax || "").trim();
    this._code   = code   || [];
}
MarkDownCodeBlock["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownCodeBlock },
    "syntax": {
        "set": function(v) { this._syntax = v;    },
        "get": function()  { return this._syntax; }
    },
    "code": {
        "set": function(v) { this._code = v;      },
        "get": function()  { return this._code;   }
    }
});

// === MarkDownParagraph ====================================
function MarkDownParagraph() {
    MarkDownNode.apply(this, ["paragraph"]);
}
MarkDownParagraph["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownParagraph },
});

// === MarkDownBold =========================================
function MarkDownBold() {
    MarkDownNode.apply(this, ["bold"]);
}
MarkDownBold["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownBold },
});

// === MarkDownItalic =======================================
function MarkDownItalic() {
    MarkDownNode.apply(this, ["italic"]);
}
MarkDownItalic["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownItalic },
});

// === MarkDownStrike =======================================
function MarkDownStrike() {
    MarkDownNode.apply(this, ["strike"]);
}
MarkDownStrike["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownStrike },
});

// === MarkDownBackQuote ====================================
function MarkDownBackQuote() {
    MarkDownNode.apply(this, ["back_quote"]);
}
MarkDownBackQuote["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownBackQuote },
});

// === MarkDownLineBreak =========================================
function MarkDownLineBreak() {
    MarkDownNode.apply(this, ["linebreak"]);
    this._properties = ["type"];
}
MarkDownLineBreak["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownLineBreak },
});

// === MarkDownText =========================================
function MarkDownText(text) { // @arg String = ""
    MarkDownNode.apply(this, ["text"]);
    this._properties = ["type", "text"];
    this._text = text || "";
}
MarkDownText["prototype"] = Object.create(MarkDownNode.prototype, {
    "constructor": { "value": MarkDownText },
    "text": {
        "set": function(v) { this._text = v;    },
        "get": function()  { return this._text; }
    }
});

return MarkDown; // return entity

});


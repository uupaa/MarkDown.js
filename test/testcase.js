var ModuleTestMarkDown = (function(global) {

var test = new Test(["MarkDown"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    false,  // enable browser test.
        worker:     false,  // enable worker test.
        node:       false,  // enable node test.
        nw:         false,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     false,  // show button.
        both:       false,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_EL) {
    test.add([
/*
        testMarkDown_normalize,
        testMarkDown_normalize2,
        testMarkDown_heading,
        testMarkDown_inline,
 */
        testMarkDown_block,
    ]);
}

// --- test cases ------------------------------------------
function testMarkDown_normalize(test, pass, miss) {
    var sourceFile = "../assets/normalize.md";
    var validateFile = "../assets/normalize.validate";
    var result = MarkDown.normalize(_readFile(sourceFile)).trim();
    var validate = _readFile(validateFile).trim();

    if (result === validate) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMarkDown_normalize2(test, pass, miss) {
    var sourceFile = "../assets/normalize2.md";
    var validateFile = "../assets/normalize2.validate";
    var result = MarkDown.normalize(_readFile(sourceFile)).trim();
    var validate = _readFile(validateFile).trim();

    if (result === validate) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMarkDown_heading(test, pass, miss) {
    var sourceFile   = "../assets/heading.md";
    var validateFile = "../assets/heading.json";
    var result       = MarkDown.parse(_readFile(sourceFile)); // JSON
    var validate     = JSON.parse(_readFile(validateFile)); // JSON

    var resultString   = JSON.stringify(result, null, 2);
    var validateString = JSON.stringify(validate, null, 2);

    if (resultString === validateString) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMarkDown_inline(test, pass, miss) {
    var sourceFile   = "../assets/inline.md";
    var validateFile = "../assets/inline.json";
    var result       = MarkDown.parse(_readFile(sourceFile)); // JSON
    var validate     = JSON.parse(_readFile(validateFile)); // JSON

    var resultString   = JSON.stringify(result, null, 2);
    var validateString = JSON.stringify(validate, null, 2);

    if (resultString === validateString) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testMarkDown_block(test, pass, miss) {
    var sourceFile   = "../assets/block.md";
    var validateFile = "../assets/block.json";
debugger;
    var result       = MarkDown.parse( _readFile(sourceFile) );
    var validate     = JSON.parse(_readFile(validateFile)); // JSON

    var resultString   = JSON.stringify(result, null, 2);
    var validateString = JSON.stringify(validate, null, 2);

    _writeFile(validateFile, resultString);

    if (resultString === validateString) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function _readFile(file) {
    var fs = require("fs");
    return fs.readFileSync(file, "utf8");
}
function _writeFile(file, content) {
    var fs = require("fs");
    fs.writeFileSync(file, content, "utf8");
}

return test.run();

})(GLOBAL);


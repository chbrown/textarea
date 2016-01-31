exports.extend = function(target /*, source_0, source_1, ... */) {
    if (target === undefined) target = {};
    for (var source_i = 1, l = arguments.length; source_i < l; source_i++) {
        var source = arguments[source_i];
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};

exports.fill = function(n, character) {
    var arr = new Array(n);
    for (var i = 0; i < n; i++) {
        arr[i] = character;
    }
    return arr.join('');
};

/**
 TODO: consider using window.getDefaultComputedStyle instead?
 */
exports.copyStyle = function(source, target) {
    var css_style_declaration = window.getComputedStyle(source);
    for (var i = 0; i < css_style_declaration.length; i++) {
        var property = css_style_declaration[i];
        target.style[property] = css_style_declaration[property];
    }
};

exports.copyStyleSubset = function(source, target, styles) {
    var css_style_declaration = window.getComputedStyle(source);
    for (var i = 0; i < styles.length; i++) {
        var property = styles[i];
        target.style[property] = css_style_declaration[property];
    }
};

exports.escapeHTML = function(html) {
    // this is for measuring the size of html,
    // so I don't actually think we need to substitute the newlines with a break. See
    //   * https://developer.mozilla.org/en-US/docs/Web/CSS/white-space
    //   * http://css-tricks.com/almanac/properties/w/whitespace/
    // '\n': '<br/>' /[\n]/g
    var replacements = {'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'};
    return html && html.replace(/[&<>"]/g, function(entity) {
            return replacements[entity];
        });
};

// these are a (the?) subset of styles that are relevant to the resulting size of a flow-sized element
exports.shadow_sized_styles = [
    // padding
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    // border-width
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    // border-style
    // 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    // font sizing
    'font-weight', 'font-size', 'font-family', 'font-size-adjust',
    // kerning/leading
    'line-height', 'letter-spacing', 'word-spacing',
    'text-decoration', 'text-transform', 'text-align', 'text-indent',
    'direction',
    // and, really, the most important ones:
    'white-space', 'word-wrap',
    // box-sizing for various vendors
    // '-moz-box-sizing', '-webkit-box-sizing',
    'box-sizing'
];

exports.createShadowElement = function() {
    var div = document.createElement('div');
    // `visibility: hidden` is how jQuery measures `display: none` elements
    // we need `display: block` or `display: inline-block` so that we can set
    // clientWidth and have it stick.
    // These styles are shadow properties that should not be overwrited by
    // the original textarea element.
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.display = 'block'; // in case the css says "div { display: inline; }" or something
    return div;
};

exports.autodedent = function(string) {
    var space = [];
    var match = null;
    var regex = /(^|\n)(\s+)/g;
    // TODO: ignore totally empty lines
    while ((match = regex.exec(string)) !== null) {
        space.push(parseInt(match[2].length, 10));
    }
    // calculate dedent amount
    var common_space = Math.min.apply(null, space);
    //
    var replace_regex = new RegExp('(^|\n)\\s{' + common_space + '}', 'g');
    return string.replace(replace_regex, '$1');
};

exports.dentSelection = function(textarea, dedent, tab) {
    /** dentSelection:
     textarea: DOM Element
     dedent: indent if false, otherwise, un-indent (usually false)
     tab: a String, e.g., '  '

     dentSelection is called when the tab key is pressed, after initializing with initTabListener

     support this.selectionDirection? I think that'd just entail indexOf instead of lastIndexOf

     Edge case to handle: when your end selection is a line with only
     whitespace, and you dedent it all out you'd want to indent it back with
     the group, but once you hit 0-width on that line, the statelessness of
     this mechanism means that selection will be forgotten. But we don't want
     to select slightly into the next line, or otherwise if you triple-click,
     the end selection would start to select the next line (which is bad!).

     Other test cases:
     1. Select from first line somewhere into document. Should indent all of first line.
     2. Zero-width selections should NOT be expanded.
     3. Triple click some portion (so that the last newline is technically selected) -- should not shift line below.
     4. TODO: dedent by fraction of a tab if, say, the tab is 4 spaces and there are only 2.

     */
    var selectionStart = textarea.selectionStart;
    var selectionEnd = textarea.selectionEnd;
    var selectionWidth = selectionEnd - selectionStart;
    // for begin, start at `selectionStart - 1` so that we don't catch the newline that the cursor is currently on
    var begin = textarea.value.lastIndexOf('\n', selectionStart - 1);
    // 0-width selections get special handling in case the cursor is sitting at the front of the line
    var end = textarea.value.indexOf('\n', selectionEnd - (selectionWidth === 0 ? 0 : 1));

    // shrink/expand to their respective ends of the documents if no newline was found
    if (begin == -1) {
        begin = 0;
    }
    if (end == -1) {
        end = textarea.value.length;
    }

    // before + middle + end: '^blah\nblahblah' + '\nthisthis\nthatthat\nyesyes' + '\nsomething else'
    var before = textarea.value.slice(0, begin);
    var middle = textarea.value.slice(begin, end);
    var after = textarea.value.slice(end);

    if (dedent) {
        // if we have selected all the way to the beginning, we also want to indent the beginning of the string
        //   begin = 0 is special and I can't figure out a way to make regex multiline play nice
        var dedent_pattern = new RegExp((begin === 0) ? '(^|\n)' + tab : '(\n)' + tab, 'g');
        // removing a tab
        middle = middle.replace(dedent_pattern, '$1');
    }
    else {
        var indent_pattern = new RegExp((begin === 0) ? '(^|\n)' : '(\n)', 'g');
        // indenting a tab
        middle = middle.replace(indent_pattern, '$1' + tab);
    }
    // modification complete, push changes to dom and set selection
    textarea.value = before + middle + after;
    if (selectionWidth === 0) {
        // TODO: don't move the cursor unless the tab was effective
        var selectionIndex = selectionStart + (dedent ? -tab.length : tab.length);
        textarea.setSelectionRange(selectionIndex, selectionIndex);
    }
    else {
        // again, special handling for begin = 0
        textarea.setSelectionRange(begin === 0 ? 0 : begin + 1, begin + middle.length);
    }
};

exports.autoindentNewline = function(textarea, jump) {
    /**
     We have just started a newline. Indent to where the previous one ended.

     If jump is true (when command is held), do not cut the current line,
     but instead act as if we were at the end of line when we pressed return.

     Should always be 0-width selection
     */
    var value = textarea.value;
    var selectionStart = textarea.selectionStart;
    if (jump) {
        var end_of_line = value.indexOf('\n', selectionStart - 1);
        if (end_of_line > -1) {
            selectionStart = end_of_line;
        }
    }
    var beginning_of_previous_line = value.lastIndexOf('\n', selectionStart - 1) + 1;
    // if (beginning_of_line > -1) {
    var previous_indent = value.slice(beginning_of_previous_line).match(/^[ \t]+/);
    if (previous_indent) {
        // need to make sure max out beginning_of_previous_line + previous_indent
        // at selectionStart
        // for example, select the middle of some whitespace and press enter
        var before = textarea.value.slice(0, selectionStart);
        var after = textarea.value.slice(selectionStart);
        // add the newline because we prevented default already
        // should replace selection if we do not have a 0-width selection
        var insert = '\n' + previous_indent[0];
        textarea.value = before + insert + after;
        var cursor = selectionStart + insert.length;
        textarea.setSelectionRange(cursor, cursor);
        return true;
    }
    // don't do anything if there is no existing indent
    // don't do anything special on the very first line of the document
    // trigger resizeToFit?
};

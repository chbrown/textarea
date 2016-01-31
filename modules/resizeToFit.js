var escapeHTML = require('./utilis').escapeHTML;

module.exports = function(){
    if (this.shadow.clientWidth != this.el.clientWidth) {
        var tmp_style = window.getComputedStyle(this.el);
        this.shadow.style.width = tmp_style.width;
    }

    var html = escapeHTML(this.el.value);
    // add extra white space to make sure the last line is rendered
    this.shadow.innerHTML = html + '&nbsp;';
    // todo: too-long lines with only trailing space won't trigger a newline
    // until you hit a visible character, which triggers an ugly shift of the
    // text to the right as the box tries to fit a full space character into
    // whatever space is left on that line.

    // element sizing, from quirskmode:
    // clientWidth and clientHeight (read/write):
    //   * The width and height of the content field, excluding border and scrollbar, but including padding
    // offsetWidth and offsetHeight (readonly):
    //   * The width and height of the entire element, including borders
    // scrollWidth and scrollHeight:
    //   * The width and height of the entire content field, including those parts that are currently hidden.
    //   * If there's no hidden content it should be equal to clientX/Y.
    var style = window.getComputedStyle(this.el);

    // we calculate the min/max height from the css, and have an absolute minimum of 2*line-height
    // var line_height = parseInt(style['line-height']) || parseInt(style['font-size']);
    var min_height = parseInt(style['min-height'], 10);
    var max_height = parseInt(style['max-height'], 10);

    // the shadow div should now have resized to match the contents of the textarea, so we measure it
    var shadow_style = window.getComputedStyle(this.shadow);
    var shadow_height = shadow_style.height;

    // todo: if the user disables auto-expanding with max-height, make sure the shadow
    // does not take up too much space

    if (!isNaN(max_height) && shadow_style.height > max_height) {
        this.el.style.overflow = 'auto';
        this.el.style.height = '';
    }
    else if (!isNaN(min_height) && shadow_style.height < min_height) {
        this.el.style.overflow = 'auto';
        this.el.style.height = '';
    }
    else if (shadow_style.height != this.el.style.height) {
        // we are free to be flexible, just match the shadow!
        this.el.style.overflow = 'hidden';
        this.el.style.height = shadow_style.height;
    }
};

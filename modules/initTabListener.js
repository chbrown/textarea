var dentSelection = require('./utilis').dentSelection;

module.exports = function(){
    /** set up indentation (tab-hijacking)

     References:
     * https://github.com/wjbryant/taboverride
     */
    var tab = this.opts.tab;
    this.el.addEventListener('keydown', function(ev) {
        // 9 = tab
        if (ev.which == 9) {
            ev.preventDefault();
            // ev.shiftKey == true ? dedent : indent
            dentSelection(this, ev.shiftKey, tab);
        }
    }, false);
};

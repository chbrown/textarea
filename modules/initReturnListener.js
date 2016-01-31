var autoindentNewline = require('./utilis').autoindentNewline;

module.exports = function(){
    /**
     10 = newline (\n)
     13 = carriage return (\r)
     */
    var tab = this.opts.tab;
    this.el.addEventListener('keydown', function (ev) {
        if (ev.which == 13) {
            var handled = autoindentNewline(this, ev.metaKey);
            if (handled) {
                ev.preventDefault(); // we've put it in ourselves
            }
        }
    }, false);
};

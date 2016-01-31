module.exports = function(interval) {
    var self = this;
    // for a hash value -- just use the length
    var last_value_hash = this.el.value.length;
    setInterval(function() {
        var current_value_hash = self.el.value.length;
        if (current_value_hash != last_value_hash) {
            self.resizeToFit();
            last_value_hash = current_value_hash;
        }
    }, interval);
};

/*jslint browser: true */
var extend = require('./modules/utilis').extend,
    autodedent = require('./modules/utilis').autodedent;

// setInterval(function() {
//   log('textarea.selectionStart', (window.textarea || {}).selectionStart);
// }, 1000);

var Textarea = function(el, opts) {
  /** Textarea: tab and autoresize support

  el: DOM Element with tagName 'textarea'
  opts:
      tab: String
          string to insert at the front of the line when indenting, defaults to '  ' (2 spaces)
      buffer: Number
          pixels to add to the height when a positive resize is necessary, defaults to 0
      autodedent: Boolean
          if true, dedent the original text as much as possible
      poll: Number
          interval between checking if the contents have changed, resizing if needed
  */
  this.opts = extend({}, {
    tab: '  ',
    buffer: 0,
    autodedent: false,
  }, opts);

  this.el = el;

  if (this.opts.autodedent) {
    this.el.value = autodedent(this.el.value);
  }

  this.initTabListener();
  this.initReturnListener();
  this.initResizeToFit();
  // todo:
  //   'command+{' -> dedent
  //   'command+}' -> indent
  //   newline after opening tag / -- autoindent + normal tab
  //   'command+option+.' -> closing currently open tag
  //   fix problem with command+newline on lines without a previous indented line
  //   'command+left' (home) -> jump to beginning of line, after whitespace
  //   trim trailing white space ?

  if (this.opts.poll) {
    this.initValuePoll(this.opts.poll);
  }
};

Textarea.prototype.initTabListener = require('./modules/initTabListener');

Textarea.prototype.initReturnListener = require('./modules/initReturnListener');

Textarea.prototype.initValuePoll = require('./modules/initValuePoll');

Textarea.prototype.initResizeToFit = require('./modules/initResizeToFit');

Textarea.prototype.resizeToFit = require('./modules/resizeToFit');

/**
Textarea.enhance() simply wraps the `new Textarea()` constructor
*/
Textarea.enhance = function(textarea, opts) {
  return new Textarea(textarea, opts);
};

module.exports = Textarea;
exports.Textarea = Textarea;


if (typeof angular !== 'undefined') {
  angular.module('textarea', []).directive('enhance', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function(scope, el, attrs, ngModel) {
        // enhance textarea (check if it's a textarea)
        var textarea = el[0];
        if (textarea.tagName == 'TEXTAREA') {
          Textarea.enhance(textarea);
        }

        if (ngModel) {
          // console.log(textarea, 'ngModel', ngModel);
          // I think the built-in ng-model will handle actually setting the value?
          ngModel.$render = function() {
            // handle undefined input value by representing it as the empty string
            textarea.value = (ngModel.$viewValue === undefined || ngModel.$viewValue === null) ? '' : ngModel.$viewValue;
            // jump out of the $digest in case a different ng-model controller is listening
            setTimeout(function() {
              // but we need to trigger an 'input' event so that the enhanced Textarea triggers a resize
              textarea.dispatchEvent(new Event('input'));
            }, 0);
          };
          el.on('blur keyup change', function() {
            scope.$apply(function() {
              ngModel.$setViewValue(textarea.value);
            });
          });
        }
      }
    };
  });
}

var createShadowElement = require('./utilis').createShadowElement,
    copyStyleSubset = require('./utilis').copyStyleSubset,
    shadow_sized_styles = require('./utilis').shadow_sized_styles;

module.exports = function(){
    /** add autosizing functionality to the textarea

     References:
     * http://flaviusmatis.github.com/flexibleArea.js
     * https://github.com/jackmoore/autosize/blob/master/jquery.autosize.js
     * https://github.com/alexbardas/jQuery.fn.autoResize/blob/master/jquery.autoresize.js
     * https://github.com/akaihola/jquery-autogrow/blob/master/jquery.autogrow.js
     */
    if (this.el.style.width === '') {
        // allow horizontal resizing if there is no manual width setting
        this.el.style.horizontal = 'horizontal';
    }
    else {
        this.el.style.horizontal = 'none';
    }

    this.shadow = createShadowElement();

    var container = this.el.parentNode;
    // insert the shadow right before the element
    container.insertBefore(this.shadow, this.el);
    // document.body.appendChild(this.shadow);
    copyStyleSubset(this.el, this.shadow, shadow_sized_styles);

    // should resizeToFit be called with other args based on what happened?
    // i.e., target.resize vs. shadow.resize vs. target input vs. target style change
    var resizeToFit = this.resizeToFit.bind(this);
    // https://developer.mozilla.org/en-US/docs/Web/Reference/Events
    window.addEventListener('resize', resizeToFit, false);
    document.addEventListener('readystatechange', resizeToFit, false);
    this.el.addEventListener('blur', resizeToFit, false);
    this.el.addEventListener('keyup', resizeToFit, false);
    this.el.addEventListener('change', resizeToFit, false);
    this.el.addEventListener('cut', resizeToFit, false);
    this.el.addEventListener('paste', resizeToFit, false);
    this.el.addEventListener('input', resizeToFit, false);
    // maybe use https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    // in the future once it's more widely supported
    // but for now, maybe poll the shadow div for changed height? (ewww, I know, polling)
    // ...

    // trigger a resize, to start us off
    this.resizeToFit();
};

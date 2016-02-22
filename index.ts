const leadingSpaceRegExp = /^( *)(\S|$)/;
/**
Calculate the width (number of space characters) of leading whitespace in a block of text.
*/
export function measureLeadingWhitespace(input: string, max = 80) {
  let spaces = max;
  // the m (multiline) RegExp literal flag treats each line as beginning with ^ and ending with $
  input.split(/\r?\n/g).forEach(line => {
    const match = line.match(leadingSpaceRegExp);
    // ignore totally empty lines
    if (match[2].length > 0) {
      spaces = Math.min(spaces, match[1].length);
    }
  });
  return spaces;
}
/**
Remove leading whitespace from each line of the input up to the specified amount.
*/
export function dedent(input: string, spaces = measureLeadingWhitespace(input)) {
  const replaceRegExp = new RegExp('(^|\n) {' + spaces + '}', 'g');
  return input.replace(replaceRegExp, '$1');
}

const htmlReplacements: {[index: string]: string} = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
};
function escapeHTML(html: string): string {
  // this is for measuring the size of html,
  // so I don't actually think we need to substitute the newlines with a break. See
  //   * https://developer.mozilla.org/en-US/docs/Web/CSS/white-space
  //   * http://css-tricks.com/almanac/properties/w/whitespace/
  // '\n': '<br/>' /[\n]/g
  return html && html.replace(/[&<>"]/g, entity => htmlReplacements[entity]);
}

function copyStyleSubset(source: Element, target: HTMLElement, properties: string[]) {
  const cssStyleDeclaration = getComputedStyle(source);
  properties.forEach(property => {
    const sourceValue = cssStyleDeclaration.getPropertyValue(property);
    target.style.setProperty(property, sourceValue);
  });
}

/** A (the?) subset of styles that are relevant to the painted size of an
in-flow element */
const cssSizeProperties = [
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
  'box-sizing',
];

function createShadowElement(): HTMLDivElement {
  const div = document.createElement('div');
  // `visibility: hidden` is how jQuery measures `display: none` elements
  // we need `display: block` or `display: inline-block` so that we can set
  // clientWidth and have it stick.
  // These styles are shadow properties that should not be overwrited by
  // the original textarea element.
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.display = 'block'; // in case the css says "div { display: inline; }" or something
  return div;
}

/**
dentSelection:

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
function dentSelection(textarea: HTMLTextAreaElement, dedent: boolean, tab: string) {
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const selectionWidth = selectionEnd - selectionStart;
  // for begin, start at `selectionStart - 1` so that we don't catch the newline that the cursor is currently on
  let begin = textarea.value.lastIndexOf('\n', selectionStart - 1);
  // 0-width selections get special handling in case the cursor is sitting at the front of the line
  let end = textarea.value.indexOf('\n', selectionEnd - (selectionWidth === 0 ? 0 : 1));

  // shrink/expand to their respective ends of the documents if no newline was found
  if (begin == -1) {
    begin = 0;
  }
  if (end == -1) {
    end = textarea.value.length;
  }

  // before + middle + end: '^blah\nblahblah' + '\nthisthis\nthatthat\nyesyes' + '\nsomething else'
  const before = textarea.value.slice(0, begin);
  let middle = textarea.value.slice(begin, end);
  const after = textarea.value.slice(end);

  if (dedent) {
    // if we have selected all the way to the beginning, we also want to indent the beginning of the string
    //   begin = 0 is special and I can't figure out a way to make regex multiline play nice
    const dedentRegExp = new RegExp((begin === 0) ? '(^|\n)' + tab : '(\n)' + tab, 'g');
    // removing a tab
    middle = middle.replace(dedentRegExp, '$1');
  }
  else {
    const indentRegExp = new RegExp((begin === 0) ? '(^|\n)' : '(\n)', 'g');
    // indenting a tab
    middle = middle.replace(indentRegExp, '$1' + tab);
  }
  // modification complete, push changes to dom and set selection
  textarea.value = before + middle + after;
  if (selectionWidth === 0) {
    // TODO: don't move the cursor unless the tab was effective
    const selectionIndex = selectionStart + (dedent ? -tab.length : tab.length);
    textarea.setSelectionRange(selectionIndex, selectionIndex);
  }
  else {
    // again, special handling for begin = 0
    textarea.setSelectionRange(begin === 0 ? 0 : begin + 1, begin + middle.length);
  }
}

/**
We have just started a newline. Indent to where the previous one ended.

If jump is true (when command is held), do not cut the current line,
but instead act as if we were at the end of line when we pressed return.

Should always be 0-width selection
*/
function autoindentNewline(textarea: HTMLTextAreaElement, jump: boolean) {
  const value = textarea.value;
  let selectionStart = textarea.selectionStart;
  if (jump) {
    const end_of_line = value.indexOf('\n', selectionStart - 1);
    if (end_of_line > -1) {
      selectionStart = end_of_line;
    }
  }
  const beginning_of_previous_line = value.lastIndexOf('\n', selectionStart - 1) + 1;
  // if (beginning_of_line > -1) {
  const previousIndentMatch = value.slice(beginning_of_previous_line).match(/^[ \t]+/);
  if (previousIndentMatch) {
    // need to make sure max out beginning_of_previous_line + previousIndentMatch
    // at selectionStart
    // for example, select the middle of some whitespace and press enter
    const before = textarea.value.slice(0, selectionStart);
    const after = textarea.value.slice(selectionStart);
    // add the newline because we prevented default already
    // should replace selection if we do not have a 0-width selection
    const insert = '\n' + previousIndentMatch[0];
    textarea.value = before + insert + after;
    const cursor = selectionStart + insert.length;
    textarea.setSelectionRange(cursor, cursor);
    return true;
  }
  // don't do anything if there is no existing indent
  // don't do anything special on the very first line of the document
  // trigger resizeToFit?
}

/** Textarea: tab and autoresize support */
class Textarea {
  /** string to insert at the front of the line when indenting; defaults to '  ' (2 spaces) */
  protected indentContent = '  ';
  /** pixels to add to the height when a positive resize is necessary; defaults to 0 */
  protected bufferSpace = 0;
  /** hidden DOM element without size constraints used for measuring text size */
  shadow: HTMLDivElement;
  /**
  @param {HTMLElement} el: DOM Element with tagName 'textarea'

  @param {boolean} autodedent: if true, dedent the original text as much as possible
  @param {boolean} poll: interval between checking if the contents have changed, resizing if needed
  */
  constructor(protected el: HTMLTextAreaElement,
              {tab = '  ', buffer = 0, autodedent = false, poll = null} = {}) {
    this.indentContent = tab;
    this.bufferSpace = buffer;

    if (autodedent) {
      this.el.value = dedent(this.el.value);
    }

    this.initTabListener();
    this.initNewlineListener();
    this.initResizeToFit();
    // todo:
    //   'command+{' -> dedent
    //   'command+}' -> indent
    //   newline after opening tag / -- autoindent + normal tab
    //   'command+option+.' -> closing currently open tag
    //   fix problem with command+newline on lines without a previous indented line
    //   'command+left' (home) -> jump to beginning of line, after whitespace
    //   trim trailing white space ?

    if (poll) {
      this.initValuePoll(poll);
    }
  }
  /** set up indentation (tab-hijacking)

  References:
    * https://github.com/wjbryant/taboverride
  */
  initTabListener() {
    this.el.addEventListener('keydown', ev => {
      // 9 = tab
      if (ev.which == 9) {
        ev.preventDefault();
        // ev.shiftKey == true ? dedent : indent
        dentSelection(this.el, ev.shiftKey, this.indentContent);
      }
    }, false);
  }
  /**
  10 = newline (\n)
  13 = carriage return (\r)
  */
  initNewlineListener() {
    this.el.addEventListener('keydown', ev => {
      if (ev.which == 13) {
        const handled = autoindentNewline(this.el, ev.metaKey);
        if (handled) {
          ev.preventDefault(); // we've put it in ourselves
        }
      }
    }, false);
  }
  initValuePoll(interval: number) {
    const self = this;
    // for a hash value -- just use the length
    let last_value_hash = this.el.value.length;
    setInterval(() => {
      const current_value_hash = self.el.value.length;
      if (current_value_hash != last_value_hash) {
        self.resizeToFit();
        last_value_hash = current_value_hash;
      }
    }, interval);
  }
  /** add autosizing functionality to the textarea

  References:
    * http://flaviusmatis.github.com/flexibleArea.js
    * https://github.com/jackmoore/autosize/blob/master/jquery.autosize.js
    * https://github.com/alexbardas/jQuery.fn.autoResize/blob/master/jquery.autoresize.js
    * https://github.com/akaihola/jquery-autogrow/blob/master/jquery.autogrow.js
  */
  initResizeToFit() {
    if (this.el.style.width === '') {
      // allow horizontal resizing if there is no manual width setting
      this.el.style.setProperty('resize', 'horizontal');
    }
    else {
      this.el.style.setProperty('resize', 'none');
    }

    this.shadow = createShadowElement();

    const container = this.el.parentNode;
    // insert the shadow right before the element
    container.insertBefore(this.shadow, this.el);
    // document.body.appendChild(this.shadow);
    copyStyleSubset(this.el, this.shadow, cssSizeProperties);

    // should resizeToFit be called with other args based on what happened?
    // i.e., target.resize vs. shadow.resize vs. target input vs. target style change
    const resizeToFit = this.resizeToFit.bind(this);
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
  }
  resizeToFit() {
    if (this.shadow.clientWidth != this.el.clientWidth) {
      const tmp_style = getComputedStyle(this.el);
      this.shadow.style.width = tmp_style.width;
    }

    const html = escapeHTML(this.el.value);
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
    const style = getComputedStyle(this.el);

    // we calculate the min/max height from the css, and have an absolute minimum of 2*line-height
    // const line_height = parseInt(style['line-height']) || parseInt(style['font-size']);
    const minHeight = parseInt(style.minHeight, 10);
    const maxHeight = parseInt(style.maxHeight, 10);

    // the shadow div should now have resized to match the contents of the textarea, so we measure it
    const shadowStyle = getComputedStyle(this.shadow);
    const shadowHeight = parseInt(shadowStyle.height, 10);

    // todo: if the user disables auto-expanding with max-height, make sure the shadow
    // does not take up too much space

    if (!isNaN(maxHeight) && shadowHeight > maxHeight) {
      this.el.style.overflow = 'auto';
      this.el.style.height = '';
    }
    else if (!isNaN(minHeight) && shadowHeight < minHeight) {
      this.el.style.overflow = 'auto';
      this.el.style.height = '';
    }
    else if (shadowStyle.height != this.el.style.height) {
      // we are free to be flexible, just match the shadow!
      this.el.style.overflow = 'hidden';
      this.el.style.height = shadowStyle.height;
    }
  }
}

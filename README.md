## textarea

One textarea plugin to rule them all.

Ace editor and CodeMirror are over the top. I just want tabs and block indentation.

And auto-expansion to fix the contents (height-wise).

Your `<textarea>` should specify `min-height` and `max-height`, but not `height`.

## How to use it

### As a node module: 

```javascript

    var Textarea = require('textarea');
        
    //Initialize on the text area element
    var el = document.querySelector('textarea');
    Textarea.enhance(el);
    
    Now your textarea have all the benefits of the plugin YAY !
```

### As a standalone:

```html

    // at the end of your body
    
    <script src="node_modules/textarea/dist/textarea.js"></script>
    <script>
        var el = document.querySelector('textarea');
        Textarea.enhance(el);
    </script>
    
    Now your textarea have all the benefits of the plugin YAY !

```


## Output a new standalone 


```bash

    //Download dependencies
    npm install
    
    //Make the standalone
    npm run dist

```


## License

Copyright 2013-2015 Christopher Brown. [MIT Licensed](http://chbrown.github.io/licenses/MIT/#2013-2015).

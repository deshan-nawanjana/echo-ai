const codeScript = {
  codeEvent(event) {
    // get target element
    const element = event.target
    // get text value
    const value = element.value
    // get selection range
    const start = element.selectionStart
    const end = element.selectionEnd
    // check tab key
    if (event.key === 'Tab') {
      // prevent default behavior
      event.preventDefault()
      // inset tab space
      element.setRangeText('  ', start, end, 'end')
    }
    // auto bracket pairs
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
    }
    // check for bracket pairs
    if (pairs[event.key]) {
      // prevent default behavior
      event.preventDefault()
      // get open and close brackets
      const open = event.key
      const close = pairs[event.key]
      // check for selections
      if (start !== end) {
        // get selected text
        const selected = value.slice(start, end)
        // warp text with brackets
        element.setRangeText(open + selected + close, start, end, 'end')
      } else {
        // inset brackets for cursor position
        element.setRangeText(open + close, start, end, 'end')
        // update cursor position
        element.selectionEnd = start + 1
      }
    }
    // check for enter key
    if (event.key === 'Enter') {
      event.preventDefault();
      const before = value.slice(0, start);
      const after = value.slice(end);

      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      const indentMatch = currentLine.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';

      const nextChar = after[0] || '';
      const prevChar = before[before.length - 1] || '';

      const openBrackets = ['{', '[', '('];
      const closeBrackets = ['}', ']', ')'];

      const isBracketPair = openBrackets.includes(prevChar) && closeBrackets.includes(nextChar);

      if (isBracketPair) {
        // Insert new line with deeper indent, then another with original indent
        const deeperIndent = indent + '  ';
        const insertText = `\n${deeperIndent}\n${indent}`;
        element.setRangeText(insertText, start, end, 'end');
        // Move cursor to middle line
        element.selectionStart = element.selectionEnd = start + 1 + deeperIndent.length;
      } else {
        const insertText = '\n' + indent;
        element.setRangeText(insertText, start, end, 'end');
      }
    }
    // Smart backspace: delete bracket pair if cursor is between them
    if (event.key === 'Backspace' && start === end) {
      const prevChar = value[start - 1];
      const nextChar = value[start];

      const pairs = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
      };
      if (pairs[prevChar] === nextChar && value !== '') {
        event.preventDefault();
        // Remove both chars
        element.setRangeText('', start - 1, start + 1, 'end');
      }
    }
    return element.value
  },
  codeScroll(event) {
    // get target element
    const element = event.target
    const preview = element.parentElement.querySelector("pre")
    if (preview) { preview.scrollTop = element.scrollTop }

  },
  codeHighlight(text, lang) {
    return Prism.highlight(text, Prism.languages[lang], lang)
  }
}

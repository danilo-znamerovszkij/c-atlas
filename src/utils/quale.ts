// Merriam's Calculus of Qualia writes the quale of blackness as █. A glyph takes
// the text colour, which is white on our dark theme, so draw it as a black swatch.
export const markQuale = (html: string): string =>
  html.replace(/█/g, '<span class="quale-swatch" role="img" aria-label="black square">█</span>')

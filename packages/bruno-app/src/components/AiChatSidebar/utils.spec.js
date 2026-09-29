import { renderMarkdown } from './utils';

describe('renderMarkdown', () => {
  it('autolinks full URLs and bare domains', () => {
    const html = renderMarkdown('See https://usebruno.com/docs or example.com');

    expect(html).toContain('<a href="https://usebruno.com/docs">https://usebruno.com/docs</a>');
    expect(html).toContain('<a href="http://example.com">example.com</a>');
  });

  it('escapes raw HTML instead of rendering it', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

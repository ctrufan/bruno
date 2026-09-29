import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TextPreview from './TextPreview';

describe('TextPreview', () => {
  it('links full URLs, bare domains and URLs with credentials', () => {
    const onLinkClick = jest.fn();
    render(
      <TextPreview
        data="docs at https://usebruno.com/docs, mirror example.com and https://user:pass@api.example.org/v1"
        onLinkClick={onLinkClick}
      />
    );

    const links = screen.getAllByTestId('text-preview-link');
    expect(links.map((link) => link.textContent)).toEqual([
      'https://usebruno.com/docs',
      'example.com',
      'https://user:pass@api.example.org/v1'
    ]);

    fireEvent.click(links[1]);
    expect(onLinkClick).toHaveBeenCalledWith('http://example.com');
  });

  it('renders plain text without links when no click handler is given', () => {
    render(<TextPreview data="see https://usebruno.com" />);

    expect(screen.queryByTestId('text-preview-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('text-preview-container')).toHaveTextContent('see https://usebruno.com');
  });
});

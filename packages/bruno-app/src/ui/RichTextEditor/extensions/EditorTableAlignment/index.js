import { TableCell, TableHeader } from '@tiptap/extension-table';

const ALIGNMENTS = ['left', 'center', 'right'];

const parseAlignment = (element) => {
  const styleAlign = element.style.textAlign;
  const attrAlign = element.getAttribute('align');
  const alignment = styleAlign || attrAlign;

  return ALIGNMENTS.includes(alignment) ? alignment : null;
};

const alignmentAttribute = {
  alignment: {
    default: null,
    parseHTML: parseAlignment,
    renderHTML: (attributes) => (attributes.alignment ? { style: `text-align: ${attributes.alignment}` } : {})
  }
};

const EditorTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttribute
    };
  }
});

const EditorTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...alignmentAttribute
    };
  }
});

export { ALIGNMENTS, EditorTableCell, EditorTableHeader };

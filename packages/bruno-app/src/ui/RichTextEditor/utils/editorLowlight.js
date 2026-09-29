import { common, createLowlight } from 'lowlight';
import protobuf from 'highlight.js/lib/languages/protobuf';

// Shared by the CodeBlockLowlight extension and EditorCodeBlock so highlighting
// and language detection use the same grammars.
export const lowlight = createLowlight(common);
lowlight.register('protobuf', protobuf);

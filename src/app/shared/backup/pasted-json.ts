/**
 * The JSON in what was pasted from an AI chat: the reply can come whole, with words around it,
 * the JSON in a code block and "Notes:" after it, so it's the code block's contents if there's
 * one, and then everything from the first `{` to the last `}`. Text with no braces comes back
 * as it is, for the import to turn down.
 */
export function pastedJson(text: string): string {
    const fenced = /```[a-z]*\s*\n([\s\S]*?)```/i.exec(text);
    const inside = fenced ? fenced[1] : text;
    const start = inside.indexOf('{');
    const end = inside.lastIndexOf('}');
    return start >= 0 && end > start ? inside.slice(start, end + 1) : inside.trim();
}

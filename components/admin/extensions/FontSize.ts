import { Extension } from "@tiptap/core"
// Side-effect import for the `textStyle` mark's command typings
// (`removeEmptyTextStyle`); the extension itself is registered in RichEditor.
import "@tiptap/extension-text-style"

/**
 * Group 1 — font size as an attribute of Tiptap's `textStyle` mark.
 *
 * Tiptap 2 ships no official font-size extension (it arrived in v3), so this is
 * the small, standard implementation: a global `fontSize` attribute on
 * `textStyle` plus set/unset commands. Being a MARK attribute, it applies to
 * the selected text only, never to the whole block.
 *
 * Rendered as `<span style="font-size: 18px">` (merged with font-family when
 * both are set). The backend sanitizer accepts only the sizes listed in
 * `editor-fonts.ts`.
 */
declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		fontSize: {
			/** Applies e.g. "18px" to the current selection. */
			setFontSize: (size: string) => ReturnType
			/** Removes the size from the current selection. */
			unsetFontSize: () => ReturnType
		}
	}
}

export interface FontSizeOptions {
	types: string[]
}

export const FontSize = Extension.create<FontSizeOptions>({
	name: "fontSize",

	addOptions() {
		return { types: ["textStyle"] }
	},

	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					fontSize: {
						default: null,
						parseHTML: (element: HTMLElement) => element.style.fontSize || null,
						renderHTML: (attributes: Record<string, unknown>) => {
							const size = attributes.fontSize

							if (typeof size !== "string" || !size) {
								return {}
							}

							return { style: `font-size: ${size}` }
						},
					},
				},
			},
		]
	},

	addCommands() {
		return {
			setFontSize:
				(size: string) =>
				({ chain }) =>
					chain().setMark("textStyle", { fontSize: size }).run(),
			unsetFontSize:
				() =>
				({ chain }) =>
					chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
		}
	},
})

export default FontSize

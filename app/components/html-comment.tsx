export function HtmlComment({ text }: { text: string }) {
	const html = `<!-- ${text} -->`;
	function callback(instance: HTMLScriptElement | null) {
		if (instance) {
			instance.outerHTML = html;
		}
	}
	return (
		<script
			ref={callback}
			type="text/comment"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

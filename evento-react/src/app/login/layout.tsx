export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		// <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 h-screen">
		// 	<div className="inline-block max-w-lg text-center justify-center" style={{ display: 'grid', placeItems: 'center' }}>
		<div>{children}</div>
		// 	</div>
		// </section>
	);
}

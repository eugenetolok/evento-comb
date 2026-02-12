export default function BadgeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section className="">
            <div className="">
                {children}
            </div>
        </section>
    );
}
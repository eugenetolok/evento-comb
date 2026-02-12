export default function BadgesLayout({
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
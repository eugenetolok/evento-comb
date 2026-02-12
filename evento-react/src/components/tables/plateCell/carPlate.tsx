import React from 'react';
import '@/components/tables/plateCell/carPlate.css';

const CarPlate = ({ plateCode }: { plateCode: string }) => {
    const [plateSize, setPlateSize] = React.useState<number>(120);

    React.useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            const parentWidth = entries[0].contentRect.width;
            setPlateSize(Math.min(Math.max(parentWidth / 2, 100), 200));
        });

        const parentElement = document.querySelector('.carPlateContainer');
        if (parentElement) {
            resizeObserver.observe(parentElement);
        }

        // Clean up the ResizeObserver on component unmount
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    console.log("plateCode", plateCode);
    const regionCode = plateCode.slice(6);
    console.log("regionCode", regionCode);
    const plateNumber = plateCode.slice(0, 6);
    console.log("plateNumber", plateNumber);

    return (
        <div className="carPlateContainer">
            <div className="carPlate" style={{ width: `${plateSize}px`, fontSize: `${plateSize / 7.5}px` }}>
                <span className="plateNumber">{plateNumber}</span>
                <span className="plateRegion">{regionCode}</span>
                <div className="russianFlagContainer">
                    <span className="rusLabel">RUS</span>
                    <div className="russianFlag"></div>
                </div>
            </div>
        </div>
    );
};

export default CarPlate;

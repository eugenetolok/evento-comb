import React from "react";
import "@/components/tables/plateCell/carPlate.css";

const RUS_TO_LATIN_MAP: Record<string, string> = {
    А: "A",
    В: "B",
    Е: "E",
    К: "K",
    М: "M",
    Н: "H",
    О: "O",
    Р: "P",
    С: "C",
    Т: "T",
    У: "Y",
    Х: "X",
};

const RUS_PLATE_REGEX = /^([ABEKMHOPCTYX])(\d{3})([ABEKMHOPCTYX]{2})(\d{2,3})$/;

const normalizePlate = (value: string): string => {
    return value
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .split("")
        .map((symbol) => RUS_TO_LATIN_MAP[symbol] ?? symbol)
        .join("");
};

type CarPlateProps = {
    plateCode?: string | null;
    compact?: boolean;
    className?: string;
};

const CarPlate = ({ plateCode, compact = false, className = "" }: CarPlateProps) => {
    const rawPlate = (plateCode ?? "").trim();
    const normalizedPlate = normalizePlate(rawPlate);
    const plateMatch = normalizedPlate.match(RUS_PLATE_REGEX);
    const containerClassName = `carPlateContainer ${compact ? "isCompact" : ""} ${!plateMatch ? "isInvalid" : ""} ${className}`.trim();

    if (!plateMatch) {
        return (
            <div className={containerClassName}>
                <div className="carPlate carPlateInvalid">
                    <span className="plateInvalidValue">{rawPlate || "Без номера"}</span>
                </div>
            </div>
        );
    }

    const [, firstLetter, digits, suffixLetters, regionCode] = plateMatch;
    const plateNumber = `${firstLetter}${digits}${suffixLetters}`;

    return (
        <div className={containerClassName}>
            <div className="carPlate">
                <span className="plateNumber">{plateNumber}</span>
                <div className="plateRegionBlock">
                    <span className="plateRegion">{regionCode}</span>
                    <div className="russianFlagContainer">
                        <span className="rusLabel">RUS</span>
                        <span className="russianFlag" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarPlate;

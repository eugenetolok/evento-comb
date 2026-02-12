// @ts-nocheck
import React, { useRef } from "react";
import { MapContainer, ImageOverlay, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

const DrawArea = () => {
    const mapRef = useRef<any>(null);

    const handleCreated = (e) => {
        console.log(e);
    };

    const imageBounds = [
        [0, 0],
        [1024, 1024],
    ];

    return (
        <MapContainer
            center={[256, 256]}
            zoom={1}
            style={{ height: "512px" }}
            whenCreated={(map) => (mapRef.current = map)}
            maxBounds={imageBounds}
            attributionControl={false}
            crs={L.CRS.Simple}
        >
            <FeatureGroup>
                <EditControl
                    position="topright"
                    onCreated={handleCreated}
                    draw={{
                        polyline: false,
                        rectangle: true,
                        circle: true,
                        circlemarker: false,
                        marker: false,
                        polygon: {
                            allowIntersection: false,
                            drawError: {
                                color: "#e1e100",
                                timeout: 1000,
                            },
                            shapeOptions: {
                                color: "#0B5394",
                            },
                        },
                    }}
                />
            </FeatureGroup>
            <ImageOverlay url="/map.jpg" bounds={imageBounds} />
        </MapContainer>
    );
};

export default DrawArea;

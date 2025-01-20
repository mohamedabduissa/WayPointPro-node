               import express from 'express';
import axios from 'axios';
import zlib from 'zlib';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const app = express();

app.get('/decode-tile', async (req, res) => {
    const { z, x, y, accessToken, platform } = req.query;

    if (!z || !x || !y || !accessToken || !platform) {
        return res.status(400).json({ error: 'Missing required parameters: z, x, y, accessToken, platform' });
    }



    try {
        let tileUrl = ""
        if(platform == "mapbox") {
            tileUrl = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/${z}/${x}/${y}.vector.pbf?access_token=${accessToken}`;
        } else {
            tileUrl = `https://api.tomtom.com/traffic/map/4/tile/incidents/${z}/${x}/${y}vector.pbf?key=${accessToken}`;
        }
        //const tileUrl = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/${z}/${x}/${y}.vector.pbf?access_token=${accessToken}`;
        const response = await axios.get(tileUrl, { responseType: 'arraybuffer' });

        let decompressedData;

       // Check if the response is compressed
        try {
            decompressedData = zlib.gunzipSync(response.data); // Try decompressing
        } catch (e) {
            decompressedData = response.data; // If decompression fails, assume it's already uncompressed
        }

        // Decode the vector tile
        const tile = new VectorTile(new Protobuf(decompressedData));

        const trafficLayer = tile.layers['traffic'];
        const features = [];
        if (trafficLayer) {
            for (let i = 0; i < trafficLayer.length; i++) {
                const feature = trafficLayer.feature(i);
        const geoJSON = feature.toGeoJSON(Number(x), Number(y), Number(z));

        if (geoJSON.properties && geoJSON.properties.congestion) {
            features.push(geoJSON);
        }

            }
        }

        res.json({ features });
    } catch (error) {
        console.error('Error decoding tile:', error.message);
        res.status(500).json({ error: 'Failed to decode tile', details: error.message });
    }
});

const PORT = 6000;
app.listen(PORT, () => {
    console.log(`Vector Tile Decoder running at http://localhost:${PORT}`);
});


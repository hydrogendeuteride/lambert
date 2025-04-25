export class CelestialDataParser {
    constructor(wasmModule) {
        if (!wasmModule || typeof wasmModule.computePorkchopPlot !== 'function') {
            throw new Error("WASM module not found or Embind methods not available");
        }

        this.wasm = wasmModule;
    }

    _transformDataToJsArrays(parsedData) {
        const dates = [];
        const positions = [];
        const velocities = [];

        if (!Array.isArray(parsedData)) {
            parsedData = [parsedData];
        }

        if (!Array.isArray(parsedData)) {
            console.error("Input data is not an array: ", parsedData);
            return { dates: [], positions: [], velocities: [], count: 0 };
        }

        for (const point of parsedData) {
            dates.push(point.date.jd);

            positions.push(
                point.position.x,
                point.position.y,
                point.position.z
            );

            velocities.push(
                point.velocity.vx,
                point.velocity.vy,
                point.velocity.vz
            );
        }

        const count = dates.length;
        if (positions.length !== count * 3 || velocities.length !== count * 3) {
            console.error("Data length error:", {
                dateCount: count,
                positionElements: positions.length,
                velocityElements: velocities.length
            });

            return { dates: [], positions: [], velocities: [], count: 0 };
        }

        return {
            dates,
            positions,
            velocities,
            count: count
        };
    }

    createTypedArrays(parsedData) {
        const data = this._transformDataToJsArrays(parsedData);

        if (data.count === 0) {
            return {
                dates: new Float64Array(0),
                positions: new Float64Array(0),
                velocities: new Float64Array(0),
                count: 0
            };
        }

        return {
            dates: new Float64Array(data.dates),
            positions: new Float64Array(data.positions),
            velocities: new Float64Array(data.velocities),
            count: data.count
        };
    }

    computePorkchopPlot(departureData, arrivalData, params) {
        const depData = this.createTypedArrays(departureData);
        const arrData = this.createTypedArrays(arrivalData);

        if (depData.count === 0 || arrData.count === 0) {
            console.error("Invalid data for porkchop plot computation");
            return null;
        }

        try {
            const results = this.wasm.computePorkchopPlot(
                params.mu,
                depData.positions,
                depData.velocities,
                arrData.positions,
                arrData.velocities,
                depData.dates,
                arrData.dates,
                depData.count,
                arrData.count,
                params.departurePlanetMu,
                params.arrivalPlanetMu,
                params.departureOrbitRadius,
                params.arrivalOrbitRadius
            );

            // const fromVec = cppVector => {
            //     const out = [];
            //     const n   = cppVector.size();
            //     for (let i = 0; i < n; ++i) out.push(cppVector.get(i));
            //     return out;
            // };
            //
            // const result = fromVec(results);
            // console.log(result);
            //
            // console.log("Results full dump:", results);
            // console.log("Results properties:", Object.keys(results));
            // console.log("Results length:", results.length);
            // console.log("Is results.data available?", results.data !== undefined);
            // console.log("Is results.size available?", results.size !== undefined);
            //
            // try {
            //     console.log("First element access:", results[0]);
            //     console.log("Can iterate?", [...results].length > 0);
            // } catch(e) {
            //     console.log("Cannot access as array:", e);
            // }

            return this.processResults(results, depData.count, arrData.count);
        } catch (error) {
            console.error("Error computing porkchop plot:", error);
            return null;
        }
    }

    processResults(results, departureCount, arrivalCount) {
        const totalSize = departureCount * arrivalCount;

        if (!results) {
            console.error("Invalid results format");
            return null;
        }

        try {
            const fromVec = cppVector => {
                const out = [];
                const n = cppVector.size();
                for (let i = 0; i < n; ++i) out.push(cppVector.get(i));
                return out;
            };

            const resultsArray = fromVec(results);

            const c3 = resultsArray.slice(0, totalSize);
            const dv1 = resultsArray.slice(totalSize, totalSize * 2);
            const totalDv = resultsArray.slice(totalSize * 2);

            const c3Grid = [];
            const dv1Grid = [];
            const totalDvGrid = [];

            for (let j = 0; j < arrivalCount; j++) {
                const c3Row = new Array(departureCount);
                const dv1Row = new Array(departureCount);
                const totalDvRow = new Array(departureCount);

                for (let i = 0; i < departureCount; i++) {
                    const index = i * arrivalCount + j;
                    c3Row[i] = c3[index];
                    dv1Row[i] = dv1[index];
                    totalDvRow[i] = totalDv[index];
                }

                c3Grid.push(c3Row);
                dv1Grid.push(dv1Row);
                totalDvGrid.push(totalDvRow);
            }

            return {
                c3: c3Grid,
                dv1: dv1Grid,
                totalDv: totalDvGrid,
                departureCount,
                arrivalCount
            };
        } catch (error) {
            console.error("Error processing results:", error);
            return null;
        }
    }
}
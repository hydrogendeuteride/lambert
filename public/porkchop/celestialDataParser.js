export class CelestialDataParser {
    constructor(wasmModule) {
        if (!wasmModule || typeof wasmModule._malloc !== 'function' ||
            typeof wasmModule._free !== 'function' || !(wasmModule.HEAPF64 instanceof Float64Array)) {
            throw new Error("WASM module not found(_malloc, _free) or no HEAPF64 buffer");
        }

        this.wasm = wasmModule;
        this.allocatedPtrs = new Map();
        this.freeAllMemory = this.freeAllMemory.bind(this);
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

    _allocateDoubleArray(array, identifier) {
        if (!array || array.length === 0) {
            console.warn(`${identifier} is invalid`);
            return 0;
        }

        const numBytes = array.length * Float64Array.BYTES_PER_ELEMENT;
        let ptr;

        try {
            ptr = this.wasm._malloc(numBytes);
            this.wasm.HEAPF64.set(array, ptr / Float64Array.BYTES_PER_ELEMENT);
        } catch (e) {
            throw new Error(`WASM memory allocation failed (${identifier}, ${numBytes}) : ${e}`);
        }

        if (ptr === 0) {
            throw new Error(`Wasm memory allocation failed (${identifier}, ${numBytes} bytes): _malloc returned 0.`);
        }

        this.allocatedPtrs.set(identifier + 'Ptr', ptr);
        // console.log(`Wasm memory allocation: ${identifier} (${array.length} elements, ${numBytes} bytes) at pointer ${ptr}`);

        return ptr;
    }

    allocateMemoryForData(parsedData) {
        const typedData = this.createTypedArrays(parsedData);

        if (typedData.count === 0) {
            return { datesPtr: 0, positionsPtr: 0, velocitiesPtr: 0, count: 0 };
        }

        let datesPtr = 0, positionsPtr = 0, velocitiesPtr = 0;
        try {
            datesPtr = this._allocateDoubleArray(typedData.dates, 'dates');
            positionsPtr = this._allocateDoubleArray(typedData.positions, 'positions');
            velocitiesPtr = this._allocateDoubleArray(typedData.velocities, 'velocities');
        } catch (error) {
            console.error("Error occured while allocating WASM memory:", error);
            this.freeAllMemory();
            return { datesPtr: 0, positionsPtr: 0, velocitiesPtr: 0, count: 0 };
        }

        return {
            datesPtr,
            positionsPtr,
            velocitiesPtr,
            count: typedData.count
        };
    }

    allocateResultBuffers(departureCount, arrivalCount) {
        const totalSize = departureCount * arrivalCount;

        if (totalSize <= 0) {
            console.error("Invalid dimensions for result buffers");
            return { dv1Ptr: 0, dv2Ptr: 0, totalDvPtr: 0 };
        }

        try {
            const c3Ptr = this._allocateDoubleArray(new Float64Array(totalSize), 'resultC3');
            const dv1Ptr = this._allocateDoubleArray(new Float64Array(totalSize), 'resultDv1');
            const totalDvPtr = this._allocateDoubleArray(new Float64Array(totalSize), 'resultTotalDv');

            return {
                c3Ptr,
                dv1Ptr,
                totalDvPtr,
                size: totalSize
            };
        } catch (error) {
            console.error("Error occured while allocating result buffer:", error);
            return { c3Ptr: 0, dv1Ptr: 0, totalDvPtr: 0 };
        }
    }

    extractResults(c3Ptr, dv1Ptr, totalDvPtr, departureCount, arrivalCount) {
        const totalSize = departureCount * arrivalCount;

        if (!totalDvPtr || !c3Ptr || !dv1Ptr || totalSize <= 0) {
            console.error("Invalid pointers or dimensions for extracting results");
            return null;
        }

        try {
            const heap = this.wasm.HEAPF64;

            const c3 = new Float64Array(totalSize);
            const dv1 = new Float64Array(totalSize);
            const totalDv = new Float64Array(totalSize);

            const c3Index = c3Ptr / Float64Array.BYTES_PER_ELEMENT;
            const dv1Index = dv1Ptr / Float64Array.BYTES_PER_ELEMENT;
            const totalDvIndex = totalDvPtr / Float64Array.BYTES_PER_ELEMENT;

            for (let i = 0; i < totalSize; i++) {
                c3[i] = heap[c3Index + i];
                dv1[i] = heap[dv1Index + i];
                totalDv[i] = heap[totalDvIndex + i];
            }

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
            console.error("Error occured while extracting results:", error);
            return null;
        }
    }

    freeAllMemory() {
        if (this.allocatedPtrs.size === 0) {
            return;
        }

        // console.log(`Disallocating ${this.allocatedPtrs.size} number of WASM memory`);
        let freedCount = 0;
        for (const [identifier, ptr] of this.allocatedPtrs.entries()) {
            if (ptr !== 0) {
                try {
                    this.wasm._free(ptr);
                    freedCount++;
                } catch (e) {
                    console.error(`WASM memory disallocation failed (${identifier}, pointer ${ptr}): ${e}`);
                }
            }
        }
        // console.log(`Total ${freedCount}. of WASM memory disallocated`);
        this.allocatedPtrs.clear();
    }
}
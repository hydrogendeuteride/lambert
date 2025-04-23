import { CelestialDataParser } from "./porkchop/celestialDataParser.js";
import { showAlertInElement } from "./error_message.js";
import { visualizePorkchopPlot } from "./porkchop/visualize_porkchop.js";

function getActualStepSize(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return "1d";

    if (element.value === 'auto') {
        return element.dataset.autoValue || "1d";
    }
    return element.value;
}

export async function fetchHorizonsData() {
    const departureBodyID = document.getElementById('departureBodyID').value;
    const arrivalBodyID = document.getElementById('arrivalBodyID').value;

    const departureStartDate = document.getElementById('departureStartDate').value;
    const departureEndDate = document.getElementById('departureEndDate').value;
    const departureStepSize = getActualStepSize('departureStepSize');

    const arrivalStartDate = document.getElementById('arrivalStartDate').value;
    const arrivalEndDate = document.getElementById('arrivalEndDate').value;
    const arrivalStepSize = getActualStepSize('arrivalStepSize');

    const mu = parseFloat(document.getElementById('mu').value || '132712440018');

    const departurePlanetMu = parseFloat(document.getElementById('departureBodyMu').value || '398600.4418'); // 기본값 지구
    const arrivalPlanetMu = parseFloat(document.getElementById('arrivalBodyMu').value || '42828.3'); // 기본값 화성
    const departureOrbitRadius = parseFloat(document.getElementById('departureOrbitRadius').value || '6778.0'); // 기본값 지구 LEO
    const arrivalOrbitRadius = parseFloat(document.getElementById('arrivalOrbitRadius').value || '3396.0'); // 기본값 화성 표면

    if (!departureBodyID || !arrivalBodyID) {
        showAlertInElement(depBodyAlert, "Choose departure body");
        return;
    }

    if (!departureStartDate || !departureEndDate || !arrivalStartDate || !arrivalEndDate) {
        showAlertInElement(arrBodyAlert, "Choose departure body");
        return;
    }

    const dStart = new Date(departureStartDate);
    const dEnd = new Date(departureEndDate);
    const aStart = new Date(arrivalStartDate);
    const aEnd = new Date(arrivalEndDate);

    if (dStart > dEnd) {
        showAlertInElement(departureDateAlert, "Departure start date must be ahead of the end date");
        return;
    }

    if (aStart > aEnd) {
        showAlertInElement(arrivalDateAlert, "Arrival start date must be ahead of the end date")
        return;
    }

    document.getElementById('result').textContent = "Deta loading...";

    if (!window.wasmModule) {
        document.getElementById('result').textContent = "Error: Wasm module not loaded.";
        return;
    }

    const wasmModule = window.wasmModule;
    let dataParser;

    try {
        const response = await fetch(`/api/horizons/combined?` +
            `depBody=${departureBodyID}` +
            `&arrBody=${arrivalBodyID}` +
            `&depStart=${departureStartDate}` +
            `&depEnd=${departureEndDate}` +
            `&arrStart=${arrivalStartDate}` +
            `&arrEnd=${arrivalEndDate}` +
            `&depStep=${departureStepSize}` +
            `&arrStep=${arrivalStepSize}`
        );
        
        if (!response.ok) {
            throw new Error(`${response.status}`);
        }
        
        const result = await response.json();
        
        const departureParsedData = result.departure.data;
        const arrivalParsedData = result.arrival.data;
        
        if (!departureParsedData || departureParsedData.length === 0) {
            document.getElementById('result').textContent = "No departure body data.";
            return;
        }
        
        if (!arrivalParsedData || arrivalParsedData.length === 0) {
            document.getElementById('result').textContent = "No arrival body data.";
            return;
        }

        document.getElementById('result').textContent = `Departure body data: ${departureParsedData.length}, Arrival body data: ${arrivalParsedData.length}`;
        //---------------------------------------------------------------------------------------------
        dataParser = new CelestialDataParser(wasmModule);

        const departureDataPtr = dataParser.allocateMemoryForData(departureParsedData, "departure");
        const arrivalDataPtr = dataParser.allocateMemoryForData(arrivalParsedData, "arrival");

        if (departureDataPtr.count === 0 || arrivalDataPtr.count === 0) {
            document.getElementById('result').textContent = "WASM memory allocation error.";
            return;
        }

        const resultBuffers = dataParser.allocateResultBuffers(departureDataPtr.count, arrivalDataPtr.count);
        if (!resultBuffers.c3Ptr || !resultBuffers.dv1Ptr || !resultBuffers.totalDvPtr) {
            document.getElementById('result').textContent = "Result buffer allocation error";
            return;
        }

        document.getElementById('result').textContent += "\nWasm function ready";

        //----------------------------------------------------------------------------------------------
        try {
            if (typeof wasmModule._computePorkchopPlotSimple !== 'function') {
                throw new Error("computePorkchopPlot function not found.");
            }

            wasmModule._computePorkchopPlotSimple(
                mu,
                departureDataPtr.positionsPtr,
                departureDataPtr.velocitiesPtr,
                arrivalDataPtr.positionsPtr,
                arrivalDataPtr.velocitiesPtr,
                departureDataPtr.datesPtr,
                arrivalDataPtr.datesPtr,
                departureDataPtr.count,
                arrivalDataPtr.count,
                departurePlanetMu,
                arrivalPlanetMu,
                departureOrbitRadius,
                arrivalOrbitRadius,
                resultBuffers.c3Ptr,
                resultBuffers.dv1Ptr,
                resultBuffers.totalDvPtr
            );

            const results = dataParser.extractResults(
                resultBuffers.c3Ptr,
                resultBuffers.dv1Ptr,
                resultBuffers.totalDvPtr,
                departureDataPtr.count,
                arrivalDataPtr.count
            );

            document.getElementById('result').textContent += "\nPorkchop plot calculation complete";

            visualizePorkchopPlot(results, departureParsedData, arrivalParsedData);

        } catch (wasmError) {
            console.error("WASM function error:", wasmError);
            document.getElementById('result').textContent += "\nWASM function error: " + wasmError.message;
        }

    } catch (error) {
        document.getElementById('result').textContent = "Server error: " + error.message;
        console.error("Error fetching Horizons data:", error);
    } finally {
        if (dataParser) {
            dataParser.freeAllMemory();
        }
    }
}

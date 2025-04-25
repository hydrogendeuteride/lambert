export async function visualizePorkchopPlot(results, departureParsedData, arrivalParsedData) {

    if (!results || !results.totalDv) {
        console.error("No data to visualize.");
        return;
    }

    function formatDate(jd) {
        const dateMsec = (jd - 2440587.5) * 86400000;
        const date = new Date(dateMsec);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const departureDates = departureParsedData.map(item =>
        item.date.formatted && !item.date.formatted.includes('JD') ? item.date.formatted : formatDate(item.date.jd)
    );

    const arrivalDates = arrivalParsedData.map(item =>
        item.date.formatted && !item.date.formatted.includes('JD') ? item.date.formatted : formatDate(item.date.jd)
    );

    const filterDates = (dates, maxCount = 10) => {
        if (dates.length <= maxCount) return dates;
        const step = Math.floor(dates.length / maxCount);
        const filtered = [];
        for (let i = 0; i < dates.length; i += step) filtered.push(dates[i]);
        if (filtered[filtered.length - 1] !== dates[dates.length - 1])
            filtered.push(dates[dates.length - 1]);
        return filtered;
    };

    const displayDepartureDates = filterDates(departureDates);
    const displayArrivalDates = filterDates(arrivalDates);

    const departureTickvals = displayDepartureDates.map(date => departureDates.indexOf(date));
    const arrivalTickvals = displayArrivalDates.map(date => arrivalDates.indexOf(date));

    const processedData = results.totalDv.map(row =>
        row.map(value => value < 0 ? null : value)
    );

    const flatData = [].concat(...processedData).filter(v => v !== null);
    let minDv = Infinity;
    let maxDv = -Infinity;
    let optimalRow = -1;
    let optimalCol = -1;

    if (flatData.length > 0) {
        for (let i = 1; i < flatData.length; i++) {
            if (flatData[i] < minDv) minDv = flatData[i];
            if (flatData[i] > maxDv) maxDv = flatData[i];
        }
        
        for (let i = 0; i < processedData.length; i++) {
            for (let j = 0; j < processedData[i].length; j++) {
                if (processedData[i][j] === minDv) {
                    optimalRow = i;
                    optimalCol = j;
                    break;
                }
            }
            if (optimalRow >= 0) break;
        }
    }

    const calculateColorScale = () => {
        if (minDv === Infinity || maxDv === -Infinity) return 'Viridis';
        return [
            [0, 'rgb(0, 0, 100)'],
            [0.1, 'rgb(0, 50, 180)'],
            [0.2, 'rgb(0, 100, 200)'],
            [0.3, 'rgb(0, 150, 220)'],
            [0.4, 'rgb(0, 180, 180)'],
            [0.5, 'rgb(0, 220, 150)'],
            [0.6, 'rgb(80, 220, 100)'],
            [0.7, 'rgb(150, 220, 50)'],
            [0.8, 'rgb(220, 180, 0)'],
            [0.9, 'rgb(220, 100, 0)'],
            [1.0, 'rgb(200, 0, 0)']
        ];
    };

    const tofMatrix = [];
    for (let i = 0; i < results.totalDv.length; i++) {
        const tofRow = [];
        for (let j = 0; j < results.totalDv[i].length; j++) {
            const jdDep = departureParsedData[j]?.date.jd;
            const jdArr = arrivalParsedData[i]?.date.jd;
            if (jdDep != null && jdArr != null) {
                const tof = Math.round(jdArr - jdDep);
                tofRow.push(isFinite(tof) ? tof : null);
            } else {
                tofRow.push(null);
            }
        }
        tofMatrix.push(tofRow);
    }

    const hoverTexts = [];
    for (let i = 0; i < arrivalDates.length; i++) {
        const textRow = [];
        for (let j = 0; j < departureDates.length; j++) {
            if (!processedData[i] || processedData[i][j] === null) {
                textRow.push('');
            } else {
                const departureDate = departureDates[j];
                const arrivalDate = arrivalDates[i];
                const dvValue = processedData[i][j];
                const tofDays = tofMatrix[i][j];

                let hoverText = `Departure: ${departureDate}<br>Arrival: ${arrivalDate}<br>Delta-V: ${dvValue.toFixed(2)} km/s`;

                if (tofDays !== null) {
                    hoverText += `<br>Time of Flight: ${tofDays} days`;
                }

                textRow.push(hoverText);
            }
        }
        hoverTexts.push(textRow);
    }

    const heatmapData = {
        z: processedData,
        type: 'heatmap',
        colorscale: calculateColorScale(),
        colorbar: {
            title: 'Delta-V (km/s)',
            titlefont: { size: 14 },
            tickvals: [
                minDv.toFixed(2),
                (minDv * 1.25).toFixed(2),
                (minDv * 1.5).toFixed(2),
                (minDv * 2).toFixed(2),
                (minDv * 2.5).toFixed(2),
                (minDv * 3).toFixed(2),
                Math.min(maxDv, minDv * 4).toFixed(2)
            ],
            tickmode: 'array',
            thickness: 25
        },
        zmin: minDv,
        zmax: Math.min(maxDv, minDv * 4),
        zauto: false,
        text: hoverTexts,
        hoverinfo: 'text',
        hoverlabel: {
            bgcolor: 'white',
            bordercolor: '#333',
            font: { color: 'black' }
        }
    };

    const contourData = {
        z: tofMatrix,
        type: 'contour',
        contours: {
            coloring: 'none',
            showlabels: true,
            labelfont: { size: 10, color: 'black' },
            start: 0,
            end: 900,
            size: 50
        },
        line: {
            color: 'gray',
            width: 1,
            dash: 'dot'
        },
        showscale: false,
        hovertemplate: ' ',
        hoverinfo: 'skip'
    };

    const layout = {
        title: {
            text: 'Porkchop Plot - Optimal Transfer Orbit',
            font: { size: 18 }
        },
        xaxis: {
            title: { text: 'Departure Date', font: { size: 14 } },
            tickmode: 'array',
            tickvals: departureTickvals,
            ticktext: displayDepartureDates,
            tickangle: 0
        },
        yaxis: {
            title: { text: 'Arrival date', font: { size: 14 } },
            tickmode: 'array',
            tickvals: arrivalTickvals,
            ticktext: displayArrivalDates,
            automargin: true
        },
        annotations: [],
        hovermode: 'closest'
    };

    if (optimalRow >= 0 && optimalCol >= 0) {
        const optimalDeparture = departureDates[optimalCol];
        const optimalArrival = arrivalDates[optimalRow];

        // layout.annotations.push({
        //     x: optimalCol,
        //     y: optimalRow,
        //     text: `Optimal: ${minDv.toFixed(2)} km/s`,
        //     showarrow: true,
        //     arrowhead: 2,
        //     arrowsize: 1,
        //     arrowwidth: 2,
        //     ax: 20,
        //     ay: -30,
        //     bgcolor: 'rgba(255, 255, 255, 0.9)',
        //     bordercolor: '#333',
        //     borderwidth: 1,
        //     borderpad: 4,
        //     font: { color: '#000', size: 12, weight: 'bold' }
        // });

        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <h5><i class="bi bi-check-circle-fill me-2"></i>Porkchop Plot Calculation Completed</h5>
                <hr>
                <h6 class="mt-3">Optimal Course Info:</h6>
                <ul>
                    <li><strong>Departure Date:</strong> ${optimalDeparture}</li>
                    <li><strong>Arrival Date</strong> ${optimalArrival}</li>
                    <li><strong>Required Δv:</strong> ${minDv.toFixed(2)} km/s</li>
                    <li><strong>Delta-V Range:</strong> ${minDv.toFixed(2)} - ${maxDv.toFixed(2)} km/s</li>
                </ul>
            </div>
        `;

        try {
            const departureDate = new Date(optimalDeparture);
            const arrivalDate = new Date(optimalArrival);
            const tofDays = Math.round((arrivalDate - departureDate) / (1000 * 60 * 60 * 24));
            const resultList = resultDiv.querySelector('ul');
            const tofItem = document.createElement('li');
            tofItem.innerHTML = `<strong>Time Of Flight (TOF):</strong> ${tofDays} Days`;
            resultList.appendChild(tofItem);
        } catch (e) {
            console.warn("TOF calcualtion error:", e);
        }
    }

    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ['hoverClosestGl2d'],
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'porkchop_plot',
            height: 800,
            width: 1200,
            scale: 2
        }
    };

    Plotly.newPlot('porkchopPlotContainer', [contourData, heatmapData], layout, config);
    document.getElementById('status-badge').className = "badge bg-success";
    document.getElementById('status-badge').innerText = "Calculation Complete";
}
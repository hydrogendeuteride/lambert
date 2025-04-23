import { fetchHorizonsData } from "../horizon.js";

let solarSystemData = {};

document.addEventListener('DOMContentLoaded', function () {
    loadCelestialData();
    setupDateListeners();

    const button = document.getElementById('generateButton');
    if (button) {
        button.addEventListener('click', fetchHorizonsData);
    }

    document.getElementById('departureAltitude').addEventListener('input', () => {
        updateBodyDetails('departure');
    });

    document.getElementById('arrivalAltitude').addEventListener('input', () => {
        updateBodyDetails('arrival');
    });
});

function showError(message, elements) {
    const alertElement = document.getElementById(elements);
    alertElement.textContent = message;
    alertElement.className = 'alert-msg alert-msg-error';
    alertElement.style.display = 'block';
}

function loadCelestialData() {
    fetch('./porkchop/celestialData.json')
        .then(res => {
            if (!res.ok) {
                throw new Error('celestialData.json loading failed');
            }
            return res.json();
        })
        .then(data => {
            solarSystemData = data;
            populateCentralBodySelect();
        })
        .catch(error => {
            console.error(error);
            showError('celestialData.json load failed: ' + error.message);
        });
}

function populateCentralBodySelect() {
    const centralSelect = document.getElementById('centralBodySelect');
    centralSelect.innerHTML = '';

    for (const central in solarSystemData) {
        centralSelect.add(new Option(central, central));
    }

    if ('Sun' in solarSystemData) {
        centralSelect.value = 'Sun';
    }

    centralSelect.addEventListener('change', updateCentralBody);

    updateCentralBody();
}

function updateCentralBody() {
    const selected = document.getElementById('centralBodySelect').value;

    if (!selected || !solarSystemData[selected]) {
        console.error('No center system selected');
        return;
    }

    const system = solarSystemData[selected];
    document.getElementById('mu').value = system.mu;

    populateBodySelects(system.bodies);
}

function populateBodySelects(bodies) {
    const depSelect = document.getElementById('departureBodySelect');
    const arrSelect = document.getElementById('arrivalBodySelect');

    const prevDep = depSelect.value;
    const prevArr = arrSelect.value;

    depSelect.innerHTML = '';
    arrSelect.innerHTML = '';

    for (const body in bodies) {
        depSelect.add(new Option(body, body));
        arrSelect.add(new Option(body, body));
    }

    if (prevDep && depSelect.querySelector(`option[value="${prevDep}"]`)) {
        depSelect.value = prevDep;
    } else if (depSelect.querySelector('option[value="Earth"]')) {
        depSelect.value = 'Earth';
    } else {
        depSelect.selectedIndex = 0;
    }

    if (prevArr && arrSelect.querySelector(`option[value="${prevArr}"]`)) {
        arrSelect.value = prevArr;
    } else if (arrSelect.querySelector('option[value="Mars"]')) {
        arrSelect.value = 'Mars';
    } else if (arrSelect.options.length > 1) {
        arrSelect.selectedIndex = 1;
    } else {
        arrSelect.selectedIndex = 0;
    }

    depSelect.addEventListener('change', () => updateBodyDetails('departure'));
    arrSelect.addEventListener('change', () => updateBodyDetails('arrival'));

    updateBodyDetails('departure');
    updateBodyDetails('arrival');
}

function updateBodyDetails(type) {
    const central = document.getElementById('centralBodySelect').value;
    const bodyName = document.getElementById(type + 'BodySelect').value;
    const altitude = parseFloat(document.getElementById(type + 'Altitude').value || '0');

    if (!central || !bodyName || !solarSystemData[central] || !solarSystemData[central].bodies[bodyName]) {
        console.error(`${type} Celestial data update failed:`, { central, bodyName });
        return;
    }

    const body = solarSystemData[central].bodies[bodyName];

    document.getElementById(type + 'BodyID').value = body.id;
    document.getElementById(type + 'BodyMu').value = body.mu;
    document.getElementById(type + 'OrbitRadius').value = (body.radius + altitude).toFixed(1);
}

document.getElementById('departureAltitude').addEventListener('input', () => {
    updateBodyDetails('departure');
});

document.getElementById('arrivalAltitude').addEventListener('input', () => {
    updateBodyDetails('arrival');
});

function applyComputedValues() {
    const central = document.getElementById('centralBodySelect').value;
    if (!central || !solarSystemData[central]) {
        console.error('No center body data');
        return false;
    }

    const depName = document.getElementById('departureBodySelect').value;
    if (!depName || !solarSystemData[central].bodies[depName]) {
        console.error('No departure body data');
        return false;
    }

    const arrName = document.getElementById('arrivalBodySelect').value;
    if (!arrName || !solarSystemData[central].bodies[arrName]) {
        console.error('No arrival body data');
        return false;
    }

    const depAlt = parseFloat(document.getElementById('departureAltitude').value || '0');
    const arrAlt = parseFloat(document.getElementById('arrivalAltitude').value || '0');

    const system = solarSystemData[central];
    const dep = system.bodies[depName];
    const arr = system.bodies[arrName];

    document.getElementById('departureBodyID').value = dep.id;
    document.getElementById('departureBodyMu').value = dep.mu;
    document.getElementById('departureOrbitRadius').value = (dep.radius + depAlt).toFixed(1);

    document.getElementById('arrivalBodyID').value = arr.id;
    document.getElementById('arrivalBodyMu').value = arr.mu;
    document.getElementById('arrivalOrbitRadius').value = (arr.radius + arrAlt).toFixed(1);

    document.getElementById('mu').value = system.mu;

    return true;
}

window.applyMissionData = function () {
    if (applyComputedValues()) {
        return true;
    } else {
        alert('Error occured while setting celestial data.');
        return false;
    }
};

function calculateStepSize(depStartDate, depEndDate, arrStartDate, arrEndDate) {
    const depDiffDays = Math.ceil(
        Math.abs(new Date(depEndDate) - new Date(depStartDate)) / (1000 * 60 * 60 * 24)
    );

    const arrDiffDays = Math.ceil(
        Math.abs(new Date(arrEndDate) - new Date(arrStartDate)) / (1000 * 60 * 60 * 24)
    );

    const totalGrids = depDiffDays * arrDiffDays;

    if (totalGrids <= 100000) return "1d";
    if (totalGrids <= 400000) return "2d";
    if (totalGrids <= 800000) return "5d";
    return "10d";
}

function updateStepSizes() {
    const depStartDate = document.getElementById('departureStartDate').value;
    const depEndDate = document.getElementById('departureEndDate').value;
    const arrStartDate = document.getElementById('arrivalStartDate').value;
    const arrEndDate = document.getElementById('arrivalEndDate').value;

    const depStepSizeSelect = document.getElementById('departureStepSize');
    const arrStepSizeSelect = document.getElementById('arrivalStepSize');

    if (!(depStartDate && depEndDate && arrStartDate && arrEndDate)) {
        return;
    }

    const calculatedStepSize = calculateStepSize(depStartDate, depEndDate, arrStartDate, arrEndDate);

    [depStepSizeSelect, arrStepSizeSelect].forEach(select => {
        if (select && select.value === 'auto') {
            const autoOption = Array.from(select.options).find(option => option.value === 'auto');
            if (autoOption) {
                autoOption.textContent = `Auto (${calculatedStepSize})`;
            }

            select.dataset.autoValue = calculatedStepSize;
        }
    });
}

function setupDateListeners() {
    const dateInputs = [
        'departureStartDate',
        'departureEndDate',
        'arrivalStartDate',
        'arrivalEndDate'
    ];

    dateInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', updateStepSizes);
    });

    document.getElementById('departureStepSize').addEventListener('change', updateStepSizes);
    document.getElementById('arrivalStepSize').addEventListener('change', updateStepSizes);

    updateStepSizes();
}

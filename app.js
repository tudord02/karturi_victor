document.addEventListener('DOMContentLoaded', () => {
    // Element references (no changes here)
    const kartContainer = document.getElementById('kart-container');
    const durationModal = document.getElementById('duration-modal');
    const returnModal = document.getElementById('return-modal');
    const overtimeModal = document.getElementById('overtime-modal');
    const durationKartIdSpan = document.getElementById('duration-kart-id');
    const returnKartIdSpan = document.getElementById('return-kart-id');
    const overtimeKartIdSpan = document.getElementById('overtime-kart-id');
    const overtimeDurationSpan = document.getElementById('overtime-duration');
    const durationModalKartIdHidden = document.getElementById('duration-modal-kart-id-hidden');
    const returnModalKartIdHidden = document.getElementById('return-modal-kart-id-hidden');
    const overtimeModalKartIdHidden = document.getElementById('overtime-modal-kart-id-hidden');

    // Constants (no changes here)
    const TOTAL_KARTS = 105;
    const KARTS_PER_CATEGORY = 15;
    const CATEGORY_COUNT = Math.ceil(TOTAL_KARTS / KARTS_PER_CATEGORY);

    let kartStatus = {}; // State object structure remains the same

    // --- Helper Functions (no changes here) ---
    function formatTimeMMSS(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function formatTimeHHMMSS(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function showModal(modalElement, kartId) {
        if (kartId) {
            const hiddenInput = modalElement.querySelector('input[type="hidden"]');
            const kartIdSpan = modalElement.querySelector('span[id$="-kart-id"]');
            if (hiddenInput) hiddenInput.value = kartId;
            if (kartIdSpan) kartIdSpan.textContent = kartId;
        }
        modalElement.classList.remove('hidden');
        modalElement.classList.add('flex');
    }

    function hideModal(modalElement) {
        const hiddenInput = modalElement.querySelector('input[type="hidden"]');
        if (hiddenInput) hiddenInput.value = '';
        modalElement.classList.add('hidden');
        modalElement.classList.remove('flex');
    }


    // --- Core Logic Functions ---
    function updateButtonAppearance(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) return;

        const status = kart.status;
        const button = kart.element;

        button.classList.remove(
            'bg-blue-500', 'hover:bg-blue-700',
            'bg-red-500', 'hover:bg-red-700',
            'bg-orange-500', 'hover:bg-orange-700', 'animate-pulse'
        );

        button.firstChild.nodeValue = kartId;
        kart.timerDisplayElement.textContent = '';

        switch (status) {
            case 'available':
                button.classList.add('bg-blue-500', 'hover:bg-blue-700');
                break;
            case 'rented':
                button.classList.add('bg-red-500', 'hover:bg-red-700');
                break;
            case 'overtime':
                button.classList.add('bg-orange-500', 'hover:bg-orange-700', 'animate-pulse');
                break;
        }
    }

    function resetKart(kartId) {
        console.log(`Resetting Kart ${kartId}`);
        const kart = kartStatus[kartId];
        if (!kart) { console.error(`Reset Error: Kart ${kartId} not found.`); return; }

        if (kart.timerId) { clearInterval(kart.timerId);
            kart.timerId = null; }
        if (kart.stopwatchId) { clearInterval(kart.stopwatchId);
            kart.stopwatchId = null; }

        kart.status = 'available';
        kart.endTime = null;
        kart.overtimeStartTime = null;
        updateButtonAppearance(kartId);
    }

    function startCountdown(kartId, durationMinutes) {
        const kart = kartStatus[kartId];
        if (!kart) { console.error(`Countdown Error: Kart ${kartId} not found.`); return; }
        if (kart.status !== 'available') { console.warn(`Countdown Warning: Kart ${kartId} not available (status: ${kart.status}).`); return; }


        const now = Date.now();
        kart.endTime = now + durationMinutes * 60 * 1000;
        kart.status = 'rented';
        updateButtonAppearance(kartId);

        if (kart.timerId) clearInterval(kart.timerId);
        if (kart.stopwatchId) clearInterval(kart.stopwatchId);
        kart.stopwatchId = null;

        kart.timerId = setInterval(() => {
            const currentKartState = kartStatus[kartId]; // Re-fetch current state inside interval
            if (!currentKartState || currentKartState.status !== 'rented' || currentKartState.timerId !== kart.timerId) {
                // Stop interval if kart doesn't exist, is not rented anymore,
                // or if a new timer has been started for this kart (timerId mismatch)
                clearInterval(kart.timerId);
                return;
            }

            const currentTime = Date.now();
            const remainingTime = Math.round((currentKartState.endTime - currentTime) / 1000);

            if (remainingTime <= 0) {
                clearInterval(kart.timerId);
                // Check status again *after* clearing interval, before showing modal
                if (kartStatus[kartId] && kartStatus[kartId].status === 'rented') {
                    kart.timerId = null; // Ensure timerId is cleared in state
                    console.log(`Kart ${kartId} time expired.`);
                    kart.timerDisplayElement.textContent = ' Expired!';
                    showModal(returnModal, kartId);
                }
            } else {
                kart.timerDisplayElement.textContent = ` (${formatTimeMMSS(remainingTime)})`;
            }
        }, 1000); // Update every second

        // Store the newly created timerId in the state *after* setting the interval
        kart.timerId = kart.timerId; // This line seems redundant, let's remove it. The ID is assigned in the setInterval line.

        console.log(`Kart ${kartId} rented for ${durationMinutes} mins. End time: ${new Date(kart.endTime)}`);
    }


    function startOvertime(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) { console.error(`Overtime Error: Kart ${kartId} not found.`); return; }

        // Ensure we are coming from a state where overtime makes sense (e.g. rented, or time just expired)
        // This prevents accidentally starting overtime on an available kart through edge cases
        if (kart.status === 'available') {
            console.warn(`Overtime Warning: Kart ${kartId} is available. Cannot start overtime.`);
            resetKart(kartId); // Reset just in case
            return;
        }

        kart.status = 'overtime';
        kart.overtimeStartTime = Date.now();
        updateButtonAppearance(kartId);

        if (kart.timerId) { clearInterval(kart.timerId);
            kart.timerId = null; } // Ensure countdown timer is stopped
        if (kart.stopwatchId) clearInterval(kart.stopwatchId); // Clear previous stopwatch if any

        const newStopwatchId = setInterval(() => { // Assign to a new variable first
            const currentKartState = kartStatus[kartId]; // Re-fetch state
            if (!currentKartState || currentKartState.status !== 'overtime' || currentKartState.stopwatchId !== newStopwatchId) {
                // Stop if kart doesn't exist, not in overtime, or a new stopwatch started
                clearInterval(newStopwatchId);
                return;
            }
            const now = Date.now();
            const elapsedSeconds = Math.round((now - currentKartState.overtimeStartTime) / 1000);
            currentKartState.timerDisplayElement.textContent = ` (OT: ${formatTimeHHMMSS(elapsedSeconds)})`;
        }, 1000);

        kart.stopwatchId = newStopwatchId; // Assign the correct ID to the state

        console.log(`Kart ${kartId} entered overtime.`);
    }

    function stopOvertime(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) { console.error(`Stop Overtime Error: Kart ${kartId} not found.`); return; }
        if (kart.status !== 'overtime') {
            console.warn(`Stop Overtime Warning: Kart ${kartId} not in overtime (status: ${kart.status}).`);
            return;
        }
        if (kart.stopwatchId) {
            clearInterval(kart.stopwatchId);
            kart.stopwatchId = null;
        } else {
            console.warn(`Kart ${kartId} was in overtime state but had no stopwatchId to clear.`);
        }

        const now = Date.now();
        const elapsedOvertimeSeconds = kart.overtimeStartTime ? Math.round((now - kart.overtimeStartTime) / 1000) : 0;
        const formattedDuration = formatTimeHHMMSS(elapsedOvertimeSeconds);
        console.log(`Kart ${kartId} overtime stopped. Duration: ${formattedDuration}`);
        overtimeDurationSpan.textContent = formattedDuration;
        showModal(overtimeModal, kartId);
    }


    // --- Event Handlers ---
    function handleKartClick(event) {
        const button = event.target.closest('.kart-button');
        if (!button) return;
        const kartId = button.dataset.kartId;
        const kart = kartStatus[kartId];
        if (!kart) { console.error(`Click Error: Kart ${kartId} not found.`); return; }
        const status = kart.status;
        console.log(`Kart ${kartId} clicked. Status: ${status}`);
        switch (status) {
            case 'available':
                showModal(durationModal, kartId);
                break;
            case 'rented':
                if (confirm(`Kart ${kartId} is currently rented. Mark as returned early?`)) { resetKart(kartId); }
                break;
            case 'overtime':
                stopOvertime(kartId);
                break;
            default:
                console.warn(`Unhandled kart status: ${status} for kart ${kartId}`);
        }
    }


    // --- Initialization ---
    function generateKartButtons() {
        kartContainer.innerHTML = '';
        kartStatus = {};
        for (let i = 0; i < CATEGORY_COUNT; i++) {
            const categoryStart = i * KARTS_PER_CATEGORY + 1;
            const categoryEnd = Math.min((i + 1) * KARTS_PER_CATEGORY, TOTAL_KARTS);
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-section bg-white p-4 rounded shadow mb-4';
            const categoryHeading = document.createElement('h2');
            categoryHeading.className = 'text-xl font-semibold mb-3';
            categoryHeading.textContent = `Category ${i + 1} (Karts ${categoryStart}-${categoryEnd})`;
            categoryDiv.appendChild(categoryHeading);
            const buttonWrapper = document.createElement('div');
            buttonWrapper.id = `category-${i + 1}`;
            buttonWrapper.className = 'flex flex-wrap gap-2';
            categoryDiv.appendChild(buttonWrapper);
            kartContainer.appendChild(categoryDiv);
            for (let kartIdNum = categoryStart; kartIdNum <= categoryEnd; kartIdNum++) {
                const kartId = String(kartIdNum);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'kart-button bg-blue-500 hover:bg-blue-700';
                button.dataset.kartId = kartId;
                button.appendChild(document.createTextNode(kartId));
                const timerDisplay = document.createElement('span');
                timerDisplay.className = 'timer-display';
                button.appendChild(timerDisplay);
                buttonWrapper.appendChild(button);
                kartStatus[kartId] = {
                    status: 'available',
                    timerId: null,
                    stopwatchId: null,
                    endTime: null,
                    overtimeStartTime: null,
                    element: button,
                    timerDisplayElement: timerDisplay
                };
            }
        }
        console.log(`Generated ${TOTAL_KARTS} kart buttons.`);
        kartContainer.addEventListener('click', handleKartClick);
    }

    // --- Modal Event Listeners ---

    // *** ADDED Event Listener for 30s Button ***
    document.getElementById('duration-30s').addEventListener('click', () => {
        const kartId = durationModalKartIdHidden.value;
        const kart = kartStatus[kartId]; // Get kart object
        if (kartId && kart && kart.status === 'available') {
            startCountdown(kartId, 0.5); // 0.5 minutes = 30 seconds
            hideModal(durationModal);
        } else if (kartId) {
            console.warn(`Attempted to rent kart ${kartId} (30s) which is not available or doesn't exist.`);
            hideModal(durationModal); // Hide modal anyway
        }
    });

    document.getElementById('duration-30m').addEventListener('click', () => {
        const kartId = durationModalKartIdHidden.value;
        const kart = kartStatus[kartId];
        if (kartId && kart && kart.status === 'available') {
            startCountdown(kartId, 30);
            hideModal(durationModal);
        } else if (kartId) {
            console.warn(`Attempted to rent kart ${kartId} (30m) which is not available or doesn't exist.`);
            hideModal(durationModal);
        }
    });
    document.getElementById('duration-1h').addEventListener('click', () => {
        const kartId = durationModalKartIdHidden.value;
        const kart = kartStatus[kartId];
        if (kartId && kart && kart.status === 'available') {
            startCountdown(kartId, 60);
            hideModal(durationModal);
        } else if (kartId) {
            console.warn(`Attempted to rent kart ${kartId} (1h) which is not available or doesn't exist.`);
            hideModal(durationModal);
        }
    });
    document.getElementById('duration-cancel').addEventListener('click', () => {
        hideModal(durationModal);
    });

    // Return Modal Listeners (no changes)
    document.getElementById('return-yes').addEventListener('click', () => {
        const kartId = returnModalKartIdHidden.value;
        if (kartId && kartStatus[kartId]) { resetKart(kartId);
            hideModal(returnModal); }
    });
    document.getElementById('return-no').addEventListener('click', () => {
        const kartId = returnModalKartIdHidden.value;
        const kart = kartStatus[kartId];
        if (kartId && kart) {
            if (kart.status === 'rented' || (kart.endTime && kart.endTime <= Date.now())) {
                startOvertime(kartId);
            } else {
                console.warn(`Kart ${kartId} - 'No' clicked, unexpected status: ${kart.status}. Resetting.`);
                resetKart(kartId);
            }
            hideModal(returnModal);
        }
    });

    // Overtime Modal Listener (no changes)
    document.getElementById('overtime-ok').addEventListener('click', () => {
        const kartId = overtimeModalKartIdHidden.value;
        if (kartId && kartStatus[kartId]) { resetKart(kartId);
            hideModal(overtimeModal); }
    });

    // --- Initial Setup ---
    generateKartButtons();
    // loadState(); // Optional

}); // End DOMContentLoaded

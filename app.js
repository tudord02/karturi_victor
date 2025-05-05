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
        // Use Tailwind classes directly now
        modalElement.classList.remove('hidden');
        modalElement.classList.add('flex'); // Ensure flex is active for centering
    }

    function hideModal(modalElement) {
        const hiddenInput = modalElement.querySelector('input[type="hidden"]');
        if (hiddenInput) hiddenInput.value = '';
        // Use Tailwind classes directly
        modalElement.classList.add('hidden');
        modalElement.classList.remove('flex');
    }


    // --- Core Logic Functions ---

    // *** UPDATED Function: Uses Tailwind classes directly for colors ***
    function updateButtonAppearance(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) return; // Exit if kart doesn't exist

        const status = kart.status;
        const button = kart.element;

        // Remove all potential state-based classes
        button.classList.remove(
            'bg-blue-500', 'hover:bg-blue-700', // Available state classes
            'bg-red-500', 'hover:bg-red-700', // Rented state classes
            'bg-orange-500', 'hover:bg-orange-700', 'animate-pulse' // Overtime state classes
        );

        // Reset button text to just the kart ID
        button.firstChild.nodeValue = kartId;
        kart.timerDisplayElement.textContent = ''; // Clear timer display

        // Add classes based on the current state
        switch (status) {
            case 'available':
                button.classList.add('bg-blue-500', 'hover:bg-blue-700');
                break;
            case 'rented':
                button.classList.add('bg-red-500', 'hover:bg-red-700');
                // Timer text will be added by the interval function
                break;
            case 'overtime':
                button.classList.add('bg-orange-500', 'hover:bg-orange-700', 'animate-pulse');
                // Stopwatch text will be added by the interval function
                break;
        }
    }

    // *** UPDATED Function: Calls the new updateButtonAppearance ***
    function resetKart(kartId) {
        console.log(`Resetting Kart ${kartId}`);
        const kart = kartStatus[kartId];

        if (!kart) {
            console.error(`Attempted to reset non-existent kart: ${kartId}`);
            return;
        }

        if (kart.timerId) {
            clearInterval(kart.timerId);
            kart.timerId = null;
        }
        if (kart.stopwatchId) {
            clearInterval(kart.stopwatchId);
            kart.stopwatchId = null;
        }

        kart.status = 'available';
        kart.endTime = null;
        kart.overtimeStartTime = null;

        updateButtonAppearance(kartId); // This will now apply the blue color
        // saveState(); // Optional persistence
    }

    // *** UPDATED Function: Calls the new updateButtonAppearance ***
    function startCountdown(kartId, durationMinutes) {
        const kart = kartStatus[kartId];
        if (!kart) {
            console.error(`Attempted to start countdown for non-existent kart: ${kartId}`);
            return;
        }

        const now = Date.now();
        kart.endTime = now + durationMinutes * 60 * 1000;
        kart.status = 'rented'; // Set status *before* updating appearance

        updateButtonAppearance(kartId); // Applies red color

        // Clear previous timers just in case
        if (kart.timerId) clearInterval(kart.timerId);
        if (kart.stopwatchId) clearInterval(kart.stopwatchId);
        kart.stopwatchId = null;

        kart.timerId = setInterval(() => {
            if (!kartStatus[kartId] || kartStatus[kartId].status !== 'rented') {
                clearInterval(kart.timerId);
                return;
            }
            const currentTime = Date.now();
            const remainingTime = Math.round((kart.endTime - currentTime) / 1000);

            if (remainingTime <= 0) {
                clearInterval(kart.timerId);
                kart.timerId = null;
                if (kartStatus[kartId] && kartStatus[kartId].status === 'rented') {
                    console.log(`Kart ${kartId} time expired.`);
                    // Update text *before* showing modal
                    kart.timerDisplayElement.textContent = ' Expired!';
                    showModal(returnModal, kartId);
                }
            } else {
                kart.timerDisplayElement.textContent = ` (${formatTimeMMSS(remainingTime)})`;
            }
        }, 1000);

        console.log(`Kart ${kartId} rented for ${durationMinutes} mins. End time: ${new Date(kart.endTime)}`);
        // saveState(); // Optional persistence
    }

    // *** UPDATED Function: Calls the new updateButtonAppearance ***
    function startOvertime(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) {
            console.error(`Attempted to start overtime for non-existent kart: ${kartId}`);
            return;
        }
        kart.status = 'overtime'; // Set status *before* updating appearance
        kart.overtimeStartTime = Date.now();

        updateButtonAppearance(kartId); // Applies orange color + pulse

        // Clear previous timers
        if (kart.timerId) clearInterval(kart.timerId);
        kart.timerId = null;
        if (kart.stopwatchId) clearInterval(kart.stopwatchId);

        kart.stopwatchId = setInterval(() => {
            if (!kartStatus[kartId] || kartStatus[kartId].status !== 'overtime') {
                clearInterval(kart.stopwatchId);
                return;
            }
            const now = Date.now();
            const elapsedSeconds = Math.round((now - kart.overtimeStartTime) / 1000);
            kart.timerDisplayElement.textContent = ` (OT: ${formatTimeHHMMSS(elapsedSeconds)})`;
        }, 1000);

        console.log(`Kart ${kartId} entered overtime.`);
        // saveState(); // Optional persistence
    }

    // Function stopOvertime (no changes needed in its logic regarding appearance)
    function stopOvertime(kartId) {
        const kart = kartStatus[kartId];
        if (!kart) {
            console.error(`Attempted to stop overtime for non-existent kart: ${kartId}`);
            return;
        }
        if (kart.status !== 'overtime') {
            console.warn(`Attempted to stop overtime for kart ${kartId} which is not in overtime (status: ${kart.status}).`);
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
        // Reset happens when 'OK' is clicked in the modal
    }


    // --- Event Handlers ---
    // handleKartClick function remains the same as the corrected version before
    function handleKartClick(event) {
        const button = event.target.closest('.kart-button');
        if (!button) return;

        const kartId = button.dataset.kartId;
        const kart = kartStatus[kartId]; // Get the kart object

        // Check if kart exists in our state management
        if (!kart) {
            console.error(`Kart ${kartId} clicked, but not found in kartStatus object.`);
            return;
        }
        const status = kart.status; // Get status from the existing kart object

        console.log(`Kart ${kartId} clicked. Status: ${status}`);

        switch (status) {
            case 'available':
                showModal(durationModal, kartId);
                break;
            case 'rented':
                if (confirm(`Kart ${kartId} is currently rented. Mark as returned early?`)) {
                    resetKart(kartId);
                }
                break;
            case 'overtime':
                stopOvertime(kartId);
                break;
            default:
                console.warn(`Unhandled kart status: ${status} for kart ${kartId}`);
        }
    }


    // --- Initialization ---

    // *** UPDATED Function: Applies blue Tailwind classes initially ***
    function generateKartButtons() {
        kartContainer.innerHTML = '';
        kartStatus = {};

        for (let i = 0; i < CATEGORY_COUNT; i++) {
            const categoryStart = i * KARTS_PER_CATEGORY + 1;
            const categoryEnd = Math.min((i + 1) * KARTS_PER_CATEGORY, TOTAL_KARTS);

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-section bg-white p-4 rounded shadow mb-4'; // Added mb-4 for spacing

            const categoryHeading = document.createElement('h2');
            categoryHeading.className = 'text-xl font-semibold mb-3';
            categoryHeading.textContent = `Category ${i + 1} (Karts ${categoryStart}-${categoryEnd})`;
            categoryDiv.appendChild(categoryHeading);

            const buttonWrapper = document.createElement('div');
            buttonWrapper.id = `category-${i + 1}`;
            buttonWrapper.className = 'flex flex-wrap gap-2'; // Use gap-2 for spacing
            categoryDiv.appendChild(buttonWrapper);

            kartContainer.appendChild(categoryDiv);

            for (let kartIdNum = categoryStart; kartIdNum <= categoryEnd; kartIdNum++) {
                const kartId = String(kartIdNum);
                const button = document.createElement('button');
                button.type = 'button';
                // Base class + initial state (available = blue)
                button.className = 'kart-button bg-blue-500 hover:bg-blue-700';
                button.dataset.kartId = kartId;

                button.appendChild(document.createTextNode(kartId));

                const timerDisplay = document.createElement('span');
                timerDisplay.className = 'timer-display'; // Class defined in <style>
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

    // --- Modal Event Listeners (no changes needed here) ---
    // Duration Modal
    document.getElementById('duration-30m').addEventListener('click', () => {
        const kartId = durationModalKartIdHidden.value;
        if (kartId && kartStatus[kartId] && kartStatus[kartId].status === 'available') {
            startCountdown(kartId, 30);
            hideModal(durationModal);
        } else if (kartId) {
            console.warn(`Attempted to rent kart ${kartId} which is not available.`);
            hideModal(durationModal);
        }
    });
    document.getElementById('duration-1h').addEventListener('click', () => {
        const kartId = durationModalKartIdHidden.value;
        if (kartId && kartStatus[kartId] && kartStatus[kartId].status === 'available') {
            startCountdown(kartId, 60);
            hideModal(durationModal);
        } else if (kartId) {
            console.warn(`Attempted to rent kart ${kartId} which is not available.`);
            hideModal(durationModal);
        }
    });
    document.getElementById('duration-cancel').addEventListener('click', () => {
        hideModal(durationModal);
    });

    // Return Modal
    document.getElementById('return-yes').addEventListener('click', () => {
        const kartId = returnModalKartIdHidden.value;
        if (kartId && kartStatus[kartId]) {
            resetKart(kartId);
            hideModal(returnModal);
        }
    });
    document.getElementById('return-no').addEventListener('click', () => {
        const kartId = returnModalKartIdHidden.value;
        if (kartId && kartStatus[kartId]) {
            if (kartStatus[kartId].status === 'rented' || kartStatus[kartId].endTime <= Date.now()) {
                startOvertime(kartId);
            } else {
                console.warn(`Kart ${kartId} - 'No' clicked on return modal, but status is ${kartStatus[kartId].status}. Resetting.`);
                resetKart(kartId);
            }
            hideModal(returnModal);
        }
    });

    // Overtime Modal
    document.getElementById('overtime-ok').addEventListener('click', () => {
        const kartId = overtimeModalKartIdHidden.value;
        if (kartId && kartStatus[kartId]) {
            resetKart(kartId);
            hideModal(overtimeModal);
        }
    });

    // --- Initial Setup ---
    generateKartButtons();
    // loadState(); // Optional

}); // End DOMContentLoaded

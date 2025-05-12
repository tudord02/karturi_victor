document.addEventListener('DOMContentLoaded', () => {
    // --- Data Definition ---
    const kartData = [
        // Define each kart with a unique ID, display name, category, and prices
        // Note: IDs are created programmatically below based on category and original identifier
        { category: "Basic Karts", idents: ["fara numar ×5", "00 ×1", "1", "2", "4", "5", "6", "8", "9", "10", "11", "12", "06"], price30: 20, price1h: 30 },
        { category: "New Steering Wheel – Large Karts", idents: ["42", "43", "55", "52", "47", "24", "26", "15", "25", "44", "13", "46"], price30: 25, price1h: 40 },
        { category: "Old Steering Wheel – Large Karts", idents: ["27", "58", "17", "19", "18", "56", "23", "22", "20", "57", "21", "14", "60", "81", "59", "16"], price30: 25, price1h: 40 }, // Assuming Kart 17 is unique
        { category: "Horn-Style Steering – Large Karts", idents: ["33", "39", "30", "34", "38", "36", "37", "35", "31", "32"], price30: 25, price1h: 40 },
        { category: "Two-Seater with Attachment", idents: ["64", "68", "70", "61", "66", "65", "67", "63", "69", "62", "71", "72", "51", "48"], price30: 35, price1h: 50 },
        { category: "Two-Seater, Two-Pedal Karts", idents: ["77", "76", "78"], price30: 50, price1h: 70 },
        { category: "Grand Tour (4-Seater)", idents: ["73", "74"], price30: 50, price1h: 70 },
        { category: "Sirenetta (3-Seater)", idents: ["Verde ×2", "Roșu ×1", "Albastru ×1", "Mov ×1"], price30: 70, price1h: 100 },
        { category: "Delfino (6-Seater)", idents: ["Verde ×1", "Mov ×1"], price30: 90, price1h: 130 },
    ];

    // --- State Management ---
    let karts = {}; // Object to hold the state of each kart
    const KART_STATE_KEY = 'goKartRentalState';

    function saveState() {
        try {
            localStorage.setItem(KART_STATE_KEY, JSON.stringify(karts));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
            // Optionally alert the user that state saving failed
            // alert("Warning: Could not save kart status. Timers might reset if you close the page.");
        }
    }

    function loadState() {
        const savedState = localStorage.getItem(KART_STATE_KEY);
        if (savedState) {
            try {
                karts = JSON.parse(savedState);
                // Ensure all karts from kartData exist in the loaded state, adding new ones if necessary
                initializeKartData(); // Re-run to merge saved data with current config
            } catch (e) {
                console.error("Failed to parse saved state, initializing fresh state:", e);
                initializeKartData(); // Initialize if parsing fails
                saveState(); // Save the fresh state
            }
        } else {
            initializeKartData(); // Initialize if no saved state
            saveState(); // Save the initial state
        }
    }

    function initializeKartData() {
        const processedKarts = {}; // Temporary object to build the full kart list

        kartData.forEach(cat => {
            cat.idents.forEach(ident => {
                const match = ident.match(/^(.*?) ×(\d+)$/); // Check for "Name ×Count" format
                if (match) {
                    const name = match[1].trim();
                    const count = parseInt(match[2], 10);
                    for (let i = 1; i <= count; i++) {
                        const kartId = `${cat.category.replace(/\s+/g, '-').toLowerCase()}-${name.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                        const displayName = `${name} ${i}`;
                        // Merge with existing state or create new
                        processedKarts[kartId] = {
                            ... { // Default structure
                                id: kartId,
                                display: displayName,
                                category: cat.category,
                                price30: cat.price30,
                                price1h: cat.price1h,
                                status: 'available', // available, rented, overdue, pending_return
                                rentalEndTime: null, // Timestamp when rental ends
                                stopwatchStartTime: null, // Timestamp when overdue started
                            },
                            ...(karts[kartId] || {}) // Overwrite with loaded state if exists
                        };
                    }
                } else {
                    const kartId = `${cat.category.replace(/\s+/g, '-').toLowerCase()}-${ident.replace(/\s+/g, '-').toLowerCase()}`;
                    const displayName = ident;
                    processedKarts[kartId] = {
                        ... { // Default structure
                            id: kartId,
                            display: displayName,
                            category: cat.category,
                            price30: cat.price30,
                            price1h: cat.price1h,
                            status: 'available',
                            rentalEndTime: null,
                            stopwatchStartTime: null,
                        },
                        ...(karts[kartId] || {}) // Overwrite with loaded state
                    };
                }
            });
        });
        karts = processedKarts; // Update the main karts object
    }


    // --- UI Generation ---
    function createKartButtons() {
        const container = document.getElementById('kart-categories');
        container.innerHTML = ''; // Clear existing buttons

        // Group karts by category for display
        const kartsByCategory = {};
        Object.values(karts).forEach(kart => {
            if (!kartsByCategory[kart.category]) {
                kartsByCategory[kart.category] = [];
            }
            kartsByCategory[kart.category].push(kart);
        });

        // Sort categories (optional)
        const sortedCategories = Object.keys(kartsByCategory).sort();

        sortedCategories.forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-container';

            const title = document.createElement('h2');
            title.className = 'category-title';
            title.textContent = categoryName;
            categoryDiv.appendChild(title);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'kart-buttons-grid';

            // Sort karts within category (optional, e.g., numerically if possible)
            kartsByCategory[categoryName].sort((a, b) => {
                // Basic numeric sort for display names that are numbers
                const numA = parseInt(a.display);
                const numB = parseInt(b.display);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.display.localeCompare(b.display); // Alphabetical otherwise
            }).forEach(kart => {
                const button = document.createElement('button');
                button.className = 'kart-button';
                button.id = `kart-${kart.id}`;
                button.dataset.kartId = kart.id; // Link button to kart data

                const nameSpan = document.createElement('span');
                nameSpan.textContent = kart.display;
                button.appendChild(nameSpan);

                const timerSpan = document.createElement('span');
                timerSpan.className = 'kart-timer';
                timerSpan.id = `timer-${kart.id}`;
                button.appendChild(timerSpan);

                button.addEventListener('click', () => handleKartClick(kart.id));
                gridDiv.appendChild(button);
            });
            categoryDiv.appendChild(gridDiv);
            container.appendChild(categoryDiv);
        });
        updateAllButtonStates(); // Set initial colors/timers
    }

    // --- Event Handlers ---
    function handleKartClick(kartId) {
        const kart = karts[kartId];
        if (!kart) return;

        switch (kart.status) {
            case 'available':
                openRentalPopup(kartId);
                break;
            case 'rented':
                // Early return: Confirm first? Or just stop? Let's just stop for now.
                resetKart(kartId);
                break;
            case 'overdue':
                // Stop stopwatch and mark as returned
                resetKart(kartId);
                break;
            case 'pending_return':
                // If clicked while waiting for return confirmation, open the confirmation popup again
                openReturnPopup(kartId);
                break;
        }
    }

    // --- Pop-up Management ---
    const rentalPopup = document.getElementById('rental-popup');
    const returnPopup = document.getElementById('return-popup');
    let currentPopupKartId = null; // Track which kart the popup is for

    function openRentalPopup(kartId) {
        const kart = karts[kartId];
        if (!kart) return;

        currentPopupKartId = kartId;
        document.getElementById('popup-kart-id').textContent = `Kart ${kart.display}`;
        document.getElementById('popup-30min').textContent = `30 min (${kart.price30} lei)`;
        document.getElementById('popup-1h').textContent = `1 oră (${kart.price1h} lei)`;

        // Set up button actions
        document.getElementById('popup-30min').onclick = () => startRental(currentPopupKartId, 30);
        document.getElementById('popup-1h').onclick = () => startRental(currentPopupKartId, 60);

        rentalPopup.style.display = 'flex';
    }

    function openReturnPopup(kartId) {
        const kart = karts[kartId];
        if (!kart) return;

        currentPopupKartId = kartId;
        document.getElementById('return-kart-id').textContent = `Kart ${kart.display}`;

        // Set up button actions
        document.getElementById('return-yes').onclick = () => handleReturnConfirmation(currentPopupKartId, true);
        document.getElementById('return-no').onclick = () => handleReturnConfirmation(currentPopupKartId, false);

        returnPopup.style.display = 'flex';
    }

    function closePopup(popupId) {
        document.getElementById(popupId).style.display = 'none';
        currentPopupKartId = null;
    }

    // Close popups if clicking outside the content
    window.onclick = function(event) {
        if (event.target == rentalPopup) {
            closePopup('rental-popup');
        }
        if (event.target == returnPopup) {
            // Don't close return popup by clicking outside, force a choice
            // closePopup('return-popup');
        }
    }

    // --- Rental Logic ---
    function startRental(kartId, durationMinutes) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'available') return;

        const now = Date.now();
        kart.status = 'rented';
        kart.rentalEndTime = now + durationMinutes * 60 * 1000;
        kart.stopwatchStartTime = null;

        updateButtonState(kartId);
        saveState();
        closePopup('rental-popup');
    }

    function handleReturnConfirmation(kartId, returned) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'pending_return') return;

        if (returned) {
            resetKart(kartId); // Mark as available
        } else {
            // Start stopwatch
            kart.status = 'overdue';
            kart.stopwatchStartTime = Date.now(); // Record when overdue started
            kart.rentalEndTime = null;
            updateButtonState(kartId);
            saveState();
        }
        closePopup('return-popup');
    }

    function resetKart(kartId) {
        const kart = karts[kartId];
        if (!kart) return;

        kart.status = 'available';
        kart.rentalEndTime = null;
        kart.stopwatchStartTime = null;

        updateButtonState(kartId);
        document.getElementById(`timer-${kartId}`).textContent = ''; // Clear timer display
        saveState();
    }

    // --- Timer & UI Update ---
    function formatTime(milliseconds) {
        if (milliseconds <= 0) return "00:00";
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateButtonState(kartId) {
        const kart = karts[kartId];
        const button = document.getElementById(`kart-${kartId}`);
        const timerDisplay = document.getElementById(`timer-${kartId}`);
        if (!button || !kart) return;

        // Remove existing status classes
        button.classList.remove('available', 'rented', 'overdue', 'pending_return');
        // Remove animation class explicitly
        button.style.animation = '';
        void button.offsetWidth; // Trigger reflow to restart animation if needed

        switch (kart.status) {
            case 'available':
                button.classList.add('available');
                timerDisplay.textContent = '';
                break;
            case 'rented':
                button.classList.add('rented');
                const remainingTime = kart.rentalEndTime - Date.now();
                timerDisplay.textContent = `-${formatTime(remainingTime)}`; // Display countdown
                if (remainingTime <= 0) {
                    // Timer expired, move to pending state if not already handled by main loop
                    kart.status = 'pending_return';
                    saveState(); // Save the status change immediately
                    openReturnPopup(kartId); // Ask for confirmation
                    updateButtonState(kartId); // Re-run to apply pending_return style if needed
                }
                break;
            case 'pending_return':
                button.classList.add('rented'); // Visually same as rented, maybe slightly different?
                timerDisplay.textContent = 'Confirm Return!';
                break;
            case 'overdue':
                button.classList.add('overdue');
                const overdueTime = Date.now() - kart.stopwatchStartTime;
                timerDisplay.textContent = `+${formatTime(overdueTime)}`; // Display stopwatch
                // Ensure animation is applied
                button.style.animation = 'blink 1.5s linear infinite';
                break;
        }
    }

    function updateAllButtonStates() {
        Object.keys(karts).forEach(kartId => {
            updateButtonState(kartId);
        });
    }

    // --- Global Timer Loop ---
    function tick() {
        let needsSave = false;
        const now = Date.now();

        Object.values(karts).forEach(kart => {
            if (kart.status === 'rented') {
                if (now >= kart.rentalEndTime) {
                    // Timer just expired
                    kart.status = 'pending_return';
                    // Stop checking timer, open popup
                    openReturnPopup(kart.id);
                    needsSave = true; // State changed
                }
                // Update display regardless
                updateButtonState(kart.id);
            } else if (kart.status === 'overdue') {
                // Just update the display for the stopwatch
                updateButtonState(kart.id);
            }
        });

        if (needsSave) {
            saveState();
        }
    }

    // --- Initialization ---
    loadState(); // Load saved state or initialize
    createKartButtons(); // Create UI
    setInterval(tick, 1000); // Start the main timer loop (runs every second)

}); // End DOMContentLoaded

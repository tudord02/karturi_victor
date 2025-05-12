document.addEventListener('DOMContentLoaded', () => {
    // --- Data Definition ---
    const kartData = [
        { category: "Basic Karts", idents: ["fara numar ×5", "00 ×1", "1", "2", "4", "5", "6", "8", "9", "10", "11", "12", "06"], price30: 20, price1h: 30 },
        { category: "New Steering Wheel – Large Karts", idents: ["42", "43", "55", "52", "47", "24", "26", "15", "25", "44", "13", "46"], price30: 25, price1h: 40 },
        { category: "Old Steering Wheel – Large Karts", idents: ["27", "58", "17", "19", "18", "56", "23", "22", "20", "57", "21", "14", "60", "81", "59", "16"], price30: 25, price1h: 40 },
        { category: "Horn-Style Steering – Large Karts", idents: ["33", "39", "30", "34", "38", "36", "37", "35", "31", "32"], price30: 25, price1h: 40 },
        { category: "Two-Seater with Attachment", idents: ["64", "68", "70", "61", "66", "65", "67", "63", "69", "62", "71", "72", "51", "48"], price30: 35, price1h: 50 },
        { category: "Two-Seater, Two-Pedal Karts", idents: ["77", "76", "78"], price30: 50, price1h: 70 },
        { category: "Grand Tour (4-Seater)", idents: ["73", "74"], price30: 50, price1h: 70 },
        { category: "Sirenetta (3-Seater)", idents: ["Verde ×2", "Roșu ×1", "Albastru ×1", "Mov ×1"], price30: 70, price1h: 100 },
        { category: "Delfino (6-Seater)", idents: ["Verde ×1", "Mov ×1"], price30: 90, price1h: 130 },
    ];

    // --- State Management ---
    let karts = {}; // Holds the current state of each kart
    const KART_STATE_KEY = 'goKartRentalState_v4'; // Key for kart status in localStorage
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1'; // Key for rental history in localStorage

    // Load rental history from localStorage or initialize if not present
    function getRentalHistory() {
        const historyJson = localStorage.getItem(RENTAL_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    }

    // Save rental history to localStorage
    function saveRentalHistory(history) {
        localStorage.setItem(RENTAL_HISTORY_KEY, JSON.stringify(history));
    }

    // Add a completed rental to the history
    function logRentalToHistory(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart) return;

        const history = getRentalHistory();
        const now = Date.now();
        let rentalStartTime = now - (durationMinutes * 60 * 1000); // Approximate start time

        // If the kart object has a more precise start time (e.g., from an active rental session), use that
        if (kart.actualRentalStartTime) {
            rentalStartTime = kart.actualRentalStartTime;
        }

        const rentalEntry = {
            kartUniqueId: kart.id,
            kartDisplay: kart.display,
            kartCategory: kart.category,
            rentalStartTime: rentalStartTime,
            rentalEndTime: now, // Logged when rental is completed
            durationMinutes: durationMinutes,
            pricePaid: pricePaid,
        };
        history.push(rentalEntry);
        saveRentalHistory(history);
        console.log("Rental logged: ", rentalEntry);
    }


    function saveState() {
        try {
            localStorage.setItem(KART_STATE_KEY, JSON.stringify(karts));
        } catch (e) {
            console.error("Failed to save kart state to localStorage:", e);
        }
    }

    function loadState() {
        initializeKartData(false); // Initialize karts object from kartData without saving

        const savedState = localStorage.getItem(KART_STATE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                for (const kartId in karts) {
                    if (parsedState[kartId]) {
                        karts[kartId].status = parsedState[kartId].status || 'available';
                        karts[kartId].rentalEndTime = parsedState[kartId].rentalEndTime || null;
                        karts[kartId].stopwatchStartTime = parsedState[kartId].stopwatchStartTime || null;
                        karts[kartId].actualRentalStartTime = parsedState[kartId].actualRentalStartTime || null; // Load actual start time
                    }
                }
            } catch (e) {
                console.error("Failed to parse saved state, using default state:", e);
                saveState();
            }
        } else {
            saveState();
        }
    }

    function initializeKartData(shouldSave = true) {
        const processedKarts = {};
        kartData.forEach(cat => {
            cat.idents.forEach(ident => {
                const match = ident.match(/^(.*?) ×(\d+)$/);
                if (match) {
                    const name = match[1].trim();
                    const count = parseInt(match[2], 10);
                    for (let i = 1; i <= count; i++) {
                        const kartId = `${cat.category.replace(/\s+/g, '-').toLowerCase()}-${name.replace(/\s+/g, '-').toLowerCase()}-${i}`;
                        const displayName = `${name} ${i}`;
                        processedKarts[kartId] = {
                            id: kartId,
                            display: displayName,
                            category: cat.category,
                            price30: cat.price30,
                            price1h: cat.price1h,
                            status: 'available',
                            rentalEndTime: null,
                            stopwatchStartTime: null,
                            actualRentalStartTime: null,
                        };
                    }
                } else {
                    const kartId = `${cat.category.replace(/\s+/g, '-').toLowerCase()}-${ident.replace(/\s+/g, '-').toLowerCase()}`;
                    const displayName = ident;
                    processedKarts[kartId] = {
                        id: kartId,
                        display: displayName,
                        category: cat.category,
                        price30: cat.price30,
                        price1h: cat.price1h,
                        status: 'available',
                        rentalEndTime: null,
                        stopwatchStartTime: null,
                        actualRentalStartTime: null,
                    };
                }
            });
        });
        karts = processedKarts;
        if (shouldSave) {
            saveState();
        }
    }

    // --- UI Generation ---
    function createKartButtons() {
        const container = document.getElementById('kart-categories');
        container.innerHTML = '';
        const kartsByCategory = {};
        Object.values(karts).forEach(kart => {
            if (!kartsByCategory[kart.category]) kartsByCategory[kart.category] = [];
            kartsByCategory[kart.category].push(kart);
        });
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
            kartsByCategory[categoryName].sort((a, b) => {
                const numA = parseInt(a.display.match(/\d+/));
                const numB = parseInt(b.display.match(/\d+/));
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
                return a.display.localeCompare(b.display);
            }).forEach(kart => {
                const button = document.createElement('button');
                button.className = 'kart-button';
                button.id = `kart-${kart.id}`;
                button.dataset.kartId = kart.id;
                const kartInfoDiv = document.createElement('div');
                kartInfoDiv.className = 'kart-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'kart-name';
                nameSpan.textContent = kart.display;
                kartInfoDiv.appendChild(nameSpan);
                const priceSpan = document.createElement('span');
                priceSpan.className = 'kart-price';
                priceSpan.textContent = `${kart.price30} lei / 30min`;
                kartInfoDiv.appendChild(priceSpan);
                button.appendChild(kartInfoDiv);
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
        updateAllButtonStates();
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
                resetKart(kartId, true);
                break; // true indicates early return, log it
            case 'overdue':
                resetKart(kartId, true);
                break; // true indicates overdue return, log it
            case 'pending_return':
                openReturnPopup(kartId);
                break;
        }
    }

    // --- Pop-up Management ---
    const rentalPopup = document.getElementById('rental-popup');
    const returnPopup = document.getElementById('return-popup');
    let currentPopupKartId = null;

    window.closePopup = function(popupId) { // Make it globally accessible for inline onclick
        document.getElementById(popupId).style.display = 'none';
        currentPopupKartId = null;
    }

    function openRentalPopup(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        currentPopupKartId = kartId;
        document.getElementById('popup-kart-id').textContent = `Kart ${kart.display}`;
        document.getElementById('popup-30min').textContent = `30 min (${kart.price30} lei)`;
        document.getElementById('popup-1h').textContent = `1 oră (${kart.price1h} lei)`;
        document.getElementById('popup-30min').onclick = () => startRental(currentPopupKartId, 30, kart.price30);
        document.getElementById('popup-1h').onclick = () => startRental(currentPopupKartId, 60, kart.price1h);
        rentalPopup.style.display = 'flex';
    }

    function openReturnPopup(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        currentPopupKartId = kartId;
        document.getElementById('return-kart-id').textContent = `Kart ${kart.display}`;
        document.getElementById('return-yes').onclick = () => handleReturnConfirmation(currentPopupKartId, true);
        document.getElementById('return-no').onclick = () => handleReturnConfirmation(currentPopupKartId, false);
        returnPopup.style.display = 'flex';
    }

    // Close popups if clicking outside the content (except for return-popup)
    window.onclick = function(event) {
        if (event.target == rentalPopup) {
            closePopup('rental-popup');
        }
    }

    // --- Rental Logic ---
    function startRental(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'available') return;
        const now = Date.now();
        kart.status = 'rented';
        kart.actualRentalStartTime = now; // Store the precise start time
        kart.rentalEndTime = now + durationMinutes * 60 * 1000;
        kart.stopwatchStartTime = null;
        kart.intendedDuration = durationMinutes; // Store intended duration for logging
        kart.intendedPrice = pricePaid; // Store intended price for logging
        updateButtonState(kartId);
        saveState();
        closePopup('rental-popup');
    }

    function handleReturnConfirmation(kartId, returned) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'pending_return') return;
        if (returned) {
            resetKart(kartId, true); // true indicates it's a confirmed return, log it
        } else {
            kart.status = 'overdue';
            kart.stopwatchStartTime = Date.now();
            kart.rentalEndTime = null;
            updateButtonState(kartId);
            saveState();
        }
        closePopup('return-popup');
    }

    // Modified resetKart to include logging
    function resetKart(kartId, shouldLog = false) {
        const kart = karts[kartId];
        if (!kart) return;

        if (shouldLog && (kart.status === 'rented' || kart.status === 'overdue' || kart.status === 'pending_return')) {
            // Determine actual duration for logging
            // If it was 'rented' or 'pending_return', intendedDuration should be used.
            // If 'overdue', it means it completed its intended duration and then some.
            let loggedDuration = kart.intendedDuration || 0;
            let loggedPrice = kart.intendedPrice || 0;

            if (kart.status === 'overdue') {
                // For overdue, we assume the original rental period was completed.
                // The stopwatch tracks additional time.
                // For simplicity in this client-side version, we'll log the original intended duration and price.
                // A real system might calculate overdue fees and log total time.
            }

            logRentalToHistory(kartId, loggedDuration, loggedPrice);
        }

        kart.status = 'available';
        kart.rentalEndTime = null;
        kart.stopwatchStartTime = null;
        kart.actualRentalStartTime = null; // Clear session-specific data
        kart.intendedDuration = null;
        kart.intendedPrice = null;
        updateButtonState(kartId);
        saveState();
    }

    // --- Timer & UI Update ---
    function formatTime(milliseconds) {
        if (milliseconds <= 0) return "00:00";
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000)); // Ensure non-negative
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateButtonState(kartId) {
        const kart = karts[kartId];
        const button = document.getElementById(`kart-${kartId}`);
        const timerDisplay = document.getElementById(`timer-${kartId}`);
        if (!button || !kart || !timerDisplay) return;

        button.classList.remove('available', 'rented', 'overdue', 'pending_return');
        button.style.animation = '';
        void button.offsetWidth;

        const priceDisplay = button.querySelector('.kart-price');
        timerDisplay.textContent = '';
        if (priceDisplay) priceDisplay.style.display = 'block';

        switch (kart.status) {
            case 'available':
                button.classList.add('available');
                break;
            case 'rented':
                button.classList.add('rented');
                const remainingTime = kart.rentalEndTime - Date.now();
                timerDisplay.textContent = `-${formatTime(remainingTime)}`;
                if (priceDisplay) priceDisplay.style.display = 'none';
                if (remainingTime <= 0 && kart.rentalEndTime !== null) { // Check rentalEndTime to avoid issues if it was cleared
                    kart.status = 'pending_return';
                    saveState();
                    openReturnPopup(kart.id); // This will also trigger an updateButtonState later
                    // updateButtonState(kart.id); // Re-run to reflect 'pending_return' - called by openReturnPopup
                }
                break;
            case 'pending_return':
                button.classList.add('rented');
                timerDisplay.textContent = 'CONFIRM?';
                if (priceDisplay) priceDisplay.style.display = 'none';
                break;
            case 'overdue':
                button.classList.add('overdue');
                const overdueTime = Date.now() - kart.stopwatchStartTime;
                timerDisplay.textContent = `+${formatTime(overdueTime)}`;
                if (priceDisplay) priceDisplay.style.display = 'none';
                button.style.animation = 'blink 1.3s linear infinite';
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
            if (kart.status === 'rented' && kart.rentalEndTime !== null) {
                if (now >= kart.rentalEndTime) {
                    kart.status = 'pending_return';
                    openReturnPopup(kart.id);
                    needsSave = true;
                }
                updateButtonState(kart.id);
            } else if (kart.status === 'overdue') {
                updateButtonState(kart.id);
            }
        });
        if (needsSave) {
            saveState();
        }
    }

    // --- Navigation ---
    const historyButton = document.getElementById('viewHistoryButton');
    if (historyButton) {
        historyButton.addEventListener('click', () => {
            window.location.href = 'history.html';
        });
    }

    // --- Initialization ---
    loadState();
    createKartButtons();
    setInterval(tick, 1000);

});

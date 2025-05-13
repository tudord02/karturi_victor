document.addEventListener('DOMContentLoaded', () => {
    // --- Data Definition ---
    // Asigură-te că acest array `kartData` corespunde cu cel din fișierul tău local,
    // inclusiv cu numele pe care le-ai modificat. Ordinea din `idents` va fi respectată.
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
    let karts = {};
    const KART_STATE_KEY = 'goKartRentalState_v4';
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1';
    let notificationPermission = 'default'; // Inițializează ca default pentru a verifica la încărcare

    // Retrieve rental history from localStorage
    function getRentalHistory() {
        const historyJson = localStorage.getItem(RENTAL_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    }

    // Save rental history to localStorage
    function saveRentalHistory(history) {
        localStorage.setItem(RENTAL_HISTORY_KEY, JSON.stringify(history));
    }

    // Log a completed rental to the history
    function logRentalToHistory(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart) return;
        const history = getRentalHistory();
        const now = Date.now();
        let rentalStartTime = kart.actualRentalStartTime || (now - durationMinutes * 60 * 1000);
        const rentalEntry = {
            kartUniqueId: kart.id,
            display: kart.display,
            kartCategory: kart.category,
            rentalStartTime: rentalStartTime,
            rentalEndTime: now,
            durationMinutes: durationMinutes,
            pricePaid: pricePaid,
        };
        history.push(rentalEntry);
        saveRentalHistory(history);
        console.log("Rental logged: ", rentalEntry);
    }

    // Save the current state of all karts to localStorage
    function saveState() {
        try {
            localStorage.setItem(KART_STATE_KEY, JSON.stringify(karts));
        } catch (e) {
            console.error("Failed to save kart state to localStorage:", e);
        }
    }

    // Load kart states from localStorage or initialize
    function loadState() {
        initializeKartData(false);
        const savedState = localStorage.getItem(KART_STATE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                for (const kartId in karts) {
                    if (parsedState[kartId]) {
                        Object.assign(karts[kartId], parsedState[kartId]); // Merge saved properties
                    }
                }
            } catch (e) {
                console.error("Failed to parse saved state, re-initializing karts:", e);
                initializeKartData(true);
            }
        } else {
            initializeKartData(true);
        }
    }

    // Initialize the karts object from kartData
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
                            intendedDuration: null,
                            intendedPrice: null
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
                        intendedDuration: null,
                        intendedPrice: null
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
            if (!kartsByCategory[kart.category]) {
                kartsByCategory[kart.category] = [];
            }
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

            kartsByCategory[categoryName].forEach(kart => {
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

    // --- Notification Logic ---
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log("Acest browser nu suportă notificări desktop.");
            notificationPermission = "denied";
            return;
        }
        if (notificationPermission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                notificationPermission = permission;
                if (permission === 'granted') {
                    console.log("Permisiune pentru notificări acordată.");
                } else {
                    console.log("Permisiune pentru notificări refuzată.");
                }
            } catch (error) {
                console.error("Eroare la cererea permisiunii pentru notificări:", error);
                notificationPermission = "denied";
            }
        }
    }

    function sendTimerNotification(kart) {
        if (notificationPermission !== 'granted') {
            console.log("Permisiunea pentru notificări nu este acordată. Nu se poate trimite notificarea.");
            return;
        }
        const notificationTitle = "Timpul a expirat!";
        const notificationBody = `Kartul "${kart.display}" (${kart.category}) și-a terminat cursa.`;
        const options = {
            body: notificationBody,
            tag: `kart-timer-${kart.id}`,
            renotify: true,
        };
        try {
            const notification = new Notification(notificationTitle, options);
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
            notification.onclick = () => {
                window.focus();
            };
        } catch (error) {
            console.error("Eroare la crearea notificării:", error);
        }
    }

    // --- Event Handlers & Core Logic ---
    function handleKartClick(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        switch (kart.status) {
            case 'available':
                openRentalPopup(kartId);
                break;
            case 'rented':
            case 'overdue':
            case 'pending_return':
                showElapsedTimeAndReset(kartId);
                break;
        }
    }

    function showElapsedTimeAndReset(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        let elapsedTimeMessage = "";
        let actualDurationMinutes = kart.intendedDuration;
        let priceForLog = kart.intendedPrice;
        if (kart.status === 'rented' && kart.actualRentalStartTime) {
            const elapsedMs = Date.now() - kart.actualRentalStartTime;
            actualDurationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
            elapsedTimeMessage = `Închiriere finalizată devreme. Timp utilizat: aprox. ${actualDurationMinutes} min. Preț: ${priceForLog} lei.`;
        } else if (kart.status === 'overdue' && kart.actualRentalStartTime && kart.stopwatchStartTime) {
            const overdueMs = Date.now() - kart.stopwatchStartTime;
            const overdueMinutes = Math.round(overdueMs / 60000);
            actualDurationMinutes = kart.intendedDuration + overdueMinutes;
            elapsedTimeMessage = `Timp total: ${kart.intendedDuration} min inițial + ${overdueMinutes} min extra. Total: ${actualDurationMinutes} min. Preț: ${priceForLog} lei.`;
        } else if (kart.status === 'pending_return' || (kart.status === 'rented' && Date.now() >= kart.rentalEndTime)) {
            actualDurationMinutes = kart.intendedDuration;
            elapsedTimeMessage = `Perioada de închiriere de ${actualDurationMinutes} min a expirat. Preț: ${priceForLog} lei.`;
        } else {
            elapsedTimeMessage = `Închiriere finalizată pentru kart ${kart.display}. Preț: ${priceForLog} lei.`;
        }
        openElapsedTimePopup(kartId, elapsedTimeMessage, actualDurationMinutes, priceForLog);
    }

    // --- Pop-up Management ---
    const rentalPopup = document.getElementById('rental-popup');
    const returnPopup = document.getElementById('return-popup');
    const elapsedTimePopup = document.getElementById('elapsed-time-popup');
    let currentPopupKartId = null;

    window.closePopup = function(popupId) {
        const popupElement = document.getElementById(popupId);
        if (popupElement) popupElement.style.display = 'none';
        currentPopupKartId = null;
    }

    function openRentalPopup(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        currentPopupKartId = kartId;

        const popupContent = rentalPopup.querySelector('.popup-content');
        const existingTestButton = popupContent.querySelector('#popup-30sec-test');
        if (existingTestButton) {
            existingTestButton.remove();
        }

        document.getElementById('popup-kart-id').textContent = `Kart ${kart.display}`;
        const btn30Min = document.getElementById('popup-30min');
        btn30Min.textContent = `30 min (${kart.price30} lei)`;
        btn30Min.onclick = () => startRental(currentPopupKartId, 30, kart.price30);

        const btn1h = document.getElementById('popup-1h');
        btn1h.textContent = `1 oră (${kart.price1h} lei)`;
        btn1h.onclick = () => startRental(currentPopupKartId, 60, kart.price1h);

        // RE-ADD 30-second test button specifically for "Kart 1" (ID: basic-karts-1)
        // Ensure your kart ID for "Kart 1" in kartData corresponds to 'basic-karts-1'
        if (kart.id === 'basic-karts-1') {
            const testButton30Sec = document.createElement('button');
            testButton30Sec.id = 'popup-30sec-test';
            testButton30Sec.textContent = '30 sec (Test - 1 leu)';
            testButton30Sec.onclick = () => startRental(currentPopupKartId, 0.5, 1); // 0.5 minutes = 30 seconds

            // Optional: Style the test button (can also be done via CSS class)
            // This style is consistent with the one defined in style.css for #popup-30sec-test
            testButton30Sec.style.backgroundColor = '#ffc107';
            testButton30Sec.style.color = '#212529';

            const cancelButton = popupContent.querySelector('.cancel-button');
            popupContent.insertBefore(testButton30Sec, cancelButton);
        }

        rentalPopup.style.display = 'flex';
    }

    function openReturnPopup(kartId) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'pending_return') return;
        currentPopupKartId = kartId;
        document.getElementById('return-kart-id').textContent = `Kart ${kart.display}`;
        document.getElementById('return-yes').onclick = () => handleReturnConfirmation(currentPopupKartId, true);
        document.getElementById('return-no').onclick = () => handleReturnConfirmation(currentPopupKartId, false);
        returnPopup.style.display = 'flex';
    }

    function openElapsedTimePopup(kartId, message, loggedDuration, loggedPrice) {
        document.getElementById('elapsed-time-message').textContent = message;
        const okButton = document.getElementById('elapsed-time-ok');
        okButton.onclick = () => {
            resetKart(kartId, true, loggedDuration, loggedPrice);
            closePopup('elapsed-time-popup');
        };
        elapsedTimePopup.style.display = 'flex';
    }

    window.onclick = function(event) {
        if (event.target == rentalPopup) closePopup('rental-popup');
        if (event.target == returnPopup) closePopup('return-popup');
    }

    // --- Rental Logic ---
    async function startRental(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'available') return;

        if (notificationPermission === 'default') {
            await requestNotificationPermission();
        }

        const now = Date.now();
        kart.status = 'rented';
        kart.actualRentalStartTime = now;
        kart.rentalEndTime = now + durationMinutes * 60 * 1000;
        kart.stopwatchStartTime = null;
        kart.intendedDuration = durationMinutes;
        kart.intendedPrice = pricePaid;
        updateButtonState(kartId);
        saveState();
        closePopup('rental-popup');
    }

    function handleReturnConfirmation(kartId, returned) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'pending_return') {
            closePopup('return-popup');
            return;
        }
        if (returned) {
            showElapsedTimeAndReset(kartId);
        } else {
            kart.status = 'overdue';
            kart.stopwatchStartTime = Date.now();
            kart.rentalEndTime = null;
            updateButtonState(kartId);
            saveState();
        }
        closePopup('return-popup');
    }

    function resetKart(kartId, shouldLog = false, loggedDuration, loggedPrice) {
        const kart = karts[kartId];
        if (!kart) return;
        if (shouldLog) {
            const durationToLog = typeof loggedDuration !== 'undefined' ? loggedDuration : kart.intendedDuration;
            const priceToLog = typeof loggedPrice !== 'undefined' ? loggedPrice : kart.intendedPrice;
            if (durationToLog > 0) {
                logRentalToHistory(kartId, durationToLog, priceToLog);
            }
        }
        kart.status = 'available';
        kart.rentalEndTime = null;
        kart.stopwatchStartTime = null;
        kart.actualRentalStartTime = null;
        kart.intendedDuration = null;
        kart.intendedPrice = null;
        updateButtonState(kartId);
        saveState();
    }

    // --- Timer Display & UI Update ---
    function formatTime(milliseconds) {
        if (milliseconds <= 0) return "00:00";
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
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
                if (remainingTime <= 0 && kart.rentalEndTime !== null) {
                    if (kart.status !== 'pending_return') {
                        kart.status = 'pending_return';
                        saveState();
                        requestNotificationPermission().then(() => {
                            sendTimerNotification(kart);
                        });
                        openReturnPopup(kart.id);
                        updateButtonState(kart.id);
                    }
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
                    if (kart.status !== 'pending_return') {
                        kart.status = 'pending_return';
                        needsSave = true;
                        openReturnPopup(kart.id);
                        updateButtonState(kart.id);
                    }
                } else {
                    updateButtonState(kart.id);
                }
            } else if (kart.status === 'overdue') {
                updateButtonState(kart.id);
            }
        });
        if (needsSave) {
            saveState();
        }
    }

    // --- Navigation ---
    const viewHistoryBtn = document.getElementById('viewHistoryButton');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            window.location.href = 'history.html';
        });
    }

    // --- Initialization ---
    if ('Notification' in window) {
        notificationPermission = Notification.permission; // Preia starea actuală la încărcare
        if (notificationPermission === 'granted') {
            console.log("Permisiunea pentru notificări este deja acordată.");
        } else if (notificationPermission === 'denied') {
            console.log("Permisiunea pentru notificări este refuzată.");
        } else { // default
            console.log("Permisiunea pentru notificări este 'default'. Va fi cerută la nevoie.");
        }
    } else {
        notificationPermission = "denied"; // Notifications not supported
        console.log("Acest browser nu suportă notificări desktop.");
    }

    loadState();
    createKartButtons();
    setInterval(tick, 1000);
});

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
    let karts = {};
    const KART_STATE_KEY = 'goKartRentalState_v4'; // Ensure this matches the key you intend to use
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1';
    let notificationPermission = 'default';
    console.log("[Init] Notification permission state:", notificationPermission);

    function getRentalHistory() {
        const historyJson = localStorage.getItem(RENTAL_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    }

    function saveRentalHistory(history) {
        localStorage.setItem(RENTAL_HISTORY_KEY, JSON.stringify(history));
    }

    function logRentalToHistory(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart) return;
        const history = getRentalHistory();
        const now = Date.now();
        let rentalStartTime = kart.actualRentalStartTime || (now - durationMinutes * 60 * 1000);
        const rentalEntry = {
            kartUniqueId: kart.id,
            display: kart.display, // Changed from kartDisplay to display to match kart object
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

    function saveState() {
        try {
            localStorage.setItem(KART_STATE_KEY, JSON.stringify(karts));
        } catch (e) {
            console.error("Failed to save kart state to localStorage:", e);
        }
    }

    // Initialize the karts object from kartData (original structure)
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

    // Load kart states from localStorage or initialize (original structure)
    function loadState() {
        initializeKartData(false);
        const savedState = localStorage.getItem(KART_STATE_KEY);
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                for (const kartId in karts) {
                    if (parsedState[kartId]) {
                        Object.assign(karts[kartId], parsedState[kartId]);
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

    // --- UI Generation ---
    function createKartButtons() {
        const container = document.getElementById('kart-categories');
        if (!container) {
            console.error("Fatal Error: kart-categories container not found in HTML.");
            return;
        }
        container.innerHTML = '';
        const kartsByCategory = {};

        if (Object.keys(karts).length === 0) {
            console.warn("No karts loaded or initialized. Cannot create kart buttons.");
            // Optionally, display a message to the user in the UI
            // container.innerHTML = "<p>No karts available to display. Please check configuration.</p>";
            return;
        }

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
        console.log("Kart buttons created successfully.");
    }

    // --- Notification Logic ---
    async function requestNotificationPermission() {
        console.log("[requestNotificationPermission] Function called.");
        if (!('Notification' in window)) {
            alert("Acest browser nu suportă notificări desktop.");
            console.log("[requestNotificationPermission] Browser does not support notifications.");
            notificationPermission = "denied";
            return "denied";
        }

        console.log("[requestNotificationPermission] Current Notification.permission state:", Notification.permission);
        if (Notification.permission === 'granted') {
            notificationPermission = 'granted';
            console.log("[requestNotificationPermission] Permission already granted.");
            return "granted";
        }
        if (Notification.permission === 'denied') {
            notificationPermission = 'denied';
            alert("Notificările sunt blocate. Verificați setările browser-ului Dvs. pentru acest site.");
            console.log("[requestNotificationPermission] Permission previously denied.");
            return "denied";
        }

        console.log("[requestNotificationPermission] Requesting permission from user...");
        try {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
            console.log("[requestNotificationPermission] User responded with:", permission);
            if (permission === 'granted') {
                console.log("Permisiune pentru notificări acordată de utilizator.");
                alert("Notificările au fost activate!");
                // ---- TEST NOTIFICATION (Uncomment to test immediately after permission grant) ----
                // if (Notification.permission === "granted") {
                //     console.log("[requestNotificationPermission] Sending a TEST notification.");
                //     try {
                //         new Notification("Notificare de Test!", {
                //             body: "Dacă vezi asta, permisiunile funcționează!",
                //             icon: 'kart-icon.png' // Ensure kart-icon.png is in the root directory
                //         });
                //     } catch (testError) {
                //         console.error("[requestNotificationPermission] Error sending TEST notification:", testError);
                //         alert("Eroare la trimiterea notificării de test: " + testError.message);
                //     }
                // }
                // ---- END TEST NOTIFICATION ----
            } else {
                console.log("Permisiune pentru notificări refuzată de utilizator.");
                alert("Ați refuzat permisiunea pentru notificări.");
            }
            return permission;
        } catch (error) {
            console.error("[requestNotificationPermission] Error requesting notification permission:", error);
            notificationPermission = "denied";
            alert("A apărut o eroare la cererea permisiunii pentru notificări.");
            return "denied";
        }
    }

    function sendTimerNotification(kart) {
        console.log(`[sendTimerNotification] Called for kart: ${kart.display}. Current global notificationPermission: ${notificationPermission}`);
        console.log(`[sendTimerNotification] Verifying Notification.permission directly: ${Notification.permission}`);

        if (notificationPermission !== 'granted' && Notification.permission !== 'granted') {
            console.warn(`[sendTimerNotification] Permission not 'granted' (global: ${notificationPermission}, direct: ${Notification.permission}). Notification for ${kart.display} will NOT be sent.`);
            return;
        }

        const notificationTitle = "Timpul a expirat!";
        const notificationBody = `Kartul "${kart.display}" (${kart.category}) și-a terminat cursa.`;
        const options = {
            body: notificationBody,
            tag: `kart-timer-${kart.id}`,
            renotify: true,
            icon: 'kart-icon.png' // You'll need to provide this image
        };
        console.log("[sendTimerNotification] Notification options:", options);

        try {
            console.log("[sendTimerNotification] Attempting to create new Notification...");
            const notification = new Notification(notificationTitle, options);
            console.log("[sendTimerNotification] Notification object created:", notification);

            if ('vibrate' in navigator) {
                console.log("[sendTimerNotification] Attempting to vibrate...");
                navigator.vibrate([200, 100, 200, 100, 200]);
            }

            notification.onclick = () => {
                console.log("[sendTimerNotification] Notification clicked.");
                window.focus();
            };
            notification.onshow = () => {
                console.log(`[sendTimerNotification] Notification successfully shown for ${kart.display}`);
            };
            notification.onerror = (err) => {
                console.error(`[sendTimerNotification] Error showing notification for ${kart.display}:`, err);
                alert(`Eroare la afișarea notificării pentru ${kart.display}: ${err.message || 'Unknown error'}`);
            };
            console.log("Notificare trimisă (sau încercare de trimitere) pentru kartul: " + kart.display);
        } catch (error) {
            console.error("[sendTimerNotification] Error creating Notification for kart " + kart.display + ":", error);
            alert("Eroare la crearea notificării: " + error.message + "\nVerificați consola pentru detalii.");
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
            actualDurationMinutes = (kart.intendedDuration || 0) + overdueMinutes; // Ensure intendedDuration is a number
            elapsedTimeMessage = `Timp total: ${kart.intendedDuration || 0} min inițial + ${overdueMinutes} min extra. Total: ${actualDurationMinutes} min. Preț: ${priceForLog} lei.`;
        } else if (kart.status === 'pending_return' || (kart.status === 'rented' && kart.rentalEndTime && Date.now() >= kart.rentalEndTime)) {
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

        // Reverted to original test button logic for "basic-karts-fara-numar-1" or similar
        // Assuming the '1' ident from "Basic Karts" is 'basic-karts-1-1' or 'basic-karts-1'
        // The original script used: if (kart.id === 'basic-karts-1')
        // Let's find the kart with ident "1" in "Basic Karts" category
        const targetTestKartId = `basic-karts-1`; // This matches the user's original logic for the test button if ident "1" is directly mapped

        if (kart.id === targetTestKartId) {
            console.log("Adding 30sec test button for kart:", kart.id);
            const testButton30Sec = document.createElement('button');
            testButton30Sec.id = 'popup-30sec-test';
            testButton30Sec.textContent = '30 sec (Test - 1 leu)';
            testButton30Sec.onclick = () => startRental(currentPopupKartId, 0.5, 1); // 0.5 minutes = 30 seconds

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
        console.log(`[openReturnPopup] Opened for kart ${kart.display}`);
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
        if (event.target === rentalPopup) closePopup('rental-popup');
        if (event.target === returnPopup) closePopup('return-popup');
        if (event.target === elapsedTimePopup) closePopup('elapsed-time-popup');
    }

    // --- Rental Logic ---
    async function startRental(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'available') return;
        console.log(`[startRental] Renting kart ${kart.display} for ${durationMinutes} mins, price ${pricePaid}. Current notificationPermission: ${notificationPermission}`);

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
        console.log(`[startRental] Kart ${kart.display} rented. Ends at: ${new Date(kart.rentalEndTime).toLocaleTimeString()}`);
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
            console.log(`[handleReturnConfirmation] Kart ${kart.display} NOT returned. Status: overdue. Overdue timer started.`);
            updateButtonState(kartId);
            saveState();
        }
        closePopup('return-popup');
    }

    function resetKart(kartId, shouldLog = false, loggedDuration, loggedPrice) {
        const kart = karts[kartId];
        if (!kart) return;
        console.log(`[resetKart] Resetting kart ${kart.display}. Log: ${shouldLog}`);
        if (shouldLog) {
            const durationToLog = typeof loggedDuration !== 'undefined' ? loggedDuration : kart.intendedDuration;
            const priceToLog = typeof loggedPrice !== 'undefined' ? loggedPrice : kart.intendedPrice;
            if (durationToLog > 0) {
                logRentalToHistory(kartId, durationToLog, priceToLog);
            } else {
                console.log(`[resetKart] Not logging kart ${kart.display} as duration was 0 or undefined.`);
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
                const remainingTime = kart.rentalEndTime ? kart.rentalEndTime - Date.now() : 0;
                timerDisplay.textContent = `-${formatTime(remainingTime)}`;
                if (priceDisplay) priceDisplay.style.display = 'none';

                if (remainingTime <= 0 && kart.rentalEndTime !== null) {
                    if (kart.status !== 'pending_return') {
                        kart.status = 'pending_return';
                        saveState();
                        console.log(`[updateButtonState] Kart ${kart.display} time EXPIRED. Status: ${kart.status}. Global notifPerm: ${notificationPermission}. Direct Notif.perm: ${Notification.permission}`);

                        if (notificationPermission === 'granted' || Notification.permission === 'granted') {
                            console.log(`[updateButtonState] Attempting to send notification for ${kart.display}`);
                            sendTimerNotification(kart);
                        } else {
                            console.warn(`[updateButtonState] Notification permission not granted for ${kart.display}. Not sending. Global: ${notificationPermission}, Direct: ${Notification.permission}`);
                        }
                        openReturnPopup(kart.id);
                        updateButtonState(kart.id); // Re-render with new status
                    }
                }
                break;
            case 'pending_return':
                button.classList.add('rented');
                timerDisplay.textContent = 'CONFIRM?';
                if (priceDisplay) priceDisplay.style.display = 'none';
                console.log(`[updateButtonState] Kart ${kart.display} is PENDING_RETURN.`);
                break;
            case 'overdue':
                button.classList.add('overdue');
                const overdueTime = kart.stopwatchStartTime ? Date.now() - kart.stopwatchStartTime : 0;
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
                        console.log(`[tick] Kart ${kart.display} rental period ended. Current status: ${kart.status}. Transitioning to pending_return.`);
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

    // --- Buton Activare Notificări ---
    const enableNotificationsBtn = document.getElementById('enableNotificationsButton');
    if (enableNotificationsBtn) {
        if ('Notification' in window) {
            console.log("[Init Button] Initial Notification.permission:", Notification.permission);
            if (Notification.permission === 'granted') {
                enableNotificationsBtn.style.display = 'none';
                notificationPermission = 'granted';
                console.log("Permisiunea pentru notificări este deja acordată la încărcare. Buton ascuns.");
            } else if (Notification.permission === 'denied') {
                enableNotificationsBtn.style.display = 'none';
                notificationPermission = 'denied';
                console.log("Permisiunea pentru notificări este refuzată la încărcare. Buton ascuns.");
            } else { // default
                notificationPermission = 'default';
                enableNotificationsBtn.style.display = 'inline-block';
                console.log("Permisiunea pentru notificări este 'default' la încărcare. Buton vizibil.");
            }
        } else {
            enableNotificationsBtn.style.display = 'none';
            notificationPermission = 'denied';
            console.log("Browser-ul nu suportă notificări, buton ascuns.");
        }

        enableNotificationsBtn.addEventListener('click', async() => {
            console.log("[Button Click] 'Activează Notificări' clicked.");
            const permissionResult = await requestNotificationPermission();
            if (permissionResult !== 'default') {
                enableNotificationsBtn.style.display = 'none';
                console.log(`[Button Click] Notification permission is now '${permissionResult}'. Hiding button.`);
            } else {
                console.log(`[Button Click] Notification permission is still '${permissionResult}'. Button remains visible.`);
            }
        });
    }

    // --- Initialization ---
    try {
        console.log("Document loaded. Initializing app...");
        loadState();
        console.log("loadState completed. Karts object:", karts ? Object.keys(karts).length + " karts" : "undefined/null");
        createKartButtons();
        console.log("createKartButtons completed.");
        setInterval(tick, 1000);
        console.log("App initialized. Number of karts:", karts ? Object.keys(karts).length : "N/A");
        console.log("Global notificationPermission after init and button setup:", notificationPermission);
    } catch (error) {
        console.error("Unhandled error during app initialization:", error);
        // Display a user-friendly message on the page
        const container = document.getElementById('kart-categories') || document.body;
        if (container) {
            const errorMsgElement = document.createElement('p');
            errorMsgElement.textContent = "A apărut o eroare la inițializarea aplicației. Verificați consola pentru detalii.";
            errorMsgElement.style.color = "red";
            errorMsgElement.style.fontWeight = "bold";
            errorMsgElement.style.textAlign = "center";
            errorMsgElement.style.padding = "20px";
            if (container.firstChild) {
                container.insertBefore(errorMsgElement, container.firstChild);
            } else {
                container.appendChild(errorMsgElement);
            }
        }
    }
});

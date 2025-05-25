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
    const KART_STATE_KEY = 'goKartRentalState_v6';
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1';
    let notificationPermission = Notification.permission;

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
            display: kart.display,
            kartCategory: kart.category,
            rentalStartTime: rentalStartTime,
            rentalEndTime: now,
            durationMinutes: durationMinutes,
            pricePaid: pricePaid,
        };
        history.push(rentalEntry);
        saveRentalHistory(history);
        // console.log("Rental logged: ", rentalEntry); // Keep this for your own checks
    }

    function saveState() {
        try {
            localStorage.setItem(KART_STATE_KEY, JSON.stringify(karts));
        } catch (e) {
            console.error("Failed to save kart state to localStorage:", e);
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
                        processedKarts[kartId] = { id: kartId, display: displayName, category: cat.category, price30: cat.price30, price1h: cat.price1h, status: 'available', rentalEndTime: null, stopwatchStartTime: null, actualRentalStartTime: null, intendedDuration: null, intendedPrice: null };
                    }
                } else {
                    const kartId = `${cat.category.replace(/\s+/g, '-').toLowerCase()}-${ident.replace(/\s+/g, '-').toLowerCase()}`;
                    const displayName = ident;
                    processedKarts[kartId] = { id: kartId, display: displayName, category: cat.category, price30: cat.price30, price1h: cat.price1h, status: 'available', rentalEndTime: null, stopwatchStartTime: null, actualRentalStartTime: null, intendedDuration: null, intendedPrice: null };
                }
            });
        });
        karts = processedKarts;
        if (shouldSave) {
            saveState();
        }
    }

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

    const notificationsContainer = document.getElementById('screen-notifications-container');

    function addScreenNotification(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        if (document.getElementById(`notif-${kartId}`)) {
            return;
        }
        const notificationItem = document.createElement('div');
        notificationItem.id = `notif-${kartId}`;
        notificationItem.className = 'screen-notification-item';
        notificationItem.textContent = `Kart ${kart.display}`;
        notificationItem.onclick = () => {
            openReturnPopup(kartId);
        };
        notificationsContainer.appendChild(notificationItem);
    }

    function removeScreenNotification(kartId) {
        const notificationItem = document.getElementById(`notif-${kartId}`);
        if (notificationItem) {
            notificationItem.remove();
        }
    }

    function createKartButtons() {
        const container = document.getElementById('kart-categories');
        if (!container) return;
        container.innerHTML = '';
        const kartsByCategory = {};
        if (Object.keys(karts).length === 0) return;
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

    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert("Acest browser nu suportă notificări desktop.");
            notificationPermission = "denied";
            return "denied";
        }
        if (Notification.permission === 'granted') {
            notificationPermission = 'granted';
            return "granted";
        }
        if (Notification.permission === 'denied') {
            notificationPermission = 'denied';
            alert("Notificările sunt blocate. Verificați setările browser-ului Dvs. pentru acest site.");
            return "denied";
        }
        try {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
            if (permission === 'granted') {
                alert("Notificările au fost activate!");
            } else {
                alert("Ați refuzat permisiunea pentru notificări.");
            }
            return permission;
        } catch (error) {
            notificationPermission = "denied";
            return "denied";
        }
    }

    function sendTimerNotification(kart) {
        if (notificationPermission !== 'granted') return;
        const options = { body: `Kartul "${kart.display}" (${kart.category}) și-a terminat cursa.`, tag: `kart-timer-${kart.id}`, renotify: true, icon: 'kart-icon.png' };
        try {
            new Notification("Timpul a expirat!", options).onclick = () => window.focus();
        } catch (error) { console.error("Error creating Notification:", error); }
    }

    function handleKartClick(kartId) {
        const kart = karts[kartId];
        if (!kart) return;
        switch (kart.status) {
            case 'available':
                openRentalPopup(kartId);
                break;
            case 'attention_needed':
                openReturnPopup(kartId);
                break;
            case 'rented':
                openConfirmResetPopup(kartId);
                break;
            case 'overdue':
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
            elapsedTimeMessage = `Închiriere oprită devreme. Timp utilizat: aprox. ${actualDurationMinutes} min. Preț: ${priceForLog} lei.`;
        } else if (kart.status === 'overdue' && kart.actualRentalStartTime) {
            const baseDurationMs = (kart.intendedDuration || 0) * 60000;
            const stopwatchMs = Date.now() - (kart.stopwatchStartTime || (kart.actualRentalStartTime + baseDurationMs));
            const totalElapsedMs = baseDurationMs + stopwatchMs;
            actualDurationMinutes = Math.max(1, Math.round(totalElapsedMs / 60000));
            const overdueMinutes = Math.round(stopwatchMs / 60000);
            elapsedTimeMessage = `Timp total: ${kart.intendedDuration || 0} min inițial + ${overdueMinutes} min extra. Total: ${actualDurationMinutes} min. Preț: ${priceForLog} lei.`;
        } else if (kart.status === 'attention_needed') {
            actualDurationMinutes = kart.intendedDuration;
            elapsedTimeMessage = `Perioada de închiriere de ${actualDurationMinutes} min a expirat. Preț: ${priceForLog} lei.`;
        }
        openElapsedTimePopup(kartId, elapsedTimeMessage, actualDurationMinutes, priceForLog);
    }

    const rentalPopup = document.getElementById('rental-popup');
    const returnPopup = document.getElementById('return-popup');
    const elapsedTimePopup = document.getElementById('elapsed-time-popup');
    const confirmResetPopup = document.getElementById('confirm-reset-popup');
    let currentPopupKartId = null;

    window.closePopup = function(popupId) {
        const popupElement = document.getElementById(popupId);
        if (popupElement) popupElement.style.display = 'none';
        currentPopupKartId = null;
    }

    // **MODIFIED openRentalPopup with console.logs for debugging**
    function openRentalPopup(kartId) {
        const kart = karts[kartId];
        console.log("[DEBUG] openRentalPopup called for kartId:", kartId);
        if (!kart) {
            console.error("[DEBUG] Kart object not found for ID:", kartId);
            return;
        }
        console.log("[DEBUG] Kart object:", kart);
        currentPopupKartId = kartId;

        const popupContent = rentalPopup.querySelector('.popup-content');
        const existingTestButton = popupContent.querySelector('#popup-30sec-test');
        if (existingTestButton) existingTestButton.remove();

        document.getElementById('popup-kart-id').textContent = `Kart ${kart.display}`;

        const btn30Min = document.getElementById('popup-30min');
        const btn1h = document.getElementById('popup-1h');

        if (!btn30Min || !btn1h) {
            console.error("[DEBUG] 30min or 1h button element not found in HTML!");
            return;
        }
        console.log("[DEBUG] btn30Min element:", btn30Min);
        console.log("[DEBUG] btn1h element:", btn1h);

        const text30Min = `30 min (${kart.price30} lei)`;
        const text1h = `1 oră (${kart.price1h} lei)`;

        console.log("[DEBUG] Text for 30min button:", text30Min);
        console.log("[DEBUG] Text for 1h button:", text1h);

        btn30Min.textContent = text30Min;
        btn1h.textContent = text1h;

        btn30Min.onclick = () => startRental(currentPopupKartId, 30, kart.price30);
        btn1h.onclick = () => startRental(currentPopupKartId, 60, kart.price1h);

        const targetTestKartIds = ['basic-karts-1', 'basic-karts-2'];
        if (targetTestKartIds.includes(kart.id)) {
            const testButton30Sec = document.createElement('button');
            testButton30Sec.id = 'popup-30sec-test';
            testButton30Sec.textContent = '30 sec (Test - 1 leu)';
            testButton30Sec.onclick = () => startRental(currentPopupKartId, 0.5, 1);
            testButton30Sec.style.backgroundColor = '#ffc107';
            testButton30Sec.style.color = '#212529';
            popupContent.insertBefore(testButton30Sec, popupContent.querySelector('.cancel-button'));
        }

        rentalPopup.style.display = 'flex';
        console.log("[DEBUG] Rental popup displayed.");
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

    function openConfirmResetPopup(kartId) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'rented') return;
        currentPopupKartId = kartId;
        document.getElementById('confirm-reset-kart-id').textContent = `Kart ${kart.display}`;
        document.getElementById('confirm-reset-yes').onclick = () => {
            showElapsedTimeAndReset(kartId);
            closePopup('confirm-reset-popup');
        };
        document.getElementById('confirm-reset-cancel').onclick = () => {
            closePopup('confirm-reset-popup');
        };
        confirmResetPopup.style.display = 'flex';
    }

    function openElapsedTimePopup(kartId, message, loggedDuration, loggedPrice) {
        document.getElementById('elapsed-time-message').textContent = message;
        document.getElementById('elapsed-time-ok').onclick = () => {
            resetKart(kartId, true, loggedDuration, loggedPrice);
            closePopup('elapsed-time-popup');
        };
        elapsedTimePopup.style.display = 'flex';
    }

    window.onclick = function(event) {
        if (event.target === rentalPopup) closePopup('rental-popup');
        if (event.target === returnPopup) closePopup('return-popup');
        if (event.target === elapsedTimePopup) closePopup('elapsed-time-popup');
        if (event.target === confirmResetPopup) closePopup('confirm-reset-popup');
    }

    function startRental(kartId, durationMinutes, pricePaid) {
        const kart = karts[kartId];
        if (!kart || kart.status !== 'available') return;
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
        if (!kart) { closePopup('return-popup'); return; }
        removeScreenNotification(kartId);
        if (returned) {
            showElapsedTimeAndReset(kartId);
        } else {
            kart.status = 'overdue';
            kart.stopwatchStartTime = kart.originalRentalEndTime || kart.actualRentalStartTime + (kart.intendedDuration * 60000);
            kart.rentalEndTime = null;
            saveState();
            updateButtonState(kartId);
        }
        closePopup('return-popup');
    }

    function resetKart(kartId, shouldLog = false, loggedDuration, loggedPrice) {
        const kart = karts[kartId];
        if (!kart) return;
        removeScreenNotification(kartId);
        if (shouldLog) {
            const durationToLog = typeof loggedDuration !== 'undefined' ? loggedDuration : kart.intendedDuration;
            const priceToLog = typeof loggedPrice !== 'undefined' ? loggedPrice : kart.intendedPrice;
            if (durationToLog !== null && priceToLog !== null && durationToLog >= 0) {
                logRentalToHistory(kartId, durationToLog, priceToLog);
            }
        }
        kart.status = 'available';
        kart.rentalEndTime = null;
        kart.stopwatchStartTime = null;
        kart.actualRentalStartTime = null;
        kart.intendedDuration = null;
        kart.intendedPrice = null;
        kart.originalRentalEndTime = null;
        updateButtonState(kartId);
        saveState();
    }

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

        button.classList.remove('available', 'rented', 'overdue', 'attention-needed');
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
                break;
            case 'attention_needed':
                button.classList.add('attention-needed');
                timerDisplay.textContent = 'TIMP EXPIRAT';
                if (priceDisplay) priceDisplay.style.display = 'none';
                break;
            case 'overdue':
                button.classList.add('overdue');
                const overdueTime = kart.stopwatchStartTime ? Date.now() - kart.stopwatchStartTime : 0;
                timerDisplay.textContent = `+${formatTime(overdueTime)}`;
                if (priceDisplay) priceDisplay.style.display = 'none';
                break;
        }
    }

    function updateAllButtonStates() {
        Object.keys(karts).forEach(kartId => {
            updateButtonState(kartId);
            if (karts[kartId].status === 'attention_needed') {
                addScreenNotification(kartId);
            }
        });
    }

    function tick() {
        const now = Date.now();
        Object.values(karts).forEach(kart => {
            if (kart.status === 'rented' && kart.rentalEndTime && now >= kart.rentalEndTime) {
                kart.status = 'attention_needed';
                kart.originalRentalEndTime = kart.rentalEndTime;
                sendTimerNotification(kart);
                saveState();
                updateButtonState(kart.id);
                addScreenNotification(kart.id);
            }
            if (kart.status === 'rented' || kart.status === 'overdue') {
                updateButtonState(kart.id);
            }
        });
    }

    const viewHistoryBtn = document.getElementById('viewHistoryButton');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => { window.location.href = 'history.html'; });
    }
    const enableNotificationsBtn = document.getElementById('enableNotificationsButton');
    if (enableNotificationsBtn) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') enableNotificationsBtn.style.display = 'none';
            else if (Notification.permission === 'denied') enableNotificationsBtn.style.display = 'none';
            else enableNotificationsBtn.style.display = 'inline-block';
        } else {
            enableNotificationsBtn.style.display = 'none';
        }
        enableNotificationsBtn.addEventListener('click', async() => {
            const permissionResult = await requestNotificationPermission();
            if (permissionResult !== 'default') enableNotificationsBtn.style.display = 'none';
        });
    }

    try {
        loadState();
        createKartButtons();
        setInterval(tick, 1000);
    } catch (error) {
        console.error("Unhandled error during app initialization:", error);
    }
});

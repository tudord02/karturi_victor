// history_script.js

document.addEventListener('DOMContentLoaded', () => {
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1'; 

    function getRentalHistory() {
        const historyJson = localStorage.getItem(RENTAL_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    }

    function formatDateTime(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function calculateStatistics(history, daysAgo) {
        const stats = {}; 
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - daysAgo); 
        cutoffDate.setHours(0, 0, 0, 0); 

        history.forEach(rental => {
            const rentalDate = new Date(rental.rentalEndTime); 
            if (rentalDate >= cutoffDate) {
                stats[rental.kartCategory] = (stats[rental.kartCategory] || 0) + 1;
            }
        });
        return stats;
    }

    function displayStatistics(elementId, statsData) {
        const ulElement = document.getElementById(elementId);
        if (!ulElement) return;

        ulElement.innerHTML = ''; 

        if (Object.keys(statsData).length === 0) {
            ulElement.innerHTML = '<li>Nicio închiriere în această perioadă.</li>';
            return;
        }

        const sortedCategories = Object.entries(statsData).sort(([, a], [, b]) => b - a);

        for (const [category, count] of sortedCategories) {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-name';
            nameSpan.textContent = `${category}: `;

            const countSpan = document.createElement('span');
            countSpan.className = 'usage-count';
            countSpan.textContent = `${count} închirieri`;

            li.appendChild(nameSpan);
            li.appendChild(countSpan);
            ulElement.appendChild(li);
        }
    }

    function displayDetailedLog(history) {
        const ulElement = document.getElementById('detailed-history-log');
        if (!ulElement) return;

        ulElement.innerHTML = ''; 

        if (history.length === 0) {
            ulElement.innerHTML = '<li>Niciun istoric de închirieri găsit.</li>';
            return;
        }

        const recentHistory = history.slice().reverse().slice(0, 50); 

        recentHistory.forEach(rental => {
            const li = document.createElement('li');

            const detailsSpan = document.createElement('span');
            detailsSpan.className = 'log-details';
            detailsSpan.textContent = `Kart: ${rental.kartDisplay} (${rental.kartCategory}) - ${rental.durationMinutes}min, ${rental.pricePaid} lei. `;

            const timeSpan = document.createElement('span');
            timeSpan.className = 'log-timestamp';
            timeSpan.textContent = `Finalizat: ${formatDateTime(rental.rentalEndTime)}`;

            li.appendChild(detailsSpan);
            li.appendChild(timeSpan);
            ulElement.appendChild(li);
        });
    }

    function loadAndDisplayAllHistory() {
        const rentalHistory = getRentalHistory();

        const statsWeek = calculateStatistics(rentalHistory, 7);
        displayStatistics('stats-last-week', statsWeek);

        const statsMonth = calculateStatistics(rentalHistory, 30);
        displayStatistics('stats-last-month', statsMonth);

        const statsYear = calculateStatistics(rentalHistory, 365);
        displayStatistics('stats-last-year', statsYear);

        displayDetailedLog(rentalHistory);
        console.log("Rental history loaded/reloaded and displayed on history page.");
    }

    const deleteButtonPage = document.getElementById('deleteHistoryButtonPage');
    const deletePopupPage = document.getElementById('delete-history-page-popup');
    const yesButtonPage = document.getElementById('delete-history-page-yes');
    const noButtonPage = document.getElementById('delete-history-page-no');

    if (deleteButtonPage && deletePopupPage) {
        deleteButtonPage.addEventListener('click', () => {
            deletePopupPage.style.display = 'flex';
        });
    }

    if (yesButtonPage && deletePopupPage) {
        yesButtonPage.addEventListener('click', () => {
            localStorage.removeItem(RENTAL_HISTORY_KEY); 
            alert("Istoricul închirierilor a fost șters."); 
            deletePopupPage.style.display = 'none'; 
            loadAndDisplayAllHistory(); 
        });
    }

    if (noButtonPage && deletePopupPage) {
        noButtonPage.addEventListener('click', () => {
            deletePopupPage.style.display = 'none'; 
        });
    }
    
    window.addEventListener('click', function(event) {
        if (deletePopupPage && event.target == deletePopupPage) {
            deletePopupPage.style.display = 'none';
        }
    });

    loadAndDisplayAllHistory(); 
});

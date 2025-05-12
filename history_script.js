document.addEventListener('DOMContentLoaded', () => {
    const RENTAL_HISTORY_KEY = 'goKartRentalHistory_v1'; // Must match the key in script.js

    // Function to load rental history from localStorage
    function getRentalHistory() {
        const historyJson = localStorage.getItem(RENTAL_HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    }

    // Function to format timestamp to a readable date/time string
    function formatDateTime(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' });
    }

    // Function to calculate statistics
    function calculateStatistics(history, daysAgo) {
        const stats = {}; // { categoryName: count }
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - daysAgo);
        cutoffDate.setHours(0, 0, 0, 0); // Start of the day

        history.forEach(rental => {
            const rentalDate = new Date(rental.rentalEndTime); // Use rentalEndTime for when it was completed
            if (rentalDate >= cutoffDate) {
                stats[rental.kartCategory] = (stats[rental.kartCategory] || 0) + 1;
            }
        });
        return stats;
    }

    // Function to display statistics
    function displayStatistics(elementId, statsData) {
        const ulElement = document.getElementById(elementId);
        if (!ulElement) return;

        ulElement.innerHTML = ''; // Clear loading message

        if (Object.keys(statsData).length === 0) {
            ulElement.innerHTML = '<li>Nicio închiriere în această perioadă.</li>';
            return;
        }

        // Sort categories by usage count (descending)
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

    // Function to display detailed log
    function displayDetailedLog(history) {
        const ulElement = document.getElementById('detailed-history-log');
        if (!ulElement) return;

        ulElement.innerHTML = ''; // Clear loading message

        if (history.length === 0) {
            ulElement.innerHTML = '<li>Niciun istoric de închirieri găsit.</li>';
            return;
        }

        // Display latest (e.g., 50) rentals, sorted by most recent first
        const recentHistory = history.slice().reverse().slice(0, 50); // Get last 50, reversed

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

    // --- Main execution ---
    const rentalHistory = getRentalHistory();

    // Calculate and display stats
    const statsWeek = calculateStatistics(rentalHistory, 7);
    displayStatistics('stats-last-week', statsWeek);

    const statsMonth = calculateStatistics(rentalHistory, 30);
    displayStatistics('stats-last-month', statsMonth);

    const statsYear = calculateStatistics(rentalHistory, 365);
    displayStatistics('stats-last-year', statsYear);

    // Display detailed log
    displayDetailedLog(rentalHistory);

    console.log("Rental history loaded and displayed:", rentalHistory);
});

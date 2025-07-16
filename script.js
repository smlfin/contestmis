document.addEventListener('DOMContentLoaded', () => {
    // **REPLACE THIS URL** with the "Publish to web" CSV link you copied.
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQib5xPHilSGhwL-6Wib6ZS2VsTR5ehFZ6EmEhKOHP7l1TaXlVdKKzOeLqlLrutqIscwRKqvF6zdko_/pub?gid=1429991894&single=true&output=csv';

    const tableBody = document.querySelector('#misTable tbody');
    const loadingSpinner = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('error-message');

    // Define the indices of the columns you want to KEEP for HTML table display (0-indexed)
    const COLUMNS_TO_KEEP_FOR_DISPLAY_INDICES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 14, 17, 18];
    const EXPECTED_HTML_COLUMN_COUNT = COLUMNS_TO_KEEP_FOR_DISPLAY_INDICES.length; // This is 13

    async function fetchDataAndDisplayTable() {
        loadingSpinner.style.display = 'block'; // Show spinner
        errorMessageDiv.style.display = 'none'; // Hide any previous error

        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
            }
            const csvText = await response.text();

            // --- IMPROVED CSV PARSING LOGIC ---
            const rows = csvText.split(/\r?\n/)
                .filter(line => line.trim() !== '')
                .map(line => {
                    const cells = [];
                    let match;
                    const regex = /(?:^|,)(?:"([^"]*)"|([^,"]*))/g;

                    let lastIndex = 0;
                    while ((match = regex.exec(line)) !== null) {
                        cells.push((match[1] !== undefined ? match[1] : match[2] || '').trim());
                        lastIndex = regex.lastIndex;
                    }
                    if (lastIndex < line.length && line.charAt(lastIndex - 1) === ',') {
                        cells.push('');
                    }
                    return cells;
                });

            if (rows.length > 0) {
                const dataRows = rows.slice(1); // Skip the first row (headers from CSV)

                dataRows.forEach(row => {
                    if (row.every(cell => cell === '')) return;

                    const tr = document.createElement('tr');
                    const selectedCellsForDisplay = [];

                    COLUMNS_TO_KEEP_FOR_DISPLAY_INDICES.forEach(colIndex => {
                        selectedCellsForDisplay.push(row[colIndex] !== undefined ? row[colIndex] : '');
                    });

                    const paddedRow = [...selectedCellsForDisplay];
                    while (paddedRow.length < EXPECTED_HTML_COLUMN_COUNT) {
                        paddedRow.push('');
                    }

                    paddedRow.forEach(cellData => {
                        const td = document.createElement('td');
                        td.textContent = cellData;
                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });

            } else {
                displayError('No data found in the published CSV or parsing failed.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            displayError(`Failed to load data. Please check your published CSV URL and ensure your sheet is publicly accessible. Error: ${error.message}`);
        } finally {
            loadingSpinner.style.display = 'none'; // Hide spinner
        }
    }

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    fetchDataAndDisplayTable(); // Initial fetch on page load for the table
});
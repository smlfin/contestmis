document.addEventListener('DOMContentLoaded', () => {
    // **REPLACE THIS URL** with the "Publish to web" CSV link you copied.
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQib5xPHilSGhwL-6Wib6ZS2VsTR5ehFZ6EmEhKOHP7l1TaXlVdKKzOeLqlLrutqIscwRKqvF6zdko_/pub?gid=1429991894&single=true&output=csv';

    const loadingSpinner = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('error-message');
    const companySelect = document.getElementById('companySelect');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportCompanyName = document.getElementById('reportCompanyName');
    const reportNetGrowth = document.getElementById('reportNetGrowth');
    const reportStaffCount = document.getElementById('reportStaffCount');
    const reportAchievedCount = document.getElementById('reportAchievedCount');

    // Define original CSV column indices for data needed in reports (0-indexed)
    const ORIGINAL_INDEX_COMPANY_NAME = 1;
    const ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET = 6; // Foreign trip contest Target
    const ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET = 7; // Foreign trip fresh customer target (The 'hurdle')
    const ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET = 8; // Domestic Trip contest target
    const ORIGINAL_INDEX_CONTEST_TOTAL_NET = 17;
    const ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL = 11;
    const ORIGINAL_INDEX_NET_GROWTH_JULY = 14;

    let allParsedData = []; // Store all data for reporting on this page

    async function fetchDataForReport() {
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
                allParsedData = rows.slice(1); // Store all data rows (skipping CSV header)
                const uniqueCompanies = new Set();

                allParsedData.forEach(row => {
                    const companyName = row[ORIGINAL_INDEX_COMPANY_NAME];
                    if (companyName) {
                        uniqueCompanies.add(companyName);
                    }
                });

                // Populate company select dropdown
                companySelect.innerHTML = '<option value="">-- Select Company --</option>'; // Clear existing options
                Array.from(uniqueCompanies).sort().forEach(company => { // Sort for better UX
                    const option = document.createElement('option');
                    option.value = company;
                    option.textContent = company;
                    companySelect.appendChild(option);
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

    function generateCompanyReport() {
        const selectedCompany = companySelect.value;

        if (!selectedCompany) {
            reportCompanyName.textContent = "No company selected.";
            reportNetGrowth.textContent = "N/A";
            reportStaffCount.textContent = "N/A";
            reportAchievedCount.textContent = "N/A";
            return;
        }

        const companyData = allParsedData.filter(row => row[ORIGINAL_INDEX_COMPANY_NAME] === selectedCompany);

        let totalNetGrowth = 0;
        let staffCount = companyData.length;
        let achievedTargetCount = 0;

        companyData.forEach(staffRow => {
            // --- Parse values for calculations, handling empty/invalid as 0 ---
            const netGrowth = parseFloat(staffRow[ORIGINAL_INDEX_NET_GROWTH_JULY].replace(/,/g, '')) || 0;
            const foreignTripContestTarget = parseFloat(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET].replace(/,/g, '')) || 0;
            const domesticTripContestTarget = parseFloat(staffRow[ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET].replace(/,/g, '')) || 0;
            const foreignTripFreshCustomerTarget = parseFloat(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET].replace(/,/g, '')) || 0; // The 'hurdle'
            const contestTotalNet = parseFloat(staffRow[ORIGINAL_INDEX_CONTEST_TOTAL_NET].replace(/,/g, '')) || 0;
            const freshCustomerAchTotal = parseFloat(staffRow[ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL].replace(/,/g, '')) || 0;

            totalNetGrowth += netGrowth;

            // --- Achieved Target Logic ---
            let metPrimaryContestTarget = false;
            let metHurdle = false;

            // Check if they met the Foreign Trip Contest Target (if applicable)
            if (foreignTripContestTarget > 0 && contestTotalNet > foreignTripContestTarget) {
                metPrimaryContestTarget = true;
            }

            // Check if they met the Domestic Trip Contest Target (if applicable)
            // If domestic target exists and is met, it also counts as metPrimaryContestTarget
            // This assumes a staff member needs to meet *at least one* of these if applicable
            if (domesticTripContestTarget > 0 && contestTotalNet > domesticTripContestTarget) {
                metPrimaryContestTarget = true;
            }

            // Check the 'Hurdle' (Foreign trip fresh customer target)
            if (freshCustomerAchTotal > foreignTripFreshCustomerTarget) {
                metHurdle = true;
            }

            // A staff member achieved their target if they met AT LEAST ONE primary contest target AND the hurdle
            if (metPrimaryContestTarget && metHurdle) {
                achievedTargetCount++;
            }
        });

        reportCompanyName.textContent = `Report for: ${selectedCompany}`;
        reportNetGrowth.textContent = totalNetGrowth.toLocaleString();
        reportStaffCount.textContent = staffCount;
        reportAchievedCount.textContent = achievedTargetCount;
    }

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    // Event Listener for Generate Report button
    generateReportBtn.addEventListener('click', generateCompanyReport);

    fetchDataForReport(); // Initial fetch on page load for the report page
});
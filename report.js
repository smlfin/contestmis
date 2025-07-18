document.addEventListener('DOMContentLoaded', () => {
    // **REPLACE THIS URL** with the "Publish to web" CSV link you copied.
    const CSV_URL = '1https://docs.google.com/spreadsheets/d/e/2PACX-1vQib5xPHilSGhwL-6Wib6ZS2VsTR5ehFZ6EmEhKOHP7l1TaXlVdKKzOeLqlLrutqIscwRKqvF6zdko_/pub?gid=1429991894&single=true&output=csv';

    const loadingSpinner = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('error-message');
    const monthSelect = document.getElementById('monthSelect'); // New month select element
    const companySelect = document.getElementById('companySelect');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportCompanyName = document.getElementById('reportCompanyName');
    const reportNetGrowth = document.getElementById('reportNetGrowth');
    const reportStaffCount = document.getElementById('reportStaffCount');
    // New elements for winners
    const foreignTripWinnersElement = document.getElementById('foreignTripWinners');
    const domesticTripWinnersElement = document.getElementById('domesticTripWinners');


    // Define original CSV column indices for data needed in reports (0-indexed)
    const ORIGINAL_INDEX_COMPANY_NAME = 1;
    const ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET = 6;
    const ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET = 7;
    const ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET = 8;
    const ORIGINAL_INDEX_CONTEST_TOTAL_NET = 17;
    const ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL = 11;
    const ORIGINAL_INDEX_NET_GROWTH_JULY = 14;

    let allParsedData = []; // Store all data (full rows) for reporting

    async function fetchDataAndSetupUI() {
        loadingSpinner.style.display = 'block';
        errorMessageDiv.style.display = 'none';

        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
            }
            const csvText = await response.text();

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
                allParsedData = rows.slice(1);
                const uniqueCompanies = new Set();

                allParsedData.forEach(row => {
                    const companyName = row[ORIGINAL_INDEX_COMPANY_NAME];
                    if (companyName) {
                        uniqueCompanies.add(companyName);
                    }
                });

                companySelect.innerHTML = '<option value="">-- Select Company --</option>';
                Array.from(uniqueCompanies).sort().forEach(company => {
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
            loadingSpinner.style.display = 'none';
        }
    }

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }

    function generateCompanyReport() {
        const selectedCompany = companySelect.value;
        const selectedMonth = monthSelect.value; // Get selected month (for future use)

        if (!selectedCompany) {
            reportCompanyName.textContent = "No company selected.";
            reportNetGrowth.textContent = "N/A";
            reportStaffCount.textContent = "N/A";
            foreignTripWinnersElement.textContent = "N/A";
            domesticTripWinnersElement.textContent = "N/A";
            return;
        }

        const companyData = allParsedData.filter(row => row[ORIGINAL_INDEX_COMPANY_NAME] === selectedCompany);

        let totalNetGrowth = 0;
        let staffCount = companyData.length;
        let foreignTripWinnersCount = 0; // New counter
        let domesticTripWinnersCount = 0; // New counter

        companyData.forEach(staffRow => {
            const parseValue = (value) => {
                const cleanedValue = String(value).replace(/,/g, '').trim();
                const parsedNum = parseFloat(cleanedValue);
                return isNaN(parsedNum) ? 0 : parsedNum;
            };

            const netGrowth = parseValue(staffRow[ORIGINAL_INDEX_NET_GROWTH_JULY]);
            const foreignTripContestTarget = parseValue(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET]);
            const domesticTripContestTarget = parseValue(staffRow[ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET]);
            const foreignTripFreshCustomerTarget = parseValue(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET]);
            const contestTotalNet = parseValue(staffRow[ORIGINAL_INDEX_CONTEST_TOTAL_NET]);
            const freshCustomerAchTotal = parseValue(staffRow[ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL]);

            totalNetGrowth += netGrowth;

            // Determine Foreign Trip Winners
            const isForeignTripWinner = (
                foreignTripContestTarget > 0 && contestTotalNet >= foreignTripContestTarget &&
                freshCustomerAchTotal >= foreignTripFreshCustomerTarget
            );
            if (isForeignTripWinner) {
                foreignTripWinnersCount++;
            }

            // Determine Domestic Trip Winners
            const isDomesticTripWinner = (
                domesticTripContestTarget > 0 && contestTotalNet >= domesticTripContestTarget &&
                freshCustomerAchTotal >= foreignTripFreshCustomerTarget
            );
            if (isDomesticTripWinner) {
                domesticTripWinnersCount++;
            }
        });

        reportCompanyName.textContent = `Report for: ${selectedCompany} (Data for ${monthSelect.options[monthSelect.selectedIndex].text})`;
        reportNetGrowth.textContent = totalNetGrowth.toLocaleString();
        reportStaffCount.textContent = staffCount;
        foreignTripWinnersElement.textContent = foreignTripWinnersCount; // Display foreign winners
        domesticTripWinnersElement.textContent = domesticTripWinnersCount; // Display domestic winners
    }

    // Event Listeners
    monthSelect.addEventListener('change', generateCompanyReport);
    generateReportBtn.addEventListener('click', generateCompanyReport);
    companySelect.addEventListener('change', generateCompanyReport);

    fetchDataAndSetupUI();
});

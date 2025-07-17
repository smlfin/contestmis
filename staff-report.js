document.addEventListener('DOMContentLoaded', () => {
    // **REPLACE THIS URL** with the "Publish to web" CSV link you copied.
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQib5xPHilSGhwL-6Wib6ZS2VsTR5ehFZ6EmEhKOHP7l1TaXlVdKKzOeLqlLrutqIscwRKqvF6zdko_/pub?gid=1429991894&single=true&output=csv';

    const loadingSpinner = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('error-message');
    const monthSelect = document.getElementById('monthSelect'); // New month select element
    const companySelect = document.getElementById('companySelect');
    const staffSearchInput = document.getElementById('staffSearch');
    const staffSuggestionsDiv = document.getElementById('staffSuggestions');
    const reportStaffName = document.getElementById('reportStaffName');
    const reportOutstanding = document.getElementById('reportOutstanding');

    // Table detail elements
    const foreignTripContestTarget = document.getElementById('foreignTripContestTarget');
    const foreignTripContestAchievement = document.getElementById('foreignTripContestAchievement');
    const foreignTripContestShortfall = document.getElementById('foreignTripContestShortfall');

    const domesticTripContestTarget = document.getElementById('domesticTripContestTarget');
    const domesticTripContestAchievement = document.getElementById('domesticTripContestAchievement');
    const domesticTripContestShortfall = document.getElementById('domesticTripContestShortfall');

    const freshCustomerTarget = document.getElementById('freshCustomerTarget');
    const freshCustomerAchievement = document.getElementById('freshCustomerAchievement');
    const freshCustomerShortfall = document.getElementById('freshCustomerShortfall');

    // Define original CSV column indices for data needed in reports (0-indexed)
    const ORIGINAL_INDEX_COMPANY_NAME = 1;
    const ORIGINAL_INDEX_STAFF_NAME = 3;
    const ORIGINAL_INDEX_OS_AS_ON = 5; // Out standing
    const ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET = 6;
    const ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET = 7; // Fresh customer Target
    const ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET = 8;
    const ORIGINAL_INDEX_CONTEST_TOTAL_NET = 17; // Achievement for contest targets
    const ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL = 11; // Achievement for fresh customer target (Column L)

    let allParsedData = []; // Stores all data rows from CSV

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

    function clearReport() {
        reportStaffName.textContent = "No staff selected.";
        reportOutstanding.textContent = "Out standing: N/A";
        [foreignTripContestTarget, foreignTripContestAchievement, foreignTripContestShortfall,
         domesticTripContestTarget, domesticTripContestAchievement, domesticTripContestShortfall,
         freshCustomerTarget, freshCustomerAchievement, freshCustomerShortfall
        ].forEach(el => el.textContent = 'N/A');
    }

    // --- Autocomplete Logic ---
    companySelect.addEventListener('change', () => {
        staffSearchInput.value = '';
        staffSuggestionsDiv.style.display = 'none';
        clearReport();
    });

    staffSearchInput.addEventListener('input', () => {
        const query = staffSearchInput.value.toLowerCase();
        const selectedCompany = companySelect.value;
        staffSuggestionsDiv.innerHTML = '';

        if (query.length < 1 || !selectedCompany) {
            staffSuggestionsDiv.style.display = 'none';
            return;
        }

        const filteredStaff = allParsedData.filter(row => {
            const companyMatch = row[ORIGINAL_INDEX_COMPANY_NAME] === selectedCompany;
            const staffName = (row[ORIGINAL_INDEX_STAFF_NAME] || '').toLowerCase();
            return companyMatch && staffName.includes(query);
        });

        if (filteredStaff.length > 0) {
            filteredStaff.slice(0, 10).forEach(staffRow => {
                const staffName = staffRow[ORIGINAL_INDEX_STAFF_NAME];
                const div = document.createElement('div');
                div.textContent = staffName;
                div.addEventListener('click', () => {
                    staffSearchInput.value = staffName;
                    staffSuggestionsDiv.style.display = 'none';
                    generateStaffReport(staffRow);
                });
                staffSuggestionsDiv.appendChild(div);
            });
            staffSuggestionsDiv.style.display = 'block';
        } else {
            staffSuggestionsDiv.style.display = 'none';
        }
    });

    document.addEventListener('click', (event) => {
        if (!staffSearchInput.contains(event.target) && !staffSuggestionsDiv.contains(event.target)) {
            staffSuggestionsDiv.style.display = 'none';
        }
    });

    // --- Report Generation Logic ---
    function generateStaffReport(staffRow) {
        const selectedMonthText = monthSelect.options[monthSelect.selectedIndex].text;
        reportStaffName.textContent = `Report for: ${staffRow[ORIGINAL_INDEX_STAFF_NAME]} (${staffRow[ORIGINAL_INDEX_COMPANY_NAME]}) - Data for ${selectedMonthText}`;

        // Removed temporary console logs from parseValue, assuming they've served their purpose
        const parseValue = (value) => {
            const cleanedValue = String(value).replace(/,/g, '').trim();
            const parsedNum = parseFloat(cleanedValue);
            return isNaN(parsedNum) ? 0 : parsedNum;
        };

        const osAsOn = parseValue(staffRow[ORIGINAL_INDEX_OS_AS_ON]);
        const foreignTripContestTargetVal = parseValue(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_CONTEST_TARGET]);
        const domesticTripContestTargetVal = parseValue(staffRow[ORIGINAL_INDEX_DOMESTIC_TRIP_CONTEST_TARGET]);
        const foreignTripFreshCustomerTargetVal = parseValue(staffRow[ORIGINAL_INDEX_FOREIGN_TRIP_FRESH_CUSTOMER_TARGET]);
        const contestTotalNetAch = parseValue(staffRow[ORIGINAL_INDEX_CONTEST_TOTAL_NET]);
        const freshCustomerAchTotal = parseValue(staffRow[ORIGINAL_INDEX_FRESH_CUSTOMER_ACH_TOTAL]);

        reportOutstanding.textContent = `Out standing: ${osAsOn.toLocaleString()}`;

        foreignTripContestTarget.textContent = foreignTripContestTargetVal.toLocaleString();
        foreignTripContestAchievement.textContent = contestTotalNetAch.toLocaleString();
        // CORRECTED TYPO HERE: foreignTripContestTargetTargetVal -> foreignTripContestTargetVal
        const ftcShortfall = foreignTripContestTargetVal - contestTotalNetAch;
        foreignTripContestShortfall.textContent = ftcShortfall > 0 ? ftcShortfall.toLocaleString() : 'Met/Exceeded';

        domesticTripContestTarget.textContent = domesticTripContestTargetVal > 0 ? domesticTripContestTargetVal.toLocaleString() : 'Not Applicable';
        domesticTripContestAchievement.textContent = domesticTripContestTargetVal > 0 ? contestTotalNetAch.toLocaleString() : 'N/A';
        const dtcShortfall = domesticTripContestTargetVal - contestTotalNetAch;
        domesticTripContestShortfall.textContent = domesticTripContestTargetVal > 0 ? (dtcShortfall > 0 ? dtcShortfall.toLocaleString() : 'Met/Exceeded') : 'N/A';

        freshCustomerTarget.textContent = foreignTripFreshCustomerTargetVal.toLocaleString();
        freshCustomerAchievement.textContent = freshCustomerAchTotal.toLocaleString();
        const fctShortfall = foreignTripFreshCustomerTargetVal - freshCustomerAchTotal;
        freshCustomerShortfall.textContent = fctShortfall > 0 ? fctShortfall.toLocaleString() : 'Met/Exceeded';
    }

    monthSelect.addEventListener('change', () => {
        const selectedStaffName = staffSearchInput.value;
        const selectedCompany = companySelect.value;
        if (selectedStaffName && selectedCompany) {
            const staffRow = allParsedData.find(row =>
                row[ORIGINAL_INDEX_STAFF_NAME] === selectedStaffName &&
                row[ORIGINAL_INDEX_COMPANY_NAME] === selectedCompany
            );
            if (staffRow) {
                generateStaffReport(staffRow);
            }
        }
    });

    fetchDataAndSetupUI();
});

// ---------------------------------------------------------------------------------------------------
// Constants (بر اساس اسکرین‌شات و مفروضات رایج)
const MAX_TRADES_TO_DISPLAY_MAIN = 1;
const MAX_TRADES_TO_DISPLAY_BOTTOM = 10;
const ANIMATION_DURATION = 500;

const orderOptions = {
    Buy: [
        { value: '', text: 'انتخاب کنید' },
        { value: 'BUY|market', text: 'خرید | مارکت' },
        { value: 'BUY|limit', text: 'خرید | لیمیت' },
        { value: 'BUY|stop', text: 'خرید | استاپ' },
    ],
    Sell: [
        { value: '', text: 'انتخاب کنید' },
        { value: 'SELL|market', text: 'فروش | مارکت' },
        { value: 'SELL|limit', text: 'فروش | لیمیت' },
        { value: 'SELL|stop', text: 'فروش | استاپ' },
    ]
};

// API Fetch Functions
async function fetchMasterDataFromApi() {
    try {
        const response = await fetch('/api/masterdata');
        if (!response.ok) {
            console.error("HTTP error fetching master data:", response.status);
            return { symbols: [], brokers: [], strategies: [] };
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for master data:", contentType);
            return { symbols: [], brokers: [], strategies: [] };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching master data for script.js:", error);
        return { symbols: [], brokers: [], strategies: [] };
    }
}

async function fetchTradesFromApi() {
    console.log("Fetching trades from API...");
    try {
        const response = await fetch('/api/trades');
        if (!response.ok) {
            console.error("HTTP error fetching trades:", response.status);
            return [];
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for trades:", contentType);
            return [];
        }
        const trades = await response.json();
        console.log("Trades fetched successfully:", trades);
        return trades;
    } catch (error) {
        console.error("Error fetching trades:", error);
        return [];
    }
}

async function saveTradeToApi(tradeData) {
    console.log("Saving trade to API:", tradeData);
    try {
        // Determine method: POST for new, PUT for update
        const method = tradeData.id ? 'PUT' : 'POST';
        const url = tradeData.id ? `/api/trades/${tradeData.id}` : '/api/trades';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tradeData)
        });
        if (!response.ok) {
            console.error(`HTTP error ${method}ing trade:`, response.status);
            const errorBody = await response.text();
            console.error("Error details:", errorBody);
            alert('خطا در ذخیره‌سازی ترید.');
            return false;
        }
        const result = await response.json();
        console.log("Trade saved successfully via API:", result);
        return true;
    } catch (error) {
        console.error("Error saving trade:", error);
        alert('خطا در ارتباط با سرور برای ذخیره‌سازی ترید.');
        return false;
    }
}

async function deleteTradeFromApi(tradeId) {
    console.log("Deleting trade from API with ID:", tradeId);
    try {
        const response = await fetch(`/api/trades/${tradeId}`, { method: 'DELETE' });
        if (!response.ok) {
            console.error("HTTP error deleting trade:", response.status);
            const errorBody = await response.text();
            console.error("Error details:", errorBody);
            if (response.status === 404) {
                console.warn(`Trade with ID ${tradeId} not found on server for deletion.`);
                return true; // Consider it "deleted" if not found on server
            }
            alert('خطا در حذف ترید.');
            return false;
        }
        console.log("Trade deleted successfully via API:", tradeId);
        return true;
    } catch (error) {
        console.error("Error deleting trade:", error);
        alert('خطا در ارتباط با سرور برای حذف ترید.');
        return false;
    }
}

// Helper Functions
// This function now fetches a single trade by ID, which is more efficient.
async function findTradeById(tradeId) {
    console.log("Finding trade by ID:", tradeId);
    try {
        const response = await fetch(`/api/trades/${tradeId}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Trade with ID ${tradeId} not found.`);
                return null;
            }
            console.error(`HTTP error fetching trade with ID ${tradeId}:`, response.status);
            return null;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for single trade:", contentType);
            return null;
        }
        const trade = await response.json();
        console.log("Trade found by ID:", trade);
        return trade;
    } catch (error) {
        console.error(`Error fetching trade with ID ${tradeId}:`, error);
        return null;
    }
}


// Populate Selects
async function populateSymbolSelect() {
    console.log("populateSymbolSelect called.");
    const symbolSelectElement = document.getElementById('symbol');
    if (!symbolSelectElement) { console.error("symbolSelect element not found."); return; }
    const masterData = await fetchMasterDataFromApi();
    symbolSelectElement.innerHTML = '<option value="">انتخاب کنید</option>';
    if (masterData.symbols && masterData.symbols.length > 0) {
        masterData.symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol.name;
            option.textContent = symbol.name;
            symbolSelectElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'نمادی ثبت نشده است.';
        symbolSelectElement.appendChild(option);
    }
    console.log("populateSymbolSelect finished.");
}

async function populateBrokerSelect() {
    console.log("populateBrokerSelect called.");
    const brokerSelectElement = document.getElementById('broker');
    if (!brokerSelectElement) { console.error("brokerSelect element not found."); return; }
    const masterData = await fetchMasterDataFromApi();
    brokerSelectElement.innerHTML = '<option value="">انتخاب کنید</option>';
    if (masterData.brokers && masterData.brokers.length > 0) {
        masterData.brokers.forEach(broker => {
            const option = document.createElement('option');
            option.value = broker.name;
            option.textContent = broker.name;
            option.dataset.brokerId = broker.id; // Store broker ID for later use if needed
            brokerSelectElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'بروکری ثبت نشده است.';
        brokerSelectElement.appendChild(option);
    }
    console.log("populateBrokerSelect finished.");
}

async function populateStrategySelect() {
    console.log("populateStrategySelect called.");
    const strategySelectElement = document.getElementById('strategy');
    if (!strategySelectElement) { console.error("strategySelect element not found."); return; }
    const masterData = await fetchMasterDataFromApi();
    strategySelectElement.innerHTML = '<option value="">انتخاب کنید</option>';
    if (masterData.strategies && masterData.strategies.length > 0) {
        masterData.strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.name;
            option.textContent = strategy.name;
            option.dataset.strategyId = strategy.id; // Store strategy ID for later use if needed
            strategySelectElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'استراتژی ثبت نشده است.';
        strategySelectElement.appendChild(option);
    }
    console.log("populateStrategySelect finished.");
}

async function updateAccountOptions() {
    console.log("updateAccountOptions called.");
    const accountNumberSelectElement = document.getElementById('accountNumber');
    const brokerSelectElement = document.getElementById('broker');
    if (!accountNumberSelectElement || !brokerSelectElement) {
        console.error("accountNumberSelect or brokerSelect element not found.");
        return;
    }
    accountNumberSelectElement.innerHTML = ''; // Clear existing options
    const selectedBrokerName = brokerSelectElement.value;
    console.log("Selected Broker Name for Accounts:", selectedBrokerName);

    if (!selectedBrokerName) {
        accountNumberSelectElement.innerHTML = '<option value="">ابتدا بروکر را انتخاب کنید</option>';
        console.log("No broker selected.");
        return;
    }

    const masterData = await fetchMasterDataFromApi();
    const selectedBroker = masterData.brokers.find(b => b.name === selectedBrokerName);

    console.log("Selected Broker Object for Accounts:", selectedBroker);

    if (selectedBroker && selectedBroker.accounts && selectedBroker.accounts.length > 0) {
        console.log("Accounts array for selected broker:", selectedBroker.accounts);
        accountNumberSelectElement.innerHTML = '<option value="">انتخاب کنید</option>'; // Add a default "select" option
        selectedBroker.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.number;
            option.textContent = account.number;
            option.dataset.brokerId = selectedBroker.id; // Store broker ID on account option
            option.dataset.accountId = account.id; // Store account ID on account option
            accountNumberSelectElement.appendChild(option);
        });
        console.log("Finished adding account options.");
    } else {
        accountNumberSelectElement.innerHTML = '<option value="">برای این بروکر حسابی ثبت نشده است.</option>';
        console.log("Selected broker found, but no accounts found.", selectedBroker);
    }
}

function updateOrderTypeOptions() {
    console.log("updateOrderTypeOptions called");
    const orderTypeElement = document.getElementById('orderType');
    const tradeDirectionElement = document.getElementById('tradeDirection');

    if (!orderTypeElement || !tradeDirectionElement) {
        console.error("orderType or tradeDirection element not found in updateOrderTypeOptions.");
        return;
    }

    orderTypeElement.innerHTML = ''; // Clear existing options
    const selectedDirection = tradeDirectionElement.value;
    console.log("Selected Direction:", selectedDirection);

    const selectedOptions = orderOptions[selectedDirection];
    console.log("Selected Options:", selectedOptions);

    if (selectedOptions && selectedOptions.length > 0) {
        selectedOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            orderTypeElement.appendChild(option);
        });
    } else {
        // Fallback if no options for selected direction (shouldn't happen with current setup)
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'انتخاب کنید';
        orderTypeElement.appendChild(option);
    }
    console.log("updateOrderTypeOptions finished");
}


// Calculation and Display Helpers
function calculateDuration(entryTime, exitTime) {
    if (!entryTime || !exitTime) return 'در حال انجام...';
    try {
        const entryDate = new Date(entryTime);
        const exitDate = new Date(exitTime);
        const diffMs = exitDate.getTime() - entryDate.getTime();
        if (diffMs < 0) return 'زمان خروج نامعتبر';

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        if (hours > 0) { return `${hours}h ${minutes}m`; } else { return `${diffMinutes}m`; }
    } catch (e) {
        console.error("Error calculating duration:", e);
        return 'Error duration';
    }
}

function formatEntryDateTimeForCard(dateString) {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    } catch (e) {
        console.error("Error formatting date/time:", e);
        return '---';
    }
}

function estimatePipSize(symbol) {
    if (!symbol) return 0.0001; // Default for major pairs
    symbol = symbol.toUpperCase();
    if (symbol.includes('JPY')) { return 0.01; } // JPY pairs have 2 decimal places for pips
    if (symbol === 'XAUUSD') { return 0.01; } // Gold
    // Add other symbols if they have specific pip sizes
    if (symbol.includes('DJI') || symbol.includes('NASDAQ') || symbol.includes('US30') || symbol.includes('NDX')) { return 0.01; } // Indices typically have 2 decimal places for points/pips
    return 0.0001; // Default for most major forex pairs
}

function getContractSize(symbol) {
    if (!symbol) return 100000; // Default for forex standard lot (100,000 units)
    symbol = symbol.toUpperCase();
    if (symbol === 'XAUUSD') { return 100; } // Gold (100 ounces per lot)
    if (symbol.includes('DJI') || symbol.includes('NASDAQ') || symbol.includes('US30') || symbol.includes('NDX')) { return 1; } // Indices (1 unit per lot/contract)
    // Add other symbols if they have specific contract sizes
    return 100000; // Default for forex
}


function calculateProfitPips(trade) {
    const { entryPrice, exitPrice, tradeDirection, symbol } = trade;
    if (!entryPrice || !exitPrice) return '---'; // Trade not closed yet

    const pipSize = estimatePipSize(symbol);
    if (pipSize === 0 || isNaN(pipSize) || pipSize <= 0) {
        console.warn(`Invalid pip size for symbol ${symbol}: ${pipSize}`);
        return '---';
    }

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);

    if (isNaN(entry) || isNaN(exit)) return '---';

    let priceDifference = 0;
    if (tradeDirection === 'Buy') {
        priceDifference = exit - entry;
    } else if (tradeDirection === 'Sell') {
        priceDifference = entry - exit;
    } else {
        console.warn(`Invalid trade direction: ${tradeDirection}`);
        return '---';
    }

    const pips = priceDifference / pipSize;

    // Check for infinite or extremely large values that might indicate calculation errors
    if (!isFinite(pips) || Math.abs(pips) > 1000000) {
        console.warn(`Pips calculation resulted in abnormal value: ${pips}`);
        return '---';
    }

    return pips.toFixed(1); // Format to one decimal place
}

function calculateProfitDollars(trade) {
    const { entryPrice, exitPrice, tradeDirection, symbol, volume } = trade;
    if (!entryPrice || !exitPrice || !volume) return '---'; // Trade not closed yet or volume missing

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const volumeFloat = parseFloat(volume);

    if (isNaN(entry) || isNaN(exit) || isNaN(volumeFloat) || volumeFloat <= 0) return '---';

    const contractSize = getContractSize(symbol);
    if (isNaN(contractSize) || contractSize <= 0) {
        console.warn(`Invalid contract size for symbol ${symbol}: ${contractSize}`);
        return '---';
    }

    let priceDifference = 0;
    if (tradeDirection === 'Buy') {
        priceDifference = exit - entry;
    } else if (tradeDirection === 'Sell') {
        priceDifference = entry - exit;
    } else {
        console.warn(`Invalid trade direction: ${tradeDirection}`);
        return '---';
    }

    const grossProfitDollars = priceDifference * volumeFloat * contractSize;
    const commission = parseFloat(trade.commission || 0); // Commission might be optional or zero
    const finalProfit = grossProfitDollars - commission;

    // Check for infinite or extremely large values
    if (!isFinite(finalProfit) || Math.abs(finalProfit) > 1000000000) {
        console.warn(`Profit calculation resulted in abnormal value: ${finalProfit}`);
        return '---';
    }

    // Return formatted number with dollar sign
    return `${finalProfit.toFixed(2)}$`;
}

function getTradingSession(entryTime) {
    if (!entryTime) return '---';
    try {
        const entryDate = new Date(entryTime);
        const utcHours = entryDate.getUTCHours(); // Get UTC hour of trade entry

        const sessions = [];
        // Define session ranges in UTC hours (approximate for Forex)
        const sessionRanges = {
            'سیدنی': [22, 7], // 10 PM to 7 AM UTC (previous day to current day)
            'توکیو': [0, 9],    // 0 AM to 9 AM UTC
            'لندن': [7, 16],  // 7 AM to 4 PM UTC
            'نیویورک': [12, 21] // 12 PM to 9 PM UTC
        };

        for (const sessionName in sessionRanges) {
            const [start, end] = sessionRanges[sessionName];
            if (start > end) { // Handles sessions that cross midnight (e.g., Sydney)
                if (utcHours >= start || utcHours < end) {
                    sessions.push(sessionName);
                }
            } else {
                if (utcHours >= start && utcHours < end) {
                    sessions.push(sessionName);
                }
            }
        }

        if (sessions.length === 0) return 'خارج از سشن ها (UTC)';
        return sessions.join(' / '); // Join multiple sessions if overlapping
    } catch (e) {
        console.error("Error getting trading session:", e);
        return 'Error session';
    }
}

function getTradeOutcome(trade) {
    const { entryPrice, exitPrice, tradeDirection } = trade;

    if (!exitPrice || !entryPrice || !tradeDirection) return 'در حال انجام'; // Trade is still open

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);

    if (isNaN(entry) || isNaN(exit)) return 'در حال انجام'; // Prices are not valid numbers

    if (tradeDirection === 'Buy') {
        return exit > entry ? 'موفق' : (exit < entry ? 'ناموفق' : 'بدون تغییر');
    } else if (tradeDirection === 'Sell') {
        return exit < entry ? 'موفق' : (exit > entry ? 'ناموفق' : 'بدون تغییر');
    }
    return 'نامشخص'; // Should not be reached if tradeDirection is valid
}

function calculateRiskReward(trade) {
    const { entryPrice, stopLoss, takeProfit, tradeDirection } = trade;

    if (!entryPrice || !tradeDirection || !stopLoss || !takeProfit) return '---'; // Missing required fields

    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) return '---'; // Invalid numbers

    let risk = 0;
    let reward = 0;

    if (tradeDirection === 'Buy') {
        if (sl >= entry) return 'SL >= Entry'; // Invalid SL for Buy trade
        if (tp <= entry) return 'TP <= Entry'; // Invalid TP for Buy trade
        risk = entry - sl;
        reward = tp - entry;
    } else if (tradeDirection === 'Sell') {
        if (sl <= entry) return 'SL <= Entry'; // Invalid SL for Sell trade
        if (tp >= entry) return 'TP >= Entry'; // Invalid TP for Sell trade
        risk = sl - entry;
        reward = entry - tp;
    } else {
        return '---'; // Invalid trade direction
    }

    if (risk <= 0 || reward <= 0) return '---'; // Risk or reward must be positive

    const riskRewardRatio = reward / risk;
    return `1:${riskRewardRatio.toFixed(2)}`; // Format as 1:R
}

function createTradeCardHTML(trade) {
    const duration = calculateDuration(trade.entryTime, trade.exitTime);
    const profitPips = calculateProfitPips(trade);
    const profitDollars = calculateProfitDollars(trade);
    const tradingSession = getTradingSession(trade.entryTime);
    const formattedEntryDateTime = formatEntryDateTimeForCard(trade.entryTime);
    const outcome = getTradeOutcome(trade);
    const riskReward = calculateRiskReward(trade);

    let statusClass = 'status';
    if (outcome === 'موفق') statusClass += ' success';
    else if (outcome === 'ناموفق') statusClass += ' danger';
    else if (outcome === 'در حال انجام') statusClass += ' pending';

    let orderTypeText = trade.orderType || '---';
    // Format orderType (e.g., "BUY|market" to "Market")
    if (trade.orderType && trade.orderType.includes('|')) {
        const parts = trade.orderType.split('|');
        if (parts.length > 1) {
            orderTypeText = parts[1];
            orderTypeText = orderTypeText.charAt(0).toUpperCase() + orderTypeText.slice(1); // Capitalize first letter
        } else {
            orderTypeText = trade.orderType; // Fallback if split doesn't work as expected
        }
    } else if (trade.orderType) {
        orderTypeText = trade.orderType.charAt(0).toUpperCase() + orderTypeText.slice(1);
    }

    const cardHTML = `
        <h3>${trade.symbol || '---'} - ${trade.tradeDirection === 'Buy' ? 'خرید ⬆️' : (trade.tradeDirection === 'Sell' ? 'فروش ⬇️' : '---')}</h3>
        <div class="card-info-grid">
            <div><strong>حجم:</strong> ${trade.volume || '---'}</div>
            <div><strong>تاریخ ورود:</strong> ${formattedEntryDateTime}</div>
            ${trade.exitTime ? `<div><strong>تاریخ خروج:</strong> ${formatEntryDateTimeForCard(trade.exitTime)}</div>` : ''}
            <div><strong>مدت ترید:</strong> ${duration}</div>
            <div><strong>سشن:</strong> ${tradingSession}</div>
            ${profitPips !== '---' ? `<div><strong>پیپ:</strong> ${profitPips}</div>` : ''}
            ${profitDollars !== '---' ?
                `<div>
                    <strong>سود/زیان:</strong>
                    <span class="profit-loss-value ${parseFloat(profitDollars) >= 0 ? 'positive' : 'negative'}">${profitDollars}</span>
                </div>`
                : ''
            }
            ${riskReward !== '---' ? `<div><strong>R:R:</strong> ${riskReward}</div>` : ''}
        </div>
        <div class="card-notes">
            <strong>توضیحات:</strong> ${trade.notes || '---'}
        </div>
        <div class="${statusClass}">${outcome}</div>
        <button class="edit-button" data-trade-id="${trade.id}">✏️</button>
        <button class="delete-button" data-trade-id="${trade.id}">❌</button>
    `;
    return cardHTML;
}

// Display Management
async function displayLatestTradeInMainSection() {
    console.log("displayLatestTradeInMainSection called.");
    const trades = await fetchTradesFromApi();
    const tradeCardsContainer = document.getElementById('trade-cards');
    const latestTradeSection = document.getElementById('latest-trade-section');

    if (!tradeCardsContainer || !latestTradeSection) {
        console.error('Display elements not found in main section.');
        return;
    }

    // Preserve the title if it exists, otherwise create a new one
    const titleElement = tradeCardsContainer.querySelector('h3');
    tradeCardsContainer.innerHTML = ''; // Clear previous content
    if (titleElement) {
        tradeCardsContainer.appendChild(titleElement);
    } else {
        const newTitle = document.createElement('h3');
        newTitle.textContent = 'ترید ثبت شده (آخرین ترید)';
        tradeCardsContainer.appendChild(newTitle);
    }


    if (trades.length > 0) {
        // Sort trades by entryTime in descending order to get the latest
        trades.sort((a, b) => {
            const dateA = a.entryTime ? new Date(a.entryTime) : new Date(0); // Handle missing entryTime
            const dateB = b.entryTime ? new Date(b.entryTime) : new Date(0);
            return dateB - dateA;
        });

        const latestTrade = trades[0]; // Get the most recent trade
        console.log("Latest trade selected for display:", latestTrade);

        const tradeCard = document.createElement('div');
        tradeCard.classList.add('trade-card');
        tradeCard.dataset.tradeId = latestTrade.id; // Store trade ID for edit/delete
        const cardHTML = createTradeCardHTML(latestTrade);
        tradeCard.innerHTML = cardHTML;
        tradeCardsContainer.appendChild(tradeCard);

        // Animate the display of the section
        latestTradeSection.style.display = 'flex';
        setTimeout(() => { latestTradeSection.style.opacity = '1'; }, 50); // Small delay for transition
    } else {
        // Hide the section if no trades
        latestTradeSection.style.opacity = '0';
        setTimeout(() => {
            console.log("Latest trade section hidden.");
            latestTradeSection.style.display = 'none';
        }, ANIMATION_DURATION); // Wait for fade out before hiding
        console.log('No trades saved yet. Main card section empty/hidden.');
    }
    console.log("displayLatestTradeInMainSection finished.");
}

async function displayRecentTradesInBottomSection() {
    console.log("displayRecentTradesInBottomSection called.");
    const trades = await fetchTradesFromApi();
    const recentTradesContainer = document.getElementById('recent-trades');

    if (!recentTradesContainer) {
        console.error('Recent trades container not found.');
        return;
    }

    // Preserve the title if it exists, otherwise create a new one
    const titleElement = recentTradesContainer.querySelector('h3');
    recentTradesContainer.innerHTML = ''; // Clear previous content
    if (titleElement) {
        recentTradesContainer.appendChild(titleElement);
    } else {
        const newTitle = document.createElement('h3');
        newTitle.textContent = '۱۰ ترید آخر';
        recentTradesContainer.appendChild(newTitle);
    }

    if (trades.length > 0) {
        // Sort trades by entryTime in descending order
        trades.sort((a, b) => {
            const dateA = a.entryTime ? new Date(a.entryTime) : new Date(0);
            const dateB = b.entryTime ? new Date(b.entryTime) : new Date(0);
            return dateB - dateA;
        });

        // Slice to get only the latest N trades
        const recentTrades = trades.slice(0, MAX_TRADES_TO_DISPLAY_BOTTOM);
        console.log(`Displaying ${recentTrades.length} recent trades in bottom section.`);

        recentTrades.forEach(trade => {
            const tradeCard = document.createElement('div');
            tradeCard.classList.add('trade-card');
            tradeCard.dataset.tradeId = trade.id; // Store trade ID for edit/delete
            tradeCard.innerHTML = createTradeCardHTML(trade);
            recentTradesContainer.appendChild(tradeCard);
        });
        console.log(`Finished displaying recent trades.`);
    } else {
        console.log('No trades saved yet. Recent trades section empty.');
    }
    console.log("displayRecentTradesInBottomSection finished.");
}

// Edit and Delete Management
async function populateFormForEdit(trade) {
    console.log("populateFormForEdit called with trade:", trade);
    const symbolElement = document.getElementById('symbol');
    const tradeDirectionElement = document.getElementById('tradeDirection');
    const orderTypeElement = document.getElementById('orderType');
    const volumeElement = document.getElementById('volume');
    const entryPriceElement = document.getElementById('entryPrice');
    const exitPriceElement = document.getElementById('exitPrice');
    const exitTimeElement = document.getElementById('exitTime');
    const timeframeElement = document.getElementById('timeframe');
    const brokerElement = document.getElementById('broker');
    const accountNumberElement = document.getElementById('accountNumber');
    const orderNumberElement = document.getElementById('orderNumber');
    const stopLossElement = document.getElementById('stopLoss');
    const takeProfitElement = document.getElementById('takeProfit');
    const commissionElement = document.getElementById('commission');
    const entryTimeElement = document.getElementById('entryTime');
    const strategyElement = document.getElementById('strategy');
    const emotionElement = document.getElementById('emotion');
    const notesElement = document.getElementById('notes');
    const tradeFormElement = document.getElementById('trade-form');
    const submitButtonElement = tradeFormElement ? tradeFormElement.querySelector('button[type="submit"]') : null;

    // Check if all required elements are found
    if (!symbolElement || !tradeDirectionElement || !orderTypeElement || !tradeFormElement || !volumeElement || !entryPriceElement || !exitPriceElement || !exitTimeElement || !timeframeElement || !brokerElement || !accountNumberElement || !orderNumberElement || !stopLossElement || !takeProfitElement || !commissionElement || !entryTimeElement || !strategyElement || !emotionElement || !notesElement) {
        console.error("One or more form elements not found in populateFormForEdit.");
        alert("عناصر فرم برای ویرایش ترید پیدا نشدند.");
        return;
    }
    console.log("All form elements found for populateFormForEdit.");

    // Set values for basic inputs directly
    tradeDirectionElement.value = trade.tradeDirection || '';
    volumeElement.value = trade.volume || '';
    entryPriceElement.value = trade.entryPrice || '';
    exitPriceElement.value = trade.exitPrice || '';
    timeframeElement.value = trade.timeframe || '';
    orderNumberElement.value = trade.orderNumber || '';
    stopLossElement.value = trade.stopLoss || '';
    takeProfitElement.value = trade.takeProfit || '';
    commissionElement.value = trade.commission || '0';
    emotionElement.value = trade.emotion || '';
    notesElement.value = trade.notes || '';

    // Handle date/time inputs (ensure they are in YYYY-MM-DDTHH:MM format for datetime-local)
    if (trade.entryTime) {
        try {
            const date = new Date(trade.entryTime);
            const formattedEntryTime = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
            entryTimeElement.value = formattedEntryTime;
            console.log("Set entryTime value:", formattedEntryTime);
        } catch (e) {
            console.error("Error formatting entryTime for input:", e);
            entryTimeElement.value = '';
        }
    } else {
        entryTimeElement.value = '';
    }

    if (trade.exitTime) {
        try {
            const date = new Date(trade.exitTime);
            const formattedExitTime = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
            exitTimeElement.value = formattedExitTime;
            console.log("Set exitTime value:", formattedExitTime);
        } catch (e) {
            console.error("Error formatting exitTime for input:", e);
            exitTimeElement.value = '';
        }
    } else {
        exitTimeElement.value = '';
    }

    // Handle selects that depend on other selects or master data being populated
    // These functions must be awaited to ensure options are loaded before setting value
    await populateSymbolSelect(); // Ensure options are there
    if (symbolElement) {
        symbolElement.value = trade.symbol || '';
        console.log("Set symbol value:", trade.symbol);
    }

    // Order Type (depends on tradeDirection and updateOrderTypeOptions)
    // Set tradeDirection first, then update order type options based on it
    tradeDirectionElement.value = trade.tradeDirection || ''; // Ensure tradeDirection is set
    updateOrderTypeOptions(); // Call immediately to update options based on tradeDirection
    if (orderTypeElement) {
        orderTypeElement.value = trade.orderType || '';
        console.log("Set orderType value:", trade.orderType);
    }

    // Broker and Account Number (broker depends on populateBrokerSelect, accountNumber depends on updateAccountOptions)
    await populateBrokerSelect(); // Ensure broker options are there
    if (brokerElement) {
        brokerElement.value = trade.broker || '';
        console.log("Set broker value:", trade.broker);
        await updateAccountOptions(); // Call immediately to update accounts based on selected broker
        if (accountNumberElement) {
            accountNumberElement.value = trade.accountNumber || '';
            console.log("Set accountNumber value:", trade.accountNumber);
        }
    } else {
        console.error("Broker element not found when trying to set its value.");
    }

    // Strategy (depends on populateStrategySelect)
    await populateStrategySelect(); // Ensure strategy options are there
    if (strategyElement) {
        strategyElement.value = trade.strategy || '';
        console.log("Set strategy value:", trade.strategy);
    }

    // Set the trade ID on the form for update operations
    tradeFormElement.dataset.editingTradeId = trade.id;
    // Change button text to "Update Trade"
    if (submitButtonElement) submitButtonElement.textContent = 'به روز رسانی ترید';
    // Scroll the form into view
    tradeFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log("populateFormForEdit finished.");
}

function exitEditMode() {
    console.log("exitEditMode called.");
    const tradeFormElement = document.getElementById('trade-form');
    if (!tradeFormElement) {
        console.error("tradeForm element not found in exitEditMode.");
        return;
    }

    tradeFormElement.reset(); // Clear all form fields

    // Re-populate selects to ensure they are in their default state
    // These are async functions, but we don't need to await them for reset
    populateSymbolSelect();
    populateBrokerSelect();
    populateStrategySelect();
    updateOrderTypeOptions(); // Reset based on default trade direction
    updateAccountOptions(); // Reset based on default broker

    // Remove the editing ID from the form's dataset
    delete tradeFormElement.dataset.editingTradeId;
    // Change the submit button text back to "ذخیره ترید"
    const submitButtonElement = tradeFormElement.querySelector('button[type="submit"]');
    if (submitButtonElement) submitButtonElement.textContent = 'ذخیره ترید';
    console.log("exitEditMode finished.");
}

// Initial Display of cards and population of selects
async function initializePageDisplay() {
    console.log("initializePageDisplay called.");
    const tradeCardsContainerElement = document.getElementById('trade-cards');
    const latestTradeSectionElement = document.getElementById('latest-trade-section');

    if (tradeCardsContainerElement && latestTradeSectionElement) {
        tradeCardsContainerElement.innerHTML = '<h3>ترید ثبت شده (آخرین ترید)</h3>';
        latestTradeSectionElement.style.opacity = '0';
        latestTradeSectionElement.style.display = 'none';
        console.log("Main card section initialized empty and hidden.");
    } else {
        console.error('Display elements not found in initialize.');
    }

    // Populate selects before displaying trades, as they rely on master data
    await populateSymbolSelect();
    await populateBrokerSelect();
    await populateStrategySelect();
    updateOrderTypeOptions(); // This is synchronous
    await updateAccountOptions();
    console.log("Populate functions called and awaited in initializePageDisplay.");

    // Display recent trades and latest trade
    await displayRecentTradesInBottomSection();
    await displayLatestTradeInMainSection();
    console.log("initializePageDisplay finished.");
}

// Main Event Listener - executes when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded fired (script.js).");

    // Get references to key HTML elements
    const tradeDirection = document.getElementById('tradeDirection');
    const orderType = document.getElementById('orderType');
    const brokerSelect = document.getElementById('broker');
    const accountNumberSelect = document.getElementById('accountNumber');
    const tradeForm = document.getElementById('trade-form');
    const tradeCardsContainer = document.getElementById('trade-cards');
    const latestTradeSection = document.getElementById('latest-trade-section');
    const recentTradesContainer = document.getElementById('recent-trades');

    // Basic check to ensure all required elements are present
    if (!tradeDirection || !orderType || !brokerSelect || !accountNumberSelect || !tradeForm || !tradeCardsContainer || !latestTradeSection || !recentTradesContainer) {
        console.error("One or more key elements not found on DOMContentLoaded. Please check your HTML IDs.");
        alert("برخی از عناصر مهم صفحه یافت نشدند. لطفاً صفحه را بررسی کنید.");
        return; // Stop execution if critical elements are missing
    }
    console.log("All key elements found on DOMContentLoaded.");

    // Attach event listeners to dynamic elements
    tradeDirection.addEventListener('change', updateOrderTypeOptions);
    brokerSelect.addEventListener('change', updateAccountOptions);

    // Handle form submission (for both new trade and updating existing trade)
    tradeForm.addEventListener('submit', async function(event) {
        console.log("Form submit event fired.");
        event.preventDefault(); // Prevent default form submission (page reload)

        const formData = new FormData(tradeForm);
        const tradeData = Object.fromEntries(formData.entries());
        console.log("Form data collected:", tradeData);

        // --- Form Validation ---
        const requiredFields = ['symbol', 'tradeDirection', 'orderType', 'volume', 'entryPrice', 'stopLoss', 'takeProfit', 'broker', 'accountNumber', 'strategy', 'emotion'];
        for (const field of requiredFields) {
            const isExitField = (field === 'exitPrice' || field === 'exitTime');
            const isTradeOpen = !tradeData['exitTime']; // Check if exitTime is empty, meaning trade is still open

            // Skip validation for exit fields if trade is open (not closed yet)
            if (isExitField && isTradeOpen) continue;

            // Check if field value is empty or default for selects
            if (!tradeData[field] && tradeData[field] !== 0) {
                const labelElement = document.querySelector('label[for="' + field + '"]');
                // Get the label text, clean it (remove ':', trim whitespace)
                const labelText = labelElement ? labelElement.textContent.replace(':', '').trim() : field;
                const selectElement = document.getElementById(field);

                if (selectElement) {
                    // For select elements, check if the selected option has an empty value (e.g., "انتخاب کنید")
                    if (tradeData[field] === '' || (selectElement.options.length > 0 && selectElement.selectedIndex === 0 && selectElement.options[0].value === '')) {
                        alert('لطفاً فیلد "' + labelText + '" را انتخاب کنید.');
                        selectElement.focus();
                        return; // Stop form submission
                    }
                } else {
                    // For other input fields (e.g., text, number, datetime-local)
                    // Special handling for 'commission' if it's expected to be numeric but might be optional/empty string
                    if (field === 'commission' && (tradeData[field] === '' || isNaN(parseFloat(tradeData[field])))) {
                           // If commission is optional, remove this check. If mandatory and numeric, keep it.
                           // For now, assuming it should be numeric if provided.
                         alert('لطفاً فیلد "' + labelText + '" را به درستی وارد کنید.');
                        const emptyField = document.getElementById(field);
                        if (emptyField) { emptyField.focus(); }
                        return;
                    }
                    // General check for any other empty required text/number input
                    if (tradeData[field] === '') {
                        alert('فیلد "' + labelText + '" اجباری است.');
                        const emptyField = document.getElementById(field);
                        if (emptyField) { emptyField.focus(); }
                        return;
                    }
                }
            }
            // Numeric validation for specific fields
            if (['volume', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'commission'].includes(field)) {
                if (tradeData[field] !== '' && isNaN(parseFloat(tradeData[field]))) {
                    const labelElement = document.querySelector('label[for="' + field + '"]');
                    const labelText = labelElement ? labelElement.textContent.replace(':', '').trim() : field;
                    alert('لطفاً در فیلد "' + labelText + '" یک عدد معتبر وارد کنید.');
                    const invalidField = document.getElementById(field);
                    if (invalidField) { invalidField.focus(); }
                    return;
                }
            }
        }
        console.log("Form validation passed.");
        // --- End Form Validation ---

        // Check if we are editing an existing trade
        const editingId = tradeForm.dataset.editingTradeId;
        if (editingId) {
            tradeData.id = editingId; // Add the ID to the tradeData object for update
        }

        const saveSuccess = await saveTradeToApi(tradeData); // Call API to save/update
        if (saveSuccess) {
            alert(editingId ? 'ترید با موفقیت به روز رسانی شد!' : 'ترید با موفقیت ذخیره شد!');
            exitEditMode(); // Reset form and UI to new trade entry mode
            // Refresh displayed trades
            await displayLatestTradeInMainSection();
            await displayRecentTradesInBottomSection();
        } else {
            console.error("Trade save failed.");
        }
        console.log("Form submit event finished.");
    });


    // Event Delegation for Edit/Delete Buttons on dynamically created trade cards
    // Attach listener to a common parent element that is always present
    const commonParentForEvents = document.querySelector('main.form-container'); // Adjust this selector if your HTML structure is different
    if (commonParentForEvents) {
        commonParentForEvents.addEventListener('click', async function(event) {
            console.log("Click event on common parent fired.", event.target);
            const target = event.target; // The element that was clicked

            // Check if an edit button or its child was clicked
            const editButton = target.closest('.edit-button');
            // Check if a delete button or its child was clicked
            const deleteButton = target.closest('.delete-button');

            if (editButton) {
                console.log("Edit button clicked.");
                const tradeCardElement = target.closest('.trade-card'); // Find the parent trade-card
                if (tradeCardElement) {
                    const tradeIdToEdit = tradeCardElement.dataset.tradeId; // Get the trade ID from its dataset
                    console.log('Request to edit trade with ID from card:', tradeIdToEdit);
                    const tradeToEdit = await findTradeById(tradeIdToEdit); // Fetch trade data
                    if (tradeToEdit) {
                        console.log("Trade found for editing:", tradeToEdit);
                        console.log("Trade data:", tradeToEdit); // لاگ اطلاعات ترید دریافتی
                        await populateFormForEdit(tradeToEdit); // Populate the form
                        // Scroll the form into view for better UX
                        const tradeFormElement = document.getElementById('trade-form');
                        if (tradeFormElement) tradeFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        console.error("Trade with ID", tradeIdToEdit, "not found for editing.");
                        alert("ترید مورد نظر برای ویرایش پیدا نشد.");
                    }
                }
            } else if (deleteButton) {
                console.log("Delete button clicked.");
                const tradeCardElement = target.closest('.trade-card');
                if (tradeCardElement) {
                    const tradeIdToDelete = tradeCardElement.dataset.tradeId;
                    console.log('Request to delete trade with ID:', tradeIdToDelete);
                    if (confirm('آیا از حذف این ترید اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
                        const deleteSuccess = await deleteTradeFromApi(tradeIdToDelete);
                        if (deleteSuccess) {
                            alert('ترید با موفقیت حذف شد.');
                            // Refresh displayed trades after deletion
                            await displayLatestTradeInMainSection();
                            await displayRecentTradesInBottomSection();

                            // If the deleted trade was currently being edited, exit edit mode
                            const tradeFormElement = document.getElementById('trade-form');
                            if (tradeFormElement && tradeFormElement.dataset.editingTradeId == tradeIdToDelete) {
                                exitEditMode();
                                console.log("Exited edit mode after deleting the trade being edited.");
                            }
                        } else {
                            console.error("Trade deletion failed.");
                        }
                    } else {
                        console.log("Delete cancelled.");
                    }
                }
            }
        });
    } else {
        console.error('عنصر والد "main.form-container" برای اضافه کردن EventListener پیدا نشد.');
    }

    // --- NEW LOGIC: Handle initial page load for editing if tradeId is in URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const editTradeId = urlParams.get('tradeId'); // Get tradeId from URL query string

    if (editTradeId) {
        console.log("URL contains tradeId for editing:", editTradeId);
        console.log("About to call findTradeById with ID:", editTradeId); // لاگ قبل از فراخوانی findTradeById
        const tradeToEdit = await findTradeById(editTradeId); // Fetch the specific trade
        if (tradeToEdit) {
            console.log("Trade found from URL for editing:", tradeToEdit);
            console.log("Trade data:", tradeToEdit); // لاگ اطلاعات ترید دریافتی
            await populateFormForEdit(tradeToEdit); // Populate the form with fetched trade data
        } else {
            console.error("Trade with ID", editTradeId, "not found from URL for editing.");
            alert("ترید مورد نظر برای ویرایش پیدا نشد. لطفاً از صفحه گزارش‌ها دوباره تلاش کنید.");
            // Clean the URL to remove the tradeId parameter if not found
            window.history.replaceState(null, '', window.location.pathname);
        }
    } else {
        console.log("No tradeId found in URL. Initializing for new trade entry and displaying recent trades.");
        // Call initializePageDisplay only if not in edit mode from URL
        await initializePageDisplay();
    }
}); // End of DOMContentLoaded listener
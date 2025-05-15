// js/reports.js - Script for Trade Reports and Statistics Page - With Filtering, Summary Stats, and Edit/Delete functionality

console.log("reports.js is running!");

// متغیری برای ذخیره تمام تریدهای خوانده شده از سرور
let allTrades = [];
let masterData = {}; // برای ذخیره اطلاعات پایه از API (نمادها، بروکرها و ...)

// ===========================================
// API Fetch Functions
// ===========================================

// تابع ناهمزمان برای خواندن اطلاعات تریدها از API سرور
async function fetchTradesFromApi() {
    console.log("Fetching trades from API for reports page...");
    try {
        const response = await fetch('/api/trades');
        if (!response.ok) {
            console.error("HTTP error fetching trades:", response.status);
            return []; // در صورت خطا، یک آرایه خالی برگردانید
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for trades:", contentType);
            return []; // در صورت پاسخ نامعتبر، یک آرایه خالی برگردانید
        }
        const trades = await response.json();
        console.log("Trades fetched successfully for reports page:", trades);
        return trades || []; // اطمینان از برگرداندن آرایه (حتی اگر null یا undefined باشد)
    } catch (error) {
        console.error("Error fetching trades for reports page:", error);
        return []; // در صورت بروز خطا، یک آرایه خالی برگردانید
    }
}

// تابع ناهمزمان برای خواندن اطلاعات پایه (نمادها، بروکرها، استراتژی‌ها) از API سرور
async function fetchMasterDataFromApi() {
    console.log("Fetching master data from API for reports page...");
    try {
        const response = await fetch('/api/masterdata');
        if (!response.ok) {
            console.error("HTTP error fetching master data:", response.status);
            return { symbols: [], brokers: [], strategies: [], emotions: [] };
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for master data:", contentType);
            return { symbols: [], brokers: [], strategies: [], emotions: [] };
        }
        const masterData = await response.json();
        console.log("Master data fetched successfully:", masterData);
        return masterData;
    } catch (error) {
        console.error("Error fetching master data for reports page:", error);
        return { symbols: [], brokers: [], strategies: [], emotions: [] };
    }
}

// ===========================================
// Utility Functions (Date & Calculation)
// ===========================================

// تابع محاسبه سشن معاملاتی از entryTime
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

        if (sessions.length === 0) return 'خارج از سشن‌ها (UTC)';
        return sessions.join(' / '); // Join multiple sessions if overlapping
    } catch (e) {
        console.error("Error getting trading session:", e);
        return 'Error session';
    }
}

// تابع استخراج روز هفته به فارسی
function getWeekday(entryTime) {
    if (!entryTime) return '---';
    try {
        const date = new Date(entryTime);
        const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
        return days[date.getDay()];
    } catch (e) {
        console.error("Error getting weekday:", e);
        return 'Error weekday';
    }
}

// تابع کمکی برای محاسبه سود/زیان و سود/زیان پیپ
function calculateProfitLoss(trade) {
    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(trade.exitPrice);
    const volume = parseFloat(trade.volume);
    const commission = parseFloat(trade.commission || 0); // کمیسیون ممکن است وجود نداشته باشد

    if (isNaN(entryPrice) || (trade.exitTime && isNaN(exitPrice)) || isNaN(volume)) {
        return { profitLoss: 0, pipProfitLoss: 0, tradeStatus: 'Pending' };
    }

    let profitLoss = 0;
    let pipProfitLoss = 0;

    if (trade.exitTime) {
        if (trade.tradeDirection === 'Buy') {
            profitLoss = (exitPrice - entryPrice) * volume * 100000 - commission;
            pipProfitLoss = (exitPrice - entryPrice) * 10000;
        } else if (trade.tradeDirection === 'Sell') {
            profitLoss = (entryPrice - exitPrice) * volume * 100000 - commission;
            pipProfitLoss = (entryPrice - exitPrice) * 10000;
        }
    }

    pipProfitLoss = parseFloat(pipProfitLoss.toFixed(2));

    let tradeStatus = 'Pending';
    if (trade.exitTime) {
        if (profitLoss > 0) {
            tradeStatus = 'Win';
        } else if (profitLoss < 0) {
            tradeStatus = 'Loss';
        } else {
            tradeStatus = 'BreakEven';
        }
    }

    return {
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        pipProfitLoss: pipProfitLoss,
        tradeStatus: tradeStatus
    };
}

// تابع کمکی برای محاسبه مدت زمان ترید (ساعت و دقیقه)
function calculateDuration(trade) {
    const entryTime = new Date(trade.entryTime);
    const exitTime = new Date(trade.exitTime);

    if (isNaN(entryTime) || isNaN(exitTime) || !trade.exitTime) {
        return 'در حال اجرا';
    }

    const diffMs = exitTime - entryTime;
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
}

// ===========================================
// UI Population Functions
// ===========================================

// پر کردن فیلترهای دراپ‌داون با اطلاعات Master Data و Trades
function populateFilterOptions(data, trades) {
    const symbolSelect = document.getElementById('filter-symbol');
    const brokerSelect = document.getElementById('filter-broker');
    const strategySelect = document.getElementById('filter-strategy');
    const emotionSelect = document.getElementById('filter-emotion');
    const timeframeSelect = document.getElementById('timeframe-filter');
    const statusSelect = document.getElementById('status-filter');
    const tradeTypeSelect = document.getElementById('trade-type-filter');
    const sessionSelect = document.getElementById('session-filter');
    const weekdaySelect = document.getElementById('weekday-filter');

    // پر کردن نمادها
    if (symbolSelect && data.symbols) {
        symbolSelect.innerHTML = '<option value="">همه</option>';
        data.symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol.name;
            option.textContent = symbol.name;
            symbolSelect.appendChild(option);
        });
    }

    // پر کردن بروکرها
    if (brokerSelect && data.brokers) {
        brokerSelect.innerHTML = '<option value="">همه</option>';
        data.brokers.forEach(broker => {
            const option = document.createElement('option');
            option.value = broker.name;
            option.textContent = broker.name;
            brokerSelect.appendChild(option);
        });
    }

    // پر کردن استراتژی‌ها
    if (strategySelect && data.strategies) {
        strategySelect.innerHTML = '<option value="">همه</option>';
        data.strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.name;
            option.textContent = strategy.name;
            strategySelect.appendChild(option);
        });
    }

    // پر کردن احساسات
    if (emotionSelect && data.emotions) {
        emotionSelect.innerHTML = '<option value="">همه</option>';
        data.emotions.forEach(emotion => {
            const option = document.createElement('option');
            option.value = emotion.name;
            option.textContent = emotion.name;
            emotionSelect.appendChild(option);
        });
    }

    // پر کردن تایم‌فریم‌ها (از trades یا لیست ثابت)
    if (timeframeSelect) {
        const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
        timeframeSelect.innerHTML = '<option value="">همه</option>';
        timeframes.forEach(timeframe => {
            const option = document.createElement('option');
            option.value = timeframe;
            option.textContent = timeframe;
            timeframeSelect.appendChild(option);
        });
    }

    // پر کردن وضعیت
    if (statusSelect) {
        const statuses = [
            { value: 'Win', text: 'موفق' },
            { value: 'Loss', text: 'ناموفق' },
            { value: 'Pending', text: 'در انتظار' },
            { value: 'BreakEven', text: 'سر به سر' }
        ];
        statusSelect.innerHTML = '<option value="">همه</option>';
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status.value;
            option.textContent = status.text;
            statusSelect.appendChild(option);
        });
    }

    // پر کردن نوع ترید
    if (tradeTypeSelect) {
        const tradeTypes = [
            { value: 'Buy', text: 'خرید' },
            { value: 'Sell', text: 'فروش' }
        ];
        tradeTypeSelect.innerHTML = '<option value="">همه</option>';
        tradeTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.text;
            tradeTypeSelect.appendChild(option);
        });
    }

    // پر کردن سشن‌ها
    if (sessionSelect) {
        const sessions = ['سیدنی', 'توکیو', 'لندن', 'نیویورک'];
        sessionSelect.innerHTML = '<option value="">همه</option>';
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session;
            option.textContent = session;
            sessionSelect.appendChild(option);
        });
    }

    // پر کردن روزهای هفته
    if (weekdaySelect) {
        const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        weekdaySelect.innerHTML = '<option value="">همه</option>';
        weekdays.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            weekdaySelect.appendChild(option);
        });
    }
}

// پر کردن جدول تریدها
function populateTradesTable(tradesToDisplay) {
    const tableBody = document.getElementById('trades-table-body');
    if (!tableBody) {
        console.error("Table body element not found!");
        return;
    }
    tableBody.innerHTML = '';

    if (tradesToDisplay.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="14" style="text-align: center;">هیچ تریدی برای نمایش یافت نشد.</td>`;
        tableBody.appendChild(noDataRow);
        return;
    }

    tradesToDisplay.forEach(trade => {
        const { profitLoss, pipProfitLoss, tradeStatus } = calculateProfitLoss(trade);
        const duration = calculateDuration(trade);
        const session = getTradingSession(trade.entryTime);
        const weekday = getWeekday(trade.entryTime);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trade.symbol}</td>
            <td>${new Date(trade.entryTime).toLocaleDateString('fa-IR')}</td>
            <td>${trade.tradeDirection === 'Buy' ? 'خرید' : 'فروش'}</td>
            <td>${trade.timeframe || '-'}</td>
            <td>${session}</td>
            <td>${trade.volume}</td>
            <td><span class="profit-loss-value ${profitLoss < 0 ? 'negative' : 'positive'}">${profitLoss.toFixed(2)}</span></td>
            <td><span class="profit-loss-value ${pipProfitLoss < 0 ? 'negative' : 'positive'}">${pipProfitLoss.toFixed(2)}</span></td>
            <td>${duration}</td>
            <td>${trade.broker}</td>
            <td>${trade.strategy}</td>
            <td>${tradeStatus === 'Win' ? 'موفق' : tradeStatus === 'Loss' ? 'ناموفق' : tradeStatus === 'Pending' ? 'در انتظار' : 'سر به سر'}</td>
            <td>${trade.emotion}</td>
            <td>
                <button class="edit-btn" data-trade-id="${trade.id}">ویرایش</button>
                <button class="delete-btn" data-trade-id="${trade.id}">حذف</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// به‌روزرسانی آمار خلاصه
function updateSummaryStats(trades) {
    let totalTrades = trades.length;
    let totalWins = 0;
    let totalLosses = 0;
    let totalProfitLossUSD = 0;
    let totalProfitLossPip = 0;
    let largestProfitUSD = 0;
    let largestLossUSD = 0;
    let largestProfitPip = 0;
    let largestLossPip = 0;

    trades.forEach(trade => {
        const { profitLoss, pipProfitLoss, tradeStatus } = calculateProfitLoss(trade);

        if (tradeStatus === 'Win') {
            totalWins++;
        } else if (tradeStatus === 'Loss') {
            totalLosses++;
        }

        totalProfitLossUSD += profitLoss;
        totalProfitLossPip += pipProfitLoss;

        if (profitLoss > largestProfitUSD) {
            largestProfitUSD = profitLoss;
        }
        if (profitLoss < largestLossUSD) {
            largestLossUSD = profitLoss;
        }
        if (pipProfitLoss > largestProfitPip) {
            largestProfitPip = pipProfitLoss;
        }
        if (pipProfitLoss < largestLossPip) {
            largestLossPip = pipProfitLoss;
        }
    });

    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgProfitPerTradeUSD = totalTrades > 0 ? totalProfitLossUSD / totalTrades : 0;
    const avgProfitPerTradePip = totalTrades > 0 ? totalProfitLossPip / totalTrades : 0;

    document.getElementById('total-trades').textContent = totalTrades;
    document.getElementById('total-wins').textContent = totalWins;
    document.getElementById('total-losses').textContent = totalLosses;
    document.getElementById('win-rate').textContent = `${winRate.toFixed(2)}%`;
    document.getElementById('total-profit-loss-usd').textContent = totalProfitLossUSD.toFixed(2);
    document.getElementById('total-profit-loss-pip').textContent = totalProfitLossPip.toFixed(2);
    document.getElementById('avg-profit-per-trade-usd').textContent = avgProfitPerTradeUSD.toFixed(2);
    document.getElementById('avg-profit-per-trade-pip').textContent = avgProfitPerTradePip.toFixed(2);
    document.getElementById('largest-profit-usd').textContent = largestProfitUSD.toFixed(2);
    document.getElementById('largest-loss-usd').textContent = largestLossUSD.toFixed(2);
    document.getElementById('largest-profit-pip').textContent = largestProfitPip.toFixed(2);
    document.getElementById('largest-loss-pip').textContent = largestLossPip.toFixed(2);

    console.log("Summary Stats Updated:", {
        totalTrades, totalProfitLossUSD, totalLosses, totalPipProfitLoss: totalProfitLossPip,
        totalWins, winRate, avgProfitPerTradeUSD, avgProfitPerTradePip
    });
}

// ===========================================
// Filtering Logic
// ===========================================

async function applyFilters() {
    const filterStartDate = document.getElementById('filter-start-date').value;
    const filterEndDate = document.getElementById('filter-end-date').value;
    const filterSymbol = document.getElementById('filter-symbol').value;
    const filterBroker = document.getElementById('filter-broker').value;
    const filterStrategy = document.getElementById('filter-strategy').value;
    const filterEmotion = document.getElementById('filter-emotion').value;
    const timeframeFilter = document.getElementById('timeframe-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const tradeTypeFilter = document.getElementById('trade-type-filter').value;
    const weekdayFilter = document.getElementById('weekday-filter').value;
    const sessionFilter = document.getElementById('session-filter').value;

    let filteredTrades = [...allTrades];

    // اعمال فیلترها
    if (filterStartDate) {
        filteredTrades = filteredTrades.filter(trade => {
            const tradeDate = new Date(trade.entryTime.substring(0, 10));
            const filterDate = new Date(filterStartDate);
            return tradeDate.getTime() >= filterDate.getTime();
        });
    }
    if (filterEndDate) {
        filteredTrades = filteredTrades.filter(trade => {
            const tradeDate = new Date((trade.exitTime || trade.entryTime).substring(0, 10));
            const filterDate = new Date(filterEndDate);
            filterDate.setDate(filterDate.getDate() + 1);
            return tradeDate.getTime() < filterDate.getTime();
        });
    }
    if (filterSymbol) {
        filteredTrades = filteredTrades.filter(trade => trade.symbol === filterSymbol);
    }
    if (filterBroker) {
        filteredTrades = filteredTrades.filter(trade => trade.broker === filterBroker);
    }
    if (filterStrategy) {
        filteredTrades = filteredTrades.filter(trade => trade.strategy === filterStrategy);
    }
    if (filterEmotion) {
        filteredTrades = filteredTrades.filter(trade => trade.emotion === filterEmotion);
    }
    if (timeframeFilter) {
        filteredTrades = filteredTrades.filter(trade => trade.timeframe === timeframeFilter);
    }
    if (statusFilter) {
        filteredTrades = filteredTrades.filter(trade => {
            const { tradeStatus } = calculateProfitLoss(trade);
            return tradeStatus === statusFilter;
        });
    }
    if (tradeTypeFilter) {
        filteredTrades = filteredTrades.filter(trade => trade.tradeDirection === tradeTypeFilter);
    }
    if (weekdayFilter) {
        filteredTrades = filteredTrades.filter(trade => getWeekday(trade.entryTime) === weekdayFilter);
    }
    if (sessionFilter) {
        filteredTrades = filteredTrades.filter(trade => {
            const session = getTradingSession(trade.entryTime);
            return session.includes(sessionFilter);
        });
    }

    populateTradesTable(filteredTrades);
    updateSummaryStats(filteredTrades);
}

function resetFilters() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-symbol').value = '';
    document.getElementById('filter-broker').value = '';
    document.getElementById('filter-strategy').value = '';
    document.getElementById('filter-emotion').value = '';
    document.getElementById('timeframe-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('trade-type-filter').value = '';
    document.getElementById('weekday-filter').value = '';
    document.getElementById('session-filter').value = '';

    applyFilters();
}

// ===========================================
// Event Handlers (Edit & Delete)
// ===========================================

async function handleTableActions(event) {
    const target = event.target;
    const tradeId = target.dataset.tradeId;

    if (target.classList.contains('edit-btn')) {
        if (tradeId) {
            window.location.href = `../index.html?tradeId=${tradeId}`;
        } else {
            console.error("No trade ID found for edit button.");
        }
    } else if (target.classList.contains('delete-btn')) {
        if (tradeId) {
            if (confirm('آیا از حذف این ترید اطمینان دارید؟ این عملیات برگشت ناپذیر است.')) {
                const success = await deleteTradeFromApi(tradeId);
                if (success) {
                    allTrades = allTrades.filter(trade => trade.id !== parseInt(tradeId));
                    populateTradesTable(allTrades);
                    updateSummaryStats(allTrades);
                } else {
                    alert('خطا در حذف ترید رخ داد.');
                }
            }
        } else {
            console.error("No trade ID found for delete button.");
        }
    }
}

async function deleteTradeFromApi(tradeId) {
    console.log(`Attempting to delete trade with ID: ${tradeId}`);
    try {
        const response = await fetch(`/api/trades/${tradeId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            console.error("HTTP error deleting trade:", response.status);
            if (response.status === 404) {
                alert("ترید مورد نظر یافت نشد.");
            } else {
                alert("خطا در حذف ترید.");
            }
            return false;
        }
        console.log(`Trade with ID ${tradeId} deleted successfully.`);
        return true;
    } catch (error) {
        console.error("Error deleting trade:", error);
        alert("خطا در ارتباط با سرور برای حذف ترید.");
        return false;
    }
}

// ===========================================
// Initialization
// ===========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed for reports page.");

    // بارگذاری و ذخیره تمام تریدها
    const trades = await fetchTradesFromApi();
    allTrades = trades;

    // دریافت اطلاعات پایه و پر کردن فیلترها
    masterData = await fetchMasterDataFromApi();
    populateFilterOptions(masterData, allTrades);

    // پر کردن اولیه جدول و آمار
    populateTradesTable(allTrades);
    updateSummaryStats(allTrades);

    // اضافه کردن Event Listenerها
    document.getElementById('filter-apply-btn').addEventListener('click', applyFilters);
    document.getElementById('filter-reset-btn').addEventListener('click', resetFilters);

    // اضافه کردن Event Listener برای دکمه‌های ویرایش و حذف
    const tradesTableBody = document.getElementById('trades-table-body');
    if (tradesTableBody) {
        tradesTableBody.addEventListener('click', handleTableActions);
    } else {
        console.error("Element with ID 'trades-table-body' not found. Edit/Delete buttons might not work.");
    }
});

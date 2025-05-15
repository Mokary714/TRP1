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
        const response = await fetch('/api/masterdata'); // فرض بر وجود این API endpoint است
        if (!response.ok) {
            console.error("HTTP error fetching master data:", response.status);
            return { symbols: [], brokers: [], strategies: [], emotions: [] }; // در صورت خطا، آبجکت خالی برگردانید
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type for master data:", contentType);
            return { symbols: [], brokers: [], strategies: [], emotions: [] }; // در صورت پاسخ نامعتبر، آبجکت خالی برگردانید
        }
        const masterData = await response.json();
        console.log("Master data fetched successfully:", masterData);
        return masterData;
    } catch (error) {
        console.error("Error fetching master data for reports page:", error);
        return { symbols: [], brokers: [], strategies: [], emotions: [] }; // در صورت بروز خطا، آبجکت خالی برگردانید
    }
}

// ===========================================
// Utility Functions (Date & Calculation)
// ===========================================

// تابع کمکی برای محاسبه سود/زیان و سود/زیان پیپ
function calculateProfitLoss(trade) {
    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(trade.exitPrice);
    const volume = parseFloat(trade.volume);
    const commission = parseFloat(trade.commission || 0); // کمیسیون ممکن است وجود نداشته باشد

    if (isNaN(entryPrice) || (trade.exitTime && isNaN(exitPrice)) || isNaN(volume)) {
        // اگر exitTime ندارد، فرض کنید هنوز باز است و سود/زیان 0 است.
        return { profitLoss: 0, pipProfitLoss: 0, tradeStatus: 'Pending' };
    }

    let profitLoss = 0;
    let pipProfitLoss = 0;

    if (trade.exitTime) { // فقط اگر ترید بسته شده باشد، سود/زیان را محاسبه کن
        if (trade.tradeDirection === 'Buy') {
            // فرض: برای جفت ارزهای 4 رقمی (مثل EURUSD) ضربدر 10000, برای 2 رقمی (مثل USDJPY) ضربدر 100
            // برای سادگی فعلاً یک ضریب کلی 100000 (معادل 10 دلار به ازای هر 0.1 لات برای جفت‌ارزهای 4 رقمی)
            // و برای پیپ 10000 (4 رقم اعشار) را در نظر می‌گیریم.
            // این ضرایب بسته به نوع نماد و بروکر می‌تواند متفاوت باشد.
            profitLoss = (exitPrice - entryPrice) * volume * 100000 - commission;
            pipProfitLoss = (exitPrice - entryPrice) * 10000; // 4 رقم اعشار برای پیپ
        } else if (trade.tradeDirection === 'Sell') {
            profitLoss = (entryPrice - exitPrice) * volume * 100000 - commission;
            pipProfitLoss = (entryPrice - exitPrice) * 10000;
        }
    }

    // گرد کردن پیپ سود/زیان به دو رقم اعشار برای نمایش
    pipProfitLoss = parseFloat(pipProfitLoss.toFixed(2));

    // محاسبه وضعیت ترید بر اساس سود/زیان
    let tradeStatus = 'Pending'; // فرض اولیه
    if (trade.exitTime) { // اگر ترید بسته شده باشد
        if (profitLoss > 0) {
            tradeStatus = 'Win';
        } else if (profitLoss < 0) {
            tradeStatus = 'Loss';
        } else {
            tradeStatus = 'BreakEven';
        }
    } else {
        tradeStatus = 'Pending'; // اگر exitTime ندارد، یعنی هنوز باز است
    }

    return {
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        pipProfitLoss: pipProfitLoss,
        tradeStatus: tradeStatus // اضافه کردن وضعیت ترید
    };
}

// تابع کمکی برای محاسبه مدت زمان ترید (ساعت و دقیقه)
function calculateDuration(trade) {
    const entryTime = new Date(trade.entryTime);
    const exitTime = new Date(trade.exitTime);

    if (isNaN(entryTime) || isNaN(exitTime) || !trade.exitTime) {
        return 'در حال اجرا'; // اگر exitTime ندارد، یعنی هنوز باز است
    }

    const diffMs = exitTime - entryTime; // اختلاف به میلی‌ثانیه
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
}

// ===========================================
// UI Population Functions
// ===========================================

// پر کردن فیلترهای دراپ‌داون با اطلاعات Master Data
function populateFilterOptions(data) {
    const symbolSelect = document.getElementById('filter-symbol');
    const brokerSelect = document.getElementById('filter-broker');
    const strategySelect = document.getElementById('filter-strategy');
    // const emotionSelect = document.getElementById('filter-emotion'); // این فیلد در HTML ثابت است، نیازی به پر کردن پویا ندارد

    // پر کردن نمادها
    if (symbolSelect && data.symbols) {
        data.symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol.name;
            option.textContent = symbol.name;
            symbolSelect.appendChild(option);
        });
    }

    // پر کردن بروکرها
    if (brokerSelect && data.brokers) {
        data.brokers.forEach(broker => {
            const option = document.createElement('option');
            option.value = broker.name;
            option.textContent = broker.name;
            brokerSelect.appendChild(option);
        });
    }

    // پر کردن استراتژی‌ها
    if (strategySelect && data.strategies) {
        data.strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.name;
            option.textContent = strategy.name;
            strategySelect.appendChild(option);
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
    tableBody.innerHTML = ''; // ابتدا محتوای قبلی را پاک کنید

    if (tradesToDisplay.length === 0) {
        const noDataRow = document.createElement('tr');
        // colspan باید برابر با تعداد ستون‌های Thead باشد
        // در حال حاضر 12 ستون داریم (15 - 3 حذف + 1 اضافه = 13)
        // ستون‌های فعلی: نماد, تاریخ ورود, جهت, سشن, حجم, سود/زیان ($), سود/زیان (پیپ), مدت, بروکر, استراتژی, احساسات, وضعیت, عملیات
        // تعداد ستون‌ها: 13
        noDataRow.innerHTML = `<td colspan="13" style="text-align: center;">هیچ تریدی برای نمایش یافت نشد.</td>`;
        tableBody.appendChild(noDataRow);
        return; // پایان تابع
    }

    tradesToDisplay.forEach(trade => {
        const { profitLoss, pipProfitLoss, tradeStatus } = calculateProfitLoss(trade);
        const duration = calculateDuration(trade);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${trade.symbol}</td>
            <td>${new Date(trade.entryTime).toLocaleDateString('fa-IR')}</td>
            <td>${trade.tradeDirection === 'Buy' ? 'خرید' : 'فروش'}</td>
            <td>${trade.timeframe || '-'}</td> <td>${trade.volume}</td>
            <td><span class="profit-loss-value ${profitLoss < 0 ? 'negative' : 'positive'}">${profitLoss.toFixed(2)}</span></td>
            <td><span class="profit-loss-value ${pipProfitLoss < 0 ? 'negative' : 'positive'}">${pipProfitLoss.toFixed(2)}</span></td>
            <td>${duration}</td>
            <td>${trade.broker}</td>
            <td>${trade.strategy}</td>
            <td>${trade.emotion}</td>
            <td>${tradeStatus}</td>
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
    // const filterStatus = document.getElementById('filter-status').value; // فیلتر وضعیت حذف شد

    let filteredTrades = [...allTrades]; // همیشه با یک کپی از تمام تریدها شروع کنید

    // اعمال فیلترها
    if (filterStartDate) {
        filteredTrades = filteredTrades.filter(trade => {
            // استفاده از entryTime برای شروع فیلتر
            const tradeDate = new Date(trade.entryTime.substring(0, 10));
            const filterDate = new Date(filterStartDate);
            return tradeDate.getTime() >= filterDate.getTime();
        });
    }
    if (filterEndDate) {
        filteredTrades = filteredTrades.filter(trade => {
            // اگر exitTime دارد از آن استفاده کن، در غیر این صورت از entryTime
            const tradeDate = new Date((trade.exitTime || trade.entryTime).substring(0, 10));
            const filterDate = new Date(filterEndDate);
            // برای اینکه شامل کل روز پایان شود، یک روز به filterDate اضافه می‌کنیم
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
    // فیلتر وضعیت حذف شد
    // if (filterStatus) {
    //     filteredTrades = filteredTrades.filter(trade => {
    //         const { tradeStatus } = calculateProfitLoss(trade);
    //         return tradeStatus === filterStatus;
    //     });
    // }

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
    // document.getElementById('filter-status').value = ''; // فیلتر وضعیت حذف شد

    applyFilters(); // اعمال فیلترها با مقادیر خالی (نمایش همه تریدها)
}

// ===========================================
// Event Handlers (Edit & Delete)
// ===========================================

async function handleTableActions(event) {
    const target = event.target;
    const tradeId = target.dataset.tradeId;

    if (target.classList.contains('edit-btn')) {
        if (tradeId) {
            // هدایت به صفحه index.html با ID ترید برای ویرایش
            // ../index.html برای برگشت به پوشه ریشه از /forms/
            window.location.href = `../index.html?tradeId=${tradeId}`;
        } else {
            console.error("No trade ID found for edit button.");
        }
    } else if (target.classList.contains('delete-btn')) {
        if (tradeId) {
            if (confirm('آیا از حذف این ترید اطمینان دارید؟ این عملیات برگشت ناپذیر است.')) {
                const success = await deleteTradeFromApi(tradeId);
                if (success) {
                    // ترید را از لیست allTrades حذف کنید
                    allTrades = allTrades.filter(trade => trade.id !== parseInt(tradeId));
                    // جدول و آمار را به روز کنید
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

// بارگذاری اولیه داده‌ها و اضافه کردن Event Listenerها پس از بارگذاری کامل DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed for reports page.");

    // بارگذاری و ذخیره تمام تریدها
    const trades = await fetchTradesFromApi();
    allTrades = trades; // به روزرسانی متغیر سراسری

    // دریافت اطلاعات پایه و پر کردن فیلترها
    masterData = await fetchMasterDataFromApi();
    populateFilterOptions(masterData);

    // پر کردن اولیه جدول و آمار
    populateTradesTable(allTrades);
    updateSummaryStats(allTrades);

    // اضافه کردن Event Listenerها
    document.getElementById('filter-apply-btn').addEventListener('click', applyFilters);
    document.getElementById('filter-reset-btn').addEventListener('click', resetFilters);

    // اضافه کردن Event Listener برای دکمه‌های ویرایش و حذف به صورت делеگاسیون
    const tradesTableBody = document.getElementById('trades-table-body');
    if (tradesTableBody) {
        tradesTableBody.addEventListener('click', handleTableActions);
    } else {
        console.error("Element with ID 'trades-table-body' not found. Edit/Delete buttons might not work.");
    }

    // اضافه کردن Event Listener به فیلترها برای اعمال فیلتر به صورت خودکار (اختیاری)
    // اگر میخواهید با هر تغییر فیلتر، نتایج بروز شوند، این خطوط را فعال کنید:
    // document.getElementById('filter-start-date').addEventListener('change', applyFilters);
    // document.getElementById('filter-end-date').addEventListener('change', applyFilters);
    // document.getElementById('filter-symbol').addEventListener('change', applyFilters);
    // document.getElementById('filter-broker').addEventListener('change', applyFilters);
    // document.getElementById('filter-strategy').addEventListener('change', applyFilters);
    // document.getElementById('filter-emotion').addEventListener('change', applyFilters);
    // document.getElementById('filter-status').addEventListener('change', applyFilters);
});
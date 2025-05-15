// server.js - Updated to handle both masterData.json and trades.json

const express = require('express');
const path = require('path');
const fs = require('fs').promises; // استفاده از fs.promises برای کار با توابع ناهمزمان فایل سیستم

const app = express();
const PORT = 3000;

// مسیر فایل‌های JSON
const masterDataPath = path.join(__dirname, 'data', 'masterData.json');
const tradesPath = path.join(__dirname, 'data', 'trades.json');

// اطمینان از وجود دایرکتوری data
const dataDir = path.join(__dirname, 'data');
fs.mkdir(dataDir, { recursive: true }).catch(console.error);

// Middleware برای پردازش داده‌های JSON ارسالی در درخواست‌ها
app.use(express.json());

// Middleware برای ارائه فایل‌های استاتیک (HTML, CSS, JS)
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/', express.static(path.join(__dirname, ''))); // برای دسترسی به index.html و initial-info.html در ریشه

// -------------------- مدیریت اطلاعات پایه (Master Data) --------------------

// API endpoint برای دریافت اطلاعات پایه
app.get('/api/masterdata', async (req, res) => {
    console.log('GET /api/masterdata requested');
    try {
        // تلاش برای خواندن فایل masterData.json
        const data = await fs.readFile(masterDataPath, 'utf8');
        res.json(JSON.parse(data));
        console.log('masterData.json read and sent successfully');
    } catch (error) {
        if (error.code === 'ENOENT') {
            // اگر فایل وجود نداشت، یک ساختار اولیه خالی برگردان
            console.log('masterData.json not found, returning empty initial data.');
            res.json({ symbols: [], brokers: [], strategies: [] });
        } else {
            // در صورت بروز خطای دیگر در خواندن فایل
            console.error('Error reading masterData.json:', error);
            res.status(500).json({ error: 'Failed to read master data' });
        }
    }
});

// API endpoint برای ذخیره اطلاعات پایه
app.post('/api/masterdata', async (req, res) => {
    console.log('POST /api/masterdata requested with data:', req.body);
    const masterData = req.body; // داده‌های جدید اطلاعات پایه از بدنه درخواست

    try {
        // نوشتن داده‌های جدید در فایل masterData.json
        await fs.writeFile(masterDataPath, JSON.stringify(masterData, null, 2), 'utf8');
        res.json({ message: 'Master data saved successfully' });
        console.log('masterData.json saved successfully');
    } catch (error) {
        // در صورت بروز خطا در نوشتن فایل
        console.error('Error writing masterData.json:', error);
        res.status(500).json({ error: 'Failed to save master data' });
    }
});

// -------------------- مدیریت اطلاعات تریدها (Trades) --------------------

// تابع کمکی برای خواندن تریدها از فایل
async function readTrades() {
    try {
        const data = await fs.readFile(tradesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // اگر فایل وجود نداشت، یک آرایه خالی برگردان
            console.log('trades.json not found, returning empty array.');
            return [];
        } else {
            // در صورت بروز خطای دیگر
            console.error('Error reading trades.json:', error);
            throw new Error('Failed to read trades data'); // ارسال خطا به بالا
        }
    }
}

// تابع کمکی برای نوشتن تریدها در فایل
async function writeTrades(trades) {
    try {
        await fs.writeFile(tradesPath, JSON.stringify(trades, null, 2), 'utf8');
        console.log('trades.json saved successfully.');
    } catch (error) {
        console.error('Error writing trades.json:', error);
        throw new Error('Failed to save trades data'); // ارسال خطا به بالا
    }
}

// API endpoint برای دریافت تمام تریدها
app.get('/api/trades', async (req, res) => {
    console.log('GET /api/trades requested');
    try {
        const trades = await readTrades(); // خواندن تریدها با استفاده از تابع کمکی
        res.json(trades);
        console.log('trades.json read and sent successfully.');
    } catch (error) {
        console.error('Error in GET /api/trades:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint برای دریافت یک ترید خاص بر اساس شناسه
app.get('/api/trades/:id', async (req, res) => {
    const tradeId = req.params.id; // گرفتن شناسه از پارامترهای URL
    console.log(`GET /api/trades/:id requested for ID: ${tradeId}`);

    // تبدیل شناسه به عدد برای مقایسه صحیح (اگر ID ها در دیتابیس عددی هستند)
    const idNum = parseInt(tradeId);
    if (isNaN(idNum)) {
        console.error("Invalid trade ID received for fetch:", tradeId);
        return res.status(400).json({ error: 'Invalid trade ID' });
    }

    try {
        const trades = await readTrades(); // خواندن تمام تریدها
        const trade = trades.find(t => t.id === idNum); // پیدا کردن ترید با شناسه مطابق

        if (trade) {
            res.json(trade); // اگر ترید پیدا شد، آن را برگردان
            console.log(`Trade with ID ${tradeId} found and sent.`);
        } else {
            // اگر ترید پیدا نشد
            console.warn(`Trade with ID ${tradeId} not found in readTrades() results.`);
            res.status(404).json({ error: 'Trade not found' });
        }
    } catch (error) {
        console.error(`Error in GET /api/trades/:id for ID ${tradeId}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// --- اصلاح شده: API endpoint برای ذخیره یک ترید جدید (فقط POST) ---
app.post('/api/trades', async (req, res) => {
    console.log('POST /api/trades requested with data:', req.body);
    const tradeData = req.body; // داده‌های ترید از بدنه درخواست

    // اگر ترید دیتا شامل ID بود، یعنی فرانت‌اند قصد به‌روزرسانی داشته.
    // این حالت باید توسط PUT /api/trades/:id هندل شود، نه POST.
    if (tradeData.id) {
        console.warn("POST /api/trades received data with an ID. This should be handled by PUT /api/trades/:id for updates.");
        return res.status(400).json({ error: "Please use PUT /api/trades/:id for updates, or remove 'id' for new trade creation." });
    }

    try {
        const trades = await readTrades(); // خواندن تریدهای موجود
        
        // حالت افزودن جدید
        // تولید شناسه یکتا (می‌تواند timestamp فعلی باشد)
        tradeData.id = Date.now();
        trades.push(tradeData); // اضافه کردن ترید جدید
        console.log('New trade added with ID:', tradeData.id);

        await writeTrades(trades); // نوشتن لیست به‌روز شده در فایل
        res.status(201).json({ message: 'Trade created successfully', tradeId: tradeData.id }); // ارسال شناسه ترید ذخیره شده و وضعیت 201 Created
        console.log('Trade data saved to trades.json');

    } catch (error) {
        console.error('Error in POST /api/trades:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- جدید: API endpoint برای به‌روزرسانی یک ترید (PUT) ---
app.put('/api/trades/:id', async (req, res) => {
    const tradeIdToUpdate = parseInt(req.params.id); // گرفتن شناسه از پارامترهای URL
    console.log(`PUT /api/trades/:id requested for ID: ${tradeIdToUpdate} with data:`, req.body);

    if (isNaN(tradeIdToUpdate)) {
        console.error("Invalid trade ID received for update (PUT):", req.params.id);
        return res.status(400).json({ error: 'Invalid trade ID' });
    }

    const updatedTradeData = req.body; // داده‌های جدید برای ترید از بدنه درخواست
    // اطمینان از اینکه ID در داده‌های دریافتی با ID موجود در URL همخوانی دارد (اختیاری اما توصیه شده)
    if (updatedTradeData.id && updatedTradeData.id !== tradeIdToUpdate) {
        console.warn(`Mismatch between URL ID (${tradeIdToUpdate}) and body ID (${updatedTradeData.id}). Using URL ID.`);
        updatedTradeData.id = tradeIdToUpdate;
    } else if (!updatedTradeData.id) {
        updatedTradeData.id = tradeIdToUpdate; // اگر ID در بدنه نبود، ID از URL را قرار بده
    }


    try {
        let trades = await readTrades(); // خواندن تریدهای موجود

        const existingIndex = trades.findIndex(trade => trade.id === tradeIdToUpdate);

        if (existingIndex > -1) {
            trades[existingIndex] = updatedTradeData; // جایگزینی ترید قدیمی با داده‌های جدید
            await writeTrades(trades); // نوشتن لیست به‌روز شده در فایل
            res.json({ message: 'Trade updated successfully', tradeId: tradeIdToUpdate });
            console.log(`Trade with ID ${tradeIdToUpdate} updated and saved to trades.json.`);
        } else {
            // اگر ترید با شناسه مورد نظر پیدا نشد
            console.warn(`Trade with ID ${tradeIdToUpdate} not found for update (PUT).`);
            res.status(404).json({ error: 'Trade not found' });
        }

    } catch (error) {
        console.error('Error in PUT /api/trades/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint برای حذف یک ترید بر اساس شناسه
app.delete('/api/trades/:id', async (req, res) => {
    const tradeIdToDelete = req.params.id; // گرفتن شناسه از پارامترهای URL
    console.log('DELETE /api/trades/:id requested for ID:', tradeIdToDelete);

    // تبدیل شناسه به عدد برای مقایسه صحیح با ID های تولید شده توسط Date.now()
    const idToDeleteNum = parseInt(tradeIdToDelete);
    if (isNaN(idToDeleteNum)) {
        console.error("Invalid trade ID received for deletion:", tradeIdToDelete);
        return res.status(400).json({ error: 'Invalid trade ID' });
    }

    try {
        const trades = await readTrades(); // خواندن تریدهای موجود
        const initialCount = trades.length;

        // فیلتر کردن ترید مورد نظر برای حذف
        const updatedTrades = trades.filter(trade => trade.id !== idToDeleteNum);
        console.log(`Trades count before delete: ${initialCount}, after: ${updatedTrades.length}`);


        if (updatedTrades.length < initialCount) {
            // اگر تعداد کم شده، یعنی ترید پیدا شده و حذف شده است
            await writeTrades(updatedTrades); // نوشتن لیست به‌روز شده
            res.json({ message: 'Trade deleted successfully' });
            console.log('Trade with ID', tradeIdToDelete, 'deleted successfully from trades.json');
        } else {
            // اگر تعداد کم نشده، یعنی ترید با این شناسه پیدا نشده است
            console.warn('Trade with ID', tradeIdToDelete, 'not found for deletion.');
            res.status(404).json({ error: 'Trade not found' });
        }

    } catch (error) {
        console.error('Error in DELETE /api/trades/:id:', error);
        res.status(500).json({ error: error.message });
    }
});


// مدیریت خطاهای مسیرهای ناموجود
app.use((req, res) => {
    console.warn(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).send('Not Found');
});

// راه‌اندازی سرور
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Master Data management: http://localhost:${PORT}/forms/initial-info.html`);
    console.log(`Trade Journal: http://localhost:${PORT}/`);
});
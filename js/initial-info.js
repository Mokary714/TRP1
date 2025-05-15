// js/initial-info.js - Master Data Management Script - Functional Version

// ----- Async functions for interacting with the Node.js API -----

// تابع ناهمزمان برای خواندن اطلاعات پایه از API سرور
async function fetchMasterDataFromApi() {
    console.log("Fetching master data from API...");
    try {
        const response = await fetch('/api/masterdata');
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("HTTP error fetching master data:", response.status, errorBody);
            alert(`خطا در دریافت اطلاعات پایه: ${response.status}`);
            return { symbols: [], brokers: [], strategies: [], emotions: [] }; // اضافه کردن emotions
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error("Invalid content type:", contentType);
            alert("پاسخ سرور نامعتبر است.");
            return { symbols: [], brokers: [], strategies: [], emotions: [] }; // اضافه کردن emotions
        }

        const data = await response.json();
        console.log("Master data fetched successfully:", data);
        // اطمینان از وجود آرایه های خالی در صورت عدم وجود در داده دریافتی
        if (!data.symbols) data.symbols = [];
        if (!data.brokers) data.brokers = [];
        if (!data.strategies) data.strategies = [];
        if (!data.emotions) data.emotions = [];
        // اطمینان از وجود آرایه accounts داخل هر بروکر
        if (data.brokers && data.brokers.length > 0) {
            data.brokers.forEach(broker => {
                if (!broker.accounts) {
                    broker.accounts = [];
                }
            });
        }

        return data;
    } catch (error) {
        console.error("Error fetching master data:", error);
        alert('خطا در ارتباط با سرور برای دریافت اطلاعات پایه.');
        return { symbols: [], brokers: [], strategies: [], emotions: [] }; // اضافه کردن emotions
    }
}

// تابع ناهمزمان برای ذخیره اطلاعات پایه در API سرور
async function saveMasterDataToApi(data) {
    console.log("Saving master data to API:", data);
    try {
        const response = await fetch('/api/masterdata', {
            method: 'POST', // سرور ما POST را برای ذخیره/به‌روزرسانی masterData مدیریت می‌کند
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("HTTP error saving master data:", response.status, errorBody);
            alert('خطا در ذخیره‌سازی اطلاعات.');
            return false;
        }

        const result = await response.json(); // سرور ما پس از ذخیره موفق، داده‌های ذخیره شده را برمی‌گرداند
        console.log("Master data saved successfully via API:", result);
        return true;
    } catch (error) {
        console.error("Error saving master data:", error);
        alert('خطا در ارتباط با سرور برای ذخیره‌سازی.');
        return false;
    }
}

// ----- توابع کمکی -----

function findBrokerById(masterData, id) {
    // استفاده از == برای تطابق با IDهای تولید شده با Date.now() که ممکن است رشته باشند
    return masterData.brokers.find(item => item.id == id);
}

function findAccountById(masterData, brokerId, accountId) {
    const broker = masterData.brokers.find(item => item.id == brokerId);
    if (broker && broker.accounts) {
         // استفاده از == برای تطابق با IDهای تولید شده با Date.now() که ممکن است رشته باشند
        return broker.accounts.find(account => account.id == accountId);
    }
    return null;
}


// ----- توابع Populate و Display -----

async function populateBrokerSelect() {
    console.log("populateBrokerSelect called (API version).");
    const brokerSelectElement = document.getElementById('selectBroker');
    if (!brokerSelectElement) {
        console.error("selectBroker element not found in populateBrokerSelect.");
        return;
    }

    const masterData = await fetchMasterDataFromApi();
    const currentSelectedValue = brokerSelectElement.value;
     // ذخیره ID بروکر انتخاب شده فعلی اگر وجود دارد
    const currentSelectedOption = brokerSelectElement.options[brokerSelectElement.selectedIndex];
    const currentSelectedBrokerId = currentSelectedOption && currentSelectedOption.dataset.brokerId ? currentSelectedOption.dataset.brokerId : null;


    brokerSelectElement.innerHTML = '<option value="">انتخاب کنید</option>';

    if (masterData.brokers && masterData.brokers.length > 0) {
        // مرتب‌سازی بروکرها بر اساس نام به صورت صعودی
        masterData.brokers.sort((a, b) => a.name.localeCompare(b.name));

        masterData.brokers.forEach(broker => {
            const option = document.createElement('option');
            option.value = broker.name;
            option.textContent = broker.name;
            option.dataset.brokerId = broker.id; // ذخیره ID در dataset
            brokerSelectElement.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'بروکری ثبت نشده است.';
        brokerSelectElement.appendChild(option);
    }

    // تلاش برای انتخاب مجدد مقدار یا ID قبلی پس از به‌روزرسانی لیست
    if (currentSelectedBrokerId) {
        const optionToSelect = brokerSelectElement.querySelector(`option[data-broker-id="${currentSelectedBrokerId}"]`);
        if (optionToSelect) {
            selectBrokerSelect.value = optionToSelect.value; // انتخاب بر اساس مقدار option
             console.log(`Previously selected broker with ID ${currentSelectedBrokerId} re-selected.`);
        } else {
            console.log(`Previously selected broker with ID ${currentSelectedBrokerId} not found after fetching data.`);
             // اگر بروکر قبلی دیگر وجود ندارد، مطمئن شویم هیچ چیز انتخاب نشده
             selectBrokerSelect.value = "";
        }
    } else if (currentSelectedValue) {
         // اگر ID قبلی نداشتیم، تلاش کنیم با Name انتخاب کنیم
         const optionToSelect = brokerSelectElement.querySelector(`option[value="${currentSelectedValue}"]`);
         if (optionToSelect) {
            selectBrokerSelect.value = currentSelectedValue;
            console.log(`Previously selected broker with name "${currentSelectedValue}" re-selected.`);
         } else {
             console.log(`Previously selected broker with name "${currentSelectedValue}" not found after fetching data.`);
              selectBrokerSelect.value = "";
         }
    }


    // به‌روزرسانی لیست حساب‌ها بر اساس بروکر انتخاب شده (چه قبلی چه جدید)
    await displayAccountsForSelectedBroker();
    console.log("populateBrokerSelect finished (API version).");
}

async function displayAccountsForSelectedBroker() {
    console.log("displayAccountsForSelectedBroker called (API version).");
    const accountListUl = document.getElementById('account-list');
    const selectBrokerSelect = document.getElementById('selectBroker');

    if (!accountListUl || !selectBrokerSelect) {
        console.error("account-list or selectBroker element not found.");
        return;
    }

    const masterData = await fetchMasterDataFromApi();
    const selectedBrokerName = selectBrokerSelect.value;
    const selectedBrokerOption = selectBrokerSelect.options[selectBrokerSelect.selectedIndex];
     // خواندن ID ذخیره شده در dataset گزینه انتخاب شده
    const selectedBrokerId = selectedBrokerOption && selectedBrokerOption.dataset.brokerId ? selectedBrokerOption.dataset.brokerId : null;


    accountListUl.innerHTML = ''; // پاکسازی لیست فعلی

    // پیدا کردن بروکر انتخاب شده بر اساس ID ذخیره شده
    const selectedBroker = masterData.brokers.find(b => b.id == selectedBrokerId);

    if (selectedBroker && selectedBroker.accounts && selectedBroker.accounts.length > 0) {
        console.log("Selected broker found and has accounts:", selectedBroker.accounts);
         // مرتب‌سازی حساب‌ها بر اساس شماره حساب به صورت صعودی
         selectedBroker.accounts.sort((a, b) => a.number.localeCompare(b.number));

        selectedBroker.accounts.forEach(account => {
            const li = document.createElement('li');
            li.innerHTML = `
                شماره حساب: ${account.number} - موجودی اولیه: ${parseFloat(account.initialBalance || 0).toFixed(2)}$
                <div class="list-item-actions">
                    <button class="edit-account-button" data-broker-id="${selectedBroker.id}" data-account-id="${account.id}">✏️</button>
                    <button class="delete-account-button" data-broker-id="${selectedBroker.id}" data-account-id="${account.id}">❌</button>
                </div>
            `;
            li.dataset.accountId = account.id;
             li.dataset.brokerId = selectedBroker.id; // ذخیره ID بروکر مادر در dataset عنصر li
            accountListUl.appendChild(li);
        });
    } else if (selectedBrokerName) {
        console.log("Selected broker found but has no accounts.");
        const li = document.createElement('li');
        li.textContent = `برای بروکر "${selectedBrokerName}" شماره حسابی ثبت نشده است.`;
        accountListUl.appendChild(li);
    } else {
        console.log("No broker selected. Displaying default account list message.");
        const li = document.createElement('li');
        li.textContent = 'لیست شماره حساب‌ها پس از انتخاب بروکر نمایش داده می‌شود.';
        accountListUl.appendChild(li);
    }
    console.log("displayAccountsForSelectedBroker finished (API version).");
}


// ----- توابع نمایش لیست‌های نمادها و استراتژی‌ها -----

async function displaySymbols() {
    console.log("displaySymbols called.");
    const symbolListUl = document.getElementById('symbol-list');
    if (!symbolListUl) {
        console.error("symbol-list element not found.");
        return;
    }

    const masterData = await fetchMasterDataFromApi();
    symbolListUl.innerHTML = ''; // پاکسازی لیست فعلی

    if (masterData.symbols && masterData.symbols.length > 0) {
        // مرتب‌سازی نمادها بر اساس نام به صورت صعودی
        masterData.symbols.sort((a, b) => a.name.localeCompare(b.name));

        masterData.symbols.forEach(symbol => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${symbol.name}
                <div class="list-item-actions">
                    <button class="edit-symbol-button" data-symbol-id="${symbol.id}">✏️</button>
                    <button class="delete-symbol-button" data-symbol-id="${symbol.id}">❌</button>
                </div>
            `;
            li.dataset.symbolId = symbol.id; // ذخیره ID نماد در dataset
            symbolListUl.appendChild(li);
        });
        console.log(`Displayed ${masterData.symbols.length} symbols.`);
    } else {
        const li = document.createElement('li');
        li.textContent = 'هیچ نمادی ثبت نشده است.';
        symbolListUl.appendChild(li);
        console.log("No symbols to display.");
    }
    console.log("displaySymbols finished.");
}

async function displayStrategies() {
    console.log("displayStrategies called.");
    const strategyListUl = document.getElementById('strategy-list');
    if (!strategyListUl) {
        console.error("strategy-list element not found.");
        return;
    }

    const masterData = await fetchMasterDataFromApi();
    // اصلاح شد: استفاده از strategyListUl به جای symbolListUl
    strategyListUl.innerHTML = ''; // <-- خط اصلاح شده

    if (masterData.strategies && masterData.strategies.length > 0) {
         // مرتب‌سازی استراتژی‌ها بر اساس نام به صورت صعودی
         masterData.strategies.sort((a, b) => a.name.localeCompare(b.name));

        masterData.strategies.forEach(strategy => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${strategy.name}
                <div class="list-item-actions">
                    <button class="edit-strategy-button" data-strategy-id="${strategy.id}">✏️</button>
                    <button class="delete-strategy-button" data-strategy-id="${strategy.id}">❌</button>
                </div>
            `;
            li.dataset.strategyId = strategy.id; // ذخیره ID استراتژی در dataset
            strategyListUl.appendChild(li);
        });
        console.log(`Displayed ${masterData.strategies.length} strategies.`);
    } else {
        const li = document.createElement('li');
        li.textContent = 'هیچ استراتژی ثبت نشده است.';
        strategyListUl.appendChild(li);
        console.log("No strategies to display.");
    }
    console.log("displayStrategies finished.");
}


// ----- توابع ویرایش فرم‌ها و خروج از حالت ویرایش -----

async function populateBrokerFormForEdit(brokerId) {
    console.log("populateBrokerFormForEdit called for broker ID:", brokerId);
    const masterData = await fetchMasterDataFromApi();
    const broker = findBrokerById(masterData, brokerId);

    if (broker) {
        console.log("Broker found for editing:", broker);
        const newBrokerNameInput = document.getElementById('newBrokerName');
        const addBrokerForm = document.getElementById('add-broker-form');
        const brokerFormSubmitButton = addBrokerForm ? addBrokerForm.querySelector('button[type="submit"]') : null;

        if (newBrokerNameInput && addBrokerForm && brokerFormSubmitButton) {
            newBrokerNameInput.value = broker.name;
            addBrokerForm.dataset.editingId = broker.id; // ذخیره ID در حالت ویرایش
            brokerFormSubmitButton.textContent = 'به‌روزرسانی بروکر';
             // اسکرول به سمت فرم
            addBrokerForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log("Broker form populated for editing.");
        } else {
            console.error("Form elements for broker edit not found.");
            alert("عناصر فرم برای ویرایش بروکر پیدا نشدند.");
        }
    } else {
        alert('بروکر مورد نظر برای ویرایش پیدا نشد.');
        console.error("Broker not found in fetched data for editing.");
    }
}

function exitBrokerEditMode() {
    console.log("exitBrokerEditMode called.");
    const addBrokerForm = document.getElementById('add-broker-form');
    const newBrokerNameInput = document.getElementById('newBrokerName');
    const brokerFormSubmitButton = addBrokerForm ? addBrokerForm.querySelector('button[type="submit"]') : null;

    if (addBrokerForm && newBrokerNameInput && brokerFormSubmitButton) {
        addBrokerForm.reset(); // پاک کردن فرم
        delete addBrokerForm.dataset.editingId; // حذف ID ذخیره شده
        brokerFormSubmitButton.textContent = 'افزودن بروکر'; // برگرداندن متن دکمه
        console.log("Broker edit mode exited.");
    } else {
        console.error("Broker form elements not found in exitBrokerEditMode.");
    }
}

async function populateAccountFormForEdit(brokerId, accountId) {
    console.log(`populateAccountFormForEdit called for broker ${brokerId}, account ${accountId}`);
    const masterData = await fetchMasterDataFromApi();
    const account = findAccountById(masterData, brokerId, accountId);

    if (account) {
        console.log("Account found for editing:", account);
        const newAccountNumberInput = document.getElementById('newAccountNumber');
        const initialBalanceInput = document.getElementById('initialBalance');
        const addAccountForm = document.getElementById('add-account-form');
        const addAccountButton = document.getElementById('add-account-button'); // دکمه ارسال فرم حساب
        const selectBrokerSelect = document.getElementById('selectBroker'); // کمبوباکس بروکر در فرم حساب

        if (newAccountNumberInput && initialBalanceInput && addAccountForm && addAccountButton && selectBrokerSelect) {
            newAccountNumberInput.value = account.number;
            initialBalanceInput.value = account.initialBalance;
            addAccountForm.dataset.editingId = account.id; // ذخیره ID حساب در حالت ویرایش
            addAccountForm.dataset.editingBrokerId = brokerId; // ذخیره ID بروکر مادر حساب در حالت ویرایش
            addAccountButton.textContent = 'به‌روزرسانی شماره حساب'; // تغییر متن دکمه

            // نمایش و فعال کردن فرم افزودن حساب (اگر مخفی بود)
            addAccountForm.style.display = 'flex';
            addAccountButton.disabled = false;


            // اگر بروکر انتخاب شده در کمبوباکس حساب، بروکر مادر حساب در حال ویرایش نبود، آن را انتخاب کن
            const broker = findBrokerById(masterData, brokerId);
            if (broker && selectBrokerSelect.value !== broker.name) {
                 selectBrokerSelect.value = broker.name;
                 // بعد از تغییر مقدار selectBroker، Event change آن فعال می شود و displayAccountsForSelectedBroker() صدا زده می شود
                 // اما اگر به صورت دستی مقدار را تغییر دهیم، Event ممکن است فعال نشود. پس بهتر است صراحتا تابع نمایش حساب ها را صدا بزنیم
                 // و همچنین dataset.brokerId گزینه انتخاب شده را به‌روز کنیم
                 const selectedOption = selectBrokerSelect.options[selectBrokerSelect.selectedIndex];
                 if (selectedOption) selectedOption.dataset.brokerId = broker.id;
                 await displayAccountsForSelectedBroker(); // به‌روزرسانی لیست حساب‌ها
                 console.log("Broker select value changed for account edit.");

             } else if (broker) {
                 // اگر بروکر قبلا هم انتخاب شده بود، مطمئن شویم لیست حساب ها به‌روز است
                 const selectedOption = selectBrokerSelect.options[selectBrokerSelect.selectedIndex];
                 if (selectedOption) selectedOption.dataset.brokerId = broker.id;
                  await displayAccountsForSelectedBroker();
                  console.log("Broker select value already correct for account edit.");

             } else {
                 console.error("Broker not found for account edit form population.");
                 // شاید لازم باشد حالت خطا را مدیریت کنیم
             }


            addAccountForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); // اسکرول به سمت فرم
            console.log("Account form populated and scrolled into view.");
        } else {
            console.error("Form elements for account edit not found.");
            alert("عناصر فرم برای ویرایش حساب پیدا نشدند.");
        }
    } else {
        alert('حساب مورد نظر برای ویرایش پیدا نشد.');
        console.error("Account not found in fetched data for editing.");
    }
    console.log("populateAccountFormForEdit finished.");
}

function exitAccountEditMode() {
    console.log("exitAccountEditMode called.");
    const addAccountForm = document.getElementById('add-account-form');
    const newAccountNumberInput = document.getElementById('newAccountNumber');
    const initialBalanceInput = document.getElementById('initialBalance');
    const addAccountButton = document.getElementById('add-account-button'); // دکمه ارسال فرم حساب

    if (addAccountForm && newAccountNumberInput && initialBalanceInput && addAccountButton) {
        addAccountForm.reset(); // پاک کردن فرم
        delete addAccountForm.dataset.editingId; // حذف ID ذخیره شده
        delete addAccountForm.dataset.editingBrokerId; // حذف ID بروکر مادر ذخیره شده
        addAccountButton.textContent = 'افزودن شماره حساب'; // برگرداندن متن دکمه
        console.log("Account edit mode exited.");
    } else {
        console.error("Account form elements not found in exitAccountEditMode.");
    }
}

async function populateSymbolFormForEdit(symbolId) {
    console.log("populateSymbolFormForEdit called for symbol ID:", symbolId);
    const masterData = await fetchMasterDataFromApi();
     // استفاده از == برای تطابق با IDهای تولید شده با Date.now() که رشته هستند
    const symbol = masterData.symbols.find(item => item.id == symbolId);

    if (symbol) {
        console.log("Symbol found for editing:", symbol);
        const newSymbolNameInput = document.getElementById('newSymbolName');
        const addSymbolForm = document.getElementById('add-symbol-form');
        const symbolFormSubmitButton = addSymbolForm ? addSymbolForm.querySelector('button[type="submit"]') : null;

        if (newSymbolNameInput && addSymbolForm && symbolFormSubmitButton) {
            newSymbolNameInput.value = symbol.name;
            addSymbolForm.dataset.editingId = symbol.id; // ذخیره ID در حالت ویرایش
            symbolFormSubmitButton.textContent = 'به‌روزرسانی نماد'; // تغییر متن دکمه
             addSymbolForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); // اسکرول به سمت فرم
            console.log("Symbol form populated for editing.");
        } else {
            console.error("Form elements for symbol edit not found.");
            alert("عناصر فرم برای ویرایش نماد پیدا نشدند.");
        }
    } else {
        alert('نماد مورد نظر برای ویرایش پیدا نشد.');
        console.error("Symbol not found in fetched data for editing.");
    }
}

function exitSymbolEditMode() {
    console.log("exitSymbolEditMode called.");
    const addSymbolForm = document.getElementById('add-symbol-form');
    const newSymbolNameInput = document.getElementById('newSymbolName');
    const symbolFormSubmitButton = addSymbolForm ? addSymbolForm.querySelector('button[type="submit"]') : null;

    if (addSymbolForm && newSymbolNameInput && symbolFormSubmitButton) {
        addSymbolForm.reset(); // پاک کردن فرم
        delete addSymbolForm.dataset.editingId; // حذف ID ذخیره شده
        symbolFormSubmitButton.textContent = 'افزودن نماد'; // برگرداندن متن دکمه
        console.log("Symbol edit mode exited.");
    } else {
        console.error("Symbol form elements not found in exitSymbolEditMode.");
    }
}

async function populateStrategyFormForEdit(strategyId) {
    console.log("populateStrategyFormForEdit called for strategy ID:", strategyId);
    const masterData = await fetchMasterDataFromApi();
     // استفاده از == برای تطابق با IDهای تولید شده با Date.now() که رشته هستند
    const strategy = masterData.strategies.find(item => item.id == strategyId);

    if (strategy) {
        console.log("Strategy found for editing:", strategy);
        const newStrategyNameInput = document.getElementById('newStrategyName');
        const addStrategyForm = document.getElementById('add-strategy-form');
        const strategyFormSubmitButton = addStrategyForm ? addStrategyForm.querySelector('button[type="submit"]') : null;

        if (newStrategyNameInput && addStrategyForm && strategyFormSubmitButton) {
            newStrategyNameInput.value = strategy.name;
            addStrategyForm.dataset.editingId = strategy.id; // ذخیره ID در حالت ویرایش
            strategyFormSubmitButton.textContent = 'به‌روزرسانی استراتژی'; // تغییر متن دکمه
             addStrategyForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); // اسکرول به سمت فرم
            console.log("Strategy form populated for editing.");
        } else {
            console.error("Form elements for strategy edit not found.");
            alert("عناصر فرم برای ویرایش استراتژی پیدا نشدند.");
        }
    } else {
        alert('استراتژی مورد نظر برای ویرایش پیدا نشد.');
        console.error("Strategy not found in fetched data for editing.");
    }
}

function exitStrategyEditMode() {
    console.log("exitStrategyEditMode called.");
    const addStrategyForm = document.getElementById('add-strategy-form');
    const newStrategyNameInput = document.getElementById('newStrategyName');
    const strategyFormSubmitButton = addStrategyForm ? addStrategyForm.querySelector('button[type="submit"]') : null;

    if (addStrategyForm && newStrategyNameInput && strategyFormSubmitButton) {
        addStrategyForm.reset(); // پاک کردن فرم
        delete addStrategyForm.dataset.editingId; // حذف ID ذخیره شده
        strategyFormSubmitButton.textContent = 'افزودن استراتژی'; // برگرداندن متن دکمه
        console.log("Strategy edit mode exited.");
    } else {
        console.error("Strategy form elements not found in exitStrategyEditMode.");
    }
}

// ----- توابع حذف -----

async function deleteBrokerFromApi(id) {
    console.log("Attempting to delete broker with ID:", id, "(API version)");
    try {
        const masterData = await fetchMasterDataFromApi();
        const initialBrokerCount = masterData.brokers.length;
         // فیلتر کردن بروکر برای حذف (حذف بروکر و تمام حساب‌های مرتبط آن)
        masterData.brokers = masterData.brokers.filter(broker => broker.id != id);
        console.log(`Filtered brokers. Count before: ${initialBrokerCount}, after: ${masterData.brokers.length}`);

        // فقط اگر تعداد کم شد (یعنی بروکر پیدا و فیلتر شد)، داده‌ها را ذخیره کن
        if (masterData.brokers.length < initialBrokerCount) {
            const saveSuccess = await saveMasterDataToApi(masterData);
            if (saveSuccess) {
                alert(`بروکر با شناسه ${id} حذف شد.`);
                await populateBrokerSelect(); // به‌روزرسانی کمبوباکس بروکر
                // displayAccountsForSelectedBroker() در داخل populateBrokerSelect صدا زده می شود
                exitBrokerEditMode(); // اگر در حال ویرایش همین بروکر بود، از حالت ویرایش خارج شود

                 // اگر حساب در حال ویرایشی متعلق به این بروکر حذف شده بود، از حالت ویرایش حساب هم خارج شو
                 const addAccountForm = document.getElementById('add-account-form');
                 if (addAccountForm && addAccountForm.dataset.editingBrokerId == id && addAccountForm.dataset.editingId) {
                     exitAccountEditMode();
                 }

                // نیاز به به‌روزرسانی کمبوباکس بروکر در صفحه اصلی هم داریم اگر باز بود (پیچیده‌تر است)
                console.log("Broker deleted and saved successfully via API.");
            } else {
                console.error("Failed to save master data after broker deletion via API.");
            }
        } else {
            console.warn(`Broker with ID ${id} not found in fetched data for deletion.`);
            alert(`بروکر با شناسه ${id} پیدا نشد.`);
        }
    } catch (error) {
        console.error("Error deleting broker:", error);
        alert('خطا در حذف بروکر.');
    }
}

async function deleteAccountFromApi(brokerId, accountId) {
    console.log(`Attempting to delete account ${accountId} from broker ${brokerId} (API version).`);
    try {
        const masterData = await fetchMasterDataFromApi();
        const broker = masterData.brokers.find(b => b.id == brokerId);

        if (broker && broker.accounts) {
            const initialAccountCount = broker.accounts.length;
            // فیلتر کردن حساب برای حذف
            broker.accounts = broker.accounts.filter(account => account.id != accountId);
            console.log(`Filtered accounts for broker ${brokerId}. Count before: ${initialAccountCount}, after: ${broker.accounts.length}`);

            if (broker.accounts.length < initialAccountCount) {
                const saveSuccess = await saveMasterDataToApi(masterData);
                if (saveSuccess) {
                    alert(`شماره حساب با شناسه ${accountId} حذف شد.`);
                    await displayAccountsForSelectedBroker(); // به‌روزرسانی لیست حساب‌ها
                    exitAccountEditMode(); // اگر در حال ویرایش همین حساب بود، از حالت ویرایش خارج شود
                    console.log("Account deleted and saved successfully via API.");
                } else {
                    console.error("Failed to save master data after account deletion via API.");
                }
            } else {
                console.warn(`Account with ID ${accountId} not found in broker ${brokerId} in fetched data for deletion.`);
                alert(`شماره حساب با شناسه ${accountId} پیدا نشد.`);
            }
        } else {
            console.warn(`بروکر با شناسه ${brokerId} برای حذف حساب پیدا نشد.`);
            alert(`بروکر با شناسه ${brokerId} برای حذف حساب پیدا نشد.`);
        }
    } catch (error) {
        console.error("Error deleting account:", error);
        alert('خطا در حذف شماره حساب.');
    }
}

async function deleteSymbolFromApi(id) {
    console.log("Attempting to delete symbol with ID:", id);
    try {
        const masterData = await fetchMasterDataFromApi();
        const initialCount = masterData.symbols.length;
        // فیلتر کردن نماد برای حذف
        masterData.symbols = masterData.symbols.filter(symbol => symbol.id != id);
        console.log(`Filtered symbols. Count before: ${initialCount}, after: ${masterData.symbols.length}`);

        // فقط اگر تعداد کم شد (یعنی نماد پیدا و فیلتر شد)، داده‌ها را ذخیره کن
        if (masterData.symbols.length < initialCount) {
            const saveSuccess = await saveMasterDataToApi(masterData);
            if (saveSuccess) {
                alert(`نماد با شناسه ${id} حذف شد.`);
                await displaySymbols(); // به‌روزرسانی لیست نمایش
                // اگر در حال ویرایش همین نماد بود، از حالت ویرایش خارج شود
                const addSymbolForm = document.getElementById('add-symbol-form');
                 if (addSymbolForm && addSymbolForm.dataset.editingId == id) {
                     exitSymbolEditMode();
                 }
                // نیاز به به‌روزرسانی لیست کمبوباکس نماد در صفحه اصلی هم داریم اگر باز بود (مثلاً با فرستادن یک کاستوم ایونت یا فراخوانی مستقیم تابع مربوطه اگر ممکن بود)
                console.log("Symbol deleted and saved successfully via API.");
            } else {
                console.error("Failed to save master data after symbol deletion via API.");
            }
        } else {
            console.warn(`Symbol with ID ${id} not found in fetched data for deletion.`);
            alert(`نماد با شناسه ${id} پیدا نشد.`);
        }
    } catch (error) {
        console.error("Error deleting symbol:", error);
        alert('خطا در حذف نماد.');
    }
}

async function deleteStrategyFromApi(id) {
    console.log("Attempting to delete strategy with ID:", id);
    try {
        const masterData = await fetchMasterDataFromApi();
        const initialCount = masterData.strategies.length;
        // فیلتر کردن استراتژی برای حذف
        masterData.strategies = masterData.strategies.filter(strategy => strategy.id != id);
        console.log(`Filtered strategies. Count before: ${initialCount}, after: ${masterData.strategies.length}`);

        // فقط اگر تعداد کم شد (یعنی استراتژی پیدا و فیلتر شد)، داده‌ها را ذخیره کن
        if (masterData.strategies.length < initialCount) {
            const saveSuccess = await saveMasterDataToApi(masterData);
            if (saveSuccess) {
                alert(`استراتژی با شناسه ${id} حذف شد.`);
                await displayStrategies(); // به‌روزرسانی لیست نمایش
                 // اگر در حال ویرایش همین استراتژی بود، از حالت ویرایش خارج شود
                 const addStrategyForm = document.getElementById('add-strategy-form');
                 if (addStrategyForm && addStrategyForm.dataset.editingId == id) {
                     exitStrategyEditMode();
                 }
                 // نیاز به به‌روزرسانی لیست کمبوباکس استراتژی در صفحه اصلی هم داریم اگر باز بود
                console.log("Strategy deleted and saved successfully via API.");
            } else {
                console.error("Failed to save master data after strategy deletion via API.");
            }
        } else {
            console.warn(`Strategy with ID ${id} not found in fetched data for deletion.`);
            alert(`استراتژی با شناسه ${id} پیدا نشد.`);
        }
    } catch (error) {
        console.error("Error deleting strategy:", error);
        alert('خطا در حذف استراتژی.');
    }
}


// ----- فراخوانی اولیه هنگام بارگذاری صفحه -----

async function initializePageDisplay() {
    console.log("initializePageDisplay called (API version).");

    // پر کردن تمام لیست‌ها هنگام بارگذاری صفحه
    await populateBrokerSelect(); // این تابع بروکرها را پر کرده و displayAccountsForSelectedBroker را صدا می زند
    await displaySymbols(); // فراخوانی تابع نمایش نمادها
    await displayStrategies(); // فراخوانی تابع نمایش استراتژی‌ها


    // مخفی کردن فرم افزودن حساب در ابتدا و غیرفعال کردن دکمه آن
    const addAccountForm = document.getElementById('add-account-form');
    if (addAccountForm) addAccountForm.style.display = 'none';
    const addAccountButton = document.getElementById('add-account-button');
    if (addAccountButton) addAccountButton.disabled = true;

    // نیاز به فراخوانی تابع نمایش احساسات (emotions) هم داریم اگر در HTML لیست نمایش احساسات دارید
    // اگر در HTML لیست نمایش احساسات اضافه نکردید، نیازی به فراخوانی تابع displayEmotions (که هنوز ننوشته ایم) نیست

    console.log("Initial page display setup finished (API version).");
}

// ----- Event Listener اصلی -----

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOMContentLoaded fired (API version).");

    // تعریف متغیرها (اطمینان حاصل کنید که تمام این عناصر در HTML شما وجود دارند)
    let addSymbolForm = document.getElementById('add-symbol-form');
    let newSymbolNameInput = document.getElementById('newSymbolName');

    let addBrokerForm = document.getElementById('add-broker-form');
    let newBrokerNameInput = document.getElementById('newBrokerName');
    let selectBrokerSelect = document.getElementById('selectBroker');

    let addAccountForm = document.getElementById('add-account-form');
    let newAccountNumberInput = document.getElementById('newAccountNumber');
    let initialBalanceInput = document.getElementById('initialBalance');
    let addAccountButton = document.getElementById('add-account-button');
    let accountListUl = document.getElementById('account-list'); // نیاز به Event Listener روی والدش داریم

    let brokerFormSubmitButton = addBrokerForm ? addBrokerForm.querySelector('button[type="submit"]') : null;

    let addStrategyForm = document.getElementById('add-strategy-form');
    let newStrategyNameInput = document.getElementById('newStrategyName');

     // عناصر لیست‌های جدید (نماد و استراتژی) - نیاز به Event Listener روی والد مشترک داریم
    let symbolListUl = document.getElementById('symbol-list');
    let strategyListUl = document.getElementById('strategy-list');

    // اگر بخش مدیریت احساسات در HTML وجود دارد، متغیرهای مربوط به آن را هم اینجا تعریف کنید
    // let addEmotionForm = document.getElementById('add-emotion-form');
    // let newEmotionNameInput = document.getElementById('newEmotionName');
    // let emotionListUl = document.getElementById('emotion-list');


    // چک کردن وجود تمام عناصر کلیدی (مطمئن شوید تمام ID ها در HTML درست هستند)
    // توجه: از آنجایی که مطمئن نیستیم تمام عناصر لیست (مثل symbolListUl) در HTML اصلی شما وجود دارند،
    // این چک را موقتاً ساده‌تر می‌کنیم تا فقط عناصر فرم‌های اصلی را بررسی کند
    // اگر این چک ساده‌تر مشکل را حل کرد، می‌توانیم آن را مجدداً شامل همه عناصر کنیم یا بررسی دقیق‌تری انجام دهیم
    if (!addSymbolForm || !newSymbolNameInput || !addBrokerForm || !newBrokerNameInput || !selectBrokerSelect || !addAccountForm || !newAccountNumberInput || !initialBalanceInput || !addAccountButton || !addStrategyForm || !newStrategyNameInput || !symbolListUl || !strategyListUl) {
        console.error("One or more key form/list elements not found on DOMContentLoaded. Please check your HTML IDs.");
        alert("برخی از عناصر مهم صفحه یافت نشدند. لطفاً صفحه را بررسی کنید.");
        return;
    }
    console.log("All key form elements found on DOMContentLoaded.");


    // ----- اتصال Event Listenerها -----

    // فرم افزودن/ویرایش نماد
    addSymbolForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("Add/Edit symbol form submit event fired (API version).");

        const newSymbolName = newSymbolNameInput.value.trim();
        const editingId = addSymbolForm.dataset.editingId; // خواندن ID اگر در حالت ویرایش هستیم


        if (newSymbolName) {
            const masterData = await fetchMasterDataFromApi();
            // بررسی وجود نماد فقط برای افزودن یا هنگام به‌روزرسانی به نام تکراری
            const symbolExists = masterData.symbols.some(symbol =>
                 symbol.name.toUpperCase() === newSymbolName.toUpperCase() && symbol.id != editingId // بررسی عدم تکرار نام، به جز آیتم در حال ویرایش
            );

            if (symbolExists) {
                alert(`نماد "${newSymbolName}" قبلاً ثبت شده است.`);
                console.log("Symbol already exists.");
            } else {
                if (editingId) {
                    // منطق به‌روزرسانی نماد
                    const symbolToUpdate = masterData.symbols.find(symbol => symbol.id == editingId);
                    if (symbolToUpdate) {
                         symbolToUpdate.name = newSymbolName;
                        const saveSuccess = await saveMasterDataToApi(masterData);
                        if (saveSuccess) {
                            alert(`نماد "${newSymbolName}" با موفقیت به‌روزرسانی شد.`);
                            exitSymbolEditMode(); // خروج از حالت ویرایش
                            await displaySymbols(); // به‌روزرسانی لیست نمایش
                            // نکته: نیاز به به‌روزرسانی لیست کمبوباکس نماد در صفحه اصلی هم داریم اگر باز بود. این کار پیچیده‌تر است و خارج از Scope فعلی است.
                            console.log("Symbol updated and saved successfully via API.");
                        } else {
                            console.error("Failed to save updated symbol via API.");
                        }
                    } else {
                        alert('خطا در یافتن نماد برای به‌روزرسانی.');
                        console.error("Symbol to update not found in fetched data.");
                    }

                } else {
                    // منطق افزودن نماد جدید
                    masterData.symbols.push({ id: Date.now(), name: newSymbolName }); // تولید ID منحصر به فرد
                    const saveSuccess = await saveMasterDataToApi(masterData);
                    if (saveSuccess) {
                        alert(`نماد "${newSymbolName}" با موفقیت اضافه شد.`);
                        newSymbolNameInput.value = ''; // پاک کردن فرم
                        await displaySymbols(); // به‌روزرسانی لیست نمایش
                        // نکته: نیاز به به‌روزرسانی لیست کمبوباکس نماد در صفحه اصلی هم داریم اگر باز بود.
                        console.log("Symbol added and saved successfully via API.");
                    } else {
                        console.error("Failed to save symbol via API.");
                    }
                }
            }
        } else {
            alert('لطفاً نام نماد را وارد کنید.');
            console.log("New symbol name is empty.");
        }
        console.log("Add/Edit symbol form submit finished (API version).");
    });


    // فرم افزودن/ویرایش بروکر
    addBrokerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("Add/Edit broker form submit event fired (API version).");

        const newBrokerName = newBrokerNameInput.value.trim();
        const editingId = addBrokerForm.dataset.editingId;

        if (newBrokerName) {
            const masterData = await fetchMasterDataFromApi();
            const brokerExists = masterData.brokers.some(broker =>
                broker.name.toUpperCase() === newBrokerName.toUpperCase() && broker.id != editingId
            );

            if (brokerExists) {
                alert(`بروکر "${newBrokerName}" قبلاً ثبت شده است.`);
                console.log("Broker already exists.");
            } else {
                if (editingId) {
                    const brokerToUpdate = masterData.brokers.find(broker => broker.id == editingId);
                    if (brokerToUpdate) {
                        brokerToUpdate.name = newBrokerName;
                        const saveSuccess = await saveMasterDataToApi(masterData);
                        if (saveSuccess) {
                            alert(`بروکر "${newBrokerName}" با موفقیت به‌روزرسانی شد.`);
                            exitBrokerEditMode();
                            await populateBrokerSelect(); // به‌روزرسانی کمبوباکس بروکر و لیست حساب‌ها
                            // نکته: نیاز به به‌روزرسانی کمبوباکس بروکر در صفحه اصلی هم داریم اگر باز بود.
                            console.log("Broker updated and saved successfully via API.");
                        } else {
                            console.error("Failed to save updated broker via API.");
                        }
                    } else {
                        alert('خطا در یافتن بروکر برای به‌روزرسانی.');
                        console.error("Broker to update not found in fetched data.");
                    }
                } else {
                    masterData.brokers.push({ id: Date.now(), name: newBrokerName, accounts: [] }); // تولید ID و آرایه حساب‌های خالی
                    const saveSuccess = await saveMasterDataToApi(masterData);
                    if (saveSuccess) {
                        alert(`بروکر "${newBrokerName}" با موفقیت اضافه شد.`);
                        newBrokerNameInput.value = ''; // پاک کردن فرم
                        await populateBrokerSelect(); // به‌روزرسانی کمبوباکس بروکر
                        // نکته: نیاز به به‌روزرسانی کمبوباکس بروکر در صفحه اصلی هم داریم اگر باز بود.
                        console.log("Broker added and saved successfully via API.");
                    } else {
                        console.error("Failed to save new broker via API.");
                    }
                }
            }
        } else {
            alert('لطفاً نام بروکر را وارد کنید.');
            console.log("New broker name is empty.");
        }
        console.log("Add/Edit broker form submit finished (API version).");
    });


    // تغییر انتخاب بروکر (این بخش مدیریت نمایش فرم حساب و به‌روزرسانی لیست حساب‌ها را انجام می‌دهد)
    selectBrokerSelect.addEventListener('change', async function() {
        console.log("Select broker change event fired (API version).");
        const selectedBrokerName = selectBrokerSelect.value;
        const selectedBrokerOption = selectBrokerSelect.options[selectBrokerSelect.selectedIndex];
        // خواندن ID ذخیره شده در dataset گزینه انتخاب شده
        const selectedBrokerId = selectedBrokerOption && selectedBrokerOption.dataset.brokerId ? selectedBrokerOption.dataset.brokerId : null;

        const masterData = await fetchMasterDataFromApi();

        // اطمینان از به‌روز بودن dataset.brokerId در option انتخاب شده (مخصوصا بعد از افزودن/ویرایش بروکر)
         if (selectedBrokerName && selectedBrokerOption) {
             const selectedBroker = masterData.brokers.find(b => b.name === selectedBrokerName);
             if (selectedBroker) {
                 selectedBrokerOption.dataset.brokerId = selectedBroker.id;
                 console.log("Selected broker found by name, dataset ID set on option.");
             } else {
                 console.warn(`Selected broker name "${selectedBrokerName}" found in select, but not in masterData.`);
             }
         }


        if (selectedBrokerName) {
            // نمایش و فعال کردن فرم افزودن حساب اگر بروکری انتخاب شده باشد
            if (addAccountForm && addAccountButton) {
                addAccountForm.style.display = 'flex';
                addAccountButton.disabled = false;
                console.log("Add account form shown and button enabled.");
            }
        } else {
            // مخفی و غیرفعال کردن فرم افزودن حساب اگر هیچ بروکری انتخاب نشده باشد
            if (addAccountForm && addAccountButton) {
                addAccountForm.style.display = 'none';
                addAccountButton.disabled = true;
                console.log("Add account form hidden and button disabled.");
            }
        }

        // به‌روزرسانی لیست حساب‌ها بر اساس بروکر انتخاب شده
        await displayAccountsForSelectedBroker();

        // خروج از حالت ویرایش حساب اگر بروکر تغییر کرد یا خالی شد
        if (addAccountForm && addAccountForm.dataset.editingId) { // اگر در حال ویرایش حسابی هستیم
             const editingBrokerIdForAccount = addAccountForm.dataset.editingBrokerId;
             if (!selectedBrokerId || editingBrokerIdForAccount != selectedBrokerId) {
                console.log("Exiting account edit mode due to broker change or no broker selected.");
                 exitAccountEditMode();
             }
        } else if (!selectedBrokerId && addAccountForm && addAccountForm.dataset.editingId) {
             // این شرط اضافی است، چون اگر selectedBrokerId نباشد، شرط بالا کافی است
             console.log("Exiting account edit mode due to no broker selected (redundant check).");
             exitAccountEditMode();
         }


        // خروج از حالت ویرایش بروکر اگر بروکر در حال ویرایش، بروکر انتخاب شده فعلی نباشد
        if (addBrokerForm && addBrokerForm.dataset.editingId) { // اگر در حال ویرایش بروکری هستیم
            const editingBrokerIdForBroker = addBrokerForm.dataset.editingId;
            if (!selectedBrokerId || editingBrokerIdForBroker != selectedBrokerId) {
                 console.log("Exiting broker edit mode due to broker change or no broker selected.");
                 exitBrokerEditMode();
             }
        } else if (!selectedBrokerId && addBrokerForm && addBrokerForm.dataset.editingId) {
             // این شرط اضافی است
             console.log("Exiting broker edit mode due to no broker selected (redundant check).");
             exitBrokerEditMode();
         }


        console.log("Select broker change event finished (API version).");
    });


    // فرم افزودن/ویرایش حساب
    addAccountForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("Add/Edit account form submit event fired (API version).");

        const selectedBrokerName = selectBrokerSelect.value;
        const selectedBrokerOption = selectBrokerSelect.options[selectBrokerSelect.selectedIndex];
        // خواندن ID ذخیره شده در dataset گزینه انتخاب شده
        const selectedBrokerId = selectedBrokerOption && selectedBrokerOption.dataset.brokerId ? selectedBrokerOption.dataset.brokerId : null;


        const newAccountNumber = newAccountNumberInput.value.trim();
        const initialBalance = parseFloat(initialBalanceInput.value);
        const editingId = addAccountForm.dataset.editingId; // ID حساب اگر در حال ویرایش هستیم
        const editingBrokerId = addAccountForm.dataset.editingBrokerId; // ID بروکر حساب در حال ویرایش (برای حالت ویرایش حساب)


        if (!selectedBrokerName || !selectedBrokerId) {
            alert('لطفاً ابتدا یک بروکر را انتخاب کنید.');
            console.log("No broker selected for account submit.");
            return;
        }
        if (!newAccountNumber) {
            alert('لطفاً شماره حساب را وارد کنید.');
            console.log("Account number is empty.");
            return;
        }
        if (isNaN(initialBalance)) {
            alert('لطفاً موجودی اولیه معتبر وارد کنید.');
            console.log("Initial balance is not a valid number.");
            return;
        }

        const masterData = await fetchMasterDataFromApi();
        const selectedBroker = masterData.brokers.find(b => b.id == selectedBrokerId);

        if (selectedBroker) {
            // بررسی وجود حساب فقط برای افزودن یا هنگام به‌روزرسانی به شماره تکراری برای همان بروکر
            const accountExists = selectedBroker.accounts.some(account =>
                 account.number === newAccountNumber && account.id != editingId
            );

            if (accountExists) {
                alert(`شماره حساب "${newAccountNumber}" قبلاً برای بروکر "${selectedBrokerName}" ثبت شده است.`);
                console.log("Account number already exists for this broker.");
            } else {
                if (editingId && editingBrokerId == selectedBrokerId) {
                    // منطق به‌روزرسانی حساب
                    const accountToUpdateIndex = selectedBroker.accounts.findIndex(account => account.id == editingId);
                    if (accountToUpdateIndex > -1) {
                        selectedBroker.accounts[accountToUpdateIndex].number = newAccountNumber;
                        selectedBroker.accounts[accountToUpdateIndex].initialBalance = initialBalance;
                        const saveSuccess = await saveMasterDataToApi(masterData);
                        if (saveSuccess) {
                            alert(`شماره حساب "${newAccountNumber}" برای بروکر "${selectedBrokerName}" با موفقیت به‌روزرسانی شد.`);
                            exitAccountEditMode(); // خروج از حالت ویرایش
                            await displayAccountsForSelectedBroker(); // به‌روزرسانی لیست حساب‌ها
                            console.log("Account updated and saved successfully via API.");
                        } else {
                            console.error("Failed to save updated account via API.");
                        }
                    } else {
                        alert('خطا در یافتن شماره حساب برای به‌روزرسانی.');
                        console.error("Account to update not found in fetched data.");
                    }
                } else {
                     if (!selectedBroker.accounts) {
                         selectedBroker.accounts = []; // اطمینان از وجود آرایه accounts
                     }
                    selectedBroker.accounts.push({
                        id: Date.now(), // تولید ID منحصر به فرد برای حساب (استفاده از Date.now() برای سادگی، در واقعیت بهتر است از UUID یا IDهای سرور استفاده شود)
                        number: newAccountNumber,
                        initialBalance: initialBalance
                    });
                    const saveSuccess = await saveMasterDataToApi(masterData);
                    if (saveSuccess) {
                        alert(`شماره حساب "${newAccountNumber}" برای بروکر "${selectedBrokerName}" اضافه شد.`);
                        newAccountNumberInput.value = ''; // پاک کردن فرم
                        initialBalanceInput.value = '0'; // ریست کردن موجودی اولیه
                        await displayAccountsForSelectedBroker(); // به‌روزرسانی لیست حساب‌ها
                        console.log("Account added and saved successfully via API.");
                    } else {
                        console.error("Failed to save new account via API.");
                    }
                }
            }
        } else {
            console.error("Error: Selected broker not found in master data during account add/edit submit.");
            alert("خطا در یافتن اطلاعات بروکر انتخاب‌شده.");
        }
        console.log("Add/Edit account form submit finished (API version).");
    });

    // فرم افزودن/ویرایش استراتژی
    addStrategyForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("Add/Edit strategy form submit event fired (API version).");

        const newStrategyName = newStrategyNameInput.value.trim();
        const editingId = addStrategyForm.dataset.editingId; // خواندن ID اگر در حالت ویرایش هستیم


        if (newStrategyName) {
            const masterData = await fetchMasterDataFromApi();
            // بررسی وجود استراتژی فقط برای افزودن یا هنگام به‌روزرسانی به نام تکراری
            const strategyExists = masterData.strategies.some(strategy =>
                strategy.name.toUpperCase() === newStrategyName.toUpperCase() && strategy.id != editingId // بررسی عدم تکرار نام، به جز آیتم در حال ویرایش
            );

            if (strategyExists) {
                alert(`استراتژی "${newStrategyName}" قبلاً ثبت شده است.`);
                console.log("Strategy already exists.");
            } else {
                if (editingId) {
                    // منطق به‌روزرسانی استراتژی
                    const strategyToUpdate = masterData.strategies.find(strategy => strategy.id == editingId);
                    if (strategyToUpdate) {
                        strategyToUpdate.name = newStrategyName;
                        const saveSuccess = await saveMasterDataToApi(masterData);
                        if (saveSuccess) {
                            alert(`استراتژی "${newStrategyName}" با موفقیت به‌روزرسانی شد.`);
                            exitStrategyEditMode(); // خروج از حالت ویرایش
                            await displayStrategies(); // به‌روزرسانی لیست نمایش
                             // نکته: نیاز به به‌روزرسانی لیست کمبوباکس استراتژی در صفحه اصلی هم داریم اگر باز بود.
                            console.log("Strategy updated and saved successfully via API.");
                        } else {
                            console.error("Failed to save updated strategy via API.");
                        }
                    } else {
                        alert('خطا در یافتن استراتژی برای به‌روزرسانی.');
                        console.error("Strategy to update not found in fetched data.");
                    }
                } else {
                    // منطق افزودن استراتژی جدید
                    masterData.strategies.push({ id: Date.now(), name: newStrategyName }); // تولید ID منحصر به فرد
                    const saveSuccess = await saveMasterDataToApi(masterData);
                    if (saveSuccess) {
                        alert(`استراتژی "${newStrategyName}" با موفقیت اضافه شد.`);
                        newStrategyNameInput.value = ''; // پاک کردن فرم
                        await displayStrategies(); // به‌روزرسانی لیست نمایش
                         // نکته: نیاز به به‌روزرسانی لیست کمبوباکس استراتژی در صفحه اصلی هم داریم اگر باز بود.
                        console.log("Strategy added and saved successfully via API.");
                    } else {
                        console.error("Failed to save strategy via API.");
                    }
                }
            }
        } else {
            alert('لطفاً نام استراتژی را وارد کنید.');
            console.log("New strategy name is empty.");
        }
        console.log("Add/Edit strategy form submit finished (API version).");
    });

    // Event Listener برای فرم افزودن/ویرایش احساسات (اگر در HTML اضافه کردید)
    // اگر در HTML بخش مدیریت احساسات را اضافه نکرده اید، این Event Listener را لازم ندارید
    /*
    if (addEmotionForm) {
        addEmotionForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("Add/Edit emotion form submit event fired (API version).");

            const newEmotionName = newEmotionNameInput.value.trim();
            // نیاز به منطق ویرایش/حذف برای احساسات هم داریم اگر لازم است
            const editingId = addEmotionForm.dataset.editingId;

            if (newEmotionName) {
                const masterData = await fetchMasterDataFromApi();
                 const emotionExists = masterData.emotions.some(emotion =>
                     emotion.name.toUpperCase() === newEmotionName.toUpperCase() && emotion.id != editingId
                 );

                if (emotionExists) {
                    alert(`احساس "${newEmotionName}" قبلاً ثبت شده است.`);
                    console.log("Emotion already exists.");
                } else {
                     if (editingId) {
                         // منطق به‌روزرسانی احساس
                         const emotionToUpdate = masterData.emotions.find(emotion => emotion.id == editingId);
                         if (emotionToUpdate) {
                             emotionToUpdate.name = newEmotionName;
                             const saveSuccess = await saveMasterDataToApi(masterData);
                             if (saveSuccess) {
                                 alert(`احساس "${newEmotionName}" با موفقیت به‌روزرسانی شد.`);
                                 exitEmotionEditMode(); // تابع exitEmotionEditMode را هم باید بنویسید
                                 await displayEmotions(); // تابع displayEmotions را هم باید بنویسید
                                 // نیاز به به‌روزرسانی لیست کمبوباکس احساسات در صفحه اصلی هم داریم اگر باز بود.
                                 console.log("Emotion updated and saved successfully via API.");
                             } else {
                                 console.error("Failed to save updated emotion via API.");
                             }
                         } else {
                              alert('خطا در یافتن احساس برای به‌روزرسانی.');
                             console.error("Emotion to update not found in fetched data.");
                         }

                     } else {
                         // منطق افزودن احساس جدید
                         masterData.emotions.push({ id: Date.now(), name: newEmotionName });
                         const saveSuccess = await saveMasterDataToApi(masterData);
                         if (saveSuccess) {
                             alert(`احساس "${newEmotionName}" با موفقیت اضافه شد.`);
                             newEmotionNameInput.value = '';
                             await displayEmotions(); // تابع displayEmotions را هم باید بنویسید
                              // نیاز به به‌روزرسانی لیست کمبوباکس احساسات در صفحه اصلی هم داریم اگر باز بود.
                             console.log("Emotion added and saved successfully via API.");
                         } else {
                             console.error("Failed to save emotion via API.");
                         }
                     }
                }
            } else {
                alert('لطفاً نام احساس را وارد کنید.');
                console.log("New emotion name is empty.");
            }
            console.log("Add/Edit emotion form submit finished (API version).");
        });
    }
    */


    // مدیریت کلیک‌ها در لیست‌ها (بروکر، حساب، نماد، استراتژی)
    const commonParentForListEvents = document.querySelector('main.form-container'); // استفاده از والد مشترک برای Delegation
    if (commonParentForListEvents) {
        commonParentForListEvents.addEventListener('click', async function(event) {
            const target = event.target;
            console.log("List item click event fired (API version).", target);

            // کلیک روی دکمه‌های بروکر
            if (target.classList.contains('edit-broker-button')) {
                console.log("Edit broker button clicked.");
                const brokerIdToEdit = target.dataset.brokerId;
                await populateBrokerFormForEdit(brokerIdToEdit);
            } else if (target.classList.contains('delete-broker-button')) {
                console.log("Delete broker button clicked.");
                const brokerIdToDelete = target.dataset.brokerId;
                 // دریافت نام بروکر برای نمایش در پیام هشدار
                 const masterData = await fetchMasterDataFromApi();
                 const brokerToDelete = masterData.brokers.find(b => b.id == brokerIdToDelete);
                 const brokerName = brokerToDelete ? brokerToDelete.name : `با شناسه ${brokerIdToDelete}`;

                if (confirm(`آیا از حذف بروکر "${brokerName}" و تمام شماره حساب‌های آن اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
                    await deleteBrokerFromApi(brokerIdToDelete);
                    console.log("Delete confirmed, deleteBrokerFromApi called.");
                } else {
                    console.log("Delete cancelled.");
                }
            }
            // کلیک روی دکمه‌های حساب
            else if (target.classList.contains('edit-account-button')) {
                console.log("Edit account button clicked.");
                const brokerId = target.dataset.brokerId; // نیاز به ID بروکر مادر حساب
                const accountIdToEdit = target.dataset.accountId;
                await populateAccountFormForEdit(brokerId, accountIdToEdit);
                console.log("populateAccountFormForEdit called.");
            } else if (target.classList.contains('delete-account-button')) {
                console.log("Delete account button clicked.");
                const brokerId = target.dataset.brokerId; // نیاز به ID بروکر مادر حساب
                const accountIdToDelete = target.dataset.accountId;
                 // دریافت شماره حساب برای نمایش در پیام هشدار
                 const masterData = await fetchMasterDataFromApi();
                 const broker = masterData.brokers.find(b => b.id == brokerId);
                 const accountToDelete = broker ? broker.accounts.find(a => a.id == accountIdToDelete) : null;
                 const accountNumber = accountToDelete ? accountToDelete.number : `با شناسه ${accountIdToDelete}`;
                 const brokerName = broker ? broker.name : `بروکر با شناسه ${brokerId}`;


                if (confirm(`آیا از حذف شماره حساب "${accountNumber}" (از بروکر "${brokerName}") اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
                    await deleteAccountFromApi(brokerId, accountIdToDelete);
                    console.log("Delete confirmed, deleteAccountFromApi called.");
                } else {
                    console.log("Delete cancelled.");
                }
            }
            // کلیک روی دکمه‌های نماد
            else if (target.classList.contains('edit-symbol-button')) {
                console.log("Edit symbol button clicked.");
                const symbolIdToEdit = target.dataset.symbolId;
                 await populateSymbolFormForEdit(symbolIdToEdit);
            } else if (target.classList.contains('delete-symbol-button')) {
                console.log("Delete symbol button clicked.");
                const symbolIdToDelete = target.dataset.symbolId;
                 // دریافت نام نماد برای نمایش در پیام هشدار
                 const masterData = await fetchMasterDataFromApi();
                 const symbolToDelete = masterData.symbols.find(s => s.id == symbolIdToDelete);
                 const symbolName = symbolToDelete ? symbolToDelete.name : `با شناسه ${symbolIdToDelete}`;

                if (confirm(`آیا از حذف نماد "${symbolName}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
                     await deleteSymbolFromApi(symbolIdToDelete);
                } else {
                     console.log("Delete cancelled.");
                 }
            }
            // کلیک روی دکمه‌های استراتژی
             else if (target.classList.contains('edit-strategy-button')) {
                console.log("Edit strategy button clicked.");
                const strategyIdToEdit = target.dataset.strategyId;
                 await populateStrategyFormForEdit(strategyIdToEdit);
            } else if (target.classList.contains('delete-strategy-button')) {
                console.log("Delete strategy button clicked.");
                const strategyIdToDelete = target.dataset.strategyId;
                 // دریافت نام استراتژی برای نمایش در پیام هشدار
                 const masterData = await fetchMasterDataFromApi();
                 const strategyToDelete = masterData.strategies.find(s => s.id == strategyIdToDelete);
                 const strategyName = strategyToDelete ? strategyToDelete.name : `با شناسه ${strategyIdToDelete}`;

                if (confirm(`آیا از حذف استراتژی "${strategyName}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
                     await deleteStrategyFromApi(strategyIdToDelete);
                } else {
                     console.log("Delete cancelled.");
                 }
            }
             // کلیک روی دکمه‌های احساسات (اگر در HTML اضافه کردید)
             /*
             else if (target.classList.contains('edit-emotion-button')) {
                console.log("Edit emotion button clicked.");
                const emotionIdToEdit = target.dataset.emotionId;
                 await populateEmotionFormForEdit(emotionIdToEdit); // تابع populateEmotionFormForEdit را هم باید بنویسید
            } else if (target.classList.contains('delete-emotion-button')) {
                console.log("Delete emotion button clicked.");
                const emotionIdToDelete = target.dataset.emotionId;
                 // دریافت نام احساس برای نمایش در پیام هشدار
                 const masterData = await fetchMasterDataFromApi();
                 const emotionToDelete = masterData.emotions.find(e => e.id == emotionIdToDelete);
                 const emotionName = emotionToDelete ? emotionToDelete.name : `با شناسه ${emotionIdToDelete}`;

                if (confirm(`آیا از حذف احساس "${emotionName}" اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
                     await deleteEmotionFromApi(emotionIdToDelete); // تابع deleteEmotionFromApi را هم باید بنویسید
                } else {
                     console.log("Delete cancelled.");
                 }
            }
            */
        });
    } else {
        console.error('عنصر والد "main.form-container" برای اضافه کردن EventListener به لیست‌ها پیدا نشد.');
    }


    // فراخوانی اولیه برای پر کردن لیست‌ها هنگام بارگذاری صفحه
    await initializePageDisplay();
    console.log("DOMContentLoaded listener finished (API version).");

}); // پایان DOMContentLoaded listener
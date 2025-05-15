document.addEventListener("DOMContentLoaded", () => {
  const directionSelect = document.getElementById("direction");
  const orderTypeSelect = document.getElementById("orderType");
  const tradeForm = document.getElementById("tradeForm");

  // نوع اردر را بر اساس جهت معامله تنظیم کن
  directionSelect.addEventListener("change", () => {
    const direction = directionSelect.value;
    orderTypeSelect.innerHTML = '<option value="">انتخاب کنید</option>'; // پاکسازی اولیه

    if (direction === "Buy") {
      ["BUY|market", "BUY|limit", "BUY|stop"].forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        orderTypeSelect.appendChild(opt);
      });
    } else if (direction === "Sell") {
      ["SELL|market", "SELL|limit", "SELL|stop"].forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        orderTypeSelect.appendChild(opt);
      });
    }
  });

  // اعتبارسنجی ساده فرم
  tradeForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const symbol = document.getElementById("symbol").value;
    const direction = document.getElementById("direction").value;
    const entryTime = document.getElementById("entryTime").value;
    const exitTime = document.getElementById("exitTime").value;

    if (!symbol) {
      alert("لطفاً نماد را انتخاب کنید");
      return;
    }

    if (!direction) {
      alert("لطفاً جهت معامله را انتخاب کنید");
      return;
    }

    if (entryTime && exitTime && new Date(exitTime) < new Date(entryTime)) {
      alert("زمان خروج نمی‌تواند قبل از زمان ورود باشد");
      return;
    }

    // در این مرحله داده‌ها آماده پردازش هستند
    alert("ترید با موفقیت ثبت شد ✅");

    // TODO: ذخیره در localStorage یا ارسال به بک‌اند
    // this.submit(); // اگر بخواهی فرم واقعاً ارسال شود
  });
});

/* ==========================================================
   ละมุนสบู่ (LAMUN SOAP) — script.js (ใช้ร่วมกันทุกหน้า)
   ========================================================== */

(function () {
  'use strict';

  /* ---------- Config ---------- */
  var PRODUCTS_URL = 'products.json';

  var ORDER_API_URL =
    'https://script.google.com/macros/s/AKfycby_TBa26zNwzbq2dQBiMQPUM4PhXTEX3SM6N-B7oRwKk5XQGpMs1iEl055a-V4PzUV4/exec';

  var ORDERS_CSV_URL = '';

  var MOOD_LABELS = {
    fresh: 'เฟรช',
    gentle: 'เจนเทิล',
    deep: 'ดีป คลีน',
    romance: 'โรแมนซ์'
  };

  /* ---------- Helpers ---------- */
  function moodLabel(mood) {
    return MOOD_LABELS[mood] || mood;
  }

  function formatPrice(price) {
    var n = Number(price);
    return (isNaN(n) ? price : n.toLocaleString('th-TH')) + ' บาท';
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ==========================================================
     1) product.html — แสดงสินค้า + ปุ่มกรอง mood
     ========================================================== */
  function initProductPage() {
    var list = document.getElementById('product-list');
    var filterBar = document.getElementById('filter-bar');
    if (!list || !filterBar) return;

    var allProducts = [];

    function renderCards(products) {
      list.innerHTML = '';

      if (!products.length) {
        list.appendChild(el('p', 'empty-state', 'ยังไม่มีสินค้าในหมวดนี้'));
        return;
      }

      products.forEach(function (p) {
        var card = el('article', 'product-card');
        card.setAttribute('data-mood', p.mood);

        var imageWrap = el('div', 'product-card__image');
        var img = document.createElement('img');
        img.src = p.image;
        img.alt = p.name;
        img.loading = 'lazy';
        imageWrap.appendChild(img);

        var body = el('div', 'product-card__body');

        var meta = el('div', 'product-card__meta');
        meta.appendChild(el('span', 'mood-dot'));
        meta.appendChild(
          document.createTextNode(moodLabel(p.mood) + ' · ' + p.size)
        );

        var title = el('h3', 'product-card__title', p.name);
        body.appendChild(meta);
        body.appendChild(title);
        body.appendChild(el('span', 'mood-rule'));

        if (p.description) {
          body.appendChild(el('p', 'product-card__desc', p.description));
        }

        var footer = el('div', 'product-card__footer');
        footer.appendChild(el('span', 'price', formatPrice(p.price)));

        var buy = el('a', 'btn btn--gold', 'สั่งซื้อ');
        buy.href =
          'order.html?item=' + encodeURIComponent(p.name) +
          '&price=' + encodeURIComponent(p.price);
        footer.appendChild(buy);

        body.appendChild(footer);
        card.appendChild(imageWrap);
        card.appendChild(body);
        list.appendChild(card);
      });
    }

    function setActiveButton(mood) {
      var buttons = filterBar.querySelectorAll('button');
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute('data-mood') === mood;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function applyFilter(mood) {
      var filtered =
        mood === 'all'
          ? allProducts
          : allProducts.filter(function (p) { return p.mood === mood; });
      setActiveButton(mood);
      renderCards(filtered);
    }

    function buildFilterBar() {
      var moods = [];
      allProducts.forEach(function (p) {
        if (moods.indexOf(p.mood) === -1) moods.push(p.mood);
      });

      filterBar.innerHTML = '';
      ['all'].concat(moods).forEach(function (mood) {
        var btn = el('button', 'btn btn--text filter-btn',
          mood === 'all' ? 'ทั้งหมด' : moodLabel(mood));
        btn.type = 'button';
        btn.setAttribute('data-mood', mood);
        btn.addEventListener('click', function () { applyFilter(mood); });
        filterBar.appendChild(btn);
      });
    }

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        allProducts = data;
        buildFilterBar();

        var wanted = (new URLSearchParams(window.location.search).get('mood') || '')
          .trim().toLowerCase();
        var exists = allProducts.some(function (p) { return p.mood === wanted; });
        applyFilter(exists ? wanted : 'all');
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = '';
        list.appendChild(
          el('p', 'empty-state', 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง')
        );
      });
  }

  /* ==========================================================
     2) order.html — เติมฟอร์มจาก URL + ส่งออเดอร์
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    if (!form) return;

    var itemsInput = document.getElementById('items');
    var totalInput = document.getElementById('total');

    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    if (itemsInput && item !== null) itemsInput.value = item;
    if (totalInput && price !== null) totalInput.value = price;

    function val(id) {
      var node = document.getElementById(id);
      return node ? node.value : '';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var payload = {
        customerName: val('customerName'),
        contact: val('contact'),
        items: val('items'),
        total: val('total'),
        note: val('note')
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function () { window.location.href = 'thankyou.html'; })
        .catch(function (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================
     3) admin.html — ตารางออเดอร์จาก Google Sheet (CSV)
     ========================================================== */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    while (i < text.length) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }

    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    var COLUMNS = 6;

    function showMessage(message) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', 'empty-state', message);
      td.colSpan = COLUMNS;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    if (!ORDERS_CSV_URL) {
      showMessage('ยังไม่ได้ตั้งค่าลิงก์ CSV ของ Google Sheet');
      return;
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text).filter(function (r) {
          return r.some(function (cell) { return cell.trim() !== ''; });
        });

        rows.shift();

        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        rows.reverse();

        tbody.innerHTML = '';
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          for (var c = 0; c < COLUMNS; c++) {
            tr.appendChild(el('td', '', (r[c] || '').trim()));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ---------- Boot ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

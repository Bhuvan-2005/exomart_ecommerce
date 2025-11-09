document.addEventListener('DOMContentLoaded', () => {
  // Check and apply dark mode preference
  const darkModePreference = localStorage.getItem('darkMode');
  if (darkModePreference === 'true') {
    document.body.classList.add('dark-mode');
  } else if (darkModePreference === 'false') {
    document.body.classList.remove('dark-mode');
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark-mode');
    }
  }

  const raw = localStorage.getItem('lastPaymentReceipt');

  if (!raw) {
    window.location.href = 'index.html';
    return;
  }

  let receipt;
  try {
    receipt = JSON.parse(raw);
  } catch (error) {
    console.error('Unable to parse receipt', error);
    window.location.href = 'index.html';
    return;
  }

  localStorage.removeItem('lastPaymentReceipt');

  const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  setText('#receipt-id', receipt.paymentId || '-');
  setText('#receipt-status', receipt.status ? receipt.status.toUpperCase() : '-');

  const processedDate = receipt.processedAt
    ? new Date(receipt.processedAt).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Just now';
  setText('#receipt-date', processedDate);

  setText('#receipt-name', receipt.user && receipt.user.name ? receipt.user.name : 'Customer');
  setText('#receipt-email', receipt.user && receipt.user.email ? receipt.user.email : '—');
  setText('#receipt-total', formatCurrency(receipt.total || receipt.amount));

  const cardContainer = document.getElementById('receipt-card');
  if (cardContainer) {
    let paymentDetails = '';
    
    if (receipt.method === 'card' && receipt.card) {
      const brand = receipt.card.brand || 'Card';
      const last4 = receipt.card.last4 ? `•••• ${receipt.card.last4}` : 'XXXX';
      paymentDetails = `
        <div>
          <span class="receipt-label">Payment Method</span>
          <span>${brand} (${last4})</span>
        </div>
        <div>
          <span class="receipt-label">Cardholder</span>
          <span>${receipt.card.holder || 'Not shared'}</span>
        </div>
        <div>
          <span class="receipt-label">Expiry</span>
          <span>${receipt.card.expiry || 'N/A'}</span>
        </div>
      `;
    } else if (receipt.method === 'netbanking' && receipt.netbanking) {
      paymentDetails = `
        <div>
          <span class="receipt-label">Payment Method</span>
          <span>Net Banking</span>
        </div>
        <div>
          <span class="receipt-label">Bank</span>
          <span>${receipt.netbanking.bank || 'N/A'}</span>
        </div>
        <div>
          <span class="receipt-label">Account Holder</span>
          <span>${receipt.netbanking.accountName || 'N/A'}</span>
        </div>
      `;
    } else if (receipt.method === 'upi' && receipt.upi) {
      paymentDetails = `
        <div>
          <span class="receipt-label">Payment Method</span>
          <span>UPI / Wallet</span>
        </div>
        <div>
          <span class="receipt-label">Provider</span>
          <span>${receipt.upi.provider || 'N/A'}</span>
        </div>
        <div>
          <span class="receipt-label">UPI ID</span>
          <span>${receipt.upi.id || 'N/A'}</span>
        </div>
      `;
    } else {
      paymentDetails = `
        <div>
          <span class="receipt-label">Payment Method</span>
          <span>${receipt.method ? receipt.method.toUpperCase() : 'N/A'}</span>
        </div>
      `;
    }

    paymentDetails += `
      <div>
        <span class="receipt-label">Currency</span>
        <span>${receipt.currency || 'INR'}</span>
      </div>
    `;

    cardContainer.innerHTML = `
      <div class="receipt-card glass-panel">
        ${paymentDetails}
      </div>
    `;
  }

  const itemsContainer = document.getElementById('receipt-items');
  if (itemsContainer && Array.isArray(receipt.items)) {
    const itemsMarkup = receipt.items
      .map(
        (item) => `
        <div class="receipt-item">
          <div>
            <h4>${item.name || 'Product'}</h4>
            <p>${item.quantity} × ${formatCurrency(item.unitPrice)}</p>
          </div>
          <div class="receipt-item-total">${formatCurrency(item.lineTotal)}</div>
        </div>`
      )
      .join('');

    const summaryMarkup = `
      <div class="receipt-summary-totals glass-panel">
        <div><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
        <div><span>Tax (10%)</span><span>${formatCurrency(receipt.tax)}</span></div>
        <div class="receipt-grand-total"><span>Total Paid</span><span>${formatCurrency(receipt.total)}</span></div>
      </div>
    `;

    itemsContainer.innerHTML = `
      <h3>Order Items</h3>
      <div class="receipt-items-list">${itemsMarkup}</div>
      ${summaryMarkup}
    `;
  }

  document.getElementById('success-shop')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('success-account')?.addEventListener('click', () => {
    localStorage.setItem('requestedSection', 'account-section');
    window.location.href = 'index.html';
  });

  document.getElementById('success-print')?.addEventListener('click', () => {
    window.print();
  });
});


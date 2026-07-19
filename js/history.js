/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — HISTORY & WALLET
   Ride History, My Vehicles (list), Wallet page
═══════════════════════════════════════════════════════ */

const History = (() => {
  async function initRideHistory(userId) {
    const filter = document.getElementById('history-filter');
    filter?.addEventListener('change', () => renderHistory(userId, filter.value));
    await renderHistory(userId, 'all');
  }

  async function renderHistory(userId, filter = 'all') {
    const list = document.getElementById('ride-history-list');
    if (!list) return;

    try {
      // Fetch trips where user is passenger OR driver
      const trips = await API.getTrips({ role: 'all' });
      // Filter for completed.
      let filtered = trips.filter(t => t.status === 'completed');
      
      if (filter === 'as-driver')    filtered = filtered.filter(t => t.rideId?.driverId?._id === userId);
      if (filter === 'as-passenger') filtered = filtered.filter(t => t.rideId?.driverId?._id !== userId);

      if (!filtered.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No completed rides yet.</p></div>`;
        return;
      }

      list.innerHTML = filtered.map(t => {
        const ride = t.rideId;
        if (!ride) return '';
        const isDriver = ride.driverId?._id === userId;
        const partner  = isDriver ? t.passengerId : ride.driverId;
        // Handle nested date format correctly
        const sdate = ride.date;

        return `
        <div class="history-card">
          <div class="user-avatar" style="flex-shrink:0">${isDriver ? '🚗' : (partner?.avatar || '?')}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="history-role-badge ${isDriver ? 'driver' : 'passenger'}">${isDriver ? '🚗 Driver' : '👤 Passenger'}</span>
            </div>
            <div style="font-weight:600;font-size:14px">${(ride.pickup||'').split(',')[0]} → ${(ride.destination||'').split(',')[0]}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:3px">
              📅 ${sdate} • 🕐 ${ride.time} • 📍 ${ride.distance?.toFixed(1) || '—'} km
            </div>
            ${!isDriver && partner ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Driver: ${partner.firstName} ${partner.lastName}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="trip-fare" style="font-size:15px">${isDriver ? '+' : ''}₹${t.totalFare}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${t.paymentMethod || 'cash'}</div>
            <span class="status-badge completed" style="font-size:11px;margin-top:6px;display:inline-flex">✅ Done</span>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state"><p>Error loading history.</p></div>`;
    }
  }

  async function initWallet(userId) {
    try {
      const user = await API.me();
      
      // Update balance displays
      const walletBalance = document.getElementById('wallet-balance');
      const walletUserName = document.getElementById('wallet-user-name');
      if (walletBalance) walletBalance.textContent = `₹${(user.walletBalance || 0).toFixed(2)}`;
      if (walletUserName) walletUserName.textContent = user.firstName + ' ' + user.lastName;

      // Sidebar wallet badge
      const badge = document.getElementById('sidebar-wallet-badge');
      if (badge) badge.textContent = `₹${(user.walletBalance || 0).toFixed(0)}`;

      await renderTransactions(userId);
      bindRecharge(userId);
    } catch (err) {
      console.error('Failed to init wallet', err);
    }
  }

  async function renderTransactions(userId) {
    const list = document.getElementById('wallet-transactions');
    if (!list) return;

    try {
      const txns = await API.getWalletTxns();

      if (!txns || !txns.length) {
        list.innerHTML = `<div class="empty-state"><p>No transactions yet.</p></div>`;
        return;
      }

      list.innerHTML = txns.map(t => {
        const dt = new Date(t.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        return `
        <div class="transaction-item">
          <div class="txn-icon ${t.type}">${t.type === 'credit' ? '↑' : '↓'}</div>
          <div class="txn-info">
            <div class="txn-desc">${t.desc}</div>
            <div class="txn-date">${dt} ${t.method ? '• ' + t.method : ''}</div>
          </div>
          <div class="txn-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}₹${t.amount}</div>
        </div>`;
      }).join('');
    } catch (err) {
      list.innerHTML = `<div class="empty-state"><p>Error loading transactions.</p></div>`;
    }
  }

  function bindRecharge(userId) {
    let selectedAmount = 0;

    document.querySelectorAll('.amount-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.amount-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedAmount = parseInt(pill.dataset.amount);
        document.getElementById('custom-recharge-amount').value = selectedAmount;
      });
    });

    document.getElementById('recharge-btn')?.addEventListener('click', async () => {
      const customInput = document.getElementById('custom-recharge-amount');
      const amount = parseInt(customInput?.value) || selectedAmount;
      if (!amount || amount < 1) {
        Notifications.showToast('error', 'Invalid amount', 'Minimum recharge is ₹1.');
        return;
      }

      Notifications.showToast('info', 'Processing...', 'Connecting to Razorpay gateway...');
      document.getElementById('recharge-btn').disabled = true;

      try {
        const orderRes = await API.createWalletOrder({ amount });
        
        const options = {
          key: "rzp_test_TEtvEWceSQBzxC",
          amount: amount * 100,
          currency: "INR",
          name: "CarPool Enterprise",
          description: "Wallet Recharge",
          ...(orderRes.id && !orderRes.id.startsWith('order_mock_') ? { order_id: orderRes.id } : {}),
          handler: async function (response) {
            try {
              const res = await API.rechargeWallet({
                amount: amount,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });

              // Update UI
              const newBalance = res.walletBalance;
              const walletBalance = document.getElementById('wallet-balance');
              if (walletBalance) walletBalance.textContent = `₹${newBalance.toFixed(2)}`;
              const sideBadge = document.getElementById('sidebar-wallet-badge');
              if (sideBadge) sideBadge.textContent = `₹${Math.round(newBalance)}`;

              if (customInput) customInput.value = '';
              document.querySelectorAll('.amount-pill').forEach(p => p.classList.remove('active'));
              selectedAmount = 0;

              await renderTransactions(userId);
              Notifications.showToast('success', 'Wallet Recharged! 💰', `₹${amount} added successfully.`);
            } catch(e) {
              Notifications.showToast('error', 'Recharge Verification failed', e.message);
            }
          },
          prefill: {
            name: Auth.getCurrentUser()?.firstName || "User",
            email: Auth.getCurrentUser()?.email || "user@example.com"
          },
          theme: { color: "#2563EB" },
          modal: {
            ondismiss: function() {
              document.getElementById('recharge-btn').disabled = false;
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          Notifications.showToast('error', 'Payment Failed', response.error.description);
          document.getElementById('recharge-btn').disabled = false;
        });
        rzp.open();
      } catch (err) {
        Notifications.showToast('error', 'Recharge initialization failed', err.message);
        document.getElementById('recharge-btn').disabled = false;
      }
    });
  }

  return { initRideHistory, initWallet };
})();

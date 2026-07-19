/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — PAYMENT
   Razorpay Test Integration + Wallet + Cash
   Key ID : rzp_test_TEtvEWceSQBzxC
   NOTE   : Key Secret is server-side only — never exposed here
═══════════════════════════════════════════════════════ */

const Payment = (() => {
  const RAZORPAY_KEY_ID = 'rzp_test_TEtvEWceSQBzxC';
  let _currentTrip   = null;

  // ── Open Payment Page ─────────────────────────────────
  async function openPayment(tripId) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    try {
      const t = await API.getTrip(tripId);
      if (!t) return;
      _currentTrip = t;
      const ride = t.rideId;

      document.getElementById('payment-amount').textContent = `₹${t.totalFare}`;
      document.getElementById('payment-trip-info').textContent =
        `${ride.pickup.split(',')[0]} → ${ride.destination.split(',')[0]} • ${FindRide?.formatDate(ride.date) || ride.date}`;

      // Wallet balance
      const me = await API.me();
      document.getElementById('payment-wallet-balance').textContent =
        `₹${(me?.walletBalance || 0).toFixed(2)}`;

      // Reset to cash
      document.getElementById('pm-cash').checked = true;
      togglePaymentExtras('cash', me);

      App.showPage('page-payment');
    } catch (err) {
      console.error('Failed to open payment', err);
    }
  }

  // ── Toggle extra UI per payment method ────────────────
  function togglePaymentExtras(method, userDetails) {
    const upiSec    = document.getElementById('upi-section');
    const walletSec = document.getElementById('wallet-section');

    if (upiSec)    upiSec.classList.toggle('hidden', method !== 'upi');
    if (walletSec) walletSec.classList.toggle('hidden', method !== 'wallet');

    if (method === 'upi') drawQRCode();
    if (method === 'wallet' && _currentTrip && userDetails) {
      const balance = userDetails.walletBalance || 0;
      const insufficient = document.getElementById('wallet-insufficient');
      if (insufficient) insufficient.classList.toggle('hidden', balance >= _currentTrip.totalFare);
    }
  }

  // ── UPI QR Code (canvas mock) ─────────────────────────
  function drawQRCode() {
    const canvas = document.getElementById('upi-qr-canvas');
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const size = 160;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';

    const drawSquare = (x, y, s) => {
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 6, y + 6, s - 12, s - 12);
    };
    drawSquare(4, 4, 40);
    drawSquare(116, 4, 40);
    drawSquare(4, 116, 40);

    for (let i = 0; i < 400; i++) {
      if (Math.random() > 0.5) {
        ctx.fillRect(
          Math.floor(Math.random() * 18) * 8 + 4,
          Math.floor(Math.random() * 18) * 8 + 4,
          6, 6
        );
      }
    }
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(68, 68, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹', 80, 80);
  }

  // ── Process Payment ───────────────────────────────────
  async function processPayment() {
    const method = document.querySelector('input[name="payment-method"]:checked')?.value || 'cash';
    const t      = _currentTrip;
    const user   = Auth.getCurrentUser();
    if (!t || !user) return;

    const btn = document.getElementById('pay-now-btn');
    btn.disabled    = true;
    btn.textContent = 'Processing...';

    switch (method) {
      case 'wallet': {
        const me = await API.me();
        if ((me?.walletBalance || 0) < t.totalFare) {
          Notifications.showToast('error', 'Insufficient balance', 'Please recharge your wallet.');
          btn.disabled = false; btn.textContent = 'Pay Now';
          return;
        }
        await completePayment('wallet');
        break;
      }
      case 'cash': {
        Notifications.showToast('info', 'Cash Payment', 'Pay driver directly. Confirming...');
        setTimeout(() => completePayment('cash'), 1200);
        break;
      }
      case 'upi':
      case 'card': {
        openRazorpay(method, t, user);
        btn.disabled = false; btn.textContent = 'Pay Now';
        break;
      }
      default:
        btn.disabled = false; btn.textContent = 'Pay Now';
    }
  }

  // ── Open Real Razorpay Checkout ───────────────────────
  function openRazorpay(method, trip, user) {
    if (typeof Razorpay === 'undefined') {
      Notifications.showToast('error', 'Payment gateway unavailable', 'Please check your internet connection.');
      return;
    }

    const amountPaise = Math.round(trip.totalFare * 100);

    const options = {
      key:         RAZORPAY_KEY_ID,
      amount:      amountPaise,
      currency:    'INR',
      name:        'CarPool Enterprise',
      description: `Ride payment — ₹${trip.totalFare}`,
      image:       'https://i.imgur.com/n5tjHFD.png',

      prefill: {
        name:    (user.firstName || '') + ' ' + (user.lastName || ''),
        email:   user.email  || 'user@carpool.com',
        contact: user.phone  || '9999999999',
      },

      config: {
        display: {
          blocks: {
            utib: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
            other: { name: 'Other methods', instruments: [{ method: 'card' }, { method: 'netbanking' }] },
          },
          sequence: method === 'upi' ? ['block.utib', 'block.other'] : ['block.other', 'block.utib'],
          preferences: { show_default_blocks: true },
        },
      },

      theme: { color: '#3B82F6' },

      handler: function (response) {
        console.log('[Razorpay] Payment ID:', response.razorpay_payment_id);
        Notifications.showToast('success', 'Payment Authorized 🎉',
          `Payment ID: ${response.razorpay_payment_id.slice(0, 16)}...`);
        completePayment(method, response.razorpay_payment_id);
      },

      modal: {
        ondismiss: function () {
          Notifications.showToast('info', 'Payment cancelled', 'You closed the payment window.');
          const btn = document.getElementById('pay-now-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
        },
        escape:    true,
        backdropclose: false,
      },
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      console.error('[Razorpay] Failed:', resp.error);
      Notifications.showToast('error', 'Payment Failed',
        resp.error.description || 'Please try a different method.');
      const btn = document.getElementById('pay-now-btn');
      if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
    });

    rzp.open();
  }

  // ── Complete Payment (post-gateway) ──────────────────
  async function completePayment(method, gatewayTxnId = null) {
    if (!_currentTrip) return;

    try {
      await API.updateTrip(_currentTrip._id, {
        paymentStatus:  'paid',
        paymentMethod:  method,
        ...(gatewayTxnId ? { razorpayPaymentId: gatewayTxnId } : {}),
      });

      const btn = document.getElementById('pay-now-btn');
      if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }

      Notifications.showToast('success', 'Payment Successful! 🎉',
        `₹${_currentTrip.totalFare} paid via ${method.toUpperCase()}.`);

      App.showPage('page-my-trips');
      Trip.init(Auth.getCurrentUser()?.id);
    } catch (err) {
      Notifications.showToast('error', 'Payment update failed', err.message);
      const btn = document.getElementById('pay-now-btn');
      if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
    }
  }

  // ── Bind DOM events ───────────────────────────────────
  function bindPaymentPage() {
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        const me = await API.me();
        togglePaymentExtras(radio.value, me);
      });
    });
    document.getElementById('pay-now-btn')?.addEventListener('click', processPayment);
  }

  return { openPayment, bindPaymentPage };
})();

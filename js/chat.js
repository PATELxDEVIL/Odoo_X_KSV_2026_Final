/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — CHAT
   Real-time chat with API polling
═══════════════════════════════════════════════════════ */

const Chat = (() => {
  let _tripId     = null;
  let _partnerId  = null;
  let _partnerName = '';
  let _prevPage   = 'my-trips';
  let _pollTimer  = null;
  let _lastMessages = [];

  async function open(tripId, partnerId, partnerName, partnerAvatar, fromPage = null) {
    _tripId     = tripId;
    _partnerId  = partnerId;
    _partnerName = partnerName;
    _prevPage   = fromPage;
    _lastMessages = [];

    document.getElementById('chat-partner-name').textContent   = partnerName;
    document.getElementById('chat-partner-avatar').textContent = partnerAvatar || partnerName.charAt(0);
    document.getElementById('chat-partner-status').textContent = 'In Trip';

    const msgs = document.getElementById('chat-messages');
    msgs.innerHTML = '<div class="loading-state" style="margin-top:20px"><div class="spinner"></div></div>';

    App.showPage('page-chat');
    
    await loadMessages();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    _pollTimer = setInterval(loadMessages, 3000);
  }

  function stopPolling() {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = null;
  }

  async function loadMessages() {
    if (!_tripId) return;
    try {
      const [messages, ride] = await Promise.all([
        API.getMessages(_tripId),
        API.getRide(_tripId).catch(() => null)
      ]);
      
      const isFirstLoad = _lastMessages.length === 0 && messages.length === 0 && document.getElementById('chat-messages').innerHTML.includes('loading-state');
      
      // Prevent re-rendering if messages haven't changed, BUT allow first empty load to clear spinner
      if (!isFirstLoad && messages.length === _lastMessages.length) return;
      _lastMessages = messages;

      const msgsContainer = document.getElementById('chat-messages');
      const currentUser = Auth.getCurrentUser();
      
      if (!messages.length) {
        msgsContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;margin-top:20px">No messages yet. Send a message to say hi!</div>';
        return;
      }

      msgsContainer.innerHTML = '';
      messages.forEach(m => {
        const isSent = m.senderId._id === currentUser.id;
        const time = new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        let role = '';
        if (ride) {
          const driverId = typeof ride.driverId === 'object' ? ride.driverId._id : ride.driverId;
          role = m.senderId._id === driverId ? ' (Host)' : ' (Shared Rider)';
        }

        // Only show senderName for received messages
        const watermark = isSent ? null : `${m.senderId.firstName}${role}`;
        addBubble(msgsContainer, m.content, isSent ? 'sent' : 'received', time, watermark);
      });
      msgsContainer.scrollTop = msgsContainer.scrollHeight;
    } catch (e) {
      console.warn('Failed to load messages', e);
      const msgsContainer = document.getElementById('chat-messages');
      if (msgsContainer && msgsContainer.innerHTML.includes('loading-state')) {
        msgsContainer.innerHTML = '<div style="text-align:center;color:var(--error);font-size:12px;margin-top:20px">Error loading messages. Retrying...</div>';
      }
    }
  }

  function addBubble(container, text, type, time, senderName = null) {
    const div = document.createElement('div');
    div.className = `chat-bubble ${type}`;
    
    let html = '';
    if (senderName && type === 'received') {
      html += `<div style="font-size:10px; color:var(--primary); margin-bottom:2px; font-weight:600; text-align:left;">${senderName}</div>`;
    }
    html += `${escapeHtml(text)}<div class="chat-bubble-meta">${time}</div>`;
    
    div.innerHTML = html;
    container.appendChild(div);
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text  = input?.value.trim();
    if (!text || !_tripId) return;

    input.value = '';
    const msgs = document.getElementById('chat-messages');
    const now  = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    // Optimistic UI update (null for senderName because it's sent by me)
    addBubble(msgs, text, 'sent', now, null);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      await API.sendMessage(_tripId, text);
      await loadMessages(); // Refresh immediately
    } catch (e) {
      Notifications.showToast('error', 'Message failed', 'Could not send message.');
    }
  }

  function bind() {
    document.getElementById('chat-send-btn')?.addEventListener('click', sendMessage);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    
    // When leaving chat page, stop polling
    document.getElementById('chat-back-btn')?.addEventListener('click', () => {
      stopPolling();
      App.showPage(_prevPage ? 'page-' + _prevPage : 'page-my-trips');
    });
    
    document.getElementById('chat-call-btn')?.addEventListener('click', () => {
      Tracking.openCallModal(_partnerName);
    });
  }

  return { open, bind, stopPolling };
})();

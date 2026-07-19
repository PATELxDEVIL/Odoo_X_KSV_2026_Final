// MISSING LINE 1
// MISSING LINE 2
// MISSING LINE 3
// MISSING LINE 4
// MISSING LINE 5
// MISSING LINE 6
// MISSING LINE 7
// MISSING LINE 8
// MISSING LINE 9
// MISSING LINE 10
// MISSING LINE 11
// MISSING LINE 12
// MISSING LINE 13
// MISSING LINE 14
// MISSING LINE 15
// MISSING LINE 16
// MISSING LINE 17
// MISSING LINE 18
// MISSING LINE 19
// MISSING LINE 20
// MISSING LINE 21
// MISSING LINE 22
// MISSING LINE 23
// MISSING LINE 24
// MISSING LINE 25
// MISSING LINE 26
// MISSING LINE 27
// MISSING LINE 28
// MISSING LINE 29
// MISSING LINE 30
// MISSING LINE 31
// MISSING LINE 32
// MISSING LINE 33
// MISSING LINE 34
// MISSING LINE 35
// MISSING LINE 36
// MISSING LINE 37
// MISSING LINE 38
// MISSING LINE 39
// MISSING LINE 40
// MISSING LINE 41
// MISSING LINE 42
// MISSING LINE 43
// MISSING LINE 44
// MISSING LINE 45
// MISSING LINE 46
// MISSING LINE 47
// MISSING LINE 48
// MISSING LINE 49
// MISSING LINE 50
// MISSING LINE 51
// MISSING LINE 52
// MISSING LINE 53
// MISSING LINE 54
// MISSING LINE 55
// MISSING LINE 56
// MISSING LINE 57
// MISSING LINE 58
// MISSING LINE 59
// MISSING LINE 60
// MISSING LINE 61
// MISSING LINE 62
// MISSING LINE 63
// MISSING LINE 64
// MISSING LINE 65
// MISSING LINE 66
// MISSING LINE 67
// MISSING LINE 68
// MISSING LINE 69
// MISSING LINE 70
// MISSING LINE 71
// MISSING LINE 72
// MISSING LINE 73
// MISSING LINE 74
// MISSING LINE 75
// MISSING LINE 76
// MISSING LINE 77
// MISSING LINE 78
// MISSING LINE 79
// MISSING LINE 80
// MISSING LINE 81
// MISSING LINE 82
// MISSING LINE 83
// MISSING LINE 84
// MISSING LINE 85
// MISSING LINE 86
// MISSING LINE 87
// MISSING LINE 88
// MISSING LINE 89
// MISSING LINE 90
// MISSING LINE 91
// MISSING LINE 92
// MISSING LINE 93
// MISSING LINE 94
// MISSING LINE 95
// MISSING LINE 96
// MISSING LINE 97
// MISSING LINE 98
// MISSING LINE 99
// MISSING LINE 100
// MISSING LINE 101
// MISSING LINE 102
// MISSING LINE 103
// MISSING LINE 104
// MISSING LINE 105
// MISSING LINE 106
// MISSING LINE 107
// MISSING LINE 108
// MISSING LINE 109
// MISSING LINE 110
// MISSING LINE 111
// MISSING LINE 112
// MISSING LINE 113
// MISSING LINE 114
// MISSING LINE 115
// MISSING LINE 116
// MISSING LINE 117
// MISSING LINE 118
// MISSING LINE 119
// MISSING LINE 120
// MISSING LINE 121
// MISSING LINE 122
// MISSING LINE 123
// MISSING LINE 124
// MISSING LINE 125
// MISSING LINE 126
// MISSING LINE 127
// MISSING LINE 128
// MISSING LINE 129
// MISSING LINE 130
// MISSING LINE 131
// MISSING LINE 132
// MISSING LINE 133
// MISSING LINE 134
// MISSING LINE 135
// MISSING LINE 136
// MISSING LINE 137
// MISSING LINE 138
// MISSING LINE 139
// MISSING LINE 140
// MISSING LINE 141
// MISSING LINE 142
// MISSING LINE 143
// MISSING LINE 144
// MISSING LINE 145
// MISSING LINE 146
// MISSING LINE 147
// MISSING LINE 148
// MISSING LINE 149
// MISSING LINE 150
// MISSING LINE 151
// MISSING LINE 152
// MISSING LINE 153
// MISSING LINE 154
// MISSING LINE 155
// MISSING LINE 156
// MISSING LINE 157
// MISSING LINE 158
// MISSING LINE 159
// MISSING LINE 160
// MISSING LINE 161
// MISSING LINE 162
// MISSING LINE 163
// MISSING LINE 164
// MISSING LINE 165
// MISSING LINE 166
// MISSING LINE 167
// MISSING LINE 168
// MISSING LINE 169
// MISSING LINE 170
// MISSING LINE 171
// MISSING LINE 172
// MISSING LINE 173
// MISSING LINE 174
// MISSING LINE 175
// MISSING LINE 176
// MISSING LINE 177
// MISSING LINE 178
// MISSING LINE 179
// MISSING LINE 180
// MISSING LINE 181
// MISSING LINE 182
// MISSING LINE 183
// MISSING LINE 184
// MISSING LINE 185
// MISSING LINE 186
// MISSING LINE 187
// MISSING LINE 188
// MISSING LINE 189
// MISSING LINE 190
// MISSING LINE 191
// MISSING LINE 192
// MISSING LINE 193
// MISSING LINE 194
// MISSING LINE 195
// MISSING LINE 196
// MISSING LINE 197
// MISSING LINE 198
// MISSING LINE 199
// MISSING LINE 200
// MISSING LINE 201
// MISSING LINE 202
// MISSING LINE 203
// MISSING LINE 204
// MISSING LINE 205
// MISSING LINE 206
// MISSING LINE 207
// MISSING LINE 208
// MISSING LINE 209
// MISSING LINE 210
// MISSING LINE 211
// MISSING LINE 212
// MISSING LINE 213
// MISSING LINE 214
// MISSING LINE 215
// MISSING LINE 216
// MISSING LINE 217
// MISSING LINE 218
// MISSING LINE 219
// MISSING LINE 220
// MISSING LINE 221
// MISSING LINE 222
// MISSING LINE 223
// MISSING LINE 224
// MISSING LINE 225
// MISSING LINE 226
// MISSING LINE 227
// MISSING LINE 228
// MISSING LINE 229
// MISSING LINE 230
// MISSING LINE 231
// MISSING LINE 232
// MISSING LINE 233
// MISSING LINE 234
// MISSING LINE 235
// MISSING LINE 236
// MISSING LINE 237
// MISSING LINE 238
// MISSING LINE 239
      const upcoming = allTrips.filter(t => t.status === 'booked').slice(0, 3);

      if (!upcoming.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🗓</div>
          <p>No upcoming trips. <a href="#" data-page="find-ride" class="link">Find a ride?</a></p>
        </div>`;
        container.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', (e) => {
          e.preventDefault(); showPage('page-' + el.dataset.page);
        }));
        return;
      }

      container.innerHTML = upcoming.map(t => {
        const ride = t.rideId;
        if (!ride) return '';
        const driver = ride.driverId;
        const sdate  = FindRide ? FindRide.formatDate(ride.date) : ride.date;
        return `
        <div class="trip-card" onclick="Trip.openTripDetail('${t._id}')">
          <div class="user-avatar">${driver?.avatar || '?'}</div>
          <div class="trip-card-route">
            <div class="trip-route-line">
              <div class="route-dot start sm"></div>
              <span>${ride.pickup.split(',')[0]}</span>
              <span class="trip-route-arrow">→</span>
              <div class="route-dot end sm"></div>
              <span>${ride.destination.split(',')[0]}</span>
            </div>
            <div class="trip-meta">
              <span class="trip-meta-item">📅 ${sdate}</span>
              <span class="trip-meta-item">🕐 ${ride.time}</span>
              <span class="trip-meta-item">with ${driver?.firstName || 'Driver'}</span>
            </div>
          </div>
          <div class="trip-card-right">
            <span class="status-badge booked">✓ Booked</span>
            <div class="trip-fare">₹${t.totalFare}</div>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p>Error loading trips.</p>';
    }
  }

  function loadDashboardRides(userId) {
    const container = document.getElementById('dashboard-rides-list');
    if (!container) return;
    const available = DB.findWhere(DB.KEYS.rides, r => r.status === 'available' && r.driverId !== userId).slice(0, 4);

    if (!available.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚗</div><p>No rides available today.</p></div>`;
      return;
    }

    container.innerHTML = available.map(r => {
      const driver = DB.user(r.driverId);
      return `
      <div class="ride-card" style="cursor:pointer" onclick="FindRide.openBookingModal('${r.id}')">
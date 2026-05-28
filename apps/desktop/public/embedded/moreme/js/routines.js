/* ==========================================================================
   routines.js — Static routine data + renderers (weekday, weekend, beach, anywhere)
   ========================================================================== */

const ROUTINES = {
  weekday: {
    title: 'Weekday routine',
    body: `
      <h3>Morning (10 min)</h3>
      <ul>
        <li>Drink water</li>
        <li>Stretch (2–3 min)</li>
        <li>Quick movement — push-ups, squats, or a walk</li>
        <li>Set top 3 goals (paper or digital)</li>
        <li>Deep breaths</li>
      </ul>

      <h3>Weekly workout schedule</h3>
      <ul>
        <li><strong>Day 1 — Strength:</strong> Push-ups 3×8–12, Squats 3×12–15, Plank 3×20–30s, Lunges 2×10 each leg</li>
        <li><strong>Day 2 — Cardio:</strong> 10–20 min jog or fast walk, or 30s run / 30s walk ×10</li>
        <li><strong>Day 3 — Mixed:</strong> Jumping jacks 2×30, Mountain climbers 2×20, Sit-ups 3×10–15, Stretch + cool down</li>
        <li><strong>Day 4 — Any sport.</strong> Repeat.</li>
      </ul>

      <h3>Sports days</h3>
      <ul>
        <li>Mon: Basketball</li>
        <li>Wed: Jog/run</li>
        <li>Fri: Any sport</li>
      </ul>

      <h3>Focus system</h3>
      <ul>
        <li>First 10 minutes: hardest task, or the thing you'll want to avoid.</li>
        <li>One 20–25 min focus block per morning. Close tabs. Work on one thing. Then 3–5 min break.</li>
        <li>Daily top 3: one academic, one personal, one responsibility.</li>
      </ul>

      <h3>If you get distracted</h3>
      <ul>
        <li>Stop.</li>
        <li>Take one deep breath.</li>
        <li>Ask: "What was I supposed to be doing?"</li>
        <li>Return to that task.</li>
      </ul>

      <h3>End of day</h3>
      <ul>
        <li>Check off what you completed.</li>
        <li>Note one thing to improve tomorrow.</li>
        <li>Celebrate one win.</li>
      </ul>

      <h3>Night routine (15–20 min)</h3>
      <ul>
        <li>Light stretching or slow breathing</li>
        <li>Set clothes out for tomorrow</li>
        <li>Think of 1 win from the day</li>
        <li>Lights out at 10:00 MAX</li>
        <li>Screens and loud things off</li>
      </ul>
      <blockquote>Minimum daily commitment: 2 minutes of movement. Every day.</blockquote>
    `
  },

  weekend: {
    title: 'Weekend routine',
    body: `
      <h3>Saturday — Morning</h3>
      <ul>
        <li>10-minute morning routine</li>
        <li>Warm-up 3 min</li>
        <li>Strength circuit: Push-ups 3×10–15, Squats 3×15–20, Plank 3×30–45s, Mountain climbers 2×20</li>
        <li>Cool down 2 min</li>
        <li>Healthy breakfast (fruit, oatmeal, etc.)</li>
      </ul>
      <h3>Saturday — Midday</h3>
      <ul>
        <li>Sports 1–2 hours: basketball, soccer, running, biking, walking, football, tennis, frisbee, baseball…</li>
      </ul>
      <h3>Saturday — Afternoon</h3>
      <ul>
        <li>Schoolwork 30–45 min — Khan Academy, NoRedInk, Acton goals</li>
        <li>Reset space — clean room, organize backpack, clothes for next week</li>
      </ul>
      <h3>Saturday — Evening</h3>
      <ul>
        <li>Gaming (2 hours max)</li>
      </ul>

      <h3>Sunday — Morning</h3>
      <ul>
        <li>Light movement: walk, stretch, easy jog</li>
        <li>Breakfast + hydration</li>
      </ul>
      <h3>Sunday — Midday</h3>
      <ul>
        <li>Personal work time — any goal you set for yourself</li>
      </ul>
      <h3>Sunday — Afternoon</h3>
      <ul>
        <li>Weekly planning (10 min): goals for the week, journey tracker, school calendar</li>
        <li>Optional workout — short run / bodyweight / basketball</li>
      </ul>
      <h3>Sunday — Evening</h3>
      <ul>
        <li>Gaming 2 hours max</li>
        <li>Bedtime routine</li>
      </ul>
      <blockquote>Gaming rule: only after the day's main goals are done. No gaming past 9 PM.</blockquote>
    `
  },

  beach: {
    title: 'Beach routine',
    body: `
      <h3>Morning</h3>
      <ul>
        <li>10-minute morning routine</li>
        <li>Beach walk or jog</li>
        <li>Stretching</li>
      </ul>
      <h3>Midday</h3>
      <ul>
        <li>Biking</li>
        <li>Tennis</li>
        <li>Light bodyweight workout</li>
      </ul>
      <h3>Afternoon</h3>
      <ul>
        <li>Reading or learning</li>
        <li>Project time</li>
        <li>Hydrate (super important at the beach)</li>
      </ul>
      <h3>Evening</h3>
      <ul>
        <li>Sunset walk</li>
        <li>1 hour gaming max</li>
        <li>Early sleep — beach air knocks you out</li>
      </ul>
      <h3>Beach-specific activities</h3>
      <ul>
        <li>Sand sprints</li>
        <li>Swimming</li>
        <li>Frisbee</li>
        <li>Volleyball</li>
        <li>Shell-hunting</li>
      </ul>
    `
  },

  anywhere: {
    title: 'Anywhere routine',
    body: `
      <h3>Morning</h3>
      <ul>
        <li>10-minute routine</li>
        <li>Universal travel workout</li>
        <li>Hydrate</li>
      </ul>
      <h3>Midday</h3>
      <ul>
        <li>Explore the area</li>
        <li>Walk everywhere</li>
      </ul>
      <h3>Afternoon</h3>
      <ul>
        <li>20–30 minutes of schoolwork (if possible)</li>
        <li>20 minutes of project work (if possible)</li>
        <li>Journal one thing you noticed about the place</li>
      </ul>
      <h3>Evening</h3>
      <ul>
        <li>Light stretching</li>
        <li>1 hour gaming max</li>
        <li>Sleep on time</li>
      </ul>
      <h3>Universal travel workout</h3>
      <ul>
        <li>15 squats</li>
        <li>10 push-ups</li>
        <li>20 jumping jacks</li>
        <li>30-second plank</li>
        <li>Repeat 2–3 times</li>
      </ul>
      <h3>Universal travel activities</h3>
      <ul>
        <li>Walking, stairs, parks</li>
        <li>Hotel gyms, local sports</li>
        <li>Exploring</li>
      </ul>
    `
  },
};

const ROUTINE_ORDER = ['weekday', 'weekend', 'beach', 'anywhere'];

function renderRoutines() {
  const tabsHost = document.getElementById('routineTabs');
  const card = document.getElementById('routineCard');
  if (!tabsHost || !card) return;

  const active = STATE.routines.lastUsed || 'weekday';

  tabsHost.innerHTML = ROUTINE_ORDER.map(k => `
    <button class="routine-tab ${k === active ? 'is-active' : ''}" data-routine="${k}">${ROUTINES[k].title}</button>
  `).join('');

  card.innerHTML = `<h3 style="margin-top:0">${ROUTINES[active].title}</h3>${ROUTINES[active].body}`;

  tabsHost.querySelectorAll('[data-routine]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.routines.lastUsed = btn.dataset.routine;
      scheduleSave();
      renderRoutines();
    });
  });
}

// ---- Packing list ---------------------------------------------------------

const PACK_CATEGORIES = [
  {
    name: 'Essentials',
    items: ['Toothbrush + toothpaste', 'Shampoo + body wash', 'Comb', 'Sunscreen', 'Chapstick', 'Floss', 'Rinse', 'Face soap'],
  },
  {
    name: 'Clothing',
    items: ['3–5 shirts', '1–2 pairs of shorts', '1–2 pairs of pants', 'Underwear + socks per day', 'Hoodie or jacket', 'Pajamas', 'Swimwear', 'Hat or beanie'],
  },
  {
    name: 'Shoes',
    items: ['Everyday shoes', 'Sport shoes', 'Sandals or slides'],
  },
  {
    name: 'Electronics',
    items: ['CHARGERS', 'Headphones', 'Portable battery', 'Laptop', 'Extension cords'],
  },
  {
    name: 'School + projects',
    items: ['Notebook', 'Pens/pencils', 'Current book', 'Project materials', 'Folder for loose papers'],
  },
  {
    name: 'Fitness + sports',
    items: ['Workout clothes', 'Jump rope', 'Tennis racket', 'Water bottle', 'Small towel', 'Ball (basketball / football / soccer)'],
  },
  {
    name: 'Travel extras',
    items: ['Snacks', 'Reusable bag', 'Sunglasses', 'Travel pillow', 'Small first-aid'],
  },
  {
    name: 'Important stuff',
    items: ['Wallet', 'ID', 'Tickets / confirmations', 'Emergency contact info'],
  },
  {
    name: 'Entertainment',
    items: ['Nintendo Switch', '1–2 games', 'Book or Kindle', 'Downloaded music or playlists'],
  },
];

function renderPacking() {
  const host = document.getElementById('packList');
  if (!host) return;
  const packed = STATE.travel.packed || {};
  host.innerHTML = PACK_CATEGORIES.map(cat => `
    <div class="pack-category">
      <h4>${cat.name}</h4>
      ${cat.items.map(item => {
        const key = cat.name + '::' + item;
        const on = !!packed[key];
        return `
          <label>
            <input type="checkbox" data-pack="${key.replace(/"/g, '&quot;')}" ${on ? 'checked' : ''}>
            <span>${item}</span>
          </label>`;
      }).join('')}
    </div>
  `).join('');

  host.querySelectorAll('[data-pack]').forEach(cb => {
    cb.addEventListener('change', () => {
      STATE.travel.packed[cb.dataset.pack] = cb.checked;
      scheduleSave();
    });
  });
}

function renderTravelModeTabs() {
  document.querySelectorAll('[data-travel-mode]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.travelMode === (STATE.travel.mode || 'home'));
    btn.onclick = () => {
      STATE.travel.mode = btn.dataset.travelMode;
      scheduleSave();
      renderTravelModeTabs();
    };
  });
}

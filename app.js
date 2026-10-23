// Sidekick: Oslo - how everything WORKS.
//
// The big idea, in plain words:
//   1. The app remembers everything in ONE box called `state`.
//   2. When something changes, we call setState(...) with the change.
//   3. setState() then calls render(), which redraws the screen from the state.
//   4. Buttons say what they do with data-action="...". One listener at the
//      bottom of this file catches every click and runs the matching action.
//
// Read the file from top to bottom: DATA, STATE, SMALL HELPERS, SCREENS, ACTIONS.


// =====================================================================
// 1. DATA - the people and plans we pretend exist (changeable)
// =====================================================================

const FEED = [
  { id: 'f1', name: 'Maja', age: 27, init: 'M', color: '#CDEBDD', act: 'Run', title: 'Easy 5k along Akerselva', when: 'In 1 hour', place: 'Nydalen bridge', level: 'Beginner pace', dist: '1.2 km', mode: 'pick', done: 12, note: 'Chatty pace, around 6:15 per km. No pressure to keep up.' },
  { id: 'f2', name: 'Jonas', age: 31, init: 'J', color: '#D6E4FF', act: 'Climb', title: 'Bouldering session', when: 'In 3 hours', place: 'Climbing gym entrance, Sagene', level: 'Intermediate', dist: '2.4 km', mode: 'first', done: 7, note: 'Happy to show some routes if you are new to it.' },
  { id: 'f3', name: 'Sara', age: 24, init: 'S', color: '#FBD9E3', act: 'Coffee', title: 'Coffee walk, trying a new café', when: 'In 2 hours', place: 'Olaf Ryes plass', level: 'Any level', dist: '0.8 km', mode: 'pick', done: 3, note: 'I have not been to the café I picked either, so we can both be new.' },
  { id: 'f4', name: 'Amir', age: 29, init: 'A', color: '#FDE7C3', act: 'Gym', title: 'Gym, push day', when: 'Tomorrow 07:00', place: 'Gym near Majorstuen', level: 'Intermediate', dist: '3.1 km', mode: 'pick', done: 21, note: 'Spotting is welcome. Talking is optional.' }
];

// People who "ask to join" when YOU post a plan (pretend requests for the demo)
const REQUESTERS = [
  { id: 'r1', name: 'Ida', age: 26, init: 'I', color: '#E4D9FB', done: 9, note: 'Looks like a fun plan. Count me in!' },
  { id: 'r2', name: 'Tobias', age: 30, init: 'T', color: '#D2EEF5', done: 4, note: 'New in town and would love to join.' },
  { id: 'r3', name: 'Lena', age: 28, init: 'L', color: '#FDE0D2', done: 15, note: 'I was going anyway, happy to have company.' }
];

const ACT_TITLES = { Run: 'Easy run', Gym: 'Gym session', Climb: 'Climbing session', Coffee: 'Coffee walk' };


// =====================================================================
// 2. STATE - everything the app remembers
// =====================================================================

let state = {
  screen: 'onboard',   // which screen we are on
  step: 0,             // sign-up step (0, 1, 2)
  filter: 'All',       // browse filter chip
  selId: null,         // which plan is open on the detail screen
  reqs: {},            // my requests to join: { planId: 'pending' | 'accepted' | 'full' }
  myPost: null,        // the plan I posted (or null)
  incoming: [],        // people asking to join my plan
  toast: '',           // the green message on My plans
  match: null,         // the current match (who, when, where)
  chat: [],            // messages in the match
  shared: false,       // did I share the plan with a friend?
  form: { act: 'Run', when: 'In 1 hour', place: 'Akerselva, Nydalen bridge', level: 'Beginner', mode: 'pick' }
};

let lastScreen = null; // used so the page doesn't jump to the top on every tap

function setState(changes) {
  state = { ...state, ...changes };
  render();
}


// =====================================================================
// 3. SMALL HELPERS - tiny pieces we reuse everywhere
// =====================================================================

// Makes user-typed text safe to put into the page
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Little pictures (icons)
function svg(inner, size, width) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (width || 2) +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
const ICON = {
  clock: (s) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', s || 16),
  pin: (s) => svg('<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', s || 16),
  shield: (s, w) => svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>', s || 14, w || 2.2),
  back: () => svg('<path d="M15 5l-7 7 7 7"/>', 22, 2.2),
  check: () => svg('<path d="M5 12l5 5 9-10"/>', 32, 2.6),
  camera: (s) => svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', s || 20),
  share: () => svg('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>', 20),
  browse: () => svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', 24),
  plus: () => svg('<path d="M12 5v14M5 12h14"/>', 24),
  calendar: () => svg('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>', 24)
};

function modeLabel(mode) { return mode === 'pick' ? 'Host picks' : 'First come'; }

function avatar(person, size, fontSize) {
  return '<div class="ava" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fontSize + 'px;background:' + person.color + '">' + person.init + '</div>';
}

// A pill button. `action` is what happens on tap, `value` is the choice it carries.
function chip(label, on, action, value) {
  return '<button class="chip' + (on ? ' on' : '') + '" data-action="' + action + '" data-value="' + esc(value || label) + '">' + esc(label) + '</button>';
}

function verified(text) {
  return '<div class="ver">' + ICON.shield() + (text || 'Verified') + '</div>';
}

function findPlan(id) { return FEED.find((p) => p.id === id); }


// =====================================================================
// 4. SCREENS - each function returns the HTML for one screen
// =====================================================================

// ---- Sign-up: phone, code, selfie ----
function onboardScreen() {
  const dots = [0, 1, 2].map((i) => '<div class="dot' + (i <= state.step ? ' on' : '') + '"></div>').join('');
  let body = '';

  if (state.step === 0) {
    body =
      '<div class="h" style="font-size:20px;margin-top:40px;color:#0B7A5E">Sidekick: Oslo</div>' +
      '<div class="h" style="font-size:40px;margin-top:16px">I\'m going anyway. Want to join?</div>' +
      '<div class="muted" style="font-size:17px;line-height:1.4;margin-top:16px">Spontaneous one-on-one plans with verified people near you. Run, climb, lift or just walk and talk.</div>' +
      '<label for="phone" class="lbl" style="margin-top:32px">Phone number</label>' +
      '<input id="phone" class="inp" type="tel" placeholder="+47 000 00 000">' +
      '<div class="muted small" style="margin-top:12px">Every profile is checked with a phone number and a live selfie, so you know who you are meeting.</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-action="next">Send code</button>';
  } else if (state.step === 1) {
    body =
      '<div class="h" style="font-size:34px;margin-top:56px">Enter your code</div>' +
      '<div class="muted" style="font-size:17px;line-height:1.4;margin-top:12px">We sent a 4-digit code by text. In this prototype any digits work.</div>' +
      '<div class="codes">' +
        '<input class="inp" maxlength="1" inputmode="numeric" aria-label="Digit 1">' +
        '<input class="inp" maxlength="1" inputmode="numeric" aria-label="Digit 2">' +
        '<input class="inp" maxlength="1" inputmode="numeric" aria-label="Digit 3">' +
        '<input class="inp" maxlength="1" inputmode="numeric" aria-label="Digit 4">' +
      '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-action="next">Verify</button>';
  } else {
    body =
      '<div class="h" style="font-size:34px;margin-top:56px">Quick selfie check</div>' +
      '<div class="muted" style="font-size:17px;line-height:1.4;margin-top:12px">We compare a live selfie with your profile photo. Only verified people can post or request plans.</div>' +
      '<div class="selfie">' + ICON.camera(56) + '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-action="next">' + ICON.camera() + 'Take selfie</button>';
  }

  return '<div class="screen onboard"><div class="dots">' + dots + '</div>' + body + '</div>';
}

// ---- Browse: the list of plans near you ----
function browseScreen() {
  const filters = ['All', 'Run', 'Gym', 'Climb', 'Coffee']
    .map((f) => chip(f, state.filter === f, 'setFilter'))
    .join('');

  const cards = FEED
    .filter((p) => state.filter === 'All' || p.act === state.filter)
    .map((p) => {
      const requested = state.reqs[p.id] ? '<span class="tag warn">Requested</span>' : '';
      return '<button class="card cardbtn" data-action="openPlan" data-id="' + p.id + '">' +
        '<div class="person">' + avatar(p, 44, 18) +
          '<div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:700">' + p.name + ', ' + p.age + '</div>' + verified() + '</div>' +
          '<div class="muted" style="font-size:13px;font-weight:500">' + p.dist + '</div>' +
        '</div>' +
        '<div class="h" style="font-size:19px;font-weight:700;margin-top:14px;line-height:1.2">' + p.title + '</div>' +
        '<div class="row muted" style="margin-top:8px">' + ICON.clock() + p.when + '</div>' +
        '<div class="row muted" style="margin-top:4px">' + ICON.pin() + p.place + '</div>' +
        '<div class="tags"><span class="tag">' + p.level + '</span><span class="tag">1 spot</span><span class="tag">' + modeLabel(p.mode) + '</span>' + requested + '</div>' +
      '</button>';
    })
    .join('');

  return '<div class="screen">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
      '<div class="h title">Near you now</div>' +
      '<div class="tag" style="display:flex;align-items:center;gap:4px;margin-top:6px">' + ICON.pin(14) + 'Oslo, 5 km</div>' +
    '</div>' +
    '<div class="muted" style="font-size:15px;margin-top:6px">People who are going anyway. Ask to tag along.</div>' +
    '<div class="chips scroll">' + filters + '</div>' +
    '<div class="list">' + cards + '</div>' +
  '</div>';
}

// ---- Detail: one plan, with the host's profile ----
function detailScreen() {
  const p = findPlan(state.selId);
  const status = state.reqs[p.id] || 'none';
  let bottom = '';

  if (status === 'none') {
    const label = p.mode === 'first' ? 'Join now' : 'Request to join';
    const hint = p.mode === 'first'
      ? 'First come, first served. You are matched right away.'
      : p.name + ' sees your photo and picks one person.';
    bottom = '<button class="btn" data-action="sendRequest">' + label + '</button>' +
      '<div class="muted small" style="text-align:center;margin-top:10px">' + hint + '</div>';
  } else if (status === 'pending') {
    bottom =
      '<div class="card notice amber"><div style="font-size:16px;font-weight:700">Request sent</div>' +
      '<div style="margin-top:4px">' + p.name + ' picks one person. We will notify you either way before the plan starts.</div></div>' +
      '<div class="demo"><div class="muted" style="font-size:13px;font-weight:700">PROTOTYPE ONLY: SIMULATE ' + p.name.toUpperCase() + '\'S ANSWER</div>' +
      '<div class="demo-btns">' +
        '<button class="btn sec small-btn" data-action="simAccept">Accepts</button>' +
        '<button class="btn sec small-btn" data-action="simDecline">Picks someone else</button>' +
      '</div></div>';
  } else if (status === 'full') {
    bottom =
      '<div class="card notice grey"><div style="font-size:16px;font-weight:700">This activity is full</div>' +
      '<div class="muted" style="margin-top:4px">Plenty of other people are going out today.</div></div>' +
      '<button class="btn" style="margin-top:12px" data-action="go" data-value="browse">See other plans</button>';
  } else {
    bottom = '<button class="btn" data-action="go" data-value="match">Open your plan</button>';
  }

  return '<div class="screen" style="padding-top:48px">' +
    '<div><button class="back" data-action="go" data-value="browse" aria-label="Back to browse">' + ICON.back() + '</button></div>' +
    '<div class="person" style="gap:16px;margin-top:16px">' + avatar(p, 76, 30) +
      '<div><div class="h" style="font-size:26px">' + p.name + ', ' + p.age + '</div>' +
      '<div style="margin-top:4px">' + verified('Photo and phone verified') + '</div>' +
      '<div class="muted" style="font-size:14px;margin-top:2px">' + p.done + ' plans done, 0 cancelled</div></div>' +
    '</div>' +
    '<div class="card" style="margin-top:20px">' +
      '<div class="muted" style="font-size:13px;font-weight:700">GOING ANYWAY</div>' +
      '<div class="h" style="font-size:22px;margin-top:4px;line-height:1.2">' + p.title + '</div>' +
      '<div class="row" style="margin-top:14px">' + ICON.clock(18) + p.when + '</div>' +
      '<div class="row">' + ICON.pin(18) + p.place + '</div>' +
      '<div class="tags"><span class="tag">' + p.level + '</span><span class="tag">' + p.dist + ' away</span><span class="tag">' + modeLabel(p.mode) + '</span></div>' +
    '</div>' +
    '<div class="card" style="margin-top:12px"><div class="muted" style="font-size:13px;font-weight:700">FROM ' + p.name.toUpperCase() + '</div>' +
      '<div style="font-size:16px;line-height:1.4;margin-top:6px">' + p.note + '</div></div>' +
    '<div class="grow"></div>' +
    '<div>' + bottom + '</div>' +
  '</div>';
}

// ---- Post: make my own plan ----
function postScreen() {
  const f = state.form;
  const acts = ['Run', 'Gym', 'Climb', 'Coffee'].map((x) => chip(x, f.act === x, 'setAct')).join('');
  const whens = ['In 1 hour', 'In 2 hours', 'This evening', 'Tomorrow morning'].map((x) => chip(x, f.when === x, 'setWhen')).join('');
  const levels = ['Beginner', 'Intermediate', 'Any'].map((x) => chip(x, f.level === x, 'setLevel')).join('');
  const modes = chip('I pick', f.mode === 'pick', 'setMode', 'pick') + chip('First come', f.mode === 'first', 'setMode', 'first');
  const hint = f.mode === 'pick'
    ? 'You see everyone who asks, with photos, and choose one. The others only see "This activity is full".'
    : 'The first verified person to tap Join gets the spot. Good for relaxed plans like a coffee walk.';

  return '<div class="screen">' +
    '<div class="h title">Post a plan</div>' +
    '<div class="muted" style="font-size:15px;margin-top:6px">Something you are doing anyway, with room for one person.</div>' +
    '<span class="lbl">What are you doing?</span><div class="chips">' + acts + '</div>' +
    '<span class="lbl">When?</span><div class="chips">' + whens + '</div>' +
    '<label for="place" class="lbl">Meeting point (public place)</label>' +
    '<input id="place" class="inp" type="text" value="' + esc(f.place) + '">' +
    '<span class="lbl">Level</span><div class="chips">' + levels + '</div>' +
    '<span class="lbl">Who decides?</span><div class="chips">' + modes + '</div>' +
    '<div class="muted small" style="margin-top:10px">' + hint + '</div>' +
    '<div class="card notice" style="margin-top:20px;font-size:14px">Only verified people can request. You can see their photo first and decline quietly.</div>' +
    '<div style="margin-top:20px"><button class="btn" data-action="submitPost">Post plan</button></div>' +
  '</div>';
}

// ---- My plans: plans I host, and plans I asked to join ----
function plansScreen() {
  const p = state.myPost;
  const joiningIds = Object.keys(state.reqs);
  let html = '<div class="screen"><div class="h title">My plans</div>';

  if (state.toast) {
    html += '<div class="card notice" style="margin-top:16px">' + esc(state.toast) + '</div>';
  }

  if (!p && joiningIds.length === 0) {
    html += '<div class="card" style="margin-top:20px;text-align:center;padding:28px 20px">' +
      '<div class="h" style="font-size:20px">Nothing planned yet</div>' +
      '<div class="muted" style="font-size:15px;line-height:1.4;margin-top:6px">Post something you are doing anyway, or ask to join a plan nearby.</div>' +
      '<div class="demo-btns" style="margin-top:16px">' +
        '<button class="btn small-btn" data-action="go" data-value="post">Post a plan</button>' +
        '<button class="btn sec small-btn" data-action="go" data-value="browse">Browse</button>' +
      '</div></div>';
  }

  if (p) {
    html += '<span class="lbl" style="margin-top:24px">Hosting</span><div class="card">' +
      '<div class="h" style="font-size:19px;line-height:1.2">' + p.title + '</div>' +
      '<div class="muted" style="font-size:15px;margin-top:4px">' + p.when + ', ' + esc(p.place) + '</div>' +
      '<div class="tags" style="margin-top:10px"><span class="tag">' + p.level + '</span><span class="tag">' + modeLabel(p.mode) + '</span></div>';

    if (p.status === 'matched') {
      html += '<div style="margin-top:14px"><div style="font-size:15px;font-weight:700;color:#06573F">Matched with ' + p.with + '</div>' +
        '<button class="btn small-btn" style="margin-top:10px" data-action="go" data-value="match">Open plan</button></div>';
    } else {
      const n = state.incoming.length;
      html += '<div style="margin-top:16px;font-size:14px;font-weight:700">' + (n === 1 ? '1 request' : n + ' requests') + '</div>';
      html += state.incoming.map((r) =>
        '<div class="request"><div class="person">' + avatar(r, 52, 20) +
          '<div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:700">' + r.name + ', ' + r.age + '</div>' + verified('Photo verified') +
          '<div class="muted" style="font-size:13px">' + r.done + ' plans done, 0 cancelled</div></div></div>' +
          '<div style="font-size:15px;line-height:1.4;margin-top:10px">' + r.note + '</div>' +
          '<div class="request-btns">' +
            '<button class="btn small-btn" data-action="accept" data-id="' + r.id + '">Accept</button>' +
            '<button class="btn sec small-btn" data-action="decline" data-id="' + r.id + '">Decline</button>' +
          '</div></div>'
      ).join('');
      if (n === 0) {
        html += '<div class="muted small" style="margin-top:8px;font-size:15px">No more requests right now. We will tell you when someone new asks.</div>';
      }
    }
    html += '</div>';
  }

  if (joiningIds.length > 0) {
    const look = { pending: ['Waiting', 'warn'], accepted: ['Confirmed', 'good'], full: ['Full', ''] };
    html += '<span class="lbl" style="margin-top:24px">Joining</span><div class="list" style="margin-top:0">';
    html += joiningIds.map((id) => {
      const x = findPlan(id);
      const l = look[state.reqs[id]];
      return '<button class="card cardbtn" data-action="openJoin" data-id="' + id + '"><div class="person">' + avatar(x, 44, 18) +
        '<div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:700">' + x.title + '</div>' +
        '<div class="muted" style="font-size:14px">With ' + x.name + ', ' + x.when + '</div></div>' +
        '<span class="tag ' + l[1] + '">' + l[0] + '</span></div></button>';
    }).join('');
    html += '</div>';
  }

  return html + '</div>';
}

// ---- Match: you are going together! ----
function matchScreen() {
  const m = state.match;
  const bubbles = state.chat.map((c) => '<div class="bubble' + (c.me ? ' me' : '') + '">' + esc(c.text) + '</div>').join('');
  const quick = ['On my way', 'Running 5 min late', 'Still on?'].map((q) => '<button class="chip quick" data-action="quickReply" data-value="' + q + '">' + q + '</button>').join('');
  let others = '';
  if (m.role === 'host' && m.others > 0) {
    others = '<div class="muted small" style="margin-top:10px;text-align:center">' +
      (m.others === 1 ? '1 other request will' : m.others + ' other requests will') + ' quietly see "This activity is full".</div>';
  }

  return '<div class="screen" style="padding-top:48px">' +
    '<div><button class="back" data-action="go" data-value="plans" aria-label="Back to my plans">' + ICON.back() + '</button></div>' +
    '<div class="center"><div class="checkcircle">' + ICON.check() + '</div>' +
      '<div class="h" style="font-size:32px;margin-top:14px">It\'s a match</div>' +
      '<div class="muted" style="font-size:16px;margin-top:6px">You and ' + m.name + ' are going together.</div></div>' +
    '<div class="card" style="margin-top:20px"><div class="person">' + avatar(m, 48, 19) +
      '<div><div class="h" style="font-size:18px;line-height:1.2">' + m.title + '</div><div class="muted" style="font-size:14px">with ' + m.name + '</div></div></div>' +
      '<div class="row" style="margin-top:14px">' + ICON.clock(18) + m.when + '</div>' +
      '<div class="row">' + ICON.pin(18) + esc(m.place) + '</div>' +
      '<div class="muted small" style="margin-top:12px">We will send you both a reminder one hour before: "Still on?"</div></div>' +
    others +
    '<div class="card" style="margin-top:12px"><div class="muted" style="font-size:13px;font-weight:700">MESSAGES</div>' +
      '<div class="chat">' + bubbles + '</div>' +
      '<div class="chips" style="margin-top:12px">' + quick + '</div></div>' +
    '<div class="grow"></div>' +
    '<button class="btn sec' + (state.shared ? ' shared' : '') + '" data-action="sharePlan">' + ICON.share() + (state.shared ? 'Plan shared with a friend' : 'Share plan with a friend') + '</button>' +
    '<button class="linkbtn" data-action="cancelPlan">Cancel this plan</button>' +
  '</div>';
}

// ---- The bar at the bottom ----
function tabBar() {
  const s = state.screen;
  const n = state.incoming.length;
  function tab(screen, label, icon, extra) {
    return '<button class="tab' + (s === screen ? ' on' : '') + '" data-action="go" data-value="' + screen + '">' + icon + label + (extra || '') + '</button>';
  }
  return '<nav class="tabs" aria-label="Main">' +
    tab('browse', 'Browse', ICON.browse()) +
    tab('post', 'Post', ICON.plus()) +
    tab('plans', 'My plans', ICON.calendar(), n > 0 ? '<span class="badge">' + n + '</span>' : '') +
  '</nav>';
}


// =====================================================================
// 5. RENDER - pick the right screen and draw it
// =====================================================================

function render() {
  const s = state.screen;
  let html = '';
  if (s === 'onboard') html = onboardScreen();
  else if (s === 'browse') html = browseScreen();
  else if (s === 'detail') html = detailScreen();
  else if (s === 'post') html = postScreen();
  else if (s === 'plans') html = plansScreen();
  else if (s === 'match' && state.match) html = matchScreen();
  else html = browseScreen();

  const showTabs = s === 'browse' || s === 'post' || s === 'plans';

  // remember how far down we scrolled, so tapping a chip doesn't jump to the top
  const old = document.querySelector('.screen');
  const scrollTop = old && lastScreen === s ? old.scrollTop : 0;

  document.getElementById('app').innerHTML = '<div class="stage">' + html + '</div>' + (showTabs ? tabBar() : '');

  const fresh = document.querySelector('.screen');
  if (fresh) fresh.scrollTop = scrollTop;
  lastScreen = s;
}


// =====================================================================
// 6. ACTIONS - what happens when you tap something
//    Each name here matches a data-action="..." in the screens above.
// =====================================================================

function joinMatch(plan) {
  setState({
    reqs: { ...state.reqs, [plan.id]: 'accepted' },
    match: { name: plan.name, init: plan.init, color: plan.color, title: plan.title, when: plan.when, place: plan.place, role: 'joiner', others: 0, fid: plan.id },
    chat: [{ me: false, text: 'Hi! Glad you can join. ' + plan.note }],
    shared: false, toast: '', screen: 'match'
  });
}

function hostAccept(person) {
  const p = state.myPost;
  setState({
    match: { name: person.name, init: person.init, color: person.color, title: p.title, when: p.when, place: p.place, role: 'host', others: state.incoming.length - 1, fid: null },
    incoming: [],
    myPost: { ...p, status: 'matched', with: person.name },
    chat: [{ me: false, text: 'Hi! Thanks for picking me. ' + person.note }],
    shared: false, toast: '', screen: 'match'
  });
}

function setForm(changes) { setState({ form: { ...state.form, ...changes } }); }

const actions = {
  // sign-up
  next() {
    if (state.step < 2) setState({ step: state.step + 1 });
    else setState({ screen: 'browse' });
  },

  // moving around
  go(d) { setState({ screen: d.value, toast: '' }); },
  setFilter(d) { setState({ filter: d.value }); },
  openPlan(d) { setState({ screen: 'detail', selId: d.id }); },
  openJoin(d) {
    if (state.reqs[d.id] === 'accepted') setState({ screen: 'match', toast: '' });
    else setState({ screen: 'detail', selId: d.id });
  },

  // joining someone else's plan
  sendRequest() {
    const plan = findPlan(state.selId);
    if (plan.mode === 'first') joinMatch(plan);
    else setState({ reqs: { ...state.reqs, [plan.id]: 'pending' } });
  },
  simAccept() { joinMatch(findPlan(state.selId)); },
  simDecline() { setState({ reqs: { ...state.reqs, [state.selId]: 'full' } }); },

  // the post form
  setAct(d) { setForm({ act: d.value }); },
  setWhen(d) { setForm({ when: d.value }); },
  setLevel(d) { setForm({ level: d.value }); },
  setMode(d) { setForm({ mode: d.value }); },
  submitPost() {
    const f = state.form;
    const post = { title: ACT_TITLES[f.act], when: f.when, place: f.place || 'Public meeting point', level: f.level, mode: f.mode, status: 'open', with: '' };
    if (f.mode === 'first') {
      // first come, first served: the first requester gets the spot straight away
      const r = REQUESTERS[0];
      setState({
        myPost: { ...post, status: 'matched', with: r.name }, incoming: [],
        match: { name: r.name, init: r.init, color: r.color, title: post.title, when: post.when, place: post.place, role: 'host', others: 0, fid: null },
        chat: [{ me: false, text: 'Hi! I saw your plan and joined. ' + r.note }],
        shared: false, toast: '', screen: 'match'
      });
    } else {
      setState({ myPost: post, incoming: REQUESTERS.slice(), screen: 'plans', toast: 'Plan posted. Requests from verified people will appear here.' });
    }
  },

  // choosing among the people who asked to join my plan
  accept(d) { hostAccept(state.incoming.find((r) => r.id === d.id)); },
  decline(d) {
    const who = state.incoming.find((r) => r.id === d.id);
    setState({
      incoming: state.incoming.filter((r) => r.id !== d.id),
      toast: 'Declined quietly. ' + who.name + ' only sees "This activity is full".'
    });
  },

  // inside a match
  quickReply(d) { setState({ chat: state.chat.concat([{ me: true, text: d.value }]) }); },
  sharePlan() { setState({ shared: true }); },
  cancelPlan() {
    const m = state.match;
    const reqs = { ...state.reqs };
    let myPost = state.myPost;
    if (m.role === 'host') myPost = null;
    if (m.fid) delete reqs[m.fid];
    setState({ match: null, reqs: reqs, myPost: myPost, chat: [], shared: false, screen: 'browse', toast: '' });
  }
};

// One listener catches every tap and runs the action named in data-action
document.addEventListener('click', function (event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const run = actions[el.dataset.action];
  if (run) run(el.dataset);
});

// When you type in the "Meeting point" box, remember it (without redrawing, so you keep your cursor)
document.addEventListener('input', function (event) {
  if (event.target.id === 'place') state.form.place = event.target.value;
});

// Start the app
render();

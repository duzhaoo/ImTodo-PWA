// ===== Default Todo Items =====
const DEFAULT_TODOS = [
  { id: 1, text: '更新公众号《AI高手杜小虎》' },
  { id: 3, text: '更新公众号《世界不能没有AI》' },
  { id: 4, text: '更新公众号《我用AI追女神》' },
  { id: 5, text: '更新公众号《飘飘AI》' },
  { id: 6, text: '更新公众号《杜昭精选》' },
  { id: 7, text: '更新公众号《谁需要学AI》' },
  { id: 8, text: '更新小红书《世界不能没有AI》' },
  { id: 9, text: '更新小红书《AI高手杜小虎》' },
];

const STORAGE_KEY = 'imtodo_state_v2';

// ===== State =====
let todos = [];

// ===== Date Helpers =====
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}



// ===== Storage =====
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState() {
  const state = {
    date: getTodayStr(),
    todos: todos.map(t => ({ id: t.id, text: t.text, completed: t.completed })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ===== Initialize Todos =====
function initTodos() {
  const state = loadState();
  const today = getTodayStr();

  if (state && state.date === today) {
    // Same day — restore state
    todos = state.todos;
  } else {
    // New day or no state — reset all to uncompleted
    todos = DEFAULT_TODOS.map(t => ({ ...t, completed: false }));
    saveState();
  }
}

// ===== Render =====
function renderTodos() {
  const list = document.getElementById('todoList');

  // Sort: uncompleted first, completed last (preserve original order within each group)
  const sorted = [...todos].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  list.innerHTML = sorted.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" 
         data-id="${todo.id}" 
         onclick="toggleTodo(${todo.id})"
         role="checkbox"
         aria-checked="${todo.completed}"
         tabindex="0"
         id="todo-${todo.id}">
      <div class="todo-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <span class="todo-text">${todo.text}</span>
    </div>
  `).join('');

  updateProgress();
}

function updateProgress() {
  const completed = todos.filter(t => t.completed).length;
  const total = todos.length;
  const progressText = document.getElementById('progressText');
  const badge = document.getElementById('progressBadge');
  
  if (total > 0 && completed === total) {
    progressText.textContent = '今日任务已全部完成';
    if (badge) badge.style.color = 'var(--success)';
  } else {
    progressText.textContent = `今日任务完成情况：${completed}/${total}`;
    if (badge) badge.style.color = 'var(--accent)';
  }
}

// ===== Toggle Todo =====
function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const el = document.querySelector(`.todo-item[data-id="${id}"]`);

  if (!todo.completed) {
    // Mark as completed
    el.classList.add('completing');
    todo.completed = true;

    // Small celebration particle burst
    createParticles(el);

    setTimeout(() => {
      saveState();
      renderTodos();
    }, 350);
  } else {
    // Mark as uncompleted
    el.classList.add('uncompleting');
    todo.completed = false;

    setTimeout(() => {
      saveState();
      renderTodos();
    }, 250);
  }
}

// ===== Particle Effect =====
function createParticles(el) {
  const rect = el.getBoundingClientRect();
  const centerX = rect.left + 30;
  const centerY = rect.top + rect.height / 2;

  const container = document.createElement('div');
  container.className = 'celebration';
  document.body.appendChild(container);

  const colors = ['#6c5ce7', '#a29bfe', '#00b894', '#55efc4', '#fdcb6e', '#e17055'];

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${centerX + (Math.random() - 0.5) * 60}px`;
    particle.style.top = `${centerY + (Math.random() - 0.5) * 30}px`;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.animationDelay = `${Math.random() * 0.2}s`;
    particle.style.animationDuration = `${0.6 + Math.random() * 0.5}s`;
    container.appendChild(particle);
  }

  setTimeout(() => container.remove(), 1200);
}

// ===== Keyboard Accessibility =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const focused = document.activeElement;
    if (focused && focused.classList.contains('todo-item')) {
      e.preventDefault();
      const id = parseInt(focused.dataset.id);
      toggleTodo(id);
    }
  }
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  initTodos();
  renderTodos();
});

// ===== Register Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}

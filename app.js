// ===== State & Storage =====
const STORAGE_KEY = 'imtodo_accounts_v1';
let accounts = []; 

// Platforms definition
const PLATFORMS = [
  { id: 'wechat', icon: '微信.png', name: '公众号' },
  { id: 'xiaohongshu', icon: '小红书.png', name: '小红书' },
  { id: 'douyin', icon: 'douyin.png', name: '抖音' },
  { id: 'shipinhao', icon: 'shipinhao.png', name: '视频号' }
];

// ===== Date Helpers =====
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ===== Storage =====
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  const state = {
    date: getTodayStr(),
    accounts: accounts
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ===== Initialize =====
function initAccounts() {
  const state = loadState();
  const today = getTodayStr();

  if (state && state.accounts) {
    if (state.date === today) {
      // Same day, restore state
      accounts = state.accounts.map(acc => ({
        ...acc,
        type: acc.type || 'matrix'
      }));
    } else {
      // New day, reset platform completion
      accounts = state.accounts.map(acc => {
        const newAcc = { ...acc, type: acc.type || 'matrix' };
        if (newAcc.type === 'normal') {
          newAcc.completed = false;
        } else {
          PLATFORMS.forEach(p => newAcc[p.id] = false);
        }
        return newAcc;
      });
      saveState();
    }
  } else {
    // Migration from old app or completely fresh
    localStorage.removeItem('imtodo_custom_v1');
    accounts = [];
    saveState();
  }
}

// ===== Render =====
function renderAccounts() {
  const list = document.getElementById('accountList');
  
  if (accounts.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);margin-top:40px;font-size:0.9rem;">暂无自媒体账号卡片，点击右下角添加 +</div>`;
    updateProgress();
    return;
  }

  list.innerHTML = accounts.map(acc => {
    if (acc.type === 'normal') {
      return `
        <div class="account-card" data-id="${acc.id}">
          <div class="account-header" style="margin-bottom: 0;">
            <div class="normal-todo-content" style="display: flex; align-items: center; gap: 12px; width: 100%;">
              <div class="checkbox-btn ${acc.completed ? 'active' : ''}" onclick="toggleNormalTodo(${acc.id})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity: ${acc.completed ? '1' : '0'}; transition: 0.2s;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span class="account-name" onclick="editAccount(event, ${acc.id})" title="编辑待办" style="flex: 1; ${acc.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${acc.name}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="account-card" data-id="${acc.id}">
          <div class="account-header">
            <span class="account-name" onclick="editAccount(event, ${acc.id})" title="编辑账号">${acc.name}</span>
          </div>
          <div class="platform-toggles">
            ${PLATFORMS.map(p => `
              <div class="platform-btn ${acc[p.id] ? 'active' : ''}" onclick="togglePlatform(${acc.id}, '${p.id}')">
                <img src="${p.icon}" alt="${p.name}" title="${p.name}">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }).join('');

  updateProgress();
}

function updateProgress() {
  let completedCount = 0;
  let totalCount = 0;

  accounts.forEach(acc => {
    if (acc.type === 'normal') {
      totalCount++;
      if (acc.completed) completedCount++;
    } else {
      totalCount += PLATFORMS.length;
      PLATFORMS.forEach(p => {
        if (acc[p.id]) completedCount++;
      });
    }
  });

  const progressText = document.getElementById('progressText');
  const badge = document.getElementById('progressBadge');

  if (totalCount > 0 && completedCount === totalCount) {
    progressText.textContent = '今日全部分发已完成 =͟͟͞͞( •̀д•́)))';
    if (badge) badge.style.color = 'var(--success)';
  } else {
    progressText.textContent = `今日总更新进度：${completedCount}/${totalCount}`;
    if (badge) badge.style.color = 'var(--accent)';
  }
}

// ===== Actions =====
window.togglePlatform = function(accountId, platformId) {
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return;
  acc[platformId] = !acc[platformId];
  
  saveState();
  renderAccounts();
};

window.toggleNormalTodo = function(accountId) {
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return;
  acc.completed = !acc.completed;
  
  saveState();
  renderAccounts();
};

// ===== Modal & Setup =====
let editingAccountId = null;

document.getElementById('addFab').addEventListener('click', () => {
  editingAccountId = null;
  document.getElementById('modalTitle').textContent = '添加新待办';
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('saveBtn').textContent = '保存';
  document.getElementById('accountInput').value = '';
  document.querySelector('input[name="todoType"][value="normal"]').checked = true;
  document.getElementById('typeSelector').style.display = 'flex';
  
  document.getElementById('addModalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('accountInput').focus(), 100);
});

window.editAccount = function(event, id) {
  event.stopPropagation();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  
  editingAccountId = id;
  document.getElementById('modalTitle').textContent = '编辑待办';
  document.getElementById('deleteBtn').style.display = 'block';
  document.getElementById('saveBtn').textContent = '保存修改';
  document.getElementById('accountInput').value = acc.name;
  
  const type = acc.type || 'matrix';
  document.querySelector(`input[name="todoType"][value="${type}"]`).checked = true;
  document.getElementById('typeSelector').style.display = 'none';
  
  document.getElementById('addModalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('accountInput').focus(), 100);
};

function closeAddModal() {
  document.getElementById('addModalOverlay').classList.remove('show');
  document.getElementById('accountInput').value = '';
}

document.getElementById('cancelBtn').addEventListener('click', closeAddModal);

document.getElementById('deleteBtn').addEventListener('click', () => {
  if (editingAccountId) {
    accounts = accounts.filter(a => a.id !== editingAccountId);
    saveState();
    renderAccounts();
    closeAddModal();
  }
});

document.getElementById('addModalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('addModalOverlay')) {
    closeAddModal();
  }
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const text = document.getElementById('accountInput').value.trim();
  if (!text) return;

  const type = document.querySelector('input[name="todoType"]:checked').value;

  if (editingAccountId) {
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = text;
    }
  } else {
    const newId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
    const newAccount = { id: newId, name: text, type: type };
    if (type === 'normal') {
      newAccount.completed = false;
    } else {
      PLATFORMS.forEach(p => newAccount[p.id] = false);
    }
    accounts.push(newAccount);
  }

  saveState();
  renderAccounts();
  closeAddModal();
});

// ===== Keyboard Accessibility =====
let lastEnterTime = 0;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target === document.getElementById('accountInput')) {
    const currentTime = Date.now();
    if (currentTime - lastEnterTime < 400) {
      document.getElementById('saveBtn').click();
      lastEnterTime = 0;
    } else {
      lastEnterTime = currentTime;
    }
    return;
  }
  
  if (e.key === 'Escape' && document.getElementById('addModalOverlay').classList.contains('show')) {
    closeAddModal();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAccounts();
  renderAccounts();
});

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW fail:', err));
  });
}

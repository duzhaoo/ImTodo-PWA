// ===== State & Storage =====
const STORAGE_KEY = 'imtodo_accounts_v1';
let accounts = [];
let showCompleted = false;

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

// ===== Initialize & Migrate =====
function initAccounts() {
  const state = loadState();
  const today = getTodayStr();

  if (state && state.accounts) {
    accounts = state.accounts.map(acc => {
      let newAcc = { ...acc, type: acc.type || 'matrix' };

      // Migrate old format to new format
      if (newAcc.type === 'matrix' && !newAcc.platforms) {
        newAcc.platforms = PLATFORMS.map(p => p.id); // All platforms by default for old ones
        newAcc.done = {};
        PLATFORMS.forEach(p => {
          newAcc.done[p.id] = newAcc[p.id] || false; // copy old state or false
          delete newAcc[p.id]; // cleanup old keys
        });
      }

      // Reset if new day
      if (state.date !== today) {
        if (newAcc.type === 'normal') {
          newAcc.completed = false;
        } else if (newAcc.type === 'matrix') {
          newAcc.done = {};
          newAcc.platforms.forEach(pid => newAcc.done[pid] = false);
        }
      }
      return newAcc;
    });

    // Auto save if migration or reset happened
    saveState();
  } else {
    // Migration from old app or completely fresh
    localStorage.removeItem('imtodo_custom_v1');
    accounts = [];
    saveState();
  }
}

// ===== Render =====
function isAccountCompleted(acc) {
  if (acc.type === 'normal') return acc.completed;
  if (acc.type === 'matrix') {
    if (!acc.platforms || acc.platforms.length === 0) return false;
    return acc.platforms.every(pid => acc.done && acc.done[pid]);
  }
  return false;
}

function generateCardHTML(acc, isCompleted) {
  if (acc.type === 'normal') {
    return `
      <div class="account-card ${isCompleted ? 'completed' : ''}" data-id="${acc.id}" draggable="${!isCompleted}">
        <div class="account-header" style="margin-bottom: 0;">
          <div class="normal-todo-content" style="display: flex; align-items: center; gap: 12px; width: 100%;">
            <div class="checkbox-btn ${acc.completed ? 'active' : ''}" onclick="toggleNormalTodo(${acc.id})">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity: ${acc.completed ? '1' : '0'}; transition: 0.2s;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="account-name" onclick="editAccount(event, ${acc.id})" title="编辑卡片" style="flex: 1; ${acc.completed ? 'text-decoration: line-through;' : ''}">${acc.name}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    const selectedPlatforms = PLATFORMS.filter(p => acc.platforms.includes(p.id));
    return `
      <div class="account-card ${isCompleted ? 'completed' : ''}" data-id="${acc.id}" draggable="${!isCompleted}" style="touch-action: pan-y;">
        <div class="account-header">
          <span class="account-name" onclick="editAccount(event, ${acc.id})" title="编辑卡片">${acc.name}</span>
        </div>
        <div class="platform-toggles">
          ${selectedPlatforms.map(p => `
            <div class="platform-btn ${acc.done && acc.done[p.id] ? 'active' : ''}" id="btn-${acc.id}-${p.id}" onclick="togglePlatform(${acc.id}, '${p.id}')">
              <img src="${p.icon}" alt="${p.name}" title="${p.name}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function renderAccounts() {
  const list = document.getElementById('accountList');
  if (accounts.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);margin-top:40px;font-size:0.9rem;">暂无待办卡片，点击右下角添加 +</div>`;
    updateProgress();
    return;
  }

  const activeAccounts = accounts.filter(a => !isAccountCompleted(a));
  const completedAccounts = accounts.filter(a => isAccountCompleted(a));

  let html = '';
  html += activeAccounts.map(acc => generateCardHTML(acc, false)).join('');

  if (completedAccounts.length > 0) {
    html += `
      <div class="completed-divider" onclick="toggleCompletedSection()">
        <span>已完成 (${completedAccounts.length})</span>
        <svg class="completed-chevron ${showCompleted ? 'open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="completed-container" style="display: ${showCompleted ? 'flex' : 'none'};">
        ${completedAccounts.map(acc => generateCardHTML(acc, true)).join('')}
      </div>
    `;
  }

  list.innerHTML = html;
  updateProgress();
  setupDragAndDrop();
}

window.toggleCompletedSection = function () {
  showCompleted = !showCompleted;
  renderAccounts();
};

function updateProgress() {
  let completedCount = 0;
  let totalCount = 0;

  accounts.forEach(acc => {
    if (acc.type === 'normal') {
      totalCount++;
      if (acc.completed) completedCount++;
    } else {
      totalCount += acc.platforms.length;
      acc.platforms.forEach(pid => {
        if (acc.done && acc.done[pid]) completedCount++;
      });
    }
  });

  const progressText = document.getElementById('progressText');
  const badge = document.getElementById('progressBadge');

  if (totalCount > 0 && completedCount === totalCount) {
    progressText.textContent = '今日全部待办已完成';
    if (badge) badge.style.color = 'var(--success)';
  } else {
    progressText.textContent = `今日总更新进度：${completedCount}/${totalCount}`;
    if (badge) badge.style.color = 'var(--accent)';
  }
}

// ===== Actions =====
window.togglePlatform = function (accountId, platformId) {
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return;
  acc.done[platformId] = !acc.done[platformId];

  // Animation logic snippet
  const btn = document.getElementById(`btn-${accountId}-${platformId}`);
  if (btn) {
    btn.classList.remove('anim-bump', 'anim-shrink');
    void btn.offsetWidth; // trigger reflow
    if (acc.done[platformId]) {
      btn.classList.add('anim-bump');
    } else {
      btn.classList.add('anim-shrink');
    }
  }

  saveState();
  // Small delay before rerendering so animation isn't immediately lost
  setTimeout(() => {
    renderAccounts();
  }, 150);
};

window.toggleNormalTodo = function (accountId) {
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) return;
  acc.completed = !acc.completed;

  saveState();
  renderAccounts();
};

// ===== Drag & Drop =====
function setupDragAndDrop() {
  const cards = document.querySelectorAll('.account-card');

  cards.forEach(card => {
    // HTML5 Drag events (Desktop)
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);

    // Touch events for mobile
    card.addEventListener('touchstart', handleTouchStart, { passive: false });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', handleTouchEnd);
  });
}

let draggedCard = null;
let touchStartY = 0;
let ghostEl = null;
let touchDragStarted = false;

function handleDragStart(e) {
  draggedCard = this;
  if (e.type === 'dragstart') {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
  }
  setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  draggedCard = null;
  document.querySelectorAll('.account-card').forEach(c => {
    c.classList.remove('drag-over-top', 'drag-over-bottom');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this.classList.contains('completed')) return;
  if (this !== draggedCard && !this.classList.contains('dragging')) {
    const rect = this.getBoundingClientRect();
    const isTop = e.clientY < rect.top + rect.height / 2;
    this.classList.remove('drag-over-top', 'drag-over-bottom');
    if (isTop) {
      this.classList.add('drag-over-top');
    } else {
      this.classList.add('drag-over-bottom');
    }
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over-top', 'drag-over-bottom');
}

function handleDrop(e) {
  e.stopPropagation();
  this.classList.remove('drag-over-top', 'drag-over-bottom');
  if (this.classList.contains('completed')) return false;

  if (draggedCard && draggedCard !== this) {
    const fromId = parseInt(draggedCard.dataset.id);
    const toId = parseInt(this.dataset.id);

    const fromIndex = accounts.findIndex(a => a.id === fromId);
    const toIndex = accounts.findIndex(a => a.id === toId);

    // Determine orientation based on classes added in enter
    const isTop = e.clientY < this.getBoundingClientRect().top + this.getBoundingClientRect().height / 2;

    // Reorder array
    const [movedArr] = accounts.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (fromIndex < toIndex && !isTop) {
      // moving down, and dropped on bottom half: insert after
    } else if (fromIndex > toIndex && isTop) {
      // moving up, and dropped on top half: insert before
    } else if (fromIndex > toIndex && !isTop) {
      insertIndex += 1;
    } else if (fromIndex < toIndex && isTop) {
      insertIndex -= 1;
    }

    accounts.splice(insertIndex, 0, movedArr);

    saveState();
    renderAccounts();
  }
  return false;
}

// Mobile Touch Sorting
function handleTouchStart(e) {
  // Avoid dragging if we click on interactive elements like buttons, checkboxes, input
  const target = e.target;
  if (target.closest('.platform-btn') || target.closest('.checkbox-btn') || target.tagName.toLowerCase() === 'input') {
    return;
  }

  if (this.classList.contains('completed')) return;

  touchDragStarted = false;
  touchStartY = e.touches[0].clientY;
  draggedCard = this;
}

function handleTouchMove(e) {
  if (!draggedCard) return;

  const currentY = e.touches[0].clientY;

  // Start drag if we moved a bit vertically
  if (!touchDragStarted && Math.abs(currentY - touchStartY) > 5) {
    touchDragStarted = true;
    this.classList.add('dragging');

    // Add a ghost element to follow the finger
    ghostEl = this.cloneNode(true);
    ghostEl.style.position = 'fixed';
    ghostEl.style.zIndex = '1000';
    ghostEl.style.opacity = '0.8';
    ghostEl.style.pointerEvents = 'none';
    ghostEl.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
    document.body.appendChild(ghostEl);
  }

  if (touchDragStarted) {
    e.preventDefault(); // prevent scrolling

    const x = e.touches[0].clientX;
    const y = currentY;

    if (ghostEl) {
      const rect = draggedCard.getBoundingClientRect();
      ghostEl.style.left = `${x - rect.width / 2}px`;
      ghostEl.style.top = `${y - rect.height / 2}px`;
      ghostEl.style.width = `${rect.width}px`;
    }

    // Find element underneath
    // Temporary hide ghost to find underlying elements
    if (ghostEl) ghostEl.style.display = 'none';
    const element = document.elementFromPoint(x, y);
    if (ghostEl) ghostEl.style.display = 'block';

    const targetCard = element ? element.closest('.account-card') : null;

    document.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));

    if (targetCard && targetCard !== draggedCard && !targetCard.classList.contains('completed')) {
      const rect = targetCard.getBoundingClientRect();
      const isTop = y < rect.top + rect.height / 2;
      if (isTop) {
        targetCard.classList.add('drag-over-top');
      } else {
        targetCard.classList.add('drag-over-bottom');
      }
    }
  }
}

function handleTouchEnd(e) {
  if (!draggedCard) return;

  draggedCard.classList.remove('dragging');
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }

  if (touchDragStarted) {
    let targetCard = document.querySelector('.drag-over-top, .drag-over-bottom');
    if (targetCard && targetCard !== draggedCard) {
      const fromId = parseInt(draggedCard.dataset.id);
      const toId = parseInt(targetCard.dataset.id);

      const fromIndex = accounts.findIndex(a => a.id === fromId);
      const toIndex = accounts.findIndex(a => a.id === toId);

      const isTop = targetCard.classList.contains('drag-over-top');

      const [movedArr] = accounts.splice(fromIndex, 1);
      let insertIndex = toIndex;
      if (fromIndex < toIndex && !isTop) {
      } else if (fromIndex > toIndex && isTop) {
      } else if (fromIndex > toIndex && !isTop) {
        insertIndex += 1;
      } else if (fromIndex < toIndex && isTop) {
        insertIndex -= 1;
      }

      accounts.splice(insertIndex, 0, movedArr);
      saveState();
      renderAccounts();
    }
  }

  document.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
  draggedCard = null;
  touchDragStarted = false;
}


// ===== Modal & Setup =====
let editingAccountId = null;

// Helper to render platform selection in modal
function renderPlatformSelectorInModal(selectedPlatformIds) {
  const container = document.getElementById('platformSelector');
  if (!container) return;

  container.innerHTML = PLATFORMS.map(p => {
    const isSelected = selectedPlatformIds.includes(p.id);
    return `
      <div class="modal-platform-btn ${isSelected ? 'active' : ''}" data-id="${p.id}" onclick="toggleModalPlatform(this)">
         <img src="${p.icon}" alt="${p.name}" title="${p.name}">
      </div>
    `;
  }).join('');
}

window.toggleModalPlatform = function (element) {
  element.classList.toggle('active');
};

document.getElementById('addFab').addEventListener('click', () => {
  editingAccountId = null;
  document.getElementById('modalTitle').textContent = '添加新待办';
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('saveBtn').textContent = '保存';
  document.getElementById('accountInput').value = '';
  document.querySelector('input[name="todoType"][value="normal"]').checked = true; // default to normal 

  // Render empty selected platforms (default none checked as requested)
  renderPlatformSelectorInModal([]);

  document.getElementById('typeSelector').style.display = 'flex';

  updatePlatformSelectorVisibility();

  document.getElementById('addModalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('accountInput').focus(), 100);
});

window.editAccount = function (event, id) {
  event.stopPropagation();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;

  editingAccountId = id;
  document.getElementById('modalTitle').textContent = '编辑选项';
  document.getElementById('deleteBtn').style.display = 'block';
  document.getElementById('saveBtn').textContent = '保存修改';
  document.getElementById('accountInput').value = acc.name;

  const type = acc.type || 'matrix';
  document.querySelector(`input[name="todoType"][value="${type}"]`).checked = true;
  document.getElementById('typeSelector').style.display = 'none'; // hide type selector on edit

  if (type === 'matrix') {
    renderPlatformSelectorInModal(acc.platforms);
  }
  updatePlatformSelectorVisibility();

  document.getElementById('addModalOverlay').classList.add('show');
  setTimeout(() => document.getElementById('accountInput').focus(), 100);
};

// handle radio change
document.querySelectorAll('input[name="todoType"]').forEach(radio => {
  radio.addEventListener('change', updatePlatformSelectorVisibility);
});

function updatePlatformSelectorVisibility() {
  const type = document.querySelector('input[name="todoType"]:checked').value;
  const wrapper = document.getElementById('platformSelectorWrapper');
  if (wrapper) wrapper.style.display = type === 'matrix' ? 'block' : 'none';
}

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

  if (type === 'matrix') {
    const actives = document.querySelectorAll('.modal-platform-btn.active');
    if (actives.length === 0) {
      alert("自媒体矩阵模式下，请至少选择一个平台");
      return;
    }
  }

  if (editingAccountId) {
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = text;
      if (acc.type === 'matrix') {
        const actives = document.querySelectorAll('.modal-platform-btn.active');
        const newPlatforms = Array.from(actives).map(el => el.dataset.id);
        acc.platforms = newPlatforms;

        // ensure done exists for newly added
        newPlatforms.forEach(pid => {
          if (acc.done[pid] === undefined) acc.done[pid] = false;
        });
      }
    }
  } else {
    // New Account
    const newId = Date.now(); // use timestamp to avoid duplicate bugs
    const newAccount = { id: newId, name: text, type: type };
    if (type === 'normal') {
      newAccount.completed = false;
    } else {
      const actives = document.querySelectorAll('.modal-platform-btn.active');
      const newPlatforms = Array.from(actives).map(el => el.dataset.id);
      newAccount.platforms = newPlatforms;
      newAccount.done = {};
      newPlatforms.forEach(p => newAccount.done[p] = false);
    }
    accounts.unshift(newAccount);
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


// ===== Import / Export =====
window.exportData = function () {
  const dataStr = JSON.stringify({ date: getTodayStr(), accounts: accounts }, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `imtodo-backup-${getTodayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

window.importData = function () {
  document.getElementById('importInput').click();
}
// Event listener attached in index.html (or later after DOM load)


document.addEventListener('DOMContentLoaded', () => {
  initAccounts();
  renderAccounts();

  // Setup file import listener
  const importInput = document.getElementById('importInput');
  if (importInput) {
    importInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      if (confirm("导入将覆盖现有全部数据，确认吗？")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const json = JSON.parse(e.target.result);
            if (json && json.accounts) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
              initAccounts();
              renderAccounts();
              alert("导入成功！");
            } else {
              alert("无效的备份文件结构！");
            }
          } catch (err) {
            alert("解析 JSON 失败：" + err.message);
          }
        };
        reader.readAsText(file);
      }
      e.target.value = ''; // reset
    });
  }
});

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW fail:', err));
  });
}

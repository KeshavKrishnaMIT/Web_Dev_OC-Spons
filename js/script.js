// ================= LOGIN CHECK =================

if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = "login.html";
}


// ================= CURRENT USER =================

const currentUser = sessionStorage.getItem('loggedInUser') || '';
const currentRole = sessionStorage.getItem('loggedInRole') || 'oc';
const currentTimetableName = sessionStorage.getItem('loggedInTimetableName') || '';


// ================= TIMETABLE DATA =================

let timetableData = typeof TIMETABLE_DATA !== 'undefined' ? TIMETABLE_DATA : {};


// ================= INIT UI =================

document.addEventListener('DOMContentLoaded', function () {
    const displayUser = document.getElementById('displayUser');
    const displayRole = document.getElementById('displayRole');

    if (displayUser) {
        displayUser.textContent = currentRole === 'oc' && currentTimetableName
            ? currentTimetableName
            : currentUser;
    }

    if (displayRole) {
        displayRole.textContent = currentRole === 'cc' ? '⭐ CC' : '🎓 OC';
        displayRole.className = 'role-badge ' + currentRole;
    }

    // Show/hide role-specific UI
    if (currentRole === 'cc') {
        const btn = document.getElementById('btnAllotWork');
        if (btn) btn.style.display = 'inline-block';

        const header = document.getElementById('ccTaskHeader');
        if (header) header.style.display = 'block';

        renderCCTasks();
    } else {
        // Hide timetable section for OC users
        const timetable = document.querySelector('.timetable-section');
        if (timetable) timetable.style.display = 'none';

        const header = document.getElementById('ocTaskHeader');
        if (header) header.style.display = 'block';

        renderOCTasks();
    }

    populateDropdown();
});


// ================= POPULATE TIMETABLE DROPDOWN =================

function populateDropdown() {
    const select = document.getElementById("ocName");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Choose a student...</option>';
    Object.keys(timetableData).sort().forEach(name => {
        let option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}


// ================= SHOW TIMETABLE (popup) =================

function showTimetable() {
    const name = document.getElementById("ocName").value;
    const day = document.getElementById("day").value;

    if (!name || !day) {
        openPopup("<p style='color:#ef4444;'>Please select both a student and a day.</p>");
        return;
    }

    const person = timetableData[name];
    if (!person) {
        openPopup("<p style='color:#ef4444;'>Student data not found.</p>");
        return;
    }

    const schedule = person[day];
    if (!schedule) {
        openPopup(`<h3 style="color:#00cccc;">${escapeHtml(name)}</h3><p style="color:#4ade80;">✅ Free all day on ${day}!</p>`);
        return;
    }

    const slots = schedule.split(", ");
    let html = `<h3 style="color:#00cccc;">${escapeHtml(name)} — ${day}</h3>`;
    if (person.fullDays && person.fullDays.includes(day)) {
        html += `<p style="color:#ef4444; font-weight:600;">⚠ Full day busy</p>`;
    }
    html += '<ul style="list-style:none; padding:0;">';
    slots.forEach(slot => {
        html += `<li style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08); color:#ccc;">${escapeHtml(slot)}</li>`;
    });
    html += '</ul>';
    openPopup(html);
}


// ================= POPUP =================

function openPopup(content) {
    document.getElementById("popupBody").innerHTML = content;
    document.getElementById("popupModal").style.display = "flex";
}

function closePopup() {
    document.getElementById("popupModal").style.display = "none";
}


// ================= LOGOUT =================

function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}


// ================= TASK STORAGE =================

let selectedOCs = [];   // array of OC names selected for assignment
let ccFilter = 'all';
let ocFilter = 'all';

function getTasks() {
    return JSON.parse(localStorage.getItem('oc_tasks') || '[]');
}

function saveTasks(tasks) {
    localStorage.setItem('oc_tasks', JSON.stringify(tasks));
}

function generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ================= FREE OC FINDER =================

function findFreeOCs() {
    const day = document.getElementById('modalDay').value;
    const startStr = document.getElementById('modalStart').value;
    const endStr = document.getElementById('modalEnd').value;
    const container = document.getElementById('freeOCsList');

    if (!day) {
        container.innerHTML = '';
        return;
    }

    const startMin = startStr ? timeToMinutes(startStr) : null;
    const endMin = endStr ? timeToMinutes(endStr) : null;

    const freeOCs = [];

    Object.keys(timetableData).sort().forEach(name => {
        const person = timetableData[name];

        // Skip full-day busy
        if (person.fullDays && person.fullDays.includes(day)) return;

        const schedule = person[day];

        if (!schedule) {
            freeOCs.push({ name, status: 'Free all day' });
            return;
        }

        if (startMin === null || endMin === null) {
            freeOCs.push({ name, status: 'Has classes' });
            return;
        }

        // Check time overlap
        const slots = schedule.split(", ");
        let isFree = true;

        for (const slot of slots) {
            const timeMatch = slot.match(/(\d{2}\.\d{2})-(\d{2}\.\d{2})/);
            if (timeMatch) {
                const slotStart = dotTimeToMinutes(timeMatch[1]);
                const slotEnd = dotTimeToMinutes(timeMatch[2]);
                if (slotStart < endMin && slotEnd > startMin) {
                    isFree = false;
                    break;
                }
            }
        }

        if (isFree) {
            freeOCs.push({ name, status: 'Free at this time' });
        }
    });

    // Render checkbox list
    if (freeOCs.length === 0) {
        container.innerHTML = '<div class="oc-checklist"><div class="no-free-msg">No OCs are free at the selected time.</div></div>';
        return;
    }

    let html = '<div class="oc-checklist">';
    html += `<h4>✅ Available OCs (${freeOCs.length}) — select one or more</h4>`;
    freeOCs.forEach(oc => {
        const isChecked = selectedOCs.includes(oc.name);
        html += `<label class="oc-check-item ${isChecked ? 'checked' : ''}">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleOCSelection('${oc.name.replace(/'/g, "\\'")}')">
            <span>${escapeHtml(oc.name)}</span>
            <span class="oc-status">${oc.status}</span>
        </label>`;
    });
    html += '</div>';
    container.innerHTML = html;

    renderSelectedTags();
}

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function dotTimeToMinutes(dotStr) {
    const [h, m] = dotStr.split('.').map(Number);
    return h * 60 + m;
}


// ================= OC SELECTION (multi) =================

function toggleOCSelection(name) {
    const idx = selectedOCs.indexOf(name);
    if (idx >= 0) {
        selectedOCs.splice(idx, 1);
    } else {
        selectedOCs.push(name);
    }
    // Re-render the checkbox list to update styles
    findFreeOCs();
}

function removeOCSelection(name) {
    selectedOCs = selectedOCs.filter(n => n !== name);
    findFreeOCs();
}

function renderSelectedTags() {
    const container = document.getElementById('selectedOCTags');
    if (!container) return;

    if (selectedOCs.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = selectedOCs.map(name =>
        `<span class="selected-tag">
            ${escapeHtml(name)}
            <span class="tag-remove" onclick="removeOCSelection('${name.replace(/'/g, "\\'")}')">&times;</span>
        </span>`
    ).join('');
}


// ================= TASK MODAL =================

function openTaskModal() {
    selectedOCs = [];
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskDeadlineDate').value = '';
    document.getElementById('taskDeadlineTime').value = '';
    document.getElementById('modalDay').value = '';
    document.getElementById('modalStart').value = '';
    document.getElementById('modalEnd').value = '';
    document.getElementById('freeOCsList').innerHTML = '';
    document.getElementById('selectedOCTags').innerHTML = '';

    document.getElementById('taskModalOverlay').style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('taskModalOverlay').style.display = 'none';
}

function assignTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const deadlineDate = document.getElementById('taskDeadlineDate').value;
    const deadlineTime = document.getElementById('taskDeadlineTime').value;

    if (selectedOCs.length === 0) {
        alert('Please select at least one OC from the available list.');
        return;
    }

    if (!title) {
        alert('Please enter a task title.');
        return;
    }

    // Build deadline string
    let deadline = '';
    if (deadlineDate) {
        deadline = deadlineDate;
        if (deadlineTime) deadline += ' ' + deadlineTime;
    }

    const tasks = getTasks();

    // Create one task per selected OC (individual tracking)
    selectedOCs.forEach(ocName => {
        tasks.push({
            id: generateTaskId(),
            assignedTo: ocName,
            assignedBy: currentUser,
            title: title,
            description: description,

            deadline: deadline,
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: ''
        });
    });

    saveTasks(tasks);
    closeTaskModal();
    renderCCTasks();
}


// ================= EXPAND / COLLAPSE =================

function toggleTaskExpand(taskId) {
    const card = document.getElementById('card-' + taskId);
    if (!card) return;
    card.classList.toggle('expanded');
}

function getTaskDisplayTitle(task) {
    if (task.title) return escapeHtml(task.title);
    // Backward compat: use first 60 chars of description
    const desc = task.description || 'Untitled Task';
    return escapeHtml(desc.length > 60 ? desc.substring(0, 60) + '…' : desc);
}


// ================= DATE FORMATTING =================

function parseFuzzyDate(str) {
    if (!str) return null;
    // Try ISO first
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    return null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDateDDMMYYYY(raw) {
    const d = parseFuzzyDate(raw);
    if (!d) return raw || '—';
    return `${pad2(d.getDate())} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDeadlineDDMMYYYY(raw) {
    // raw stored as "YYYY-MM-DD" or "YYYY-MM-DD HH:MM"
    if (!raw) return '—';
    const parts = raw.split(' ');
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
        const day = pad2(Number(dateParts[2]));
        const mon = MONTH_NAMES[Number(dateParts[1]) - 1] || dateParts[1];
        const year = dateParts[0];
        const formatted = `${day} ${mon} ${year}`;
        if (parts[1]) return `${formatted} ${parts[1]}`;
        return formatted;
    }
    return raw;
}


// ================= COMPLETE TASK =================

function completeTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (task) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        saveTasks(tasks);
    }

    if (currentRole === 'cc') {
        renderCCTasks();
    } else {
        renderOCTasks();
    }
}


// ================= RENDER CC TASKS =================

function filterCCTasks(filter, btn) {
    ccFilter = filter;
    document.querySelectorAll('#ccTaskHeader .task-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderCCTasks();
}

function renderCCTasks() {
    const container = document.getElementById('ccTaskList');
    if (!container) return;

    let tasks = getTasks().filter(t => t.assignedBy === currentUser);

    if (ccFilter !== 'all') {
        tasks = tasks.filter(t => t.status === ccFilter);
    }

    tasks.sort((a, b) => {
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        return 0;
    });

    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No tasks found. Click "Allot Work" to assign tasks to OCs.</div>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const displayTitle = getTaskDisplayTitle(task);
        const desc = task.description ? escapeHtml(task.description) : '';
        return `
        <div class="task-card ${task.status}" id="card-${task.id}">
            <div class="task-card-header" onclick="toggleTaskExpand('${task.id}')">
                <span class="task-status-badge ${task.status}">
                    ${task.status === 'pending' ? '⏳' : '✅'}
                </span>
                <span class="task-title">${displayTitle}</span>
                <span class="task-chevron">▼</span>
            </div>
            <div class="task-card-body">
                ${desc ? `<div class="task-description">${desc}</div>` : ''}
                <div class="task-meta-grid">
                    <div class="task-meta-item">
                        <span class="meta-icon">👤</span>
                        <div>
                            <span class="meta-label">Assigned To</span>
                            <span class="meta-value accent">${escapeHtml(task.assignedTo)}</span>
                        </div>
                    </div>
                    <div class="task-meta-item">
                        <span class="meta-icon">📅</span>
                        <div>
                            <span class="meta-label">Date Assigned</span>
                            <span class="meta-value">${formatDateDDMMYYYY(task.createdAt)}</span>
                        </div>
                    </div>

                    ${task.deadline ? `
                    <div class="task-meta-item">
                        <span class="meta-icon">⏰</span>
                        <div>
                            <span class="meta-label">Deadline</span>
                            <span class="meta-value danger">${formatDeadlineDDMMYYYY(task.deadline)}</span>
                        </div>
                    </div>` : ''}
                    ${task.completedAt ? `
                    <div class="task-meta-item">
                        <span class="meta-icon">✅</span>
                        <div>
                            <span class="meta-label">Completed</span>
                            <span class="meta-value success">${formatDateDDMMYYYY(task.completedAt)}</span>
                        </div>
                    </div>` : ''}
                </div>
                <div class="task-card-footer">
                    <span class="task-status-badge ${task.status}">
                        ${task.status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                    </span>
                </div>
            </div>
        </div>`;
    }).join('');
}


// ================= RENDER OC TASKS =================

function filterOCTasks(filter, btn) {
    ocFilter = filter;
    document.querySelectorAll('#ocTaskHeader .task-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderOCTasks();
}

function renderOCTasks() {
    const container = document.getElementById('ocTaskList');
    if (!container) return;

    let tasks = getTasks().filter(t =>
        t.assignedTo === currentTimetableName || t.assignedTo === currentUser
    );

    if (ocFilter !== 'all') {
        tasks = tasks.filter(t => t.status === ocFilter);
    }

    tasks.sort((a, b) => {
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;
        return 0;
    });

    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No tasks assigned to you yet. Check back later!</div>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const displayTitle = getTaskDisplayTitle(task);
        const desc = task.description ? escapeHtml(task.description) : '';
        return `
        <div class="task-card ${task.status}" id="card-${task.id}">
            <div class="task-card-header" onclick="toggleTaskExpand('${task.id}')">
                <span class="task-status-badge ${task.status}">
                    ${task.status === 'pending' ? '⏳' : '✅'}
                </span>
                <span class="task-title">${displayTitle}</span>
                <span class="task-chevron">▼</span>
            </div>
            <div class="task-card-body">
                ${desc ? `<div class="task-description">${desc}</div>` : ''}
                <div class="task-meta-grid">
                    <div class="task-meta-item">
                        <span class="meta-icon">👤</span>
                        <div>
                            <span class="meta-label">Assigned By</span>
                            <span class="meta-value gold">${escapeHtml(task.assignedBy)}</span>
                        </div>
                    </div>
                    <div class="task-meta-item">
                        <span class="meta-icon">📅</span>
                        <div>
                            <span class="meta-label">Date Assigned</span>
                            <span class="meta-value">${formatDateDDMMYYYY(task.createdAt)}</span>
                        </div>
                    </div>

                    ${task.deadline ? `
                    <div class="task-meta-item">
                        <span class="meta-icon">⏰</span>
                        <div>
                            <span class="meta-label">Deadline</span>
                            <span class="meta-value danger">${formatDeadlineDDMMYYYY(task.deadline)}</span>
                        </div>
                    </div>` : ''}
                    ${task.completedAt ? `
                    <div class="task-meta-item">
                        <span class="meta-icon">✅</span>
                        <div>
                            <span class="meta-label">Completed</span>
                            <span class="meta-value success">${formatDateDDMMYYYY(task.completedAt)}</span>
                        </div>
                    </div>` : ''}
                </div>
                <div class="task-card-footer">
                    <span class="task-status-badge ${task.status}">
                        ${task.status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                    </span>
                    ${task.status === 'pending' ? `<button class="btn-complete" onclick="event.stopPropagation(); completeTask('${task.id}')">Mark Done</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}


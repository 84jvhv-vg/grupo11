// ============================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================
const App = {
    state: {
        members: [],
        tasks: [],
        activities: [],
        currentPage: 'dashboard',
        currentFilter: 'all',
        currentDate: new Date(),
        darkMode: false,
        theme: 'light'
    },
    nextId: {
        member: 1,
        task: 1,
        activity: 1
    }
};

// ============================================
// STORAGE MANAGER
// ============================================
const Storage = {
    KEY: 'teamDashboardData',
    
    save() {
        try {
            const data = {
                members: App.state.members,
                tasks: App.state.tasks,
                activities: App.state.activities,
                nextId: App.nextId,
                theme: App.state.theme
            };
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error guardando:', error);
        }
    },
    
    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return false;
            
            const data = JSON.parse(raw);
            App.state.members = data.members || [];
            App.state.tasks = data.tasks || [];
            App.state.activities = data.activities || [];
            App.nextId = data.nextId || { member: 1, task: 1, activity: 1 };
            
            if (data.theme) {
                App.state.theme = data.theme;
                document.documentElement.setAttribute('data-theme', data.theme);
            }
            
            return true;
        } catch (error) {
            console.error('Error cargando:', error);
            return false;
        }
    },
    
    clear() {
        localStorage.removeItem(this.KEY);
    }
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
const Toast = {
    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ============================================
// GESTIÓN DE MIEMBROS
// ============================================
const MemberManager = {
    getAll() {
        return App.state.members;
    },
    
    getById(id) {
        return App.state.members.find(m => m.id === id);
    },
    
    add(data) {
        const member = {
            id: App.nextId.member++,
            name: data.name,
            email: data.email || '',
            role: data.role || 'developer',
            avatar: data.avatar || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            createdAt: new Date().toISOString()
        };
        
        App.state.members.push(member);
        Storage.save();
        this.render();
        
        ActivityManager.add('member_add', `Se agregó al miembro ${member.name}`);
        Toast.show(`Miembro ${member.name} agregado correctamente`, 'success');
        return member;
    },
    
    delete(id) {
        const member = this.getById(id);
        if (!member) return;
        
        if (!confirm(`¿Eliminar a ${member.name}?`)) return;
        
        App.state.members = App.state.members.filter(m => m.id !== id);
        Storage.save();
        this.render();
        
        ActivityManager.add('member_delete', `Se eliminó al miembro ${member.name}`);
        Toast.show(`Miembro ${member.name} eliminado`, 'warning');
    },
    
    update(id, data) {
        const member = this.getById(id);
        if (!member) return;
        
        Object.assign(member, data);
        Storage.save();
        this.render();
        
        ActivityManager.add('member_update', `Se actualizó al miembro ${member.name}`);
        Toast.show('Miembro actualizado', 'success');
    },
    
    render() {
        const grid = document.getElementById('membersGrid');
        const members = this.getAll();
        
        if (members.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users" style="font-size: 48px; color: var(--text-muted);"></i>
                    <p>No hay miembros. ¡Agrega uno!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = members.map(m => `
            <div class="member-card">
                <div class="avatar-lg">${m.name.charAt(0).toUpperCase()}</div>
                <div class="name">${m.name}</div>
                <div class="email">${m.email || 'Sin email'}</div>
                <div class="role">${this.getRoleLabel(m.role)}</div>
                <div class="actions">
                    <button class="btn-secondary btn-sm" onclick="MemberManager.edit(${m.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger btn-sm" onclick="MemberManager.delete(${m.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        this.renderDashboardPreview();
        this.updateTaskAssigneeSelect();
    },
    
    renderDashboardPreview() {
        const grid = document.getElementById('teamGrid');
        const members = this.getAll().slice(0, 6);
        
        if (members.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-muted);">Sin miembros</p>';
            return;
        }
        
        grid.innerHTML = members.map(m => `
            <div class="team-member-card">
                <div class="avatar-sm">${m.name.charAt(0).toUpperCase()}</div>
                <div class="info">
                    <div class="name">${m.name}</div>
                    <div class="role">${this.getRoleLabel(m.role)}</div>
                </div>
                <div class="status"></div>
            </div>
        `).join('');
    },
    
    getRoleLabel(role) {
        const roles = {
            admin: 'Administrador',
            manager: 'Gerente',
            developer: 'Desarrollador',
            designer: 'Diseñador'
        };
        return roles[role] || role;
    },
    
    updateTaskAssigneeSelect() {
        const select = document.getElementById('taskAssignee');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Sin asignar</option>';
        
        this.getAll().forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    },
    
    edit(id) {
        const member = this.getById(id);
        if (!member) return;
        
        document.getElementById('memberModalTitle').textContent = 'Editar Miembro';
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberEmail').value = member.email || '';
        document.getElementById('memberRole').value = member.role;
        document.getElementById('memberAvatar').value = member.avatar || '';
        
        document.getElementById('memberModal').classList.add('active');
    }
};

// ============================================
// GESTIÓN DE TAREAS
// ============================================
const TaskManager = {
    getAll() {
        return App.state.tasks;
    },
    
    getFiltered() {
        const filter = App.state.currentFilter;
        let tasks = [...this.getAll()];
        
        switch(filter) {
            case 'pending':
                tasks = tasks.filter(t => !t.completed);
                break;
            case 'completed':
                tasks = tasks.filter(t => t.completed);
                break;
            case 'high':
                tasks = tasks.filter(t => t.priority === 'high' && !t.completed);
                break;
        }
        
        return tasks;
    },
    
    getById(id) {
        return App.state.tasks.find(t => t.id === id);
    },
    
    add(data) {
        const task = {
            id: App.nextId.task++,
            title: data.title,
            description: data.description || '',
            priority: data.priority || 'medium',
            dueDate: data.dueDate || null,
            assignee: data.assignee || null,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        App.state.tasks.unshift(task);
        Storage.save();
        this.render();
        
        ActivityManager.add('task_add', `Se creó la tarea "${task.title}"`);
        Toast.show(`Tarea "${task.title}" creada`, 'success');
        return task;
    },
    
    delete(id) {
        const task = this.getById(id);
        if (!task) return;
        
        if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
        
        App.state.tasks = App.state.tasks.filter(t => t.id !== id);
        Storage.save();
        this.render();
        
        ActivityManager.add('task_delete', `Se eliminó la tarea "${task.title}"`);
        Toast.show('Tarea eliminada', 'warning');
    },
    
    toggleComplete(id) {
        const task = this.getById(id);
        if (!task) return;
        
        task.completed = !task.completed;
        Storage.save();
        this.render();
        
        const action = task.completed ? 'completó' : 'reabrió';
        ActivityManager.add('task_toggle', `Se ${action} la tarea "${task.title}"`);
        Toast.show(`Tarea ${task.completed ? 'completada ✅' : 'reabierta'}`, 'info');
    },
    
    update(id, data) {
        const task = this.getById(id);
        if (!task) return;
        
        Object.assign(task, data);
        Storage.save();
        this.render();
        
        ActivityManager.add('task_update', `Se actualizó la tarea "${task.title}"`);
        Toast.show('Tarea actualizada', 'success');
    },
    
    render() {
        const board = document.getElementById('taskBoard');
        const tasks = this.getFiltered();
        
        if (tasks.length === 0) {
            board.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-tasks" style="font-size: 48px; color: var(--text-muted);"></i>
                    <p style="margin-top: 12px; font-size: 18px;">No hay tareas que mostrar</p>
                </div>
            `;
            return;
        }
        
        board.innerHTML = tasks.map(task => `
            <div class="task-card ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <span class="task-priority ${task.priority}">
                        ${this.getPriorityLabel(task.priority)}
                    </span>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span>
                        ${task.assignee ? `👤 ${MemberManager.getById(task.assignee)?.name || 'Sin asignar'}` : 'Sin asignar'}
                    </span>
                    <span>
                        ${task.dueDate ? `📅 ${new Date(task.dueDate).toLocaleDateString()}` : 'Sin fecha'}
                    </span>
                    <div class="task-actions">
                        <button class="complete-btn" onclick="TaskManager.toggleComplete(${task.id})">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="delete-btn" onclick="TaskManager.delete(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.updateStats();
    },
    
    getPriorityLabel(priority) {
        const labels = {
            high: '🔴 Alta',
            medium: '🟡 Media',
            low: '🟢 Baja'
        };
        return labels[priority] || priority;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    updateStats() {
        const tasks = this.getAll();
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        document.getElementById('totalTasks').textContent = total;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('taskBadge').textContent = pending;
        document.getElementById('totalMembers').textContent = MemberManager.getAll().length;
        
        this.renderWeeklyChart();
    },
    
    renderWeeklyChart() {
        const container = document.getElementById('weeklyChart');
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const today = new Date();
        const weekData = days.map((_, index) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - index));
            const dayTasks = App.state.tasks.filter(t => {
                const taskDate = new Date(t.createdAt);
                return taskDate.toDateString() === date.toDateString();
            });
            return {
                day: days[index],
                completed: dayTasks.filter(t => t.completed).length,
                total: dayTasks.length
            };
        });
        
        const maxValue = Math.max(...weekData.map(d => d.total), 1);
        
        container.innerHTML = weekData.map(data => `
            <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: ${(data.total / maxValue) * 100}%; background: linear-gradient(to top, var(--primary), ${data.total > 0 ? 'var(--primary-light)' : 'var(--border-color)'});">
                    <span style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 11px; color: var(--text-muted);">
                        ${data.total}
                    </span>
                </div>
                <span class="chart-bar-label">${data.day}</span>
            </div>
        `).join('');
    }
};

// ============================================
// GESTIÓN DE ACTIVIDADES
// ============================================
const ActivityManager = {
    add(type, description) {
        const activity = {
            id: App.nextId.activity++,
            type: type,
            description: description,
            timestamp: new Date().toISOString()
        };
        
        App.state.activities.unshift(activity);
        if (App.state.activities.length > 100) {
            App.state.activities = App.state.activities.slice(0, 100);
        }
        
        Storage.save();
        this.render();
    },
    
    render() {
        const container = document.getElementById('activityList');
        const activities = App.state.activities.slice(0, 10);
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                    <i class="fas fa-clock" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    Sin actividad reciente
                </div>
            `;
            return;
        }
        
        const icons = {
            task_add: 'fa-plus-circle',
            task_delete: 'fa-trash',
            task_toggle: 'fa-check-circle',
            task_update: 'fa-edit',
            member_add: 'fa-user-plus',
            member_delete: 'fa-user-minus',
            member_update: 'fa-user-edit'
        };
        
        container.innerHTML = activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${icons[a.type] || 'fa-bell'}"></i>
                </div>
                <div class="activity-content">
                    <p>${a.description}</p>
                    <span class="time">${this.timeAgo(new Date(a.timestamp))}</span>
                </div>
            </div>
        `).join('');
    },
    
    timeAgo(date) {
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
        if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
        return date.toLocaleDateString();
    }
};

// ============================================
// CALENDARIO
// ============================================
const CalendarManager = {
    render() {
        const date = App.state.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            `${new Date(year, month).toLocaleString('es', { month: 'long' })} ${year}`;
        
        const grid = document.getElementById('calendarGrid');
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        
        let html = '';
        
        ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month">${day}</div>`;
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && 
                           month === today.getMonth() && 
                           year === today.getFullYear();
            
            const hasEvent = App.state.tasks.some(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate);
                return taskDate.getDate() === day && 
                       taskDate.getMonth() === month && 
                       taskDate.getFullYear() === year;
            });
            
            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasEvent) classes += ' has-event';
            
            html += `<div class="${classes}">${day}</div>`;
        }
        
        const totalDays = firstDay + daysInMonth;
        const remainingDays = 42 - totalDays;
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }
        
        grid.innerHTML = html;
    },
    
    prevMonth() {
        App.state.currentDate.setMonth(App.state.currentDate.getMonth() - 1);
        this.render();
    },
    
    nextMonth() {
        App.state.currentDate.setMonth(App.state.currentDate.getMonth() + 1);
        this.render();
    }
};

// ============================================
// UI CONTROLLER
// ============================================
const UI = {
    init() {
        const loaded = Storage.load();
        if (!loaded) {
            this.loadSampleData();
        }
        
        MemberManager.render();
        TaskManager.render();
        ActivityManager.render();
        CalendarManager.render();
        
        this.setupEvents();
        this.applyTheme(App.state.theme);
    },
    
    loadSampleData() {
        const sampleMembers = [
            { name: 'Ana García', email: 'ana@empresa.com', role: 'manager' },
            { name: 'Carlos López', email: 'carlos@empresa.com', role: 'developer' },
            { name: 'María Rodríguez', email: 'maria@empresa.com', role: 'designer' },
            { name: 'Pedro Sánchez', email: 'pedro@empresa.com', role: 'developer' }
        ];
        
        sampleMembers.forEach(m => MemberManager.add(m));
        
        const sampleTasks = [
            { title: 'Diseñar interfaz de usuario', description: 'Crear mockups en Figma', priority: 'high', assignee: 3 },
            { title: 'Implementar autenticación', description: 'Usar JWT para login', priority: 'high', assignee: 2 },
            { title: 'Revisar código del equipo', description: 'Code review semanal', priority: 'medium', assignee: 1 },
            { title: 'Actualizar documentación', description: 'README y guías', priority: 'low', assignee: 4 }
        ];
        
        sampleTasks.forEach(t => TaskManager.add(t));
        
        Storage.save();
    },
    
    setupEvents() {
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                UI.navigateTo(page);
            });
        });
        
        document.getElementById('themeToggle').addEventListener('click', () => {
            const themes = ['light', 'dark'];
            const current = App.state.theme;
            const next = themes.find(t => t !== current) || 'light';
            UI.setTheme(next);
        });
        
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', function() {
                UI.setTheme(this.dataset.theme);
            });
        });
        
        document.querySelectorAll('.task-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.task-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                App.state.currentFilter = this.dataset.filter;
                TaskManager.render();
            });
        });
        
        document.getElementById('openTaskModal').addEventListener('click', () => {
            document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = '';
            document.getElementById('taskModal').classList.add('active');
        });
        
        document.getElementById('saveTask').addEventListener('click', UI.saveTask);
        
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            document.getElementById('memberModalTitle').textContent = 'Agregar Miembro';
            document.getElementById('memberForm').reset();
            document.getElementById('memberId').value = '';
            document.getElementById('memberModal').classList.add('active');
        });
        
        document.getElementById('saveMember').addEventListener('click', UI.saveMember);
        
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.remove('active');
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
        
        document.getElementById('prevMonth').addEventListener('click', CalendarManager.prevMonth);
        document.getElementById('nextMonth').addEventListener('click', CalendarManager.nextMonth);
        
        document.getElementById('exportData').addEventListener('click', UI.exportData);
        document.getElementById('clearData').addEventListener('click', UI.clearAllData);
        
        document.addEventListener('click', function(e) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('sidebarToggle');
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    },
    
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        const titles = {
            dashboard: ['Dashboard', 'Resumen general del equipo - Grupo 2.1'],
            tasks: ['Tareas', 'Gestiona todas tus tareas'],
            members: ['Miembros', 'Equipo de trabajo'],
            calendar: ['Calendario', 'Visualización mensual'],
            settings: ['Configuración', 'Ajustes de la aplicación']
        };
        
        const [title, subtitle] = titles[page] || ['', ''];
        document.getElementById('pageTitle').textContent = title;
        document.getElementById('pageSubtitle').textContent = subtitle;
        
        App.state.currentPage = page;
        
        if (page === 'dashboard') {
            MemberManager.renderDashboardPreview();
            TaskManager.updateStats();
            ActivityManager.render();
        }
    },
    
    setTheme(theme) {
        App.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        Storage.save();
        
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        const icon = document.querySelector('#themeToggle i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
        
        Toast.show(`Tema ${theme === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
    },
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        const icon = document.querySelector('#themeToggle i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    },
    
    saveTask() {
        const id = document.getElementById('taskId').value;
        const data = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value || null,
            assignee: document.getElementById('taskAssignee').value || null
        };
        
        if (!data.title.trim()) {
            Toast.show('El título es obligatorio', 'error');
            return;
        }
        
        if (id) {
            TaskManager.update(parseInt(id), data);
        } else {
            TaskManager.add(data);
        }
        
        document.getElementById('taskModal').classList.remove('active');
    },
    
    saveMember() {
        const id = document.getElementById('memberId').value;
        const data = {
            name: document.getElementById('memberName').value,
            email: document.getElementById('memberEmail').value,
            role: document.getElementById('memberRole').value,
            avatar: document.getElementById('memberAvatar').value
        };
        
        if (!data.name.trim()) {
            Toast.show('El nombre es obligatorio', 'error');
            return;
        }
        
        if (id) {
            MemberManager.update(parseInt(id), data);
        } else {
            MemberManager.add(data);
        }
        
        document.getElementById('memberModal').classList.remove('active');
    },
    
    exportData() {
        const data = {
            members: App.state.members,
            tasks: App.state.tasks,
            activities: App.state.activities,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-dashboard-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        Toast.show('Datos exportados correctamente', 'success');
    },
    
    clearAllData() {
        if (!confirm('¿Estás seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) return;
        if (!confirm('Confirmación final: ¿eliminar todos los datos?')) return;
        
        Storage.clear();
        location.reload();
    }
};

// ============================================
// INICIALIZAR APLICACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    console.log('✅ TeamDashboard - Grupo 2.1 iniciado correctamente');
    console.log(`📊 ${App.state.members.length} miembros, ${App.state.tasks.length} tareas`);
    console.log('👤 Administrador: Emilson Flores');
});
// --- 全局状态 ---
const GAME_STATE = {
    money: 1000000,
    month: 1,
    employees: [],
    projects: [],
    employeeIdCounter: 1,
    projectIdCounter: 1,
    pendingFireId: null,
    currentViewingProjectId: null // 记录当前Dashboard打开的项目
};

// --- 初始化 ---
document.addEventListener("DOMContentLoaded", () => {
    updateHeader();
    renderEmployees();
    renderProjects();
    document.getElementById("next-month-btn").addEventListener("click", nextMonth);
});

function updateHeader() {
    document.getElementById("money-display").innerText = GAME_STATE.money.toLocaleString();
    document.getElementById("month-display").innerText = GAME_STATE.month;
}

// --- 核心循环：推进岁月 ---
function nextMonth() {
    let totalSalary = 0;
    
    // 1. 结算工资与状态变化
    GAME_STATE.employees.forEach(emp => {
        totalSalary += emp.salary;
        // 在项目中的人压力涨得快，空闲的人压力会自然下降
        if(emp.projectId) {
            emp.status = Math.min(100, emp.status + Math.floor(Math.random() * 8) + 4);
        } else {
            emp.status = Math.max(0, emp.status - 5); 
        }
    });
    GAME_STATE.money -= totalSalary;

    // 2. 推进所有项目 (根据团队人员计算)
    GAME_STATE.projects.forEach(proj => {
        processProjectLogic(proj);
    });

    // 3. 破产判定
    if (GAME_STATE.money < 0) {
        alert("现金流断裂！你的公司破产了！");
        location.reload();
    }

    GAME_STATE.month++;
    updateHeader();
    renderEmployees();
    renderProjects();
    
    // 如果详情看板开着，也需要刷新数据
    if (GAME_STATE.currentViewingProjectId) {
        openProjectDashboard(GAME_STATE.currentViewingProjectId);
    }
}

// ================= 模块 1: 人事与招募系统 =================

function hireEmployee(role) {
    const names = ["张三", "李四", "王五", "赵六", "大佬", "萌新"];
    const baseSalaries = { "程序": 15000, "美术": 12000, "策划": 10000, "QA": 8000, "运营": 9000, "市场": 11000 };
    
    const emp = {
        id: GAME_STATE.employeeIdCounter++,
        name: `${role}_${names[Math.floor(Math.random()*names.length)]}`,
        role: role,
        salary: baseSalaries[role] + Math.floor(Math.random() * 4000 - 2000), // 薪水浮动
        status: 40, // 新手进来状态比较健康
        projectId: null // 初始空闲
    };
    
    GAME_STATE.employees.push(emp);
    closeModal('hire-modal');
    renderEmployees();
}

// 渲染左侧全局人才库
function renderEmployees() {
    const list = document.getElementById("employee-list");
    list.innerHTML = "";
    GAME_STATE.employees.forEach(emp => {
        list.appendChild(createEmployeeCardHTML(emp, false));
    });
}

// 生成员工卡片DOM (全局和Dashboard复用)
function createEmployeeCardHTML(emp, isInsideProject) {
    const card = document.createElement("div");
    card.className = "employee-card";
    
    let sColor = "var(--active)", sText = "状态良好";
    if (emp.status <= 30) { sColor = "var(--lazy)"; sText = "消极怠工"; }
    else if (emp.status >= 85) { sColor = "var(--overwork)"; sText = "濒临猝死"; }
    
    card.style.borderLeft = `4px solid ${sColor}`;

    let projectLabel = emp.projectId 
        ? `<div class="project-badge">正在开发: ${GAME_STATE.projects.find(p=>p.id===emp.projectId)?.name}</div>` 
        : `<div class="project-badge" style="background:rgba(255,255,255,0.1); color:#aaa">💤 闲置中</div>`;

    // 如果在Dashboard内部显示，提供“移出项目”按钮；如果在全局，提供“开除”按钮
    let actionBtn = isInsideProject
        ? `<button class="btn danger-btn text-small" onclick="removeFromProject(${emp.id})">踢出组</button>`
        : `<button class="btn danger-btn text-small" onclick="requestFire(${emp.id})">解雇</button>`;

    card.innerHTML = `
        <div class="emp-header">
            <div>
                <span class="emp-role">${emp.role}</span>
                <strong>${emp.name}</strong>
            </div>
            <span class="emp-status-badge" style="color:${sColor}">${sText}(${emp.status}%)</span>
        </div>
        <div class="status-bar-bg">
            <div class="status-bar-fill" style="width: ${emp.status}%; background: ${sColor}; box-shadow: 0 0 8px ${sColor}"></div>
        </div>
        ${!isInsideProject ? projectLabel : ''}
        <div class="emp-controls">
            <span>薪资: <input type="number" value="${emp.salary}" onchange="updateSalary(${emp.id}, this.value)"></span>
            <button class="btn action-btn text-small" onclick="giveVacation(${emp.id})">批年假</button>
            ${actionBtn}
        </div>
    `;
    return card;
}

// 人事操作函数
function updateSalary(id, newSalary) {
    const emp = GAME_STATE.employees.find(e => e.id === id);
    if(emp) {
        if (newSalary < emp.salary) emp.status = Math.max(0, emp.status - 40); // 降薪大打击
        else emp.status = 50; // 涨薪恢复动力
        emp.salary = parseInt(newSalary);
        refreshViews();
    }
}
function giveVacation(id) {
    const emp = GAME_STATE.employees.find(e => e.id === id);
    if(emp) { emp.status = Math.max(0, emp.status - 50); refreshViews(); }
}
function refreshViews() {
    renderEmployees();
    if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId);
}

// 开除逻辑(保留你要求的N/N+1/2N+1)
function requestFire(id) {
    const emp = GAME_STATE.employees.find(e => e.id === id);
    GAME_STATE.pendingFireId = id;
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    document.getElementById("fire-desc").innerText = `解雇 [${emp.name}] 需要支付赔偿金: ￥${cost}`;
    openModal("fire-modal");
}
function executeFire() {
    const idx = GAME_STATE.employees.findIndex(e => e.id === GAME_STATE.pendingFireId);
    const emp = GAME_STATE.employees[idx];
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    GAME_STATE.money -= cost;
    
    // 如果在项目中，也要清理
    if(emp.projectId) {
        const proj = GAME_STATE.projects.find(p => p.id === emp.projectId);
        if(proj && proj.team) proj.team = proj.team.filter(id => id !== emp.id);
    }
    
    GAME_STATE.employees.splice(idx, 1);
    closeModal("fire-modal"); updateHeader(); refreshViews();
}


// ================= 模块 2: 项目与数值引擎 =================

function createDummyProject() {
    const proj = {
        id: GAME_STATE.projectIdCounter++,
        name: `代号：神作 0${GAME_STATE.projectIdCounter}`,
        stage: 1, // 1研发 2准备 3上线 4长线
        progress: 0,
        quality: 0,
        influence: 0,
        retention: 10, // 初始10%
        uaDiscount: 0, 
        cost: 0, revenue: 0, uaCost: 0,
        historyData: { labels: [], costs: [], profits: [], revs: [] },
        chartInstance: null
    };
    GAME_STATE.projects.push(proj);
    renderProjects();
}

// 核心数值计算：队伍成员如何影响项目
function processProjectLogic(proj) {
    // 获取当前在这个项目里的员工
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    
    // 基础维护成本
    proj.cost += 20000; 
    
    // 按职业结算贡献值 (根据状态衰减或暴击)
    team.forEach(emp => {
        // 状态系数：摸鱼0.3倍，积极1.2倍，过劳1.5倍但容易出事
        let mod = emp.status <= 30 ? 0.3 : (emp.status >= 85 ? 1.5 : 1.2);
        
        if (proj.stage === 1) {
            if (emp.role === '策划') { proj.progress += 8 * mod; proj.retention += 0.5 * mod; }
            if (emp.role === '程序') { proj.progress += 10 * mod; proj.influence += 2 * mod; }
            if (emp.role === '美术') { proj.quality += 3 * mod; }
            if (emp.role === 'QA')   { proj.quality += 1 * mod; proj.influence += 0.5 * mod; }
        }
        
        if (proj.stage >= 3) { // 上线后运营和市场发力
            if (emp.role === '运营') { proj.retention += 0.2 * mod; }
            if (emp.role === '市场') { proj.uaDiscount = Math.min(50, proj.uaDiscount + 2 * mod); proj.retention += 0.1 * mod;}
        }
    });

    // 阶段流转
    if (proj.stage === 1 && proj.progress >= 100) proj.stage = 2; // 研发满，进入提审
    else if (proj.stage === 2) proj.stage = 3; // 提审1个月后自动上线
    
    // 收益计算 (上线后)
    if (proj.stage >= 3) {
        if(proj.stage === 3) proj.stage = 4; // 首月发售后进长线
        
        // 留存率衰减
        proj.retention = Math.max(1, proj.retention - 1); 
        
        // 实际买量支出 (被市场人员折扣)
        let actualUACost = proj.uaCost * (1 - proj.uaDiscount/100);
        
        // 收入公式 = 基础活跃 + (品质*影响力) * (留存/100) + 买量效果
        let baseRev = 50000 + (proj.quality * proj.influence * 10);
        let monthlyRev = (baseRev * (proj.retention / 10)) + (proj.uaCost * 1.8);
        
        proj.revenue += monthlyRev;
        GAME_STATE.money += (monthlyRev - actualUACost);
        
        // 记录折线图
        proj.historyData.labels.push(`M${GAME_STATE.month}`);
        proj.historyData.costs.push(proj.cost + actualUACost);
        proj.historyData.revs.push(monthlyRev);
        proj.historyData.profits.push(monthlyRev - actualUACost);
    }
}

// 渲染右侧项目大厅缩略图
function renderProjects() {
    const list = document.getElementById("project-list");
    list.innerHTML = "";
    GAME_STATE.projects.forEach(proj => {
        const teamCount = GAME_STATE.employees.filter(e => e.projectId === proj.id).length;
        const stageText = ["", "1.研发阶段", "2.提审阶段", "3.正式上线", "4.长线运营"][proj.stage];
        
        const card = document.createElement("div");
        card.className = "project-card";
        card.innerHTML = `
            <div class="emp-header">
                <h3 style="margin:0; color:var(--primary)">${proj.name}</h3>
                <span class="project-badge">${stageText}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted)">当前团队: ${teamCount} 人 | 进度: ${Math.floor(proj.progress)}%</p>
            <button class="btn action-btn" style="width:100%; margin-top:10px" onclick="openProjectDashboard(${proj.id})">进入控制台 ➔</button>
        `;
        list.appendChild(card);
    });
}


// ================= 模块 3: 独立项目控制台 (Dashboard) =================

function openProjectDashboard(id) {
    const proj = GAME_STATE.projects.find(p => p.id === id);
    if (!proj) return;
    
    GAME_STATE.currentViewingProjectId = id;
    
    // 填充数据看板
    document.getElementById("dash-title").innerText = proj.name;
    document.getElementById("dash-stage").innerText = ["", "研发中", "提审中", "首发当月", "长线运营"][proj.stage];
    document.getElementById("dash-progress").innerText = Math.floor(proj.progress) + "%";
    document.getElementById("dash-quality").innerText = Math.floor(proj.quality);
    document.getElementById("dash-influence").innerText = Math.floor(proj.influence);
    document.getElementById("dash-retention").innerText = proj.retention.toFixed(1) + "%";
    document.getElementById("dash-uadiscount").innerText = "-" + Math.floor(proj.uaDiscount) + "%";
    
    // 显示买量控制 (仅限上线后)
    const uaControl = document.getElementById("dash-ua-control");
    if (proj.stage >= 3) {
        uaControl.classList.remove("hidden");
        document.getElementById("ua-select").value = proj.uaCost;
    } else {
        uaControl.classList.add("hidden");
    }
    
    // 渲染该项目的专属团队
    const teamList = document.getElementById("dash-team-list");
    teamList.innerHTML = "";
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    if (team.length === 0) {
        teamList.innerHTML = "<p style='color:var(--lazy)'>当前项目无人员推进，进度停滞！请分配人员。</p>";
    } else {
        team.forEach(emp => {
            teamList.appendChild(createEmployeeCardHTML(emp, true));
        });
    }

    // 重绘折线图
    renderDashboardChart(proj);
    openModal("project-dashboard-modal");
}

function closeProjectDashboard() {
    GAME_STATE.currentViewingProjectId = null;
    closeModal("project-dashboard-modal");
}

function changeProjectUA(val) {
    if (GAME_STATE.currentViewingProjectId) {
        const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId);
        if (proj) proj.uaCost = parseInt(val);
    }
}

// 分配员工逻辑
function openAssignModal() {
    const idleList = document.getElementById("idle-employee-list");
    idleList.innerHTML = "";
    
    const idleEmps = GAME_STATE.employees.filter(e => e.projectId === null);
    if (idleEmps.length === 0) {
        idleList.innerHTML = "<p>当前没有空闲的员工，去人才库招募吧！</p>";
    } else {
        idleEmps.forEach(emp => {
            idleList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;">
                    <span>[${emp.role}] ${emp.name} (薪资:${emp.salary})</span>
                    <button class="btn primary-btn text-small" onclick="assignToProject(${emp.id})">加入本项目</button>
                </div>
            `;
        });
    }
    openModal("assign-modal");
}

function assignToProject(empId) {
    const emp = GAME_STATE.employees.find(e => e.id === empId);
    if(emp) {
        emp.projectId = GAME_STATE.currentViewingProjectId;
        openAssignModal(); // 刷新弹窗列表
        refreshViews(); // 刷新底层UI
    }
}

function removeFromProject(empId) {
    const emp = GAME_STATE.employees.find(e => e.id === empId);
    if(emp) {
        emp.projectId = null;
        refreshViews();
    }
}

// 财务折线图 (Chart.js)
let globalChartInstance = null; // 在Dashboard中我们复用一个Canvas和实例
function renderDashboardChart(proj) {
    const canvas = document.getElementById('dash-chart');
    if (!canvas) return;

    if (globalChartInstance) {
        globalChartInstance.destroy(); // 切换项目时销毁旧图表重绘
    }

    const ctx = canvas.getContext('2d');
    
    // 如果还没上线，显示占位符
    if (proj.stage < 3 || proj.historyData.labels.length === 0) {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("游戏上线后生成实时运营报表", canvas.width/2, canvas.height/2);
        return;
    }

    Chart.defaults.color = '#94a3b8';
    globalChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: proj.historyData.labels,
            datasets: [
                { label: '总支出 (研发+买量)', data: proj.historyData.costs, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 },
                { label: '流水收入', data: proj.historyData.revs, borderColor: '#00f2fe', tension: 0.3 },
                { label: '净利润', data: proj.historyData.profits, borderColor: '#f59e0b', tension: 0.3 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });
}

// 工具函数
function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
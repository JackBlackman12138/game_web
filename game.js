// --- 全局状态 ---
const GAME_STATE = {
    money: 1000000,
    month: 1,
    employees: [],
    projects: [],
    employeeIdCounter: 1,
    projectIdCounter: 1,
    pendingFireId: null,
    currentViewingProjectId: null,
    totalInfluence: 0,
    hasTriggeredInvestment: false // 标记是否触发过100影响力商单事件
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
    
    // 计算总影响力
    GAME_STATE.totalInfluence = GAME_STATE.projects.reduce((sum, p) => sum + p.influence, 0);
    document.getElementById("total-influence-display").innerText = Math.floor(GAME_STATE.totalInfluence);
}

// --- 核心循环：推进岁月 ---
function nextMonth() {
    let totalSalary = 0;
    
    GAME_STATE.employees.forEach(emp => {
        totalSalary += emp.salary;
        if(emp.projectId) emp.status = Math.min(100, emp.status + Math.floor(Math.random() * 8) + 4);
        else emp.status = Math.max(0, emp.status - 5); 
    });
    GAME_STATE.money -= totalSalary;

    GAME_STATE.projects.forEach(proj => {
        processProjectLogic(proj);
    });

    // 检查是否触发大商单投资 (总影响力 > 100)
    if (GAME_STATE.totalInfluence > 100 && !GAME_STATE.hasTriggeredInvestment) {
        GAME_STATE.hasTriggeredInvestment = true;
        triggerInvestmentEvent();
    }

    if (GAME_STATE.money < 0) {
        alert("现金流断裂！你的公司破产了！即将为您结算公司残值...");
        endGameAndSettle();
        return;
    }

    GAME_STATE.month++;
    updateHeader();
    renderEmployees();
    renderProjects();
    
    if (GAME_STATE.currentViewingProjectId) {
        openProjectDashboard(GAME_STATE.currentViewingProjectId);
    }
}

// ================= 模块 1: 人事与招募 (保留之前逻辑) =================
function hireEmployee(role) {
    const names = ["张三", "李四", "王五", "赵六", "大佬", "萌新"];
    const baseSalaries = { "程序": 15000, "美术": 12000, "策划": 10000, "QA": 8000, "运营": 9000, "市场": 11000 };
    const emp = {
        id: GAME_STATE.employeeIdCounter++,
        name: `${role}_${names[Math.floor(Math.random()*names.length)]}`,
        role: role,
        salary: baseSalaries[role] + Math.floor(Math.random() * 4000 - 2000),
        status: 40, projectId: null
    };
    GAME_STATE.employees.push(emp);
    closeModal('hire-modal'); renderEmployees();
}

function renderEmployees() {
    const list = document.getElementById("employee-list");
    list.innerHTML = "";
    GAME_STATE.employees.forEach(emp => list.appendChild(createEmployeeCardHTML(emp, false)));
}

function createEmployeeCardHTML(emp, isInsideProject) {
    const card = document.createElement("div");
    card.className = "employee-card";
    let sColor = "var(--active)", sText = "状态良好";
    if (emp.status <= 30) { sColor = "var(--lazy)"; sText = "消极怠工"; }
    else if (emp.status >= 85) { sColor = "var(--overwork)"; sText = "濒临猝死"; }
    
    card.style.borderLeft = `4px solid ${sColor}`;
    let projectLabel = emp.projectId ? `<div class="project-badge">正在开发: ${GAME_STATE.projects.find(p=>p.id===emp.projectId)?.name}</div>` : `<div class="project-badge" style="background:rgba(255,255,255,0.1); color:#aaa">💤 闲置中</div>`;
    let actionBtn = isInsideProject ? `<button class="btn danger-btn text-small" onclick="removeFromProject(${emp.id})">踢出组</button>` : `<button class="btn danger-btn text-small" onclick="requestFire(${emp.id})">解雇</button>`;

    card.innerHTML = `
        <div class="emp-header"><div><span class="emp-role">${emp.role}</span> <strong>${emp.name}</strong></div><span class="emp-status-badge" style="color:${sColor}">${sText}(${emp.status}%)</span></div>
        <div class="status-bar-bg"><div class="status-bar-fill" style="width: ${emp.status}%; background: ${sColor}; box-shadow: 0 0 8px ${sColor}"></div></div>
        ${!isInsideProject ? projectLabel : ''}
        <div class="emp-controls"><span>薪资: <input type="number" value="${emp.salary}" onchange="updateSalary(${emp.id}, this.value)"></span><button class="btn action-btn text-small" onclick="giveVacation(${emp.id})">批年假</button>${actionBtn}</div>
    `;
    return card;
}

function updateSalary(id, newSalary) {
    const emp = GAME_STATE.employees.find(e => e.id === id);
    if(emp) {
        if (newSalary < emp.salary) emp.status = Math.max(0, emp.status - 40);
        else emp.status = 50; 
        emp.salary = parseInt(newSalary); refreshViews();
    }
}
function giveVacation(id) { const emp = GAME_STATE.employees.find(e => e.id === id); if(emp) { emp.status = Math.max(0, emp.status - 50); refreshViews(); } }
function refreshViews() { renderEmployees(); if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId); }
function requestFire(id) {
    const emp = GAME_STATE.employees.find(e => e.id === id); GAME_STATE.pendingFireId = id;
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    document.getElementById("fire-desc").innerText = `解雇 [${emp.name}] 需要支付赔偿金: ￥${cost}`;
    openModal("fire-modal");
}
function executeFire() {
    const idx = GAME_STATE.employees.findIndex(e => e.id === GAME_STATE.pendingFireId);
    const emp = GAME_STATE.employees[idx];
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    GAME_STATE.money -= cost;
    if(emp.projectId) { const proj = GAME_STATE.projects.find(p => p.id === emp.projectId); if(proj && proj.team) proj.team = proj.team.filter(id => id !== emp.id); }
    GAME_STATE.employees.splice(idx, 1); closeModal("fire-modal"); updateHeader(); refreshViews();
}


// ================= 模块 2: 项目与全新数值引擎 =================

function createProject(bizType, genre, targetMonths) {
    const proj = {
        id: GAME_STATE.projectIdCounter++,
        name: `${genre}项目 0${GAME_STATE.projectIdCounter}`,
        bizType: bizType, // 买断制 / 内购制
        genre: genre,
        targetMonths: targetMonths, // 决定开发需要的总进度量
        stage: 1, 
        progress: 0,
        quality: 0, // 0-100
        influence: 0,
        retention: 10, // 初始留存10%
        uaDiscount: 0, 
        cost: 0, revenue: 0, uaCost: 0,
        historyData: { labels: [], costs: [], profits: [], revs: [] },
        chartInstance: null
    };
    GAME_STATE.projects.push(proj);
    closeModal('new-project-modal');
    renderProjects();
}

// 核心数值计算：多重飞轮效应
function processProjectLogic(proj) {
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    proj.cost += 20000; 
    
    let artMod=0, progMod=0, desMod=0, qaMod=0, opsMod=0, mktMod=0;

    // 统计各岗位的发力值
    team.forEach(emp => {
        let mod = emp.status <= 30 ? 0.3 : (emp.status >= 85 ? 1.5 : 1.2);
        if(emp.role==='美术') artMod += mod;
        if(emp.role==='程序') progMod += mod;
        if(emp.role==='策划') desMod += mod;
        if(emp.role==='QA') qaMod += mod;
        if(emp.role==='运营') opsMod += mod;
        if(emp.role==='市场') mktMod += mod;
    });

    if (proj.stage === 1) {
        // 进度由策划和程序主导，开发周期越长（targetMonths大），单月增加的百分比越少
        let progressSpeed = (desMod*1.5 + progMod*2.5 + 1) * (10 / proj.targetMonths);
        proj.progress += progressSpeed;
        
        // 【品质系统】美40%、程20%、策10%、QA30%。每月累加，上限100。
        let monthlyQuality = (artMod*0.4 + progMod*0.2 + desMod*0.1 + qaMod*0.3) * 6; 
        proj.quality = Math.min(100, proj.quality + monthlyQuality);

        // 研发期策划决定基础留存率基因
        proj.retention = Math.min(30, proj.retention + desMod*0.2); 

        if (proj.progress >= 100) proj.stage = 2; 
    } 
    else if (proj.stage === 2) proj.stage = 3; 
    
    // 上线后逻辑
    if (proj.stage >= 3) {
        if(proj.stage === 3) proj.stage = 4; 
        
        // 留存率自然衰减，运营可以维持或拉升
        proj.retention = Math.max(1, proj.retention - 1.5 + opsMod*0.5); 
        
        // 市场降低买量成本
        proj.uaDiscount = Math.min(60, mktMod * 5); 
        let actualUACost = proj.uaCost * (1 - proj.uaDiscount/100);

        // 【影响力飞轮计算】
        // 1. 根据留存率增减
        if (proj.retention > 15) proj.influence += 2; // 优秀大幅增加
        else if (proj.retention >= 5) proj.influence += 0.5; // 良好小幅增加
        else if (proj.retention < 3) proj.influence -= 1; // 较差小幅降低

        // 2. 根据产品质量增减
        if (proj.quality >= 80) proj.influence += 2;
        else if (proj.quality >= 60) proj.influence += 0.5;
        else proj.influence -= 1;

        // 3. 买量提升影响力
        if (proj.uaCost > 0) {
            proj.influence += (proj.uaCost / 50000); // 买量转化为影响力
        }
        
        proj.influence = Math.max(0, proj.influence); // 影响力不为负
        
        // 【流水计算】
        let baseRev = proj.bizType === '买断制' ? 200000 : 50000;
        // 买断制吃质量，内购制吃留存
        if (proj.bizType === '买断制') {
            baseRev = (baseRev * (proj.quality/50)) * (1 / (GAME_STATE.month - 1)); // 买断制随时间暴跌
        } else {
            baseRev = (baseRev * (proj.retention/10)) + (actualUACost * 1.8); // 内购滚雪球
        }

        proj.revenue += baseRev;
        GAME_STATE.money += (baseRev - actualUACost);
        
        // 记录报表
        proj.historyData.labels.push(`M${GAME_STATE.month}`);
        proj.historyData.costs.push(proj.cost + actualUACost);
        proj.historyData.revs.push(baseRev);
        proj.historyData.profits.push(baseRev - actualUACost);
    }
}

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
            <p style="font-size:0.85rem; color:var(--text-muted)">【${proj.bizType}】团队: ${teamCount} 人 | 进度: ${Math.floor(proj.progress)}%</p>
            <p style="font-size:0.85rem; color:var(--warning)">当前影响力: ${Math.floor(proj.influence)}</p>
            <button class="btn action-btn" style="width:100%; margin-top:10px" onclick="openProjectDashboard(${proj.id})">进入控制台 ➔</button>
        `;
        list.appendChild(card);
    });
}

// ================= 模块 3: 控制台与解散/结算 =================

function openProjectDashboard(id) {
    const proj = GAME_STATE.projects.find(p => p.id === id);
    if (!proj) return;
    GAME_STATE.currentViewingProjectId = id;
    
    document.getElementById("dash-title").innerText = proj.name;
    document.getElementById("dash-type-badge").innerText = `[${proj.bizType}] ${proj.genre}`;
    document.getElementById("dash-stage").innerText = ["", "研发中", "提审中", "首发当月", "长线运营"][proj.stage];
    document.getElementById("dash-progress").innerText = Math.floor(proj.progress) + "%";
    document.getElementById("dash-quality").innerText = Math.floor(proj.quality);
    document.getElementById("dash-influence").innerText = Math.floor(proj.influence);
    document.getElementById("dash-retention").innerText = proj.retention.toFixed(1) + "%";
    document.getElementById("dash-uadiscount").innerText = "-" + Math.floor(proj.uaDiscount) + "%";
    
    const uaControl = document.getElementById("dash-ua-control");
    if (proj.stage >= 3) { uaControl.classList.remove("hidden"); document.getElementById("ua-select").value = proj.uaCost; } 
    else { uaControl.classList.add("hidden"); }
    
    const teamList = document.getElementById("dash-team-list");
    teamList.innerHTML = "";
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    if (team.length === 0) teamList.innerHTML = "<p style='color:var(--lazy)'>当前项目无人员推进，进度停滞！</p>";
    else team.forEach(emp => teamList.appendChild(createEmployeeCardHTML(emp, true)));

    renderDashboardChart(proj);
    openModal("project-dashboard-modal");
}

function closeProjectDashboard() { GAME_STATE.currentViewingProjectId = null; closeModal("project-dashboard-modal"); }
function changeProjectUA(val) { if (GAME_STATE.currentViewingProjectId) { const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId); if (proj) proj.uaCost = parseInt(val); } }

// 删除项目逻辑
function confirmDeleteProject() {
    if(confirm("⚠️ 确定要解散该项目吗？\n所有投入的资金将沉没，组内员工将被释放到空闲状态。")) {
        const projId = GAME_STATE.currentViewingProjectId;
        // 释放员工
        GAME_STATE.employees.forEach(emp => { if(emp.projectId === projId) emp.projectId = null; });
        // 删除项目
        GAME_STATE.projects = GAME_STATE.projects.filter(p => p.id !== projId);
        closeProjectDashboard();
        updateHeader();
        refreshViews();
    }
}

// 触发大商单投资事件
function triggerInvestmentEvent() {
    document.getElementById("event-title").innerText = "🎉 震惊业界！天价估值商单";
    document.getElementById("event-desc").innerText = "你的公司在业内的总影响力突破了 100 点！企鹅大厂看中了你们的潜力，提出了一笔巨额的投资入股或IP联动协议！";
    document.getElementById("event-options").innerHTML = `
        <button class="btn warning-btn" onclick="acceptInvestment()">接受投资 (获得500万资金，但扣除部分管理权)</button>
        <button class="btn primary-btn" onclick="closeModal('event-modal')">婉言拒绝 (保持独立，无事发生)</button>
    `;
    openModal("event-modal");
}

function acceptInvestment() {
    GAME_STATE.money += 5000000;
    alert("获得了500万元融资！公司规模再上一个台阶！");
    closeModal("event-modal");
    updateHeader();
}

// 最终结算与存档
function endGameAndSettle() {
    // 估值公式：公司的总资金 + 公司的总资金 × (市场影响力 ÷ 100)
    let safeMoney = Math.max(0, GAME_STATE.money); // 防止负数导致估值倒扣
    let valuation = safeMoney + (safeMoney * (GAME_STATE.totalInfluence / 100));
    
    document.getElementById("settle-money").innerText = GAME_STATE.money.toLocaleString();
    document.getElementById("settle-influence").innerText = Math.floor(GAME_STATE.totalInfluence);
    document.getElementById("settle-valuation").innerText = Math.floor(valuation).toLocaleString();
    
    // 简单模拟存档记录 (写入 LocalStorage)
    let historyRecords = JSON.parse(localStorage.getItem("GameCreatorRecords") || "[]");
    historyRecords.push({
        date: new Date().toLocaleDateString(),
        valuation: Math.floor(valuation),
        monthsSurvived: GAME_STATE.month
    });
    localStorage.setItem("GameCreatorRecords", JSON.stringify(historyRecords));

    openModal("settlement-modal");
}

// 分配员工逻辑(保持不变)
function openAssignModal() { const idleList = document.getElementById("idle-employee-list"); idleList.innerHTML = ""; const idleEmps = GAME_STATE.employees.filter(e => e.projectId === null); if (idleEmps.length === 0) { idleList.innerHTML = "<p>当前没有空闲的员工，去招募吧！</p>"; } else { idleEmps.forEach(emp => { idleList.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;"><span>[${emp.role}] ${emp.name} (薪资:${emp.salary})</span><button class="btn primary-btn text-small" onclick="assignToProject(${emp.id})">加入本项目</button></div>`; }); } openModal("assign-modal"); }
function assignToProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = GAME_STATE.currentViewingProjectId; openAssignModal(); refreshViews(); } }
function removeFromProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = null; refreshViews(); } }

let globalChartInstance = null; 
function renderDashboardChart(proj) {
    const canvas = document.getElementById('dash-chart');
    if (!canvas) return;
    if (globalChartInstance) globalChartInstance.destroy();
    const ctx = canvas.getContext('2d');
    if (proj.stage < 3 || proj.historyData.labels.length === 0) {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b"; ctx.font = "16px Arial"; ctx.textAlign = "center";
        ctx.fillText("游戏上线后生成实时运营报表", canvas.width/2, canvas.height/2); return;
    }
    Chart.defaults.color = '#94a3b8';
    globalChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: proj.historyData.labels, datasets: [ { label: '总支出 (研发+买量)', data: proj.historyData.costs, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }, { label: '流水收入', data: proj.historyData.revs, borderColor: '#00f2fe', tension: 0.3 }, { label: '净利润', data: proj.historyData.profits, borderColor: '#f59e0b', tension: 0.3 } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
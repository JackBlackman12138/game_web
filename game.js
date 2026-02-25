// --- 全局变量设定 (改为let，方便覆盖存档) ---
let GAME_STATE = getInitialState();
let globalChartInstance = null; 

function getInitialState() {
    return {
        money: 1000000,
        month: 1,
        employees: [],
        projects: [],
        employeeIdCounter: 1,
        projectIdCounter: 1,
        pendingFireId: null,
        currentViewingProjectId: null,
        totalInfluence: 0,
        hasTriggeredInvestment: false,
        lastFinance: { revenue: 0, salary: 0, rent: 0, server: 0, ua: 0, profit: 0 }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // 页面加载时默认只显示主菜单
    document.getElementById("next-month-btn").addEventListener("click", nextMonth);
});

// ================= 主菜单与存取档系统 =================
function startNewGame() {
    GAME_STATE = getInitialState();
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("game-ui").classList.remove("hidden");
    updateHeader();
    renderEmployees();
    renderProjects();
}

function saveGame() {
    localStorage.setItem('GameCreatorSave', JSON.stringify(GAME_STATE));
    alert("💾 游戏进度已保存！");
}

function loadGame() {
    let saved = localStorage.getItem('GameCreatorSave');
    if (!saved) {
        alert("⚠️ 没有找到存档，请先开始新游戏并保存！");
        return;
    }
    GAME_STATE = JSON.parse(saved);
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("game-ui").classList.remove("hidden");
    updateHeader();
    renderEmployees();
    renderProjects();
    alert("✅ 成功读取进度！欢迎回来，老板。");
}

function openHistoryModal() {
    const historyList = document.getElementById("history-list");
    let records = JSON.parse(localStorage.getItem("GameCreatorRecords") || "[]");
    
    if (records.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>暂无公司结算记录，去建立你的第一个商业帝国吧！</p>";
    } else {
        historyList.innerHTML = records.reverse().map((r, i) => `
            <div style="background:#00000040; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--warning);">
                <div>
                    <strong style="font-size:1.1rem;">记录 #${records.length - i}</strong><br>
                    <span style="font-size:0.85rem; color:var(--text-muted);">${r.date} | 存活 ${r.monthsSurvived} 个月</span>
                </div>
                <div style="font-size:1.3rem; font-weight:900; color:var(--warning);">
                    ￥${r.valuation.toLocaleString()}
                </div>
            </div>
        `).join("");
    }
    openModal("history-modal");
}

function updateHeader() {
    document.getElementById("money-display").innerText = GAME_STATE.money.toLocaleString();
    document.getElementById("month-display").innerText = GAME_STATE.month;
    GAME_STATE.totalInfluence = GAME_STATE.projects.reduce((sum, p) => sum + p.influence, 0);
    document.getElementById("total-influence-display").innerText = Math.floor(GAME_STATE.totalInfluence);
}

// --- 核心循环：推进岁月 ---
function nextMonth() {
    if (GAME_STATE.projects.some(p => p.stage === 2)) {
        alert("⚠️ 警告：有项目已经研发100%并处于【提审阶段】，请前往项目工作室手动【发布上线】，否则无法推进下个月！");
        return;
    }

    GAME_STATE.lastFinance = { revenue: 0, salary: 0, rent: 0, server: 0, ua: 0, profit: 0 };
    GAME_STATE.lastFinance.rent = 10000 + (Math.floor(GAME_STATE.employees.length / 5) * 5000);
    GAME_STATE.lastFinance.server = GAME_STATE.projects.filter(p => p.stage >= 3).length * 8000;
    
    let totalSalary = 0;
    GAME_STATE.employees.forEach(emp => {
        totalSalary += emp.salary;
        if(emp.projectId) emp.status = Math.min(100, emp.status + Math.floor(Math.random() * 8) + 4);
        else emp.status = Math.max(0, emp.status - 5); 
    });
    GAME_STATE.lastFinance.salary = totalSalary;

    let totalExpense = totalSalary + GAME_STATE.lastFinance.rent + GAME_STATE.lastFinance.server;
    GAME_STATE.money -= totalExpense;

    GAME_STATE.projects.forEach(proj => { processProjectLogic(proj); });
    GAME_STATE.lastFinance.profit = GAME_STATE.lastFinance.revenue - (totalExpense + GAME_STATE.lastFinance.ua);

    if (GAME_STATE.totalInfluence > 100 && !GAME_STATE.hasTriggeredInvestment) {
        GAME_STATE.hasTriggeredInvestment = true; triggerInvestmentEvent();
    }

    let devProjects = GAME_STATE.projects.filter(p => p.stage === 1);
    if (Math.random() < 0.15 && devProjects.length > 0) {
        let targetProj = devProjects[Math.floor(Math.random() * devProjects.length)];
        triggerRandomEvent(targetProj);
    }

    if (GAME_STATE.money < 0) {
        alert("💸 现金流断裂！你的公司破产了！即将为您清算...");
        endGameAndSettle(true); return;
    }

    // ================= 5年自动结束逻辑 =================
    if (GAME_STATE.month >= 60) {
        alert("⏱️ 5年期限已到！游戏结束，即将为您清算最终商业帝国估值！");
        endGameAndSettle(false);
        return;
    }

    GAME_STATE.month++;
    updateHeader(); renderEmployees(); renderProjects();
    if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId);
}

// ================= 人事系统 (加入空状态UI) =================
function hireEmployee(role) {
    const names = ["大伟", "老贼", "小岛", "三上", "实习生", "地中海", "肝帝"];
    const baseSalaries = { "程序": 15000, "美术": 12000, "策划": 10000, "QA": 8000, "运营": 9000, "市场": 11000 };
    const emp = { id: GAME_STATE.employeeIdCounter++, name: `${names[Math.floor(Math.random()*names.length)]}`, role: role, salary: baseSalaries[role] + Math.floor(Math.random() * 4000 - 2000), status: 40, projectId: null };
    GAME_STATE.employees.push(emp); closeModal('hire-modal'); renderEmployees();
}

function renderEmployees() {
    const list = document.getElementById("employee-list"); list.innerHTML = "";
    if (GAME_STATE.employees.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🪑</div><h3>工位空空如也</h3><p>点击右上角 [招募人才] 开始建立团队！</p></div>`;
        return;
    }
    GAME_STATE.employees.forEach(emp => list.appendChild(createEmployeeCardHTML(emp, false)));
}

function createEmployeeCardHTML(emp, isInsideProject) {
    const card = document.createElement("div"); card.className = "game-card";
    let sColor = "var(--active)", sText = "工作积极";
    if (emp.status <= 30) { sColor = "var(--lazy)"; sText = "消极怠工"; } else if (emp.status >= 85) { sColor = "var(--danger)"; sText = "过劳警告"; }
    
    let projName = emp.projectId ? GAME_STATE.projects.find(p=>p.id===emp.projectId)?.name : "💤 摸鱼中";
    let statusHTML = !isInsideProject ? `<div class="badge" style="background:#00000040; color:#fff; margin-bottom:10px;">项目: ${projName}</div>` : '';
    let actionBtn = isInsideProject ? `<button class="btn danger-btn" onclick="removeFromProject(${emp.id})">踢出</button>` : `<button class="btn danger-btn" onclick="requestFire(${emp.id})">解雇</button>`;

    card.innerHTML = `
        <div class="emp-top">
            <div class="emp-name-role">
                <span class="emp-role">${emp.role}</span>
                <span class="emp-name">${emp.name}</span>
            </div>
            <span class="emp-status" style="color:${sColor}">${sText} (${emp.status}%)</span>
        </div>
        <div class="health-bar-bg"><div class="health-bar-fill" style="width: ${emp.status}%; background: ${sColor};"></div></div>
        ${statusHTML}
        <div class="emp-bot">
            <span style="font-size:0.8rem; font-weight:bold;">月薪: ￥<input type="number" class="salary-input" value="${emp.salary}" onchange="updateSalary(${emp.id}, this.value)"></span>
        </div>
        <div class="card-actions">
            <button class="btn action-btn" onclick="giveVacation(${emp.id})">批年假</button>
            ${actionBtn}
        </div>
    `;
    return card;
}

function updateSalary(id, newSalary) {
    const emp = GAME_STATE.employees.find(e => e.id === id); if(!emp) return;
    let diff = (newSalary - emp.salary) / emp.salary;
    if (diff < -0.1) emp.status -= (20 + Math.random()*20); 
    else if (diff < 0) emp.status -= 5; 
    else if (diff > 0.1) emp.status += 15; 
    emp.salary = parseInt(newSalary); emp.status = Math.max(0, Math.min(100, Math.floor(emp.status)));
    refreshViews();
}
function giveVacation(id) { 
    const emp = GAME_STATE.employees.find(e => e.id === id); if(!emp) return;
    if (emp.status < 40) { alert("压力这么小，不需要休假！"); return; }
    GAME_STATE.money -= Math.floor(emp.salary * 0.5); 
    emp.status = Math.max(0, emp.status - Math.floor(30 + Math.random()*20)); refreshViews(); updateHeader();
}
function refreshViews() { renderEmployees(); if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId); }

function requestFire(id) {
    const emp = GAME_STATE.employees.find(e => e.id === id); GAME_STATE.pendingFireId = id;
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    document.getElementById("fire-desc").innerText = `解雇 [${emp.name}] 需要支付赔偿金: ￥${cost}`;
    openModal("fire-modal");
}
function executeFire() {
    const idx = GAME_STATE.employees.findIndex(e => e.id === GAME_STATE.pendingFireId);
    if(idx === -1) return; const emp = GAME_STATE.employees[idx];
    GAME_STATE.money -= (emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3));
    if(emp.projectId) { const proj = GAME_STATE.projects.find(p => p.id === emp.projectId); if(proj) proj.team = proj.team.filter(id => id !== emp.id); }
    GAME_STATE.employees.splice(idx, 1); closeModal("fire-modal"); updateHeader(); refreshViews();
}

// ================= 项目引擎 (加入空状态UI) =================
function createProject(bizType, genre, targetMonths) {
    const proj = {
        id: GAME_STATE.projectIdCounter++, name: `${genre}项目 0${GAME_STATE.projectIdCounter}`,
        bizType: bizType, genre: genre, targetMonths: targetMonths, stage: 1, progress: 0, quality: 0, influence: 0, retention: 10, uaDiscount: 0, cost: 0, revenue: 0, uaCost: 0,
        historyData: { labels: [], costs: [], profits: [], revs: [] }, chartInstance: null
    };
    GAME_STATE.projects.push(proj); closeModal('new-project-modal'); renderProjects();
}

function processProjectLogic(proj) {
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    let art=0, prog=0, des=0, qa=0, ops=0, mkt=0;
    team.forEach(emp => {
        let mod = emp.status <= 30 ? 0.3 : (emp.status >= 85 ? 1.5 : 1.2);
        if(emp.role==='美术') art+=mod; if(emp.role==='程序') prog+=mod; if(emp.role==='策划') des+=mod; 
        if(emp.role==='QA') qa+=mod; if(emp.role==='运营') ops+=mod; if(emp.role==='市场') mkt+=mod;
    });

    if (proj.stage === 1) {
        proj.progress = Math.min(100, proj.progress + (des*1.5 + prog*2.5 + 1) * (10 / proj.targetMonths));
        proj.quality = Math.min(100, proj.quality + (art*0.4 + prog*0.2 + des*0.1 + qa*0.3) * 6);
        proj.retention = Math.min(30, proj.retention + des*0.2); 
        if (proj.progress >= 100) proj.stage = 2; 
    } else if (proj.stage >= 3) {
        if(proj.stage === 3) proj.stage = 4; 
        proj.retention = Math.max(1, proj.retention - 1.5 + ops*0.5); 
        proj.uaDiscount = Math.min(60, mkt * 5); 
        let actualUACost = proj.uaCost * (1 - proj.uaDiscount/100);
        GAME_STATE.lastFinance.ua += actualUACost;

        if (proj.retention > 15) proj.influence += 2; else if (proj.retention >= 5) proj.influence += 0.5; else if (proj.retention < 3) proj.influence -= 1;
        if (proj.quality >= 80) proj.influence += 2; else if (proj.quality >= 60) proj.influence += 0.5; else proj.influence -= 1;
        if (proj.uaCost > 0) proj.influence += (proj.uaCost / 50000); 
        proj.influence = Math.max(0, proj.influence); 
        
        let baseRev = proj.bizType === '买断制' ? 200000 : 50000;
        if (proj.bizType === '买断制') baseRev = (baseRev * (proj.quality/50)) * (1 / (GAME_STATE.month - 1)); 
        else baseRev = (baseRev * (proj.retention/10)) + (actualUACost * 1.8); 
        
        let netRev = baseRev * 0.7; 
        proj.revenue += netRev; GAME_STATE.money += netRev; GAME_STATE.lastFinance.revenue += netRev; 
        
        proj.historyData.labels.push(`M${GAME_STATE.month}`); proj.historyData.costs.push(actualUACost); proj.historyData.revs.push(netRev); proj.historyData.profits.push(netRev - actualUACost);
    }
}

function renderProjects() {
    const list = document.getElementById("project-list"); list.innerHTML = "";
    if (GAME_STATE.projects.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💿</div><h3>暂无在研项目</h3><p>点击右上角 [立项新游戏] 开启你的征途！</p></div>`;
        return;
    }
    GAME_STATE.projects.forEach(proj => {
        const teamCount = GAME_STATE.employees.filter(e => e.projectId === proj.id).length;
        const stageText = ["", "研发中", "等待发布", "刚首发", "长线运营"][proj.stage];
        const card = document.createElement("div"); card.className = "game-card";
        if(proj.stage === 2) card.style.borderColor = "var(--primary)";
        
        card.innerHTML = `
            <div class="emp-top" style="margin-bottom:5px;">
                <h3 class="proj-title">${proj.name}</h3>
                <span class="badge ${proj.stage === 2 ? 'bounce-anim':''}">${stageText}</span>
            </div>
            <p class="proj-info">类型: [${proj.bizType}] ${proj.genre}</p>
            <div class="health-bar-bg" style="height:15px;"><div class="health-bar-fill" style="width: ${Math.floor(proj.progress)}%; background:var(--primary);"></div></div>
            <div class="proj-stats">
                <span>👨‍💻 ${teamCount}人</span>
                <span style="color:var(--warning)">🌟 ${Math.floor(proj.influence)}</span>
            </div>
            <button class="btn action-btn" style="width:100%;" onclick="openProjectDashboard(${proj.id})">进入工作室</button>
        `;
        list.appendChild(card);
    });
}

// ================= 控制台与发布 =================
function openProjectDashboard(id) {
    const proj = GAME_STATE.projects.find(p => p.id === id); if (!proj) return;
    GAME_STATE.currentViewingProjectId = id;
    
    document.getElementById("dash-title").innerText = proj.name;
    document.getElementById("dash-type-badge").innerText = proj.bizType;
    document.getElementById("dash-stage").innerText = ["", "研发中", "等待玩家发布", "首发当月", "长线运营"][proj.stage];
    document.getElementById("dash-progress").innerText = Math.floor(proj.progress) + "%";
    document.getElementById("dash-quality").innerText = Math.floor(proj.quality);
    document.getElementById("dash-influence").innerText = Math.floor(proj.influence);
    document.getElementById("dash-retention").innerText = proj.retention.toFixed(1) + "%";
    document.getElementById("dash-uadiscount").innerText = "-" + Math.floor(proj.uaDiscount) + "%";
    
    if (proj.stage >= 3) { document.getElementById("dash-ua-control").classList.remove("hidden"); document.getElementById("ua-select").value = proj.uaCost; } else { document.getElementById("dash-ua-control").classList.add("hidden"); }
    if (proj.stage === 2) document.getElementById("dash-publish-btn").classList.remove("hidden"); else document.getElementById("dash-publish-btn").classList.add("hidden");

    const teamList = document.getElementById("dash-team-list"); teamList.innerHTML = "";
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    if (team.length === 0) teamList.innerHTML = "<p class='desc-text'>暂无人员，进度停滞！</p>";
    else team.forEach(emp => teamList.appendChild(createEmployeeCardHTML(emp, true)));

    renderDashboardChart(proj); openModal("project-dashboard-modal");
}

function closeProjectDashboard() { GAME_STATE.currentViewingProjectId = null; closeModal("project-dashboard-modal"); }
function changeProjectUA(val) { if (GAME_STATE.currentViewingProjectId) { const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId); if (proj) proj.uaCost = parseInt(val); } }

function openPublishModal() { document.getElementById("project-dashboard-modal").classList.add("hidden"); openModal('publish-modal'); }
function cancelPublish() { closeModal('publish-modal'); document.getElementById("project-dashboard-modal").classList.remove("hidden"); }

function confirmPublish() {
    const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId);
    if (!proj) return;

    let isPC = document.getElementById("plat-pc").checked; let isPS = document.getElementById("plat-ps").checked;
    let isIOS = document.getElementById("plat-ios").checked; let isAndroid = document.getElementById("plat-android").checked;
    if (!isPC && !isPS && !isIOS && !isAndroid) { alert("至少选择一个平台！"); return; }

    let publishCost = 0, influenceMod = 0;
    if (isPS) { publishCost += 50000; influenceMod += (proj.bizType === '买断制' ? 20 : -30); }
    if (isIOS) { publishCost += 10000; influenceMod += (proj.bizType === '内购制' ? 15 : 0); }
    if (isAndroid) { influenceMod += (proj.bizType === '内购制' ? 10 : 0); }
    if (isPC) { influenceMod += (proj.bizType === '买断制' ? 15 : 5); }

    if (GAME_STATE.money < publishCost) { alert("资金不足以支付平台资质费！"); return; }
    
    GAME_STATE.money -= publishCost; proj.influence = Math.max(0, proj.influence + influenceMod); proj.stage = 3; 
    
    let msg = `发行成功！扣除发行费 ￥${publishCost}。`;
    if (influenceMod < 0) msg += `\n⚠️ 玩家抗议：主机首发手游导致口碑暴降！`; else if (influenceMod > 10) msg += `\n🔥 平台受众完美匹配，额外获得影响力！`;
    alert(msg);

    closeModal('publish-modal'); GAME_STATE.currentViewingProjectId = null; updateHeader(); renderProjects();
}

function confirmDeleteProject() {
    if(confirm("⚠️ 确定要解散该项目吗？所有投入将沉没！")) {
        const projId = GAME_STATE.currentViewingProjectId;
        GAME_STATE.employees.forEach(emp => { if(emp.projectId === projId) emp.projectId = null; });
        GAME_STATE.projects = GAME_STATE.projects.filter(p => p.id !== projId);
        closeProjectDashboard(); updateHeader(); refreshViews();
    }
}

function openFinanceModal() {
    document.getElementById("fin-revenue").innerText = Math.floor(GAME_STATE.lastFinance.revenue).toLocaleString();
    document.getElementById("fin-salary").innerText = Math.floor(GAME_STATE.lastFinance.salary).toLocaleString();
    document.getElementById("fin-rent").innerText = Math.floor(GAME_STATE.lastFinance.rent).toLocaleString();
    document.getElementById("fin-server").innerText = Math.floor(GAME_STATE.lastFinance.server).toLocaleString();
    document.getElementById("fin-ua").innerText = Math.floor(GAME_STATE.lastFinance.ua).toLocaleString();
    const profitEl = document.getElementById("fin-profit");
    profitEl.innerText = Math.floor(GAME_STATE.lastFinance.profit).toLocaleString();
    profitEl.style.color = GAME_STATE.lastFinance.profit >= 0 ? "var(--success)" : "var(--danger)";
    openModal("finance-modal");
}

// ================= 事件与工具 =================
function triggerRandomEvent(proj) {
    const events = [
        { title: "🚨 主美跑路", desc: `主美带着半个美术组集体离职！`, ops: [{ txt: "大厂挖人 (-15w, 品质+25)", action: () => { GAME_STATE.money-=150000; proj.quality+=25; } }, { txt: "内部提拔 (品质-20)", action: () => { proj.quality=Math.max(0, proj.quality-20); } }, { txt: "AI绘图 (赌命)", action: () => { if(Math.random()>0.5){proj.quality+=30;}else{proj.influence=Math.max(0, proj.influence-20);} } }] },
        { title: "💩 代码屎山", desc: `底层代码一团糟，加新道具就崩溃。`, ops: [{ txt: "彻底重构 (-20%进度)", action: () => { proj.progress=Math.max(0, proj.progress-20); } }, { txt: "继续雕花 (品质-15)", action: () => { proj.quality=Math.max(0, proj.quality-15); } }, { txt: "包装成Meta游戏 (高影响低留存)", action: () => { proj.influence+=40; proj.retention-=10; } }] },
        { title: "💸 资金告急", desc: `没钱了！`, ops: [{ txt: "借高利贷 (+30w资金)", action: () => { GAME_STATE.money+=300000; } }, { txt: "挥刀自宫 (马上发售，口碑清零)", action: () => { proj.progress=100; proj.quality=5; proj.influence=0; } }, { txt: "女装众筹 (赌命)", action: () => { if(Math.random()>0.5){GAME_STATE.money+=100000;}else{proj.influence=Math.max(0, proj.influence-15);} } }] }
    ];
    let ev = events[Math.floor(Math.random() * (GAME_STATE.money < 150000 ? 3 : 2))]; 
    document.getElementById("event-title").innerText = ev.title; document.getElementById("event-desc").innerText = ev.desc;
    let opsHtml = "";
    ev.ops.forEach((op, index) => {
        window[`execEventOp_${index}`] = function() { op.action(); closeModal('event-modal'); updateHeader(); refreshViews(); };
        opsHtml += `<button class="btn warning-btn" style="text-align:left;" onclick="execEventOp_${index}()">👉 ${op.txt}</button>`;
    });
    document.getElementById("event-options").innerHTML = opsHtml; openModal("event-modal");
}

function triggerInvestmentEvent() {
    document.getElementById("event-title").innerText = "🎉 企鹅大厂投资";
    document.getElementById("event-desc").innerText = "总影响力突破100！大厂看中你们提出投资入股！";
    document.getElementById("event-options").innerHTML = `<button class="btn warning-btn" onclick="GAME_STATE.money+=5000000; closeModal('event-modal'); updateHeader();">接受投资 (+500万)</button><button class="btn cancel-btn" onclick="closeModal('event-modal')">婉拒</button>`;
    openModal("event-modal");
}

// 终极结算逻辑 (支持强制结算和中途放弃)
function endGameAndSettle(isBankrupt) {
    let safeMoney = Math.max(0, GAME_STATE.money); 
    let valuation = safeMoney + (safeMoney * (GAME_STATE.totalInfluence / 100));
    
    // 如果破产，估值强制为 0
    if (isBankrupt) valuation = 0;

    document.getElementById("settle-money").innerText = GAME_STATE.money.toLocaleString();
    document.getElementById("settle-influence").innerText = Math.floor(GAME_STATE.totalInfluence);
    document.getElementById("settle-valuation").innerText = Math.floor(valuation).toLocaleString();
    
    // 写入本地存储排行榜
    let historyRecords = JSON.parse(localStorage.getItem("GameCreatorRecords") || "[]");
    historyRecords.push({ date: new Date().toLocaleDateString(), valuation: Math.floor(valuation), monthsSurvived: GAME_STATE.month });
    localStorage.setItem("GameCreatorRecords", JSON.stringify(historyRecords));
    
    // 清除当前存档，防止利用读档刷分
    localStorage.removeItem('GameCreatorSave');
    
    openModal("settlement-modal");
}

function openAssignModal() { const idleList = document.getElementById("idle-employee-list"); idleList.innerHTML = ""; const idleEmps = GAME_STATE.employees.filter(e => e.projectId === null); if (idleEmps.length === 0) { idleList.innerHTML = "<p class='desc-text'>无空闲人员。</p>"; } else { idleEmps.forEach(emp => { idleList.innerHTML += `<div style="display:flex; justify-content:space-between; background:#00000030; padding:10px; border-radius:8px; margin-bottom:8px;"><span>[${emp.role}] ${emp.name} (￥${emp.salary})</span><button class="btn primary-btn text-small" onclick="assignToProject(${emp.id})">入组</button></div>`; }); } openModal("assign-modal"); }
function assignToProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = GAME_STATE.currentViewingProjectId; openAssignModal(); refreshViews(); } }
function removeFromProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = null; refreshViews(); } }

function renderDashboardChart(proj) {
    const canvas = document.getElementById('dash-chart'); if (!canvas) return;
    if (globalChartInstance) globalChartInstance.destroy(); const ctx = canvas.getContext('2d');
    if (proj.stage < 3 || proj.historyData.labels.length === 0) { ctx.clearRect(0,0, canvas.width, canvas.height); return; }
    Chart.defaults.color = '#adb5bd'; Chart.defaults.font.family = 'Nunito';
    globalChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: proj.historyData.labels, datasets: [ { label: '买量支出', data: proj.historyData.costs, borderColor: '#ef476f', backgroundColor: '#ef476f20', fill: true, tension: 0.3 }, { label: '净流水', data: proj.historyData.revs, borderColor: '#4cc9f0', tension: 0.3 } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
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
    hasTriggeredInvestment: false,
    eventTargetProjId: null, // 随机事件命中的项目ID
    
    // 上月财务记录，用于展示
    lastFinance: { revenue: 0, salary: 0, rent: 0, server: 0, ua: 0, profit: 0 }
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
    GAME_STATE.totalInfluence = GAME_STATE.projects.reduce((sum, p) => sum + p.influence, 0);
    document.getElementById("total-influence-display").innerText = Math.floor(GAME_STATE.totalInfluence);
}

// --- 核心循环：推进岁月 ---
function nextMonth() {
    // 拦截：是否有项目待发布？
    if (GAME_STATE.projects.some(p => p.stage === 2)) {
        alert("⚠️ 警告：有项目已经研发100%并处于【提审阶段】，请前往项目控制台手动【发布上线】，否则无法推进下个月！");
        return;
    }

    // 重置财务报表
    GAME_STATE.lastFinance = { revenue: 0, salary: 0, rent: 0, server: 0, ua: 0, profit: 0 };
    
    // 基础开销计算
    GAME_STATE.lastFinance.rent = 10000 + (Math.floor(GAME_STATE.employees.length / 5) * 5000); // 阶梯房租水电
    GAME_STATE.lastFinance.server = GAME_STATE.projects.filter(p => p.stage >= 3).length * 8000; // 在线游戏服务器费
    
    let totalSalary = 0;
    GAME_STATE.employees.forEach(emp => {
        totalSalary += emp.salary;
        if(emp.projectId) emp.status = Math.min(100, emp.status + Math.floor(Math.random() * 8) + 4);
        else emp.status = Math.max(0, emp.status - 5); 
    });
    GAME_STATE.lastFinance.salary = totalSalary;

    let totalExpense = totalSalary + GAME_STATE.lastFinance.rent + GAME_STATE.lastFinance.server;
    GAME_STATE.money -= totalExpense;

    // 推进项目
    GAME_STATE.projects.forEach(proj => { processProjectLogic(proj); });

    // 计算总利润
    GAME_STATE.lastFinance.profit = GAME_STATE.lastFinance.revenue - (totalExpense + GAME_STATE.lastFinance.ua);

    // 触发大商单投资
    if (GAME_STATE.totalInfluence > 100 && !GAME_STATE.hasTriggeredInvestment) {
        GAME_STATE.hasTriggeredInvestment = true;
        triggerInvestmentEvent();
    }

    // 触发每月随机地狱笑话事件 (15% 概率，且必须有正在研发的项目)
    let devProjects = GAME_STATE.projects.filter(p => p.stage === 1);
    if (Math.random() < 0.15 && devProjects.length > 0) {
        let targetProj = devProjects[Math.floor(Math.random() * devProjects.length)];
        triggerRandomEvent(targetProj);
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
    
    if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId);
}

// ================= 模块 1: 人事与招募 =================
function hireEmployee(role) {
    const names = ["张三", "李四", "王五", "赵六", "大佬", "萌新"];
    const baseSalaries = { "程序": 15000, "美术": 12000, "策划": 10000, "QA": 8000, "运营": 9000, "市场": 11000 };
    const emp = { id: GAME_STATE.employeeIdCounter++, name: `${role}_${names[Math.floor(Math.random()*names.length)]}`, role: role, salary: baseSalaries[role] + Math.floor(Math.random() * 4000 - 2000), status: 40, projectId: null };
    GAME_STATE.employees.push(emp); closeModal('hire-modal'); renderEmployees();
}

function renderEmployees() {
    const list = document.getElementById("employee-list"); list.innerHTML = "";
    GAME_STATE.employees.forEach(emp => list.appendChild(createEmployeeCardHTML(emp, false)));
}

function createEmployeeCardHTML(emp, isInsideProject) {
    const card = document.createElement("div"); card.className = "employee-card";
    let sColor = "var(--active)", sText = "状态良好";
    if (emp.status <= 30) { sColor = "var(--lazy)"; sText = "消极怠工"; } else if (emp.status >= 85) { sColor = "var(--overwork)"; sText = "濒临猝死"; }
    card.style.borderLeft = `4px solid ${sColor}`;
    let projectLabel = emp.projectId ? `<div class="project-badge">正在开发: ${GAME_STATE.projects.find(p=>p.id===emp.projectId)?.name}</div>` : `<div class="project-badge" style="background:rgba(255,255,255,0.1); color:#aaa">💤 闲置中</div>`;
    let actionBtn = isInsideProject ? `<button class="btn danger-btn text-small" onclick="removeFromProject(${emp.id})">踢出组</button>` : `<button class="btn danger-btn text-small" onclick="requestFire(${emp.id})">解雇</button>`;

    card.innerHTML = `<div class="emp-header"><div><span class="emp-role">${emp.role}</span> <strong>${emp.name}</strong></div><span class="emp-status-badge" style="color:${sColor}">${sText}(${emp.status}%)</span></div><div class="status-bar-bg"><div class="status-bar-fill" style="width: ${emp.status}%; background: ${sColor}; box-shadow: 0 0 8px ${sColor}"></div></div>${!isInsideProject ? projectLabel : ''}<div class="emp-controls"><span>薪资: <input type="number" value="${emp.salary}" onchange="updateSalary(${emp.id}, this.value)"></span><button class="btn action-btn text-small" onclick="giveVacation(${emp.id})">批年假</button>${actionBtn}</div>`;
    return card;
}

// 【修复】随机动态调整薪资与状态算法
function updateSalary(id, newSalary) {
    const emp = GAME_STATE.employees.find(e => e.id === id);
    if(!emp) return;
    let oldSalary = emp.salary;
    emp.salary = parseInt(newSalary);
    
    // 计算薪水涨跌百分比
    let diffPercent = (emp.salary - oldSalary) / oldSalary;
    if (diffPercent < -0.1) emp.status -= (20 + Math.random()*20); // 大幅降薪，状态暴跌，可能直接摆烂
    else if (diffPercent < 0) emp.status -= (5 + Math.random()*10); // 微调降薪
    else if (diffPercent > 0.1) emp.status += (15 + Math.random()*15); // 加薪恢复积极性
    
    emp.status = Math.max(0, Math.min(100, Math.floor(emp.status)));
    refreshViews();
}

// 【修复】休年假增加开支，且随机降低压力
function giveVacation(id) { 
    const emp = GAME_STATE.employees.find(e => e.id === id); 
    if(!emp) return;
    if (emp.status < 40) { alert("他都在摸鱼了，休什么年假！"); return; }
    // 强制带薪休假需要花费半个月工资补偿
    GAME_STATE.money -= Math.floor(emp.salary * 0.5); 
    emp.status = Math.max(0, emp.status - Math.floor(25 + Math.random()*25)); // 随机降压 25~50点
    refreshViews(); updateHeader();
}
function refreshViews() { renderEmployees(); if (GAME_STATE.currentViewingProjectId) openProjectDashboard(GAME_STATE.currentViewingProjectId); }

// 【修复】执行开除事件挂载
function requestFire(id) {
    const emp = GAME_STATE.employees.find(e => e.id === id); GAME_STATE.pendingFireId = id;
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    document.getElementById("fire-desc").innerText = `解雇 [${emp.name}] 需要支付赔偿金: ￥${cost}`;
    openModal("fire-modal");
}
function executeFire() {
    const idx = GAME_STATE.employees.findIndex(e => e.id === GAME_STATE.pendingFireId);
    if(idx === -1) return;
    const emp = GAME_STATE.employees[idx];
    let cost = emp.status <= 30 ? emp.salary : (emp.status <= 85 ? emp.salary * 2 : emp.salary * 3);
    GAME_STATE.money -= cost;
    if(emp.projectId) { const proj = GAME_STATE.projects.find(p => p.id === emp.projectId); if(proj && proj.team) proj.team = proj.team.filter(id => id !== emp.id); }
    GAME_STATE.employees.splice(idx, 1); closeModal("fire-modal"); updateHeader(); refreshViews();
}

// ================= 模块 2: 项目与全自动结算 =================
function createProject(bizType, genre, targetMonths) {
    const proj = {
        id: GAME_STATE.projectIdCounter++,
        name: `${genre}项目 0${GAME_STATE.projectIdCounter}`,
        bizType: bizType, genre: genre, targetMonths: targetMonths,
        stage: 1, progress: 0, quality: 0, influence: 0, retention: 10, uaDiscount: 0, 
        cost: 0, revenue: 0, uaCost: 0,
        historyData: { labels: [], costs: [], profits: [], revs: [] }, chartInstance: null
    };
    GAME_STATE.projects.push(proj); closeModal('new-project-modal'); renderProjects();
}

function processProjectLogic(proj) {
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    let artMod=0, progMod=0, desMod=0, qaMod=0, opsMod=0, mktMod=0;
    team.forEach(emp => {
        let mod = emp.status <= 30 ? 0.3 : (emp.status >= 85 ? 1.5 : 1.2);
        if(emp.role==='美术') artMod += mod; if(emp.role==='程序') progMod += mod;
        if(emp.role==='策划') desMod += mod; if(emp.role==='QA') qaMod += mod;
        if(emp.role==='运营') opsMod += mod; if(emp.role==='市场') mktMod += mod;
    });

    if (proj.stage === 1) {
        let progressSpeed = (desMod*1.5 + progMod*2.5 + 1) * (10 / proj.targetMonths);
        proj.progress = Math.min(100, proj.progress + progressSpeed);
        let monthlyQuality = (artMod*0.4 + progMod*0.2 + desMod*0.1 + qaMod*0.3) * 6; 
        proj.quality = Math.min(100, proj.quality + monthlyQuality);
        proj.retention = Math.min(30, proj.retention + desMod*0.2); 
        
        // 进度满100% 进入提审，等待手动发布
        if (proj.progress >= 100) proj.stage = 2; 
    } 
    // 上线后逻辑
    else if (proj.stage >= 3) {
        if(proj.stage === 3) proj.stage = 4; 
        proj.retention = Math.max(1, proj.retention - 1.5 + opsMod*0.5); 
        proj.uaDiscount = Math.min(60, mktMod * 5); 
        let actualUACost = proj.uaCost * (1 - proj.uaDiscount/100);

        // 记入财务账单
        GAME_STATE.lastFinance.ua += actualUACost;

        // 影响力计算
        if (proj.retention > 15) proj.influence += 2; else if (proj.retention >= 5) proj.influence += 0.5; else if (proj.retention < 3) proj.influence -= 1;
        if (proj.quality >= 80) proj.influence += 2; else if (proj.quality >= 60) proj.influence += 0.5; else proj.influence -= 1;
        if (proj.uaCost > 0) proj.influence += (proj.uaCost / 50000); 
        proj.influence = Math.max(0, proj.influence); 
        
        // 流水计算 (扣除平台平均抽成30%)
        let baseRev = proj.bizType === '买断制' ? 200000 : 50000;
        if (proj.bizType === '买断制') { baseRev = (baseRev * (proj.quality/50)) * (1 / (GAME_STATE.month - 1)); } 
        else { baseRev = (baseRev * (proj.retention/10)) + (actualUACost * 1.8); }
        
        let netRev = baseRev * 0.7; // 平台扣除30%
        
        proj.revenue += netRev;
        GAME_STATE.money += netRev;
        GAME_STATE.lastFinance.revenue += netRev; // 记入总账
        
        proj.historyData.labels.push(`M${GAME_STATE.month}`);
        proj.historyData.costs.push(actualUACost); // 这里仅显示买量作为可变成本
        proj.historyData.revs.push(netRev);
        proj.historyData.profits.push(netRev - actualUACost);
    }
}

function renderProjects() {
    const list = document.getElementById("project-list"); list.innerHTML = "";
    GAME_STATE.projects.forEach(proj => {
        const teamCount = GAME_STATE.employees.filter(e => e.projectId === proj.id).length;
        const stageText = ["", "1.研发阶段", "2.等待发布 (100%)", "3.正式上线", "4.长线运营"][proj.stage];
        const card = document.createElement("div"); card.className = "project-card";
        // 提审状态高亮提示
        let borderStyle = proj.stage === 2 ? 'border: 2px solid var(--primary); box-shadow: 0 0 10px var(--primary);' : '';
        card.style = borderStyle;
        card.innerHTML = `<div class="emp-header"><h3 style="margin:0; color:var(--primary)">${proj.name}</h3><span class="project-badge">${stageText}</span></div><p style="font-size:0.85rem; color:var(--text-muted)">【${proj.bizType}】团队: ${teamCount} 人 | 进度: ${Math.floor(proj.progress)}%</p><p style="font-size:0.85rem; color:var(--warning)">当前影响力: ${Math.floor(proj.influence)}</p><button class="btn action-btn" style="width:100%; margin-top:10px" onclick="openProjectDashboard(${proj.id})">进入控制台 ➔</button>`;
        list.appendChild(card);
    });
}

// ================= 模块 3: 控制台与手动发布系统 =================
function openProjectDashboard(id) {
    const proj = GAME_STATE.projects.find(p => p.id === id); if (!proj) return;
    GAME_STATE.currentViewingProjectId = id;
    
    document.getElementById("dash-title").innerText = proj.name;
    document.getElementById("dash-type-badge").innerText = `[${proj.bizType}] ${proj.genre}`;
    document.getElementById("dash-stage").innerText = ["", "研发中", "等待玩家发布", "首发当月", "长线运营"][proj.stage];
    document.getElementById("dash-progress").innerText = Math.floor(proj.progress) + "%";
    document.getElementById("dash-quality").innerText = Math.floor(proj.quality);
    document.getElementById("dash-influence").innerText = Math.floor(proj.influence);
    document.getElementById("dash-retention").innerText = proj.retention.toFixed(1) + "%";
    document.getElementById("dash-uadiscount").innerText = "-" + Math.floor(proj.uaDiscount) + "%";
    
    const uaControl = document.getElementById("dash-ua-control");
    if (proj.stage >= 3) { uaControl.classList.remove("hidden"); document.getElementById("ua-select").value = proj.uaCost; } else { uaControl.classList.add("hidden"); }
    
    // 手动发布按钮显示逻辑
    const publishBtn = document.getElementById("dash-publish-btn");
    if (proj.stage === 2) publishBtn.classList.remove("hidden");
    else publishBtn.classList.add("hidden");

    const teamList = document.getElementById("dash-team-list"); teamList.innerHTML = "";
    const team = GAME_STATE.employees.filter(e => e.projectId === proj.id);
    if (team.length === 0) teamList.innerHTML = "<p style='color:var(--lazy)'>当前项目无人员推进，进度停滞！</p>";
    else team.forEach(emp => teamList.appendChild(createEmployeeCardHTML(emp, true)));

    renderDashboardChart(proj); openModal("project-dashboard-modal");
}
function closeProjectDashboard() { GAME_STATE.currentViewingProjectId = null; closeModal("project-dashboard-modal"); }
function changeProjectUA(val) { if (GAME_STATE.currentViewingProjectId) { const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId); if (proj) proj.uaCost = parseInt(val); } }

// 【新功能】发布与平台选择逻辑
function openPublishModal() {
    closeProjectDashboard();
    openModal('publish-modal');
}
function confirmPublish() {
    const proj = GAME_STATE.projects.find(p => p.id === GAME_STATE.currentViewingProjectId);
    if (!proj) return;

    let isPC = document.getElementById("plat-pc").checked;
    let isPS = document.getElementById("plat-ps").checked;
    let isIOS = document.getElementById("plat-ios").checked;
    let isAndroid = document.getElementById("plat-android").checked;

    if (!isPC && !isPS && !isIOS && !isAndroid) {
        alert("请至少选择一个发行平台！"); return;
    }

    let publishCost = 0;
    let influenceMod = 0;

    if (isPS) { publishCost += 50000; influenceMod += (proj.bizType === '买断制' ? 20 : -30); }
    if (isIOS) { publishCost += 10000; influenceMod += (proj.bizType === '内购制' ? 15 : 0); }
    if (isAndroid) { influenceMod += (proj.bizType === '内购制' ? 10 : 0); }
    if (isPC) { influenceMod += (proj.bizType === '买断制' ? 15 : 5); }

    if (GAME_STATE.money < publishCost) {
        alert("资金不足以支付所选平台的资质/审核费用！"); return;
    }

    GAME_STATE.money -= publishCost;
    proj.influence = Math.max(0, proj.influence + influenceMod);
    proj.stage = 3; // 正式进入发售期
    
    let msg = `发行成功！共扣除发行费 ￥${publishCost}。`;
    if (influenceMod < 0) msg += `\n⚠️ 玩家抗议：在主机平台首发氪金手游导致口碑暴降，影响力 ${influenceMod}！`;
    else if (influenceMod > 10) msg += `\n🔥 平台受众匹配完美！游戏引发关注，额外获得影响力 +${influenceMod}！`;
    alert(msg);

    closeModal('publish-modal');
    updateHeader(); renderProjects();
}

function confirmDeleteProject() {
    if(confirm("⚠️ 确定要解散该项目吗？所有投入将沉没！")) {
        const projId = GAME_STATE.currentViewingProjectId;
        GAME_STATE.employees.forEach(emp => { if(emp.projectId === projId) emp.projectId = null; });
        GAME_STATE.projects = GAME_STATE.projects.filter(p => p.id !== projId);
        closeProjectDashboard(); updateHeader(); refreshViews();
    }
}

// 【新功能】财务明细弹窗
function openFinanceModal() {
    document.getElementById("fin-revenue").innerText = Math.floor(GAME_STATE.lastFinance.revenue).toLocaleString();
    document.getElementById("fin-salary").innerText = Math.floor(GAME_STATE.lastFinance.salary).toLocaleString();
    document.getElementById("fin-rent").innerText = Math.floor(GAME_STATE.lastFinance.rent).toLocaleString();
    document.getElementById("fin-server").innerText = Math.floor(GAME_STATE.lastFinance.server).toLocaleString();
    document.getElementById("fin-ua").innerText = Math.floor(GAME_STATE.lastFinance.ua).toLocaleString();
    
    const profitEl = document.getElementById("fin-profit");
    profitEl.innerText = Math.floor(GAME_STATE.lastFinance.profit).toLocaleString() + " CNY";
    profitEl.style.color = GAME_STATE.lastFinance.profit >= 0 ? "var(--success)" : "var(--danger)";
    
    openModal("finance-modal");
}


// ================= 模块 4: 地狱笑话随机事件库 =================
function triggerRandomEvent(proj) {
    GAME_STATE.eventTargetProjId = proj.id;
    const events = [
        {
            title: "🚨 主美带队跑路", desc: `[${proj.name}] 的薪资谈判破裂，主美带着半个美术组集体离职！`,
            ops: [
                { txt: "砸重金从大厂挖牛人 (-￥15w, 品质+25)", action: () => { GAME_STATE.money-=150000; proj.quality+=25; } },
                { txt: "内部提拔新人 (免费, 画面降级 品质-20)", action: () => { proj.quality=Math.max(0, proj.quality-20); } },
                { txt: "转向AI绘图 (50%大成增品质, 50%暴雷扣口碑)", action: () => { if(Math.random()>0.5){proj.quality+=30;}else{proj.influence=Math.max(0, proj.influence-20);} } }
            ]
        },
        {
            title: "💩 代码变成“屎山”", desc: `[${proj.name}] 的底层代码一团糟，加新道具可能清空全服背包。`,
            ops: [
                { txt: "彻底重构底层 (-20%进度, 彻底解决隐患)", action: () => { proj.progress=Math.max(0, proj.progress-20); } },
                { txt: "硬着头皮继续雕花 (进度不变, 上线后品质-15)", action: () => { proj.quality=Math.max(0, proj.quality-15); } },
                { txt: "包装成Meta元宇宙 Bug (极高影响力, 极低留存)", action: () => { proj.influence+=40; proj.retention-=10; } }
            ]
        },
        {
            title: "🛸 祖传物理Bug变异", desc: `[${proj.name}] 测试发现墙角疯狂跳跃可穿模飞天。`,
            ops: [
                { txt: "重写碰撞系统 (-15%进度, 品质+10)", action: () => { proj.progress=Math.max(0, proj.progress-15); proj.quality+=10; } },
                { txt: "隐形空气墙封死 (免费, 体验生硬 品质-5)", action: () => { proj.quality=Math.max(0, proj.quality-5); } },
                { txt: "做成邪道速通特性 (50%变神作, 50%被全网群嘲)", action: () => { if(Math.random()>0.5){proj.influence+=30;}else{proj.influence=Math.max(0, proj.influence-20);} } }
            ]
        },
        {
            title: "⚡ 办公室遭灾", desc: "突发暴雨停电，服务器短路，最近一周代码没传云端全没了！",
            ops: [
                { txt: "全员封闭爆肝纯靠记忆重写 (全员降状态, 恢复进度)", action: () => { GAME_STATE.employees.forEach(e => {if(e.projectId===proj.id) e.status+=30;}); } },
                { txt: "向发行商申请延期 (-￥5w 违约金, 员工健康)", action: () => { GAME_STATE.money-=50000; } },
                { txt: "把经历做成彩蛋卖惨 (有概率化解并获得影响力)", action: () => { if(Math.random()>0.4){proj.influence+=15;}else{proj.influence-=5;} } }
            ]
        },
        {
            title: "⚔️ 竞品撞车大危机", desc: `某超级大厂公布了和 [${proj.name}] 玩法完全一致的新作，且早一个月发售。`,
            ops: [
                { txt: "加班抢跑发售 (+20%进度, 但Bug漫天 品质-20)", action: () => { proj.progress+=20; proj.quality=Math.max(0, proj.quality-20); } },
                { txt: "避其锋芒延期打磨 (-20%进度, 追加打磨 品质+15)", action: () => { proj.progress=Math.max(0, proj.progress-20); proj.quality+=15; } },
                { txt: "宣发碰瓷大厂黑红营销 (赌极高流量或律师函破产)", action: () => { if(Math.random()>0.7){proj.influence+=80;}else{GAME_STATE.money-=200000; alert("收到律师函罚款20万！");} } }
            ]
        },
        {
            title: "💸 资金链告急", desc: `你的公司目前账上资金吃紧，连下个月工资都悬了！`, // 这个只有在钱少时出现
            ops: [
                { txt: "制作人抵押房产借高利贷 (+￥30w资金)", action: () => { GAME_STATE.money+=300000; } },
                { txt: "挥刀自宫砍剧情草草发售 (进度直接变100%，口碑清零)", action: () => { proj.progress=100; proj.quality=5; proj.influence=0; } },
                { txt: "开启女装跳舞众筹 (50%获得10万, 50%变行业小丑)", action: () => { if(Math.random()>0.5){GAME_STATE.money+=100000;}else{proj.influence=Math.max(0, proj.influence-15);} } }
            ]
        }
    ];

    let ev = events[Math.floor(Math.random() * (GAME_STATE.money < 150000 ? 6 : 5))]; // 没钱时才可能触发第6个
    document.getElementById("event-title").innerText = ev.title;
    document.getElementById("event-desc").innerText = ev.desc;
    
    let opsHtml = "";
    ev.ops.forEach((op, index) => {
        // 使用一个全局挂载的方式来执行动态事件
        window[`execEventOp_${index}`] = function() {
            op.action();
            closeModal('event-modal');
            updateHeader(); refreshViews();
        };
        opsHtml += `<button class="btn warning-btn" style="text-align:left;" onclick="execEventOp_${index}()">👉 ${op.txt}</button>`;
    });
    
    document.getElementById("event-options").innerHTML = opsHtml;
    openModal("event-modal");
}

function triggerInvestmentEvent() {
    document.getElementById("event-title").innerText = "🎉 震惊业界！天价估值商单";
    document.getElementById("event-desc").innerText = "你的公司在业内的总影响力突破了 100 点！企鹅大厂看中了你们的潜力，提出了一笔巨额的投资入股或IP联动协议！";
    document.getElementById("event-options").innerHTML = `<button class="btn warning-btn" onclick="acceptInvestment()">接受投资 (获得500万资金)</button><button class="btn primary-btn" onclick="closeModal('event-modal')">婉言拒绝</button>`;
    openModal("event-modal");
}
function acceptInvestment() { GAME_STATE.money += 5000000; alert("获得了500万元融资！"); closeModal("event-modal"); updateHeader(); }

// 最终结算与存档
function endGameAndSettle() {
    let safeMoney = Math.max(0, GAME_STATE.money); 
    let valuation = safeMoney + (safeMoney * (GAME_STATE.totalInfluence / 100));
    document.getElementById("settle-money").innerText = GAME_STATE.money.toLocaleString();
    document.getElementById("settle-influence").innerText = Math.floor(GAME_STATE.totalInfluence);
    document.getElementById("settle-valuation").innerText = Math.floor(valuation).toLocaleString();
    let historyRecords = JSON.parse(localStorage.getItem("GameCreatorRecords") || "[]");
    historyRecords.push({ date: new Date().toLocaleDateString(), valuation: Math.floor(valuation), monthsSurvived: GAME_STATE.month });
    localStorage.setItem("GameCreatorRecords", JSON.stringify(historyRecords));
    openModal("settlement-modal");
}

function openAssignModal() { const idleList = document.getElementById("idle-employee-list"); idleList.innerHTML = ""; const idleEmps = GAME_STATE.employees.filter(e => e.projectId === null); if (idleEmps.length === 0) { idleList.innerHTML = "<p>当前没有空闲的员工，去招募吧！</p>"; } else { idleEmps.forEach(emp => { idleList.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;"><span>[${emp.role}] ${emp.name} (薪资:${emp.salary})</span><button class="btn primary-btn text-small" onclick="assignToProject(${emp.id})">加入本项目</button></div>`; }); } openModal("assign-modal"); }
function assignToProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = GAME_STATE.currentViewingProjectId; openAssignModal(); refreshViews(); } }
function removeFromProject(empId) { const emp = GAME_STATE.employees.find(e => e.id === empId); if(emp) { emp.projectId = null; refreshViews(); } }

let globalChartInstance = null; 
function renderDashboardChart(proj) {
    const canvas = document.getElementById('dash-chart'); if (!canvas) return;
    if (globalChartInstance) globalChartInstance.destroy();
    const ctx = canvas.getContext('2d');
    if (proj.stage < 3 || proj.historyData.labels.length === 0) {
        ctx.clearRect(0,0, canvas.width, canvas.height); ctx.fillStyle = "#64748b"; ctx.font = "16px Arial"; ctx.textAlign = "center";
        ctx.fillText("游戏上线后生成实时运营报表", canvas.width/2, canvas.height/2); return;
    }
    Chart.defaults.color = '#94a3b8';
    globalChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: proj.historyData.labels, datasets: [ { label: '买量支出', data: proj.historyData.costs, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }, { label: '净流水', data: proj.historyData.revs, borderColor: '#00f2fe', tension: 0.3 } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
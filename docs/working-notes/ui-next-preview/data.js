// All records are deterministic, synthetic examples. No device or account APIs are used.
const ICONS = {
 home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 plugin:'<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z"/>',
 chart:'<path d="M4 3v17h17M7 14l4-5 4 3 6-8"/><path d="M17 4h4v4"/>',
 spark:'<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 access:'<circle cx="12" cy="4" r="2"/><path d="m4 8 8 2 8-2M12 10v5m0 0-4 6m4-6 4 6"/>',
 gear:'<path d="m10 3 4 0 1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3Z"/><circle cx="12" cy="12" r="3"/>',
 back:'<path d="m14 5-7 7 7 7M7 12h14"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m5 9 7 7 7-7"/>',
 up:'<path d="m5 15 7-7 7 7"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 circle:'<circle cx="12" cy="12" r="8"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 folder:'<path d="M3 6h7l2 3h9v11H3Z"/>',
 file:'<path d="M6 3h8l5 5v13H6Z"/><path d="M14 3v6h5M9 13h7m-7 4h7"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 tasks:'<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 4V2h7v2M8 9h8m-8 5h8m-8 4h5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 warning:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 minus:'<path d="M4 12h16"/>',
 star:'<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
 move:'<path d="M12 2v20M2 12h20M9 5l3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
 resize:'<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
 account:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
 key:'<circle cx="8" cy="9" r="5"/><path d="m12 13 9 8m-3-3 3-3m-6 0 3-3"/>',
 link:'<path d="m10 7 2-2a5 5 0 0 1 7 7l-3 3M14 17l-2 2a5 5 0 0 1-7-7l3-3m1 6 6-6"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 5-5 4 3 4-6 5 7"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 network:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".5"/>',
 cloud:'<path d="M7 18H6a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4.5 4.5 0 0 1 0 9h-1M12 11v10m-3-3 3 3 3-3"/>',
 external:'<path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6"/>',
 history:'<path d="M4 5v5h5M4 10a8 8 0 1 1 1 8M12 7v5l4 2"/>',
 logout:'<path d="M9 4H3v16h6m5-12 5 4-5 4m-7-4h12"/>',
 list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h1m-1 7h1m-1 7h1"/>',
 power:'<path d="M12 2v10M6 5a9 9 0 1 0 12 0"/>',
 book:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3Zm9 2v15"/>',
 filter:'<path d="M3 5h18l-7 8v7l-4-2v-5Z"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 heart:'<path d="M12 21 3.5 12.5a5.5 5.5 0 0 1 8.5-7 5.5 5.5 0 0 1 8.5 7Z"/>',
 spinner:'<path d="M21 12a9 9 0 1 1-9-9"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 terminal:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m6 8 4 4-4 4m7 0h4"/>'
};
const PLUGINS = {
 phi:{name:'Phigros Data Studio',short:'Phigros',icon:'chart',color:'',description:'成绩、RKS 与每一次进步',version:'3.0.0',next:'3.1.0',kind:'普通插件',size:'56 KiB',category:'游戏数据',permission:['联网同步','保存图片与文件','导入文件'],route:'phi/overview'},
 gacha:{name:'跃迁与祈愿分析',short:'抽卡记录',icon:'spark',color:'purple',description:'你的抽卡历史，长久保存在本机',version:'2.0.0',next:'2.0.1',kind:'普通插件',size:'58 KiB',category:'游戏数据',permission:['联网获取记录','导入与导出文件','读取剪贴板','查找设备日志'],route:'gacha/overview'},
 shizuku:{name:'Shizuku 授权',short:'Shizuku',icon:'shield',color:'blue',description:'为需要系统权限的操作建立连接',version:'1.0.0',next:null,kind:'完全信任插件',size:'20 KiB',category:'系统工具',permission:[],route:'shizuku'},
 access:{name:'无障碍授权',short:'无障碍服务',icon:'access',color:'gold',description:'管理服务启停与自动恢复规则',version:'2.0.0',next:null,kind:'普通插件',size:'12 KiB',category:'系统工具',permission:['管理无障碍服务','后台自动恢复'],route:'access/services'},
 battery:{name:'电池观察',short:'电池观察',icon:'power',color:'blue',description:'充电状态与设备电量摘要',version:'1.0.0',next:null,kind:'普通插件',size:'28 KiB',category:'系统工具',permission:['读取电池状态'],route:'battery'}
};
const SONG_NAMES=['Stasis','Distorted Fate','Rrhar’il','Chronostasis','Re: End of a Dream','祈 -我ら神祖と共に歩む者なり-','DESTRUCTION 3,2,1','Spasmodic','Igallta','もぺもぺ','SIGMA','Another Me','Luminescence','Lyrith -迷宮リリス-','INFiNiTE ENERZY -Overdoze-','狂喜蘭舞','Credits','望影の方舟Six','Retribution','Palescreen','BURN','GOODTEK','ENERGY SYNERGY MATRIX','WATER','Final Step','S.A.T.E.L.L.I.T.E.','Snow Desert','Dreamland','Leave All Behind','A Beautiful Day','RIPPER','White Snow','夜咄ディセイブ','月下缭乱','Crystal Heart','Journey to the Rain','A New Beginning','After Dawn','Beyond the Horizon','Clockwork','Cold Silence','Echoes'];
const SONGS=SONG_NAMES.map((name,i)=>({id:`demo-song-${i+1}`,name,composer:['示例作曲者 A','示例作曲者 B','Studio C','音楽制作チーム'][i%4],constant:Math.max(11,16.8-i*.11),level:i%4===0?'AT':i%5===0?'HD':'IN',acc:Math.max(93,100-i*.103),score:1000000-i*157,fc:i%4===0||i<3,rks:Math.max(11,16.8-i*.047)}));
// Synthetic lower-score examples make every rating and completion filter reviewable.
const FILTER_DEMO_SCORES=[950000,935000,910000,890000,850000,825000,760000,720000,690000,640000,1000000,978000];
SONGS.forEach((s,i)=>{s.constant=Math.round(s.constant*10)/10;if(i<3){s.acc=100;s.score=1000000;s.fc=true;}if(i>=30){s.score=FILTER_DEMO_SCORES[i-30];s.acc=s.score/10000;s.fc=i===31||i===35||i===40;s.level=['EZ','HD','IN','AT'][(i-30)%4];}});
const HISTORY=Array.from({length:19},(_,i)=>({id:`h${i}`,date:new Date(Date.UTC(2026,5,20+i*5)).toISOString().slice(0,10),rks:15.1396+i*.038+(i===12?-.09:0),delta:i===0?null:i===12?-.052:i===13?.128:.038,count:2+i%6}));
const CATALOG=SONGS.flatMap((s,i)=>['EZ','HD','IN','AT'].filter((l,j)=>j<3||i%3===0).map((level,j)=>({...s,level,constant:Math.max(1,Math.round((s.constant-(3-j)*2.8)*10)/10)}))).sort((a,b)=>b.constant-a.constant);
const POOLS=[{id:'character',label:'角色活动',total:438,five:7,up:5,loss:2,pity:48,limit:90,average:'62.6',upAvg:'87.6'},{id:'weapon',label:'武器 / 光锥',total:164,five:3,up:2,loss:1,pity:22,limit:80,average:'54.7',upAvg:'82.0'},{id:'standard',label:'常驻',total:206,five:3,up:0,loss:0,pity:36,limit:90,average:'68.7',upAvg:'—'},{id:'beginner',label:'新手',total:40,five:1,up:0,loss:0,pity:0,limit:50,average:'40.0',upAvg:'—'}];
const PULL_NAMES=['流萤','阮·梅','姬子','知更鸟','黄泉','布洛妮娅','镜流','丹恒·饮月'];
const RECORDS=Array.from({length:84},(_,i)=>({id:`202609${String(120000+i).padStart(6,'0')}`,name:i%9===0?PULL_NAMES[Math.floor(i/9)%8]:i%3===0?['停云','佩拉','轮契','舞！舞！舞！'][i%4]:['锋镝','开疆','天倾','物穰'][i%4],rarity:i%9===0?5:i%3===0?4:3,pool:POOLS[i%4].id,date:`2026-09-${String(18-Math.floor(i/7)).padStart(2,'0')} ${String(9+i%12).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`,pity:18+i%64}));
const DATA_ITEMS=[
 {id:'host-settings',owner:'host',title:'应用设置与首页布局',kind:'设置',size:'12 KiB',merge:true,keep:true,recovery:'手动设置与布局，建议保留'},
 {id:'packages',owner:'host',title:'已安装的 v3 插件包',kind:'安装包',size:'4 个 v3 包',merge:false,keep:true,recovery:'包含本地安装版本，建议随数据保留'},
 {id:'phi-profile',owner:'phi',title:'账号档案',kind:'设置',size:'4 KiB',merge:false,keep:true,recovery:'本地备注与档案设置，建议保留'},
 {id:'phi-history',owner:'phi',title:'成绩与变化历史',kind:'业务数据',size:'1.8 MiB',merge:false,keep:true,recovery:'历史节点无法从最新云存档重建',depends:['phi-profile']},
 {id:'phi-token',owner:'phi',title:'同步登录凭据',kind:'敏感数据',size:'1 KiB',recovery:'可重新登录；迁移时按需选择',secret:true,merge:false,depends:['phi-profile']},
 {id:'phi-cache',owner:'phi',title:'定数表缓存',kind:'缓存',size:'630 KiB',recovery:'可重新下载，不必重复备份',cache:true,merge:false},
 {id:'gacha-hsr',owner:'gacha',title:'星穹铁道记录',kind:'业务数据',size:'2 个账号 · 848 条',merge:true,keep:true,recovery:'超出服务端保留期的记录无法重新获取'},
 {id:'gacha-gi',owner:'gacha',title:'原神记录',kind:'业务数据',size:'1 个账号 · 520 条',merge:true,keep:true,recovery:'超出服务端保留期的记录无法重新获取'},
 {id:'gacha-login',owner:'gacha',title:'米游社登录状态',kind:'敏感数据',size:'2 KiB',recovery:'可重新登录；迁移时按需选择',secret:true,merge:false},
 {id:'access-config',owner:'access',title:'收藏与自动恢复规则',kind:'设置',size:'3 KiB',merge:false,keep:true,recovery:'手动收藏与逐项自动恢复设置'}
];
const REFERENCES=[
 ['Atlassian Drag and Drop','提起、占位、放置反馈和可访问的替代操作','https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines'],
 ['Carbon DataTable','行选择、筛选与批量操作的上下文','https://github.com/carbon-design-system/carbon-components-react/blob/master/src/components/DataTable/README.md'],
 ['Home Assistant','分区网格与个人状态面板','https://www.home-assistant.io/dashboards/sections/'],
 ['Lawnchair','对象菜单与拖动协调','https://github.com/LawnchairLauncher/lawnchair'],
 ['Droid-ify','插件详情和安装状态驱动的动作','https://github.com/Droid-ify/client'],
 ['Obtainium','对象详情、版本和维护操作','https://wiki.obtainium.imranr.dev/ui_overview/'],
 ['Neo Backup','单对象及批量数据范围','https://github.com/NeoApplications/Neo-Backup'],
 ['Aegis','导入条目预览与保护方式','https://github.com/beemdevelopment/Aegis'],
 ['Material Files','任务进度、冲突及失败恢复','https://github.com/zhanghai/MaterialFiles'],
 ['Loop Habit Tracker','图表范围与统计口径','https://github.com/iSoron/uhabits'],
 ['Paimon.moe','并列卡池统计及记录入口','https://github.com/MadeBaruna/paimon-moe'],
 ['phi-plugin','定数分组与成绩图片的信息组织','https://github.com/Catrong/phi-plugin']
];
const SCENES=[
 ['主应用','home','首页 · 个人工具台','home','home'],['主应用','tools','工具 · 可用能力','tools','grid'],['主应用','plugins','插件 · 已安装','plugins','plugin'],['主应用','discover','插件 · 发现与安装','plugins','plus'],['主应用','detail-phi','统一插件详情','plugin/phi','plugin'],['主应用','detail-provider','完全信任插件详情','plugin/shizuku','shield'],['主应用','permissions','功能权限','permissions/phi','lock'],['主应用','versions','历史版本与升级','versions/phi','history'],['主应用','settings','外观与更新设置','settings','gear'],['主应用','about','关于与许可','about','info'],
 ['数据与任务','data','数据管理中心','data','folder'],['数据与任务','data-plugin','按插件管理 · 内容详情','data/owner/phi','folder'],['数据与任务','export','导出 · 范围与保护','data/export','upload'],['数据与任务','import','导入 · 文件与合并','data/import','download'],['数据与任务','delete','删除 · 影响范围','data/delete','trash'],['数据与任务','tasks','任务列表','tasks','tasks'],['数据与任务','task-running','执行中 · 可以离开','task/sample','spinner'],['数据与任务','task-success','完成 · 查看结果','task/sample','check'],['数据与任务','task-failed','失败 · 保留并重试','task/sample','warning'],['数据与任务','task-partial','部分完成 · 按对象重试','task/sample','list'],
 ['Phigros','phi','总览与 RKS 趋势','phi/overview','chart'],['Phigros','phi-b30','成绩 · B30','phi/scores','list'],['Phigros','phi-all','成绩 · 全部成绩','phi/scores','search'],['Phigros','phi-history','历史 · 变化节点','phi/history','history'],['Phigros','phi-event','历史 · 前后对比','phi/event/h18','chart'],['Phigros','phi-catalog','定数表 · 分组查询','phi/catalog','book'],['Phigros','phi-accounts','账号档案与登录状态','phi/accounts','account'],['Phigros','phi-login','添加账号 · TapTap','phi/login','key'],['Phigros','phi-image','成绩图片预览','phi/image','image'],
 ['跃迁与祈愿','gacha','账户总览 · 卡池对比','gacha/overview','spark'],['跃迁与祈愿','gacha-pool','卡池详情 · 五星轨迹','gacha/pool/character','chart'],['跃迁与祈愿','gacha-records','记录 · 就地筛选','gacha/records','list'],['跃迁与祈愿','gacha-link','获取 · 粘贴链接','gacha/acquire','link'],['跃迁与祈愿','gacha-log','获取 · 设备日志','gacha/acquire','terminal'],['跃迁与祈愿','gacha-login','获取 · 米游社登录','gacha/acquire','account'],['跃迁与祈愿','gacha-data','账号数据 · 导入导出','gacha/data','folder'],['跃迁与祈愿','gacha-import','UIGF 导入范围预览','gacha/import','download'],['跃迁与祈愿','gacha-export','UIGF 账号范围选择','gacha/export','upload'],['跃迁与祈愿','gacha-analysis','分析依据与草稿','gacha/analysis','filter'],
 ['系统能力','shizuku','Shizuku · 已连接','shizuku','shield'],['系统能力','shizuku-off','Shizuku · 未运行','shizuku','power'],['系统能力','shizuku-auth','Shizuku · 待授权','shizuku','key'],['系统能力','access','无障碍 · 服务列表','access/services','access'],['系统能力','access-rules','无障碍 · 自动恢复筛选','access/services','refresh'],
 ['运行状态','home-first-read','首页 · 首次读取中','home','clock'],['运行状态','home-read-error','首页 · 状态读取失败','home','warning'],['运行状态','cold-start','模拟应用冷启动','home','power'],['运行状态','phi-read-loading','Phigros · 成绩读取中','phi/scores','clock'],['运行状态','phi-read-error','Phigros · 成绩读取失败','phi/scores','warning'],['运行状态','phi-push-loading','推分 · 计算中','phi/scores','clock'],['运行状态','phi-push-error','推分 · 计算失败','phi/scores','warning'],['运行状态','phi-push-warning','推分 · 缓存保存失败','phi/scores','warning'],['运行状态','gacha-read-loading','抽卡 · 账号切换中','gacha/overview','clock'],['运行状态','gacha-read-error','抽卡 · 账号读取失败','gacha/overview','warning'],['运行状态','gacha-switch-saving','抽卡 · 等待保存账号选择','gacha/overview','clock'],['运行状态','gacha-switch-save-error','抽卡 · 账号选择保存失败','gacha/overview','warning'],['运行状态','gacha-data-pending-error','抽卡数据 · 部分失败仍在读取','gacha/data','clock'],['运行状态','gacha-session-loading','米游社 · 读取登录状态','gacha/acquire','clock'],['运行状态','local-debug','本地 Debug · 更新边界','settings','terminal'],['运行状态','legacy-package','旧 API1 插件 · 阻止安装','plugins','warning'],['运行状态','legacy-backup','旧迁移包 · 可恢复范围','data/import','history'],['运行状态','future-backup','未知备份版本 · 明确拒绝','data/import','warning'],
 ['过渡审阅','transition-local-fast','本地首读 · 快速完成','phi/overview','clock'],['过渡审阅','transition-local-before','本地首读 · 提示阈值前','phi/overview','clock'],['过渡审阅','transition-local-after','本地首读 · 提示阈值后','phi/overview','clock'],['过渡审阅','transition-local-slow','本地首读 · 慢速完成','phi/overview','clock'],['过渡审阅','transition-web-fast','工具启动 · 快速完成','gacha/overview','clock'],['过渡审阅','transition-web-before','工具启动 · 提示阈值前','gacha/overview','clock'],['过渡审阅','transition-web-after','工具启动 · 提示阈值后','gacha/overview','clock'],['过渡审阅','transition-web-slow','工具启动 · 慢速完成','gacha/overview','clock'],['过渡审阅','transition-web-error','工具启动 · 失败与重试','gacha/overview','warning'],
 ['边界与说明','first','首次使用 · 未安装插件','home','plus'],['边界与说明','empty','暂无数据 · 开始使用','phi/overview','folder'],['边界与说明','offline','离线 · 继续查看缓存','gacha/overview','network'],['边界与说明','permission','权限不足 · 返回原任务','gacha/acquire','lock'],['边界与说明','registry','独立发布中心网页','registry','external'],['边界与说明','guide','覆盖范围与设计参考','guide','book']
];
const NOTES={
 home:['你的工具台','一眼看到关心的数据，再进入工具继续。',['进入排列模式后可直接拖动；卡片即时让位，松手落下并可撤销。','顶部只在有更新或运行任务时提示。','首页布局与插件启用分别管理。']],
 tools:['从能力开始','工具列表只展示使用时需要的信息。',['点击直接进入；版本和权限进入插件详情。','长按可置顶、移动、隐藏，隐藏不等于停用。','拖动、方向键和移动菜单共用同一套排序；隐藏项保持位置。']],
 plugins:['一个对象，一个详情','“已安装 / 发现”承载插件的完整生命周期。',['从安装、更新或设置入口都进入同一详情。','安装后明确展示启用及权限的下一步。','已安装、启用、权限、连接是不同状态。']],
 data:['先选择，再做决定','三种数据任务使用同一套选择工作区。',['按来源与关键词定位；批量操作只影响当前结果。','加密、合并与替换放到下一步，选择页只处理范围。','删除前列出关联影响；失败和取消仍保留选择。']],
 task:['页面可以离开，任务仍可查看','任务结果持久留在当前预览会话中。',['顶部任务入口始终可返回执行状态。','可切换下一个任务的成功、失败或部分成功结果。','重试以失败范围为准，不重复展示虚假的成功。']],
 phi:['四种问题，四类数据','总览 / 成绩 / 历史 / 定数表。',['趋势节点连接到当次历史；时间范围可以选择。','B30 固定展示完整 P3 + B27；筛选仅作用于全部成绩。','成绩支持定数、难度、评级、FC、AP 组合筛选；定数表可限制定数范围。']],
 gacha:['从对比到具体记录','总览看各池，详情看轨迹，记录用于查找。',['各卡池同时展示，点击进入独立详情页。','月份图与五星数字都能直接进入对应记录范围。','账号、来源获取和数据迁移各有明确入口。']],
 shizuku:['正常简洁，异常明确','每个连接状态给出对应的下一步。',['已连接时收起解释性步骤。','未运行和未授权不混成一个“不可用”。','从获取任务进入后可回到原任务。']],
 access:['收藏不再等于自动启用','收藏、即时启停、自动恢复是独立操作。',['收藏只改变查找方式，不改变服务开关。','每项服务直接显示自动恢复开关，不必进入单独页面。','停用自动恢复中的服务时，说明如何处理恢复规则。']],
 settings:['低频偏好，有序归属','主题、更新、数据管理与关于。',['单项开关即时生效。','导入导出属于完整任务页面。','主题和设备尺寸可从预览控制区切换。']],
 registry:['发布信息属于网页','先说明用途和兼容要求，再提供下载。',['只提供正式版本与正式历史版本，本地开发构建不进入发布目录。','这里呈现发布状态，应用内才呈现安装状态。','下载仅为模拟，不会安装任何程序。']],
 guide:['独立、离线、可检查','这是下一代交互方案，尚未应用到 Android 产品。',['所有页面使用同一组组件和状态模型。','可选择任一场景、切换主题和画布。','外部动作通过示例选择器及演示任务模拟。']]
};
function initialState(){return {
 route:'home',root:'home',stack:[],scrolls:{},runtime:createRuntimeState(),buildFlavor:'release',nextReadOutcome:'success',readPhase:'local',readTiming:'instant',autoAppUpdate:true,appUpdateChecked:false,theme:'light',size:'phone',zoom:'fit',condition:'normal',outcome:'success',focus:false,
 sortMode:null,sortUndo:null,pluginTab:'installed',pluginQuery:'',toolQuery:'',homeOrder:['phi','gacha','shizuku','access'],toolOrder:['phi','gacha','access','shizuku'],wideTiles:['phi','gacha'],hiddenWidgets:[],hiddenTools:[],
 plugins:Object.fromEntries(Object.keys(PLUGINS).map(id=>[id,{installed:id!=='battery',enabled:id!=='battery',update:!!PLUGINS[id].next,version:PLUGINS[id].version,permissions:Object.fromEntries(PLUGINS[id].permission.map(p=>[p,true])),checkUpdates:true}])),
 phi:{account:'p1',targetCaches:{},accounts:[{id:'p1',name:'北屿',server:'国服',logged:true},{id:'p2',name:'旅人的备用档案',server:'国际服',logged:false}],scores:'b30',query:'',levels:['EZ','HD','IN','AT'],constantMin:'',constantMax:'',grades:[],fc:'any',ap:'any',catalogQuery:'',catalogLevels:['IN','AT'],catalogMin:'',catalogMax:'',days:30,historyDays:90,point:null,image:'b30',login:'taptap',loginStage:'choice',loginName:'',server:'国服'},
 gacha:{account:'g1',accounts:[{id:'g1',game:'星穹铁道',uid:'100000001',name:'开拓者',count:848},{id:'g2',game:'原神',uid:'100000002',name:'旅行者',count:520},{id:'g3',game:'星穹铁道',uid:'100000003',name:'备用账号',count:186}],pool:'character',detailFilter:'all',query:'',filterPool:'all',rarity:0,page:0,source:'link',draft:'',linkReady:false,login:false,qr:false,logRange:'系统仍保留的全部',analysis:{field:true,community:true,rules:false,extra:''},analysisDraft:null,exportIds:['g1'],importIds:['g1','g2']},
 connection:'ready',returnTo:null,services:[{id:'s1',app:'阅读助手',name:'屏幕阅读服务',component:'demo.reader/.ReadingService',enabled:true,favorite:true,auto:false},{id:'s2',app:'自动操作',name:'自动化辅助服务',component:'demo.automation/.AccessibilityService',enabled:false,favorite:false,auto:false},{id:'s3',app:'无障碍快捷键',name:'快捷操作服务',component:'demo.shortcuts/.ShortcutService',enabled:true,favorite:false,auto:true},{id:'s4',app:'时间管理',name:'专注辅助服务',component:'demo.focus/.FocusService',enabled:false,favorite:false,auto:false}],accessQuery:'',accessFilter:'all',
 dataQuery:'',autoUpdate:true,flow:null,jobs:[],jobSeq:1,overlay:null,scene:'home',firstUse:false
};}
let S=initialState();
try{const preferences=JSON.parse(localStorage.getItem('ats-next-preview-preferences')||'null');if(preferences){if(['light','dark','system'].includes(preferences.theme))S.theme=preferences.theme;if(['phone','compact','wide'].includes(preferences.size))S.size=preferences.size;if(['fit','75','100','125'].includes(preferences.zoom))S.zoom=preferences.zoom;}}catch{}
const ui={device:document.getElementById('device'),product:document.getElementById('product'),header:document.getElementById('app-header'),context:document.getElementById('context-header'),content:document.getElementById('app-content'),footer:document.getElementById('flow-footer'),nav:document.getElementById('app-nav'),overlay:document.getElementById('overlay-layer')};

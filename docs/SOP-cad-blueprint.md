# 海军舰艇 SVG 工程蓝图生产与考证标准作业程序 (SOP)

> **文档版本**：v1.2（基于第 1~3 批 `01`~`25` 共 83 份海军舰艇与附属件 SVG 资产实战提炼，新增「子 Agent 单图拆件 + 主线程脚本无损合总图」防截断流水线与无头 Edge 零 Token 直写截图规范）  
> **适用范围**：`assets/navy/` 全系舰艇 CAD 矢量资产扩建、真实三视图考证、防重叠精修与光桌浏览器集成。  
> **核心视觉基准**：`OBLIVION UI GFX / POSEIDON NAVAL CAD` 深空战术光桌蓝图风格。

---

## 一、 总体目录架构与交付物契约

### 1.1 标准目录结构
```text
<repo-root>/
├── docs/
│   ├── SOP-cad-blueprint.md                                # 本标准作业程序文档
│   └── navy-catalog.md                                     # 海军资产目录与参数索引
├── metadata/                                               # 结构化索引与分类元数据
│   ├── catalog.json
│   ├── classification.json
│   └── source-baseline.json
└── assets/
    ├── navy/                                               # 海军舰艇 SVG 矢量资产库 (37 组 / 156 份图纸)
    │   ├── 01_CVN78_福特级核动力航母/ ...
    │   └── 37_RA2_海蝎级近海防空水翼快艇/
    ├── army/                                               # 陆军地面装备 SVG 矢量资产库 (55 组 / 75 份图纸)
    └── air/                                                # 空军战机与特种飞行器 SVG 矢量资产库 (18 组 / 31 份图纸)
```

### 1.2 单舰标准交付“三件套”
除特殊多拆件舰型外，每艘新增主力舰艇（水面战舰、航母、两栖舰、核潜艇）统一在各自子目录下交付 **3 份独立自包含的 `.svg` 文件**：

| 序号 | 文件命名规范 | 资产 ID (`data-asset-id`) | 画布尺寸 (`viewBox`) | 定位与内容要求 |
| :--- | :--- | :--- | :--- | :--- |
| `01` | `01_<代号>_<舰名>_侧视立面.svg` | `naval.<slug>.side` | `0 0 1100 320` | 1:1 真实比例右舷侧视立面图（含水下防污暗红船底、球鼻艏、螺旋桨/舵、反应堆/动力舱或主装甲盒透视、主副武备与导弹谱系框） |
| `02` | `02_<代号>_<舰名>_顶视全甲板.svg` | `naval.<slug>.top` | `0 0 1100 360` | 1:1 真实长宽比正交全甲板俯视图（严格按 `LOA / BEAM` 比例建模，含主炮塔/垂发井阵列/倾斜发射箱/舰岛/直升机坪与舰载机） |
| `03` | `03_<代号>_<舰名>_侧顶双联工程蓝图.svg` | `naval.<slug>.master.sheet` | `0 0 1320 580` | 上下双联（或左图右表）联合工程总图，上下帧 X 轴纵向构件严格对齐，供战术大屏与光桌全览 |

---

## 二、 五步标准作业流程 (5-Step Pipeline)

### Step 1：世界书主尺度提取与 1:1 几何包络计算
1. **检索设定源**：从《`武备·盟军_世界书.json`》或《`武备·苏联_世界书.json`》中提取目标舰艇的 `uid`、全舰长 (`LOA`)、最大舰宽/水线宽 (`BEAM`)、吃水 (`DRAFT`)、满载排水量、动力系统、主副武备与雷达电子设备清单。
2. **锁定船首朝向**：全库所有舰艇（侧视与顶视）统一 **船首朝右 (`+X`)、船尾朝左 (`-X`)**。
3. **1:1 真实长宽比数学约束（严禁非等比拉伸）**：
   - 局部船体坐标系通常设船长跨度 `L_cad = 400 ~ 420` 单位（例如 `X = 14 .. 428`）。
   - **铁律**：`<g transform="translate(tx, ty) scale(S, S)">` 必须严格保证 `sx === sy`（等比缩放），严禁使用 `scale(2.5, 1.8)` 等非等比缩放导致圆形雷达罩、直升机旋翼、炮塔座圈畸变为椭圆。
   - **顶视图半宽公式**：设真实长宽比为 `R = LOA / BEAM`，中心线为 `Y_mid = 40`，则顶视图船体上下外缘必须严格落在：
     $$\Delta Y_{\text{half}} = \frac{L_{\text{cad}}}{2 \times R}, \quad Y_{\text{port}} = Y_{\text{mid}} - \Delta Y_{\text{half}}, \quad Y_{\text{stbd}} = Y_{\text{mid}} + \Delta Y_{\text{half}}$$
     - *示例 1（提康德罗加级 CG-47）*：`172.8m × 16.8m`（`R = 10.29:1`），当 `L_cad = 412` 时，`2 × ΔY = 40.0`，故顶视船体严格落在 `Y = 20.0 .. 60.0`。
     - *示例 2（苏维埃同盟级 Pr.23）*：`269.4m × 38.9m`（`R = 6.93:1`），当 `L_cad = 404` 时，`2 × ΔY = 58.3`，故顶视宽体防雷鼓包外缘落在 `Y = 10.8 .. 69.2`。

---

### Step 2：双图层解耦与 OBLIVION UI GFX 工程制图规范
每份 SVG 顶层结构必须严格分为两个 `<g>` 图层，以便光桌浏览器支持「一键开关工程蓝图框」与「仅复制纯净船体 `<g>`」：

1. **`<g id="layer-backdrop">`（工程蓝图背景与图框层）**：
   - 深空黑底板 `<rect width="100%" height="100%" fill="#050a0e"/>` + 双级网格 `<rect fill="url(#grid20)"/>`、`<rect fill="url(#grid100)"/>`。
   - 外框 `<rect stroke="#2c3b40"/>` 与四角青色高光折线准星 (`stroke="#38bdf8" stroke-width="1.6"`)。
   - 顶栏左英文总标题 (`fill="#38bdf8"`)、右中文工程图名 (`fill="#d4e3e6"`)；底栏左核心主尺度参数串 (`fill="#8aa1a7"`)、右 `POSEIDON NAVAL CAD ASSET · TRUE 1:1 ASPECT`。
2. **`<g id="layer-ship-cad">`（核心舰艇几何层）**：
   - **标准色板**：
     - `#d4e3e6`（亮白）：水线以上主船体轮廓、上层建筑主棱线、主炮塔外壳、直升机/舰载机主轮廓。
     - `#38bdf8`（战术青）：相控阵雷达阵面、战斧/标准垂发井、主结构分格线、弹射器轨道、核心技术标注。
     - `#ff5a36`（警示橘红）：水下防污暗红船底 (`fill="#261014" stroke="#ff5a36"`)、水线主装甲带/防雷隔舱、核反应堆压力容器、重型超音速反舰导弹（如 P-700 花岗岩、捕鲸叉、日炙/锆石）高光。
     - `#eab308`（工程金）：五叶/四叶螺旋桨与推进轴系、燃气轮机/蒸汽轮机舱、光学/雷达主火控仪、航母舷侧升降机轮廓。
   - **细节密度门禁**：每份文件体积须达到 `14 KB ~ 36 KB`，必须包含水下球鼻艏、舭龙骨、平衡舵、螺旋桨轴支架、干舷舷窗/消磁电缆、主副炮多层装甲座圈与炮管、垂发每个独立发射盖板（如 `8×8` 矩阵或圆形左轮垂发）、桁架桅杆横桁、近防炮及舰载直升机/舰载机。

---

### Step 3：Google 真实三视图检索下载与 1:1 无头渲染截图
为杜绝“凭印象画错上层建筑/烟囱/桅杆拓扑”或“放大后文字碰撞”，每批舰艇生成后必须执行以下考证闭环：

1. **Google 图片检索下载真实参考图**：
   - 在浏览器打开 Google 图片搜索 (`https://www.google.com/search?q=<中文舰名>+三视图+结构图+<English Class>+line+drawing&udm=2`)。
   - 提取排名前列的 **正交侧顶线图 (General Arrangements / Line Drawing)**、**现代化改装武备传感器布置图**、**内部装甲/反应堆剖面图** 共 3~4 张，保存至本地私有考证参考目录（不随公开开源仓库分发）。
2. **使用无头浏览器一键生成 1320×580 零黑边实机渲染图**：
   - 切勿使用全屏高分辨率窗口直接截小图（会产生右侧/底部大面积黑边）；统一调用 Edge Headless 独立临时配置目录，按 SVG 原生画布尺寸 `1320,580` 导出 PNG：
   ```powershell
   $edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
   if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
   $tmpProfile = Join-Path $env:TEMP "edge_svg_shot_$([guid]::NewGuid().ToString('N'))"
   $uri = ([System.Uri]$svgFullPath).AbsoluteUri
   & $edge --headless=new --user-data-dir="$tmpProfile" --disable-gpu --hide-scrollbars --window-size=1320,580 --screenshot="$outPngPath" "$uri" 2>$null
   Remove-Item -Recurse -Force $tmpProfile -ErrorAction SilentlyContinue
   ```

---

### Step 4：视觉比对与五大高频缺陷防碰撞精修（核心红线）
用 `read` 工具同时检视下载的 Google 真实三视图与导出的 `*_SVG工程蓝图实机截图.png`，逐项排查以下 **五大高频踩坑点**：

#### 红线 1：严禁在 `<style>` 的 `.p` 类中写死 `font-size: 9.5px;`
- **根因**：在 SVG 标准中，`<style>` 块内的 CSS 类选择器（`.p { font-size: 9.5px; }`）优先级**高于**元素上的 SVG presentation attribute（如 `<text class="p" font-size="3.2">`）！一旦局部 `<g transform="scale(2.5)">` 内的 `<text>` 带了 `class="p"`，原本 `3.2` 的文字会被强制覆盖为 `9.5px`，再经 `2.5` 倍放大变成 **`23.75px` 巨型大字**，引发整排标题互相吞噬！
- **强制规范**：
  1. `<style>` 中的 `.p` 仅允许定义 `font-family` 与 `letter-spacing`，**严禁包含 `font-size: 9.5px;`**；
  2. 外框 `layer-backdrop` 的标题文字显式写 `<text font-size="9.5" class="p mono" ...>`；
  3. 局部缩放 `<g>` 内部的所有 `<text>` 统一使用 `class="mono"`（不挂 `p` 类），并显式指定 `font-size="2.5" ~ "3.3"`。

#### 红线 2：局部 `<g>` 内部文字字号与水平安全间距公式
- 在 `scale(2.4 ~ 2.75)` 下，局部坐标系中 `font-size="3.0"` 渲染到屏幕上已达 `7.5px ~ 8.2px`，极其清晰；若局部设 `font-size="4.5"`，渲染后高达 `12px`，极易撑爆模块框或撞击相邻文字。
- **水平防碰撞公式**：局部等宽字体每个字符宽度约为 `0.62 × font-size`。两段同高度（相同 `Y`）水平文字的锚点间距必须满足：
  $$\Delta X \ge N_{\text{chars}} \times 0.62 \times \text{font-size} + 8$$
- **垂直净空铁律**：上层建筑上方的引线文字、`SKI-JUMP` 标高、导弹齐射标注必须置于最高桅杆顶或飞行物轨迹上方至少 `3.5` 个局部单位（或置于左侧/右侧空白海域），严禁横穿三脚桅、格子桅、烟囱或甲板停放的舰载机。

#### 红线 3：双联总图右侧独立参数表（Spec Panel）键值防重叠
- 当 `03` 双联总图采用“左侧 920px 双视图 + 右侧 280px 参数铭牌”布局时：
  - 左列属性名（`x="996"`，左对齐）与右列数值（`x="1258" text-anchor="end"`，右对齐）共享 `262px` 净宽；
  - 属性名与数值字号必须控制在 **`font-size="7.5" ~ "7.8"`**，左列属性名长度不得超过 22 个字符（如用 `DIMENSIONS (L×B×D):` 替代 `DIMENSIONS (LOA×BEAM×DRAFT):`），确保左右两列之间至少保留 `20px` 空白净距。

#### 红线 4：主结构拓扑与真实三视图核对清单
- **战列舰/巡洋舰**：核对主炮塔数量、背负式高低差、各炮塔朝向（前主炮朝右 `+X`、后主炮朝左 `-X`）、烟囱数量（单烟囱 vs 双烟囱）、主桅与副桅相对烟囱的前后关系（如 23型苏维埃同盟级 2 号烟囱紧后方的三脚主桅与双层横桁、衣阿华级 1 号烟囱贴合的前高塔主桅与 2 号烟囱后的短副桅）。
- **驱逐舰/巡洋舰**：核对前/后垂发单元矩阵分组（如 055 型 `8×8 + 8×8`、提康德罗加级 `8×8(61) + 8×8(61)`、伯克级前 `32` + 后 `64`）、相控阵雷达阵面安装位置（舰桥四面折角 vs 一体化综合射频桅杆）。
- **航母/两栖攻击舰**：核对舰岛数量与舷侧位置（右舷单舰岛 vs 双舰岛）、舷侧升降机相对于舰岛的前后/中间关系（如伊丽莎白女王级两座 70 吨升降机分别位于双舰岛之间与后舰岛后方）、滑跃甲板仰角或电磁弹射器条数。
- **核潜艇**：核对单壳体/双壳体剖面、围壳位置与圆滑过渡肋条、尾舵构型（十字舵 vs X 舵 + 拖曳线列声呐整流罩）、导弹发射筒倾角与舱盖数量。

#### 红线 5：`.NET System.Xml.XmlDocument` 零错误门禁
- 所有 `&` 字符在 XML 中必须写为 `&amp;`。每次修改后必须执行以下脚本校验全库 SVG 语法：
  ```powershell
   $allSvgs = Get-ChildItem "assets/navy" -Recurse -Filter "*.svg"
  foreach ($s in $allSvgs) {
    $x = New-Object System.Xml.XmlDocument
    $x.Load($s.FullName)
  }
  ```

---

### Step 5：合入《舰艇SVG资产浏览器.html》与光桌巡检
1. **子 Agent 防截断铁律（单图拆件 + 脚本无损合成总图）**：
   - 当并行派发子 Agent 绘制多艘高密度舰艇时，**严禁让单个子 Agent 在单次对话中连续输出 `01`+`02`+`03` 三份大体积 SVG**（极易触发模型单次输出长度上限或因合并耗时引发超时重派）。
   - **标准做法**：子 Agent 仅负责精雕细琢 `01`（侧视立面）与 `02`（顶视全甲板）2 份单图（单文件 18 KB ~ 28 KB，100% 一次过）；随后由主线程运行 Node.js 合成脚本，在 1 秒内提取 `01` 与 `02` 的 `<g id="layer-ship-cad">` 核心几何层，自动重映射至 `1320×580` 双联画布并注入右侧双工程规格铭牌（`#spec-panel-upper` 与 `#spec-panel-lower`），实现零失真、零重派。
2. **零上下文 Token 直写截图与 DOM 包围盒自动消碰**：
   - 切勿使用返回 Base64 大图的工具将十余张百万字节级 PNG 塞入对话上下文；统一使用 `msedge.exe --headless=new --user-data-dir="$env:TEMP\edge_svg_shot" --window-size=1320,580 --screenshot="<目标路径>.png"` 直接落盘至 `SVG资产/参考/`。
   - 在 Chrome 中对加载后的 SVG 执行 `querySelectorAll('text')` + `getBoundingClientRect()` 两两交集扫描，确保 `collisions === 0` 且 `outOfBounds === 0`。
3. **同步更新 `README.md` 与 `舰艇SVG资产浏览器.html`**：
   - 将新增舰艇目录、资产 ID、主尺度长宽比与世界书 `uid` 登记入册，并通过 Node.js 脚本将全库 83 份 `.svg` 的完整 UTF-8 源码注入 `舰艇SVG资产浏览器.html` 的内置 `ASSETS` 数组中（免 `file://` CORS 拦截）。
   - 在 Chrome 中刷新 `舰艇SVG资产浏览器.html`，核对顶部总资产计数器（`83 ASSETS`）、25 个分类过滤标签、画廊卡片缩略图与光桌精密检视器（`INSPECTOR`）下的图层开关与缩放表现。


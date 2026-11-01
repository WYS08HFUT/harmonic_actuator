# HA-110 谐波关节模组 · 交互式原理页

一体化无框电机 + 谐波减速 + 双绝对值编码的关节模组。本仓库包含 **build123d v2 机械模型**、Web 资产导出，以及交互式原理页（`web/`）。

- 设计稿：`docs/superpowers/specs/2026-11-01-harmonic-actuator-explainer-design.md`
- 实现计划：`docs/superpowers/plans/2026-11-01-harmonic-actuator-cad-v2.md`、`...-web.md`

## 1. 当前状态

- CAD v2：完成。Ø110 机身 / Ø118 输出端安装法兰；无框电机 + 100/102 谐波（50:1）+ 输出端 RB7013 交叉滚子轴承 + 双绝对值编码器；Ø20 通孔贯通。
- Web：按 `...-web.md` 实现中；页面为浅色工业风的单屏 3D 工具，含拆解、剖切、传动、二维剖面面板。

## 2. CAD v2

所有 CAD 脚本在 cadgen 0.8.1 的 Python 环境中运行（系统 Python 的 OCP 安装不完整）：

```bash
# 重建并导出 STEP / STL / GLB / manifest / 二维剖面
cadgen +0.8.1 run -m cad.export_assets

# 几何校核：包络、Ø20 通孔、真实配合零干涉、运动学接触、装配路径、资产节点名
cadgen +0.8.1 run -m cad.checks
```

### 产物

| 路径 | 说明 |
|---|---|
| `models/harmonic_actuator_v2_assembly.step` | 完整装配（中性零件状态） |
| `models/harmonic_actuator_v2_cutaway.step` | 180° + 90° 局部窗口剖切 |
| `models/harmonic_actuator_v2_cutaway.stl` | 剖切三角网格 |
| `models/harmonic_actuator_v2.glb` | 带节点名/材质的 Web 资产 |
| `web/public/assets/harmonic_actuator_v2.glb` | Web 实际加载的 GLB |
| `web/public/assets/harmonic_actuator.json` | 24 个零件的爆炸/旋转/剖切/文案索引 |
| `drawings/harmonic_actuator_section_teaching.svg` | 客户页二维剖面（齿部安装变形示意 + 活的放大窗底图） |
| `drawings/harmonic_actuator_section_neutral.svg` | CAD/QA 中性状态剖面 |
| `web/public/assets/harmonic_actuator_section_teaching.svg` | 面板用剖面副本 |

### 关键默认值

- 50:1 基准：Zf=100、Zc=102、m=0.5；工作波发生器椭圆 Ø48.05/Ø46.05；中性 CAD 波发生器缩小到 Ø46.65/Ø44.65 以避免圆柔轮静态穿模。
- 减速比 20–100（0.5 步进），输入端 0–3000 rpm；Web 用 1/20 慢放展示。
- 双绝对值编码器：输入端 14 位、输出端 19 位；多圈靠电子圈数计数，磁环本身单圈绝对。
- 防护默认 IP40，保留 Ø20 开放通孔；IP54 需密封电缆接头并放弃开放通孔。
- 页面性能表述只讲结构原理，并标注“结构原理示意，最终参数以正式规格书为准”。

## 3. Web

```bash
cd web
npm install
npm run dev       # http://127.0.0.1:5173/
npm run build
npm test
npm run check:visual
```

页面功能：单屏 3D、拆解滑块、剖切/半透明、传动（自动运行，可调输入转速与减速比）、零件信息卡、二维剖面 + 活齿部放大窗。

## 4. 旧脚本与 v1 资产（legacy）

- `harmonic_actuator_build123d.py`：v1 build123d 模板。存在输出端堆叠反了、`Hole(depth=...)` 双向切进轴承座、编码器 PCB 埋入壳体等问题；仅作参考，不作为交付。
- `generate_actuator_models.py`：v1 NumPy 网格/蓝图模板。已修复硬编码 `/working_dir` 输出路径，输出改到 `legacy_output/`；手写 STEP 是仅表面的 faceted 文件，已标记弃用，v2 实体 STEP 由 `cad/export_assets.py` 导出。
- v1 资产（`models/harmonic_actuator_assembly.*`、`models/harmonic_actuator_cutaway.*`、`previews/`、`drawings/harmonic_actuator_cad_blueprint.png`）保留在本地，不进入 v2 主链路。

## 5. 环境说明

- `requirements.txt` 是 v1 的依赖清单；v2 通过 cadgen 自带的 build123d 0.13 环境运行，避免系统 Python 的 `OCP.Standard` 导入错误。
- `web/` 使用 Vite + TypeScript + Three.js；视觉/交互检查使用本机 Chrome（`puppeteer-core`）。
- 模型单位 mm，Z 轴为轴向。GLB 是**数值毫米、根节点 Y-up**；manifest 的 `units:"mm"`/`axis:"Z"` 描述模型坐标，并带 `gltf_up:"Y"`/`gltf_units:"mm"`。Web 加载时按 `(x,y,z) → (x,z,-y)` 转换爆炸偏移和程序化齿形。
- 当前 GLB 约 11.9 MB，高于 6 MB 目标；Web 阶段用 Meshopt/降网格优化，节点名保持不变。
- v2.1 复核修复：后盖 4×M3 PCD50；柔轮毂 Ø47/Ø32；Ø44 H7/h6 止口；FS 8×M3 从柔轮侧进入、法兰侧攻丝；CRB 内圈由输出法兰 Z92–93 旋转肩台支撑，主体让位 r42；输出止口为 Ø42 H7 凹止口；定子—绕组零干涉；6806 内圈/球通过 manifest `child_groups` 旋转。

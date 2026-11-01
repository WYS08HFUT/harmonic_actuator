# HA-110 谐波关节模组 · 交互式原理页

面向客户的单页 3D 讲解工具：爆炸视图、剖切、半透明传动演示、连续减速比，以及带活动齿部放大窗的二维结构图。页面为浅色工业风，销售可直接发送链接，客户自行阅读。

## 运行

```bash
cd web
npm install
npm run dev          # http://127.0.0.1:5173/
npm run build        # 输出 web/dist，相对路径，可挂任意静态目录
npm run preview      # 预览生产构建（默认 4173）
npm test             # node:test + tsx，engine/data 纯逻辑测试
npm run check:visual # Puppeteer 截图与交互断言（需本机 Chrome）
```

`check:visual` 默认访问 `http://127.0.0.1:5173/`，可用 `URL=` 指向 `preview`；截图写到 `/tmp/ha-*.png`。脚本使用 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，其他平台需改 `CHROME` 常量。

## 页面交互

- **拆解** 0–100%：按装配顺序错峰分离；>5% 自动暂停传动，壳体半透明。
- **剖切**：世界坐标 180° 剖切，只切 manifest 中 `cut: true` 的零件；柔轮、波发生器、输出法兰永不剖切。
- **传动**：默认自动运行。输入转速 0–3000 rpm、减速比 20–100（0.5 步进）实时生效；输出方向与输入相反并在读数上标注；拆解 >5% 暂停、回 0 恢复半透明，复位恢复 50:1 / 1000 rpm。
- **视角**：整机 / 齿部 / 输出端；齿部视图自动半透明外围结构并框住齿圈。
- **结构图**：全屏面板，左侧静态轴向剖面 SVG（滚轮/双指缩放、拖动平移、双击复位），右侧实时齿部放大窗；Esc 关闭。
- **移动端**：折叠式“为什么这样设计”说明、常驻免责声明、底部单列控制条；结构图改为单列可缩放。
- **键盘**：Tab/Shift+Tab 轮换零件，Enter 打开悬停零件，Esc 关闭，方向键旋转，`+`/`-` 缩放，`R` 复位。
- **减少动态效果**：`prefers-reduced-motion` 下关闭自动旋转与传动自动运行、传动停在当前帧，爆炸滑块只取 0/50/100%，放大窗静止。

## 传动与减速比的语义

程序化齿形由减速比 `i` 推导，分度圆半径固定 25 mm：

- `Zf = 2i`，`Zc = Zf + 2`（齿差 2）
- `m = 25 / i`（模数）
- 柔轮齿顶 = 25 + m，齿根 = 25 − 1.25m
- 刚轮齿顶 = 25，齿根 = 25 + 2.25m
- 波发生器工作椭圆 = 柔轮内径 ± m（长轴/短轴）

输入转速显示真实 rpm，3D 动画按 **1/20 慢放**；输出角速度为 `-ω_in / i`。柔轮径向变形在 3D、二维齿条和环形小图中都按 **1× 真实尺度** 绘制（约 2% 应变），靠近距离轴向取景读出椭圆，避免与刚轮/波发生器穿模。

## 资产前提

页面消费 `public/assets/` 下的三份文件：

- `harmonic_actuator_v2.glb` — 数值单位 mm、根节点 Y-up（`HA_110_Actuator` 带 −90° X 旋转），节点名与 manifest 一致。
- `harmonic_actuator.json` — 模型为 Z-up、mm；含 24 个零件、旋转组、拆解偏移、剖切/半透明标记、输入/减速比范围。
- `harmonic_actuator_section_teaching.svg` — 50:1 基准的二维教学剖面。

GLB 由 build123d 生成，导出时使用 `linear_deflection=0.05`、`angular_deflection=0.2`，体积约 **4.9 MB**（build123d 默认 0.001 mm 会生成 ~12 MB）。重新生成：

```bash
# 仓库根目录
PYTHONPATH=. ~/.local/bin/cadgen +0.8.1 run cad/export_assets.py
PYTHONPATH=. ~/.local/bin/cadgen +0.8.1 run cad/checks.py
```

`export_assets.py` 同时写出 STEP/STL、复制 GLB 与 manifest 到 `web/public/assets/`、重绘 SVG。`checks.py` 覆盖参数、零件装配、齿形相位、剖切体量、资产帧与 web 资产哈希；全部 PASS 后再提交。CAD 设计依据见 `docs/superpowers/plans/2026-11-01-harmonic-actuator-cad-v2.md`，网页计划见 `docs/superpowers/plans/2026-11-01-harmonic-actuator-web.md`。

## 已知限制

- 程序化齿形采用梯形近似（平顶/平根、20° 压力角、0.06m 侧隙），用于讲解啮合关系，不是可制造齿形。
- 3D、二维齿条和环形小图均使用 1× 真实变形；齿条靠局部放大显示细节，环形小图的椭圆因此较细微。
- 二维静态 SVG 固定在 50:1 基准；改变减速比时标题与活动放大窗更新，静态图不重绘。
- 无纹理贴图、无物理载荷/背隙仿真、无音效；性能预算面向桌面与中端手机。
- 齿部视图的半透明/剖切是展示状态，不改变导出资产；齿部视图还会把柔轮杯壁/隔膜临时半透明，便于从输出端看齿圈。
- 不使用实时阴影，地面接触阴影由 Canvas 径向渐变贴片生成。
- 需要 WebGL；上下文丢失时显示错误面板并提示刷新。

## 页面文案

页脚统一提示「结构原理示意，最终参数以正式规格书为准。」产品命名使用通用型号 HA-110，不含公司名。
